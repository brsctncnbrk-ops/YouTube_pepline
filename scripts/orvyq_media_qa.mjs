#!/usr/bin/env node
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseArgs, projectDir, writeJsonAtomic, readJson, pathExists } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);
async function command(binary, args) {
  try { return await exec(binary, args, { maxBuffer: 24 * 1024 * 1024 }); }
  catch (error) { throw new Error(`${binary} failed: ${error.stderr || error.message}`); }
}
function extractLoudnorm(text) {
  const candidates = [...text.matchAll(/\{\s*"input_i"[\s\S]*?\n\}/g)].map((match) => match[0]);
  if (!candidates.length) throw new Error("Loudness analysis returned no JSON");
  return JSON.parse(candidates.at(-1));
}
function parseBlack(text) {
  return [...text.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g)].map((match) => ({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) }));
}
function parseSilence(text) {
  const starts = [...text.matchAll(/silence_start: ([\d.]+)/g)].map((match) => Number(match[1]));
  const ends = [...text.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((match) => ({ end: Number(match[1]), duration: Number(match[2]) }));
  return ends.map((entry, index) => ({ start: starts[index] ?? null, ...entry }));
}
function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();
}
async function durationSeconds(video) {
  const { stdout } = await command("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", video]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid video duration for ${video}`);
  return duration;
}

export async function runMediaQa({ projectId, video, reportPath, captionsPath, audioMetadataPath }) {
  const duration = await durationSeconds(video);
  const dir = projectDir(projectId);
  const speechQaPath = path.join(dir, "qa", "speech_transcript.json");
  const [blackDetect, silenceDetect, loudness, captions, audioMetadata, speechQa] = await Promise.all([
    command("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-an", "-vf", "blackdetect=d=0.6:pix_th=0.08:pic_th=0.985", "-f", "null", "-"]),
    command("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-vn", "-af", "silencedetect=n=-52dB:d=2.5", "-f", "null", "-"]),
    command("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-vn", "-af", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"]),
    readJson(captionsPath),
    readJson(audioMetadataPath),
    readJson(speechQaPath),
  ]);

  const blackSegments = parseBlack(`${blackDetect.stdout}\n${blackDetect.stderr}`);
  const silenceSegments = parseSilence(`${silenceDetect.stdout}\n${silenceDetect.stderr}`);
  const measured = extractLoudnorm(`${loudness.stdout}\n${loudness.stderr}`);
  const nonTerminalBlack = blackSegments.filter((segment) => segment.duration >= 0.6 && segment.end < duration - 1.5);
  const meaningfulSilence = silenceSegments.filter((segment) => segment.duration >= 2.5 && (segment.start ?? 0) > 0.5 && (segment.start ?? 0) < duration - 1.5);
  const integratedLufs = Number(measured.input_i);
  const truePeak = Number(measured.input_tp);
  const loudnessOk = integratedLufs >= -18 && integratedLufs <= -13;
  const truePeakOk = truePeak <= -1;

  const captionItems = captions.captions || [];
  const captionStyleOk = captions.style?.line_count === 1 && captions.style?.active_word_effect === false && captions.style?.background === "none";
  const captionSourceOk = captions.source === "qa/speech_transcript.json" && captions.text_source === "voice/voice_script.txt";
  const captionTextOk = captionItems.length > 0
    && /^Every major AI lab\b/i.test(captionItems[0]?.text || "")
    && captionItems.every((item) => item.text && item.text.length <= 52 && item.text.trim().split(/\s+/).length <= 7);
  const captionTimingOk = captionItems.every((item) => item.start_frame >= 0 && item.end_frame > item.start_frame && item.end_frame <= captions.duration_frames);
  const captionsOk = captionStyleOk && captionSourceOk && captionTextOk && captionTimingOk;

  const approvedMusicProfiles = ["original_tonal_score", "approved_licensed_bed"];
  const soundDesignOk = audioMetadata.procedural_noise_generation === false
    && approvedMusicProfiles.includes(audioMetadata.music_profile)
    && Boolean(audioMetadata.music_asset)
    && (audioMetadata.sfx_assets || []).length === 0;
  const declaredAssets = [audioMetadata.music_asset, ...(audioMetadata.sfx_assets || [])].filter(Boolean);
  const declaredAudioAssetsExist = await Promise.all(declaredAssets.map((rel) => pathExists(path.join(dir, rel))));
  const audioAssetsOk = declaredAudioAssetsExist.every(Boolean);

  const normalizedTranscript = normalize(speechQa.transcript);
  const openingSpeechOk = normalizedTranscript.startsWith("every major ai lab");
  const speechOk = speechQa.passed === true
    && speechQa.word_count >= 30
    && speechQa.script_similarity >= 0.85
    && openingSpeechOk;

  const pass = nonTerminalBlack.length === 0 && meaningfulSilence.length === 0 && loudnessOk && truePeakOk && captionsOk && soundDesignOk && audioAssetsOk && speechOk;
  const report = {
    schema_version: "4.0",
    project_id: projectId,
    video: path.basename(video),
    duration_seconds: duration,
    thresholds: {
      max_nonterminal_black_seconds: 0.6,
      max_nonterminal_silence_seconds: 2.5,
      integrated_lufs_range: [-18, -13],
      max_true_peak_dbtp: -1,
      caption_line_count: 1,
      max_caption_words: 7,
      max_caption_chars: 52,
      minimum_speech_similarity: 0.85,
      required_opening_words: "Every major AI lab",
      required_music_profiles: approvedMusicProfiles,
    },
    black_segments: blackSegments,
    nonterminal_black_segments: nonTerminalBlack,
    silence_segments: silenceSegments,
    meaningful_silence_segments: meaningfulSilence,
    loudness: { integrated_lufs: integratedLufs, true_peak_dbtp: truePeak, loudness_range: Number(measured.input_lra), pass: loudnessOk && truePeakOk },
    speech: { word_count: speechQa.word_count, script_similarity: speechQa.script_similarity, coverage: speechQa.speech_coverage, opening_pass: openingSpeechOk, pass: speechOk },
    captions: { count: captionItems.length, style_pass: captionStyleOk, source_pass: captionSourceOk, text_pass: captionTextOk, timing_pass: captionTimingOk, pass: captionsOk },
    sound_design: { music_profile: audioMetadata.music_profile, music_asset: audioMetadata.music_asset, procedural_noise_generation: audioMetadata.procedural_noise_generation, sfx_types: (audioMetadata.sfx_assets || []).length, assets_exist: audioAssetsOk, pass: soundDesignOk && audioAssetsOk },
    pass,
  };

  await writeJsonAtomic(reportPath, report);
  if (!pass) {
    throw new Error(`ORVYQ media QA failed: black=${nonTerminalBlack.length}, silence=${meaningfulSilence.length}, LUFS=${integratedLufs}, speech=${speechOk}, opening=${openingSpeechOk}, captions=${captionsOk}, sound=${soundDesignOk && audioAssetsOk}`);
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
    const dir = projectDir(projectId);
    const report = args.report || path.join(dir, "qa", "orvyq_media_qa.json");
    const captionsPath = args.captions || path.join(dir, "remotion", "captions.json");
    const audioMetadataPath = args["audio-metadata"] || path.join(dir, "assets", "audio", "final_mix.metadata.json");
    runMediaQa({ projectId, video, reportPath: report, captionsPath, audioMetadataPath }).then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
  }
}
