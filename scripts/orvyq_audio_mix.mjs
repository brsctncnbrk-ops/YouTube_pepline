#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const TONAL_LOOP_SECONDS = 120;

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

async function readOptionalJson(file) {
  if (!(await exists(file))) return null;
  return JSON.parse(await fs.readFile(file, "utf8"));
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

function voiceAndMusicFilter(narrationDuration, outputDuration, loudnorm = null) {
  const musicFadeOut = Math.max(0, outputDuration - 4);
  return [
    `[0:a]atrim=duration=${narrationDuration},apad=pad_dur=${Math.max(0, outputDuration - narrationDuration)},atrim=duration=${outputDuration},highpass=f=70,lowpass=f=15500,acompressor=threshold=-20dB:ratio=2.4:attack=15:release=180,asplit=2[voice_sc][voice_mix]`,
    `[1:a]atrim=duration=${outputDuration},volume=0.17,afade=t=in:st=0:d=2.5,afade=t=out:st=${musicFadeOut}:d=4[music]`,
    "[music][voice_sc]sidechaincompress=threshold=0.015:ratio=9:attack=12:release=650[ducked]",
    `[voice_mix][ducked]amix=inputs=2:normalize=0,${normalizeFilter(loudnorm)},aformat=channel_layouts=stereo[mix]`,
  ].join(";");
}

async function generateOriginalTonalBed(musicDir) {
  const output = path.join(musicDir, "orvyq_original_tonal_bed.mp3");
  const crossfadeSeconds = 1.5;
  const chordDuration = (TONAL_LOOP_SECONDS + crossfadeSeconds * 3) / 4;
  const chords = [
    [73.42, 87.31, 110.0, 146.83],
    [58.27, 73.42, 87.31, 116.54],
    [87.31, 110.0, 130.81, 174.61],
    [65.41, 82.41, 98.0, 130.81],
  ];
  const toneVolumes = [0.18, 0.12, 0.08, 0.045];
  const tremoloRates = [0.10, 0.13, 0.17, 0.21];
  const inputs = [];
  const filters = [];
  let inputIndex = 0;

  chords.forEach((frequencies, chordIndex) => {
    const toneLabels = [];
    frequencies.forEach((frequency, toneIndex) => {
      inputs.push("-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${chordDuration}`);
      const label = `c${chordIndex}t${toneIndex}`;
      filters.push(`[${inputIndex}:a]volume=${toneVolumes[toneIndex]},tremolo=f=${tremoloRates[toneIndex]}:d=0.16[${label}]`);
      toneLabels.push(`[${label}]`);
      inputIndex += 1;
    });
    filters.push(
      `${toneLabels.join("")}amix=inputs=4:normalize=0,highpass=f=35,lowpass=f=1500,` +
      `aecho=0.75:0.55:480|960:0.15|0.08,aformat=channel_layouts=stereo[chord${chordIndex}]`,
    );
  });
  filters.push(`[chord0][chord1]acrossfade=d=${crossfadeSeconds}:c1=tri:c2=tri[x01]`);
  filters.push(`[x01][chord2]acrossfade=d=${crossfadeSeconds}:c1=tri:c2=tri[x012]`);
  filters.push(`[x012][chord3]acrossfade=d=${crossfadeSeconds}:c1=tri:c2=tri,afade=t=in:st=0:d=2,afade=t=out:st=${TONAL_LOOP_SECONDS - 2}:d=2,alimiter=limit=0.82[bed]`);

  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[bed]", "-t", String(TONAL_LOOP_SECONDS),
    "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", output,
  ]);
  return output;
}

async function prepareNarrator({ dir, audioDir, sourceVoice, sourceDuration }) {
  const repairPath = path.join(dir, "voice", "audio_repair.json");
  const repair = await readOptionalJson(repairPath);
  if (!repair) return { voice: sourceVoice, repair: null };
  if (repair.operation !== "rotate") throw new Error(`Unsupported narrator repair operation: ${repair.operation}`);

  const rotateAt = Number(repair.rotate_at_seconds);
  if (!Number.isFinite(rotateAt) || rotateAt <= 0 || rotateAt >= sourceDuration) {
    throw new Error(`Invalid narrator rotate_at_seconds: ${repair.rotate_at_seconds}`);
  }

  const reorderedVoice = path.join(audioDir, "final_voice.reordered.wav");
  const filter = [
    `[0:a]atrim=start=${rotateAt},asetpts=PTS-STARTPTS[first]`,
    `[0:a]atrim=end=${rotateAt},asetpts=PTS-STARTPTS[second]`,
    "[first][second]concat=n=2:v=0:a=1[out]",
  ].join(";");
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", "-i", sourceVoice,
    "-filter_complex", filter, "-map", "[out]",
    "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", reorderedVoice,
  ]);
  return {
    voice: reorderedVoice,
    repair: {
      operation: "rotate",
      rotate_at_seconds: rotateAt,
      config: "voice/audio_repair.json",
      reason: repair.reason || null,
    },
  };
}

