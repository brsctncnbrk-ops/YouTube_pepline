#!/usr/bin/env node
/**
 * Builds a copyright-safe ORVYQ ambience bed and a normalized final mix while
 * preserving the recorded final_voice.mp3 untouched. The generated mix is the
 * only audio file rendered into the video.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

async function command(binary, args) {
  try {
    return await exec(binary, args, { maxBuffer: 12 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${binary} failed: ${error.stderr || error.message}`);
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

function bedFilter(duration) {
  const fadeStart = Math.max(0, duration - 6);
  return [
    "[0:a]volume=0.16[a]",
    "[1:a]volume=0.075[b]",
    "[2:a]volume=0.035[c]",
    "[a][b][c]amix=inputs=3:normalize=0,lowpass=f=420,highpass=f=38,aformat=channel_layouts=stereo",
    `afade=t=in:st=0:d=6,afade=t=out:st=${fadeStart}:d=6`,
  ].join(",");
}

function mixFilter(duration, loudnorm = null) {
  const fadeStart = Math.max(0, duration - 5);
  const normalize = loudnorm
    ? `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:linear=true:print_format=summary`
    : "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json";
  return [
    `[0:a]atrim=duration=${duration},afade=t=in:st=0:d=3,afade=t=out:st=${fadeStart}:d=5,volume=0.9[bed]`,
    "[1:a]aformat=channel_layouts=stereo[voice]",
    `[voice][bed]amix=inputs=2:normalize=0,${normalize}[mix]`,
  ].join(";");
}

export async function buildOrvyqAudioMix(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const audioDir = path.join(dir, "assets", "audio");
  const musicDir = path.join(dir, "assets", "music");
  const sfxDir = path.join(dir, "assets", "sfx");
  await Promise.all([fs.mkdir(musicDir, { recursive: true }), fs.mkdir(sfxDir, { recursive: true })]);

  const voice = path.join(audioDir, "final_voice.mp3");
  const bed = path.join(musicDir, "orvyq_ambient_bed.mp3");
  const pulse = path.join(sfxDir, "orvyq-pulse.wav");
  const mix = path.join(audioDir, "final_mix.mp3");
  const duration = await durationSeconds(voice);

  // Original synthesized ambience: low sine partials, no third-party music.
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-f", "lavfi", "-i", "sine=frequency=55:sample_rate=48000:duration=90",
    "-f", "lavfi", "-i", "sine=frequency=82.41:sample_rate=48000:duration=90",
    "-f", "lavfi", "-i", "sine=frequency=110:sample_rate=48000:duration=90",
    "-filter_complex", bedFilter(90),
    "-ac", "2", "-c:a", "libmp3lame", "-b:a", "160k", bed,
  ]);

  // A restrained original transition cue for native ORVYQ graphics.
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-f", "lavfi", "-i", "sine=frequency=185:sample_rate=48000:duration=0.7",
    "-af", "aformat=channel_layouts=stereo,volume=0.11,lowpass=f=800,afade=t=in:st=0:d=0.04,afade=t=out:st=0.12:d=0.58",
    "-ac", "2", "-c:a", "pcm_s16le", pulse,
  ]);

  const firstPass = await command("ffmpeg", [
    "-hide_banner", "-nostats", "-stream_loop", "-1", "-i", bed, "-i", voice,
    "-filter_complex", mixFilter(duration), "-map", "[mix]", "-t", String(duration), "-f", "null", "-",
  ]);
  const analysis = extractLoudnorm(`${firstPass.stdout}\n${firstPass.stderr}`);

  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", "-stream_loop", "-1", "-i", bed, "-i", voice,
    "-filter_complex", mixFilter(duration, analysis), "-map", "[mix]", "-t", String(duration),
    "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", mix,
  ]);

  const verification = await command("ffmpeg", [
    "-hide_banner", "-nostats", "-i", mix,
    "-filter:a", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-",
  ]);
  const measured = extractLoudnorm(`${verification.stdout}\n${verification.stderr}`);
  await writeJsonAtomic(path.join(audioDir, "final_mix.metadata.json"), {
    generated_by: "scripts/orvyq_audio_mix.mjs",
    voice_source: "assets/audio/final_voice.mp3",
    mix_asset: "assets/audio/final_mix.mp3",
    music_asset: "assets/music/orvyq_ambient_bed.mp3",
    sfx_asset: "assets/sfx/orvyq-pulse.wav",
    duration_seconds: duration,
    target: { integrated_lufs: -14, true_peak_dbtp: -1.5 },
    measured: { integrated_lufs: Number(measured.input_i), true_peak_dbtp: Number(measured.input_tp), loudness_range: Number(measured.input_lra) },
    licensing: "Original procedural ORVYQ audio generated locally; no third-party music used.",
  });
  return { duration, measured };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
