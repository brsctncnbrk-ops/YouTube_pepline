#!/usr/bin/env node
/**
 * Media-level release gate. Config/schema checks cannot detect a decoded black
 * frame, a silent tail, or an unexpectedly quiet final encode, so this runs
 * after Remotion has produced the actual MP4.
 */
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseArgs, projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);

async function command(binary, args) {
  try {
    return await exec(binary, args, { maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    // FFmpeg uses non-zero exit only for real processing failures. Preserve
    // stderr because it is the useful evidence when the media itself fails.
    throw new Error(`${binary} failed: ${error.stderr || error.message}`);
  }
}

function extractLoudnorm(text) {
  const candidates = [...text.matchAll(/\{\s*"input_i"[\s\S]*?\n\}/g)].map((match) => match[0]);
  if (!candidates.length) throw new Error("Loudness analysis returned no JSON");
  return JSON.parse(candidates.at(-1));
}

function parseBlack(text) {
  return [...text.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g)].map((match) => ({
    start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]),
  }));
}

function parseSilence(text) {
  const starts = [...text.matchAll(/silence_start: ([\d.]+)/g)].map((match) => Number(match[1]));
  const ends = [...text.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((match) => ({ end: Number(match[1]), duration: Number(match[2]) }));
  return ends.map((entry, index) => ({ start: starts[index] ?? null, ...entry }));
}

async function durationSeconds(video) {
  const { stdout } = await command("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", video]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid video duration for ${video}`);
  return duration;
}

export async function runMediaQa({ projectId, video, reportPath }) {
  const duration = await durationSeconds(video);
  const [blackDetect, silenceDetect, loudness] = await Promise.all([
    command("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-an", "-vf", "blackdetect=d=0.45:pix_th=0.10:pic_th=0.98", "-f", "null", "-"]),
    command("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-vn", "-af", "silencedetect=n=-50dB:d=1.0", "-f", "null", "-"]),
    command("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-vn", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]),
  ]);

  const blackSegments = parseBlack(`${blackDetect.stdout}\n${blackDetect.stderr}`);
  const silenceSegments = parseSilence(`${silenceDetect.stdout}\n${silenceDetect.stderr}`);
  const measured = extractLoudnorm(`${loudness.stdout}\n${loudness.stderr}`);
  const nonTerminalBlack = blackSegments.filter((segment) => segment.duration >= 0.45 && segment.end < duration - 1.25);
  const meaningfulSilence = silenceSegments.filter((segment) => segment.duration >= 1.0 && (segment.start ?? 0) < duration - 1.0);
  const integratedLufs = Number(measured.input_i);
  const truePeak = Number(measured.input_tp);
  const loudnessOk = integratedLufs >= -15.5 && integratedLufs <= -12.5;
  const truePeakOk = truePeak <= -1.0;
  const pass = nonTerminalBlack.length === 0 && meaningfulSilence.length === 0 && loudnessOk && truePeakOk;

  const report = {
    schema_version: "1.0",
    project_id: projectId,
    video: path.basename(video),
    duration_seconds: duration,
    thresholds: {
      max_nonterminal_black_seconds: 0.45,
      max_silence_seconds: 1.0,
      integrated_lufs_range: [-15.5, -12.5],
      max_true_peak_dbtp: -1.0,
    },
    black_segments: blackSegments,
    nonterminal_black_segments: nonTerminalBlack,
    silence_segments: silenceSegments,
    meaningful_silence_segments: meaningfulSilence,
    loudness: { integrated_lufs: integratedLufs, true_peak_dbtp: truePeak, loudness_range: Number(measured.input_lra) },
    pass,
  };
  await writeJsonAtomic(reportPath, report);
  if (!pass) {
    throw new Error(`ORVYQ media QA failed: ${nonTerminalBlack.length} black segment(s), ${meaningfulSilence.length} silent segment(s), ${integratedLufs} LUFS, ${truePeak} dBTP`);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const projectId = args["project-id"];
  const video = args.video;
  if (!projectId || !video) {
    console.error("Usage: node scripts/orvyq_media_qa.mjs --project-id <id> --video <path> [--report <path>]");
    process.exitCode = 1;
  } else {
    const report = args.report || path.join(projectDir(projectId), "qa", "orvyq_media_qa.json");
    runMediaQa({ projectId, video, reportPath: report }).then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
  }
}