export async function buildOrvyqAudioMix(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const audioDir = path.join(dir, "assets", "audio");
  const musicDir = path.join(dir, "assets", "music");
  await Promise.all([fs.mkdir(audioDir, { recursive: true }), fs.mkdir(musicDir, { recursive: true })]);

  const sourceVoice = path.join(audioDir, "final_voice.mp3");
  const approvedMusic = path.join(musicDir, "approved_bed.mp3");
  const mix = path.join(audioDir, "final_mix.mp3");

  if (!(await exists(sourceVoice))) throw new Error("Missing required narrator file: assets/audio/final_voice.mp3");
  const sourceDuration = await durationSeconds(sourceVoice);
  const prepared = await prepareNarrator({ dir, audioDir, sourceVoice, sourceDuration });

  const requestedOutput = Number.parseFloat(process.env.ORVYQ_AUDIO_LIMIT_SECONDS || "0");
  const outputDuration = Number.isFinite(requestedOutput) && requestedOutput > 0 ? Math.min(sourceDuration, requestedOutput) : sourceDuration;
  const requestedNarration = Number.parseFloat(process.env.ORVYQ_NARRATION_LIMIT_SECONDS || "0");
  const narrationDuration = Number.isFinite(requestedNarration) && requestedNarration > 0
    ? Math.min(outputDuration, requestedNarration)
    : outputDuration;

  const hasApprovedMusic = await exists(approvedMusic);
  const music = hasApprovedMusic ? approvedMusic : await generateOriginalTonalBed(musicDir);
  const inputs = ["-i", prepared.voice, "-stream_loop", "-1", "-i", music];

  const firstPass = await command("ffmpeg", [
    "-hide_banner", "-nostats", ...inputs,
    "-filter_complex", voiceAndMusicFilter(narrationDuration, outputDuration),
    "-map", "[mix]", "-t", String(outputDuration), "-f", "null", "-",
  ]);
  const analysis = extractLoudnorm(`${firstPass.stdout}\n${firstPass.stderr}`);

  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", ...inputs,
    "-filter_complex", voiceAndMusicFilter(narrationDuration, outputDuration, analysis),
    "-map", "[mix]", "-t", String(outputDuration),
    "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", mix,
  ]);

  const verification = await command("ffmpeg", [
    "-hide_banner", "-nostats", "-i", mix,
    "-filter:a", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json",
    "-f", "null", "-",
  ]);
  const measured = extractLoudnorm(`${verification.stdout}\n${verification.stderr}`);

  const musicRelative = hasApprovedMusic
    ? "assets/music/approved_bed.mp3"
    : "assets/music/orvyq_original_tonal_bed.mp3";
  const musicProfile = hasApprovedMusic ? "approved_licensed_bed" : "original_tonal_score";

  await writeJsonAtomic(path.join(audioDir, "final_mix.metadata.json"), {
    generated_by: "scripts/orvyq_audio_mix.mjs",
    voice_source: "assets/audio/final_voice.mp3",
    processed_voice_source: prepared.repair ? "assets/audio/final_voice.reordered.wav" : "assets/audio/final_voice.mp3",
    voice_repair: prepared.repair,
    mix_asset: "assets/audio/final_mix.mp3",
    music_asset: musicRelative,
    music_profile: musicProfile,
    music_origin: hasApprovedMusic ? "user-approved licensed asset" : "original ORVYQ tonal score generated from harmonic oscillators only",
    procedural_noise_generation: false,
    sfx_assets: [],
    source_duration_seconds: sourceDuration,
    narration_duration_seconds: narrationDuration,
    duration_seconds: outputDuration,
    preview_limited: outputDuration < sourceDuration,
    target: { integrated_lufs: -16, true_peak_dbtp: -1.5 },
    measured: {
      integrated_lufs: Number(measured.input_i),
      true_peak_dbtp: Number(measured.input_tp),
      loudness_range: Number(measured.input_lra),
    },
    licensing: hasApprovedMusic
      ? "Narration plus user-approved licensed music bed."
      : "Narration plus an original ORVYQ tonal score generated locally without noise sources or third-party audio.",
  });

  return { outputDuration, narrationDuration, sourceDuration, repair: prepared.repair, measured, music_profile: musicProfile };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
