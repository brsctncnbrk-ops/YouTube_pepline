#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

async function command(binary, args) {
  try {
    return await exec(binary, args, { maxBuffer: 32 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${binary} failed: ${error.stderr || error.message}`);
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function extractLoudnorm(text) {
  const candidates = [...text.matchAll(/\{\s*"input_i"[\s\S]*?\n\}/g)].map((match) => match[0]);
  if (!candidates.length) throw new Error("FFmpeg loudnorm analysis did not return JSON");
  return JSON.parse(candidates.at(-1));
}

async function durationSeconds(file) {
  const { stdout } = await command("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Could not determine duration for ${file}`);
  return duration;
}

function normalizeFilter(loudnorm = null) {
  return loudnorm
    ? `loudnorm=I=-16:TP=-1.5:LRA=9:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:linear=true:print_format=summary`
    : "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json";
}

function voiceOnlyFilter(loudnorm = null) {
  return `[0:a]highpass=f=70,lowpass=f=15500,acompressor=threshold=-20dB:ratio=2.4:attack=15:release=180,${normalizeFilter(loudnorm)},aformat=channel_layouts=stereo[mix]`;
}

function voiceAndMusicFilter(duration, loudnorm = null) {
  return [
    `[0:a]atrim=duration=${duration},highpass=f=70,lowpass=f=15500,acompressor=threshold=-20dB:ratio=2.4:attack=15:release=180,asplit=2[voice_sc][voice_mix]`,
    `[1:a]atrim=duration=${duration},volume=0.10,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, duration - 4)}:d=4[music]`,
    "[music][voice_sc]sidechaincompress=threshold=0.018:ratio=10:attack=10:release=500[ducked]",
    `[voice_mix][ducked]amix=inputs=2:normalize=0,${normalizeFilter(loudnorm)},aformat=channel_layouts=stereo[mix]`,
  ].join(";");
}

export async function buildOrvyqAudioMix(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const audioDir = path.join(dir, "assets", "audio");
  const musicDir = path.join(dir, "assets", "music");
  await Promise.all([fs.mkdir(audioDir, { recursive: true }), fs.mkdir(musicDir, { recursive: true })]);

  const voice = path.join(audioDir, "final_voice.mp3");
  const approvedMusic = path.join(musicDir, "approved_bed.mp3");
  const mix = path.join(audioDir, "final_mix.mp3");

  if (!(await exists(voice))) throw new Error("Missing required narrator file: assets/audio/final_voice.mp3");
  const duration = await durationSeconds(voice);
  const hasApprovedMusic = await exists(approvedMusic);
  const inputs = hasApprovedMusic ? ["-i", voice, "-stream_loop", "-1", "-i", approvedMusic] : ["-i", voice];
  const firstFilter = hasApprovedMusic ? voiceAndMusicFilter(duration) : voiceOnlyFilter();

  const firstPass = await command("ffmpeg", [
    "-hide_banner", "-nostats", ...inputs,
    "-filter_complex", firstFilter,
    "-map", "[mix]", "-t", String(duration), "-f", "null", "-",
  ]);
  const analysis = extractLoudnorm(`${firstPass.stdout}\n${firstPass.stderr}`);
  const secondFilter = hasApprovedMusic ? voiceAndMusicFilter(duration, analysis) : voiceOnlyFilter(analysis);

  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", ...inputs,
    "-filter_complex", secondFilter,
    "-map", "[mix]", "-t", String(duration),
    "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", mix,
  ]);

  const verification = await command("ffmpeg", [
    "-hide_banner", "-nostats", "-i", mix,
    "-filter:a", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json",
    "-f", "null", "-",
  ]);
  const measured = extractLoudnorm(`${verification.stdout}\n${verification.stderr}`);

  await writeJsonAtomic(path.join(audioDir, "final_mix.metadata.json"), {
    generated_by: "scripts/orvyq_audio_mix.mjs",
    voice_source: "assets/audio/final_voice.mp3",
    mix_asset: "assets/audio/final_mix.mp3",
    music_asset: hasApprovedMusic ? "assets/music/approved_bed.mp3" : null,
    music_profile: hasApprovedMusic ? "approved_licensed_bed" : "voice_only_safe_fallback",
    procedural_noise_generation: false,
    sfx_assets: [],
    duration_seconds: duration,
    target: { integrated_lufs: -16, true_peak_dbtp: -1.5 },
    measured: {
      integrated_lufs: Number(measured.input_i),
      true_peak_dbtp: Number(measured.input_tp),
      loudness_range: Number(measured.input_lra),
    },
    licensing: hasApprovedMusic
      ? "Narration plus user-approved licensed music bed."
      : "Narration only. No generated noise, synthetic drone, or third-party music was added.",
  });

  return { duration, measured, music_profile: hasApprovedMusic ? "approved_licensed_bed" : "voice_only_safe_fallback" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
