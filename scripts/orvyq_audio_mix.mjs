#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const PREVIEW_SCORE_SECONDS = 120;
const CROSSFADE_SECONDS = 1.5;
const MUSIC_SECTIONS = [
  { id: "controlled_tension", start: 0, end: 35, purpose: "Opening paradox and competitive pressure" },
  { id: "analytical_unease", start: 35, end: 78, purpose: "Public reports and controlled evaluation setup" },
  { id: "engineered_pressure", start: 78, end: 104, purpose: "Replacement threat and harmful-action result" },
  { id: "reflective_release", start: 104, end: 120, purpose: "Test-versus-incident limitation and clean outro" },
];

async function command(binary, args) {
  try { return await exec(binary, args, { maxBuffer: 48 * 1024 * 1024 }); }
  catch (error) { throw new Error(`${binary} failed: ${error.stderr || error.message}`); }
}
async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
async function readOptionalJson(file) { if (!(await exists(file))) return null; return JSON.parse(await fs.readFile(file, "utf8")); }
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
  return loudnorm ? `loudnorm=I=-16:TP=-1.5:LRA=9:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:linear=true:print_format=summary` : "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json";
}
function voiceAndMusicFilter(narrationDuration, outputDuration, loudnorm = null) {
  const musicFadeOut = Math.max(0, outputDuration - 4);
  return [
    `[0:a]atrim=duration=${narrationDuration},apad=pad_dur=${Math.max(0, outputDuration - narrationDuration)},atrim=duration=${outputDuration},highpass=f=70,lowpass=f=15500,acompressor=threshold=-20dB:ratio=2.4:attack=15:release=180,asplit=2[voice_sc][voice_mix]`,
    `[1:a]atrim=duration=${outputDuration},volume=0.19,afade=t=in:st=0:d=2.2,afade=t=out:st=${musicFadeOut}:d=4[music]`,
    "[music][voice_sc]sidechaincompress=threshold=0.015:ratio=9:attack=12:release=620[ducked]",
    `[voice_mix][ducked]amix=inputs=2:normalize=0,${normalizeFilter(loudnorm)},aformat=channel_layouts=stereo[mix]`,
  ].join(";");
}
function sectionInputDurations() {
  return [
    MUSIC_SECTIONS[0].end - MUSIC_SECTIONS[0].start + CROSSFADE_SECONDS,
    MUSIC_SECTIONS[1].end - MUSIC_SECTIONS[1].start + CROSSFADE_SECONDS,
    MUSIC_SECTIONS[2].end - MUSIC_SECTIONS[2].start + CROSSFADE_SECONDS,
    MUSIC_SECTIONS[3].end - MUSIC_SECTIONS[3].start,
  ];
}

async function generateOriginalSectionedScore(musicDir) {
  const output = path.join(musicDir, "orvyq_original_tonal_bed.mp3");
  const durations = sectionInputDurations();
  const sections = [
    { frequencies: [55, 73.42, 82.41, 110], volumes: [0.19, 0.12, 0.075, 0.04], tremolo: [0.12, 0.16, 0.21, 0.27], depth: 0.16, lowpass: 1250, echo: "640|1280:0.12|0.06", gain: 0.86 },
    { frequencies: [58.27, 87.31, 116.54, 174.61], volumes: [0.16, 0.105, 0.065, 0.035], tremolo: [0.18, 0.23, 0.31, 0.38], depth: 0.2, lowpass: 1850, echo: "430|860:0.13|0.07", gain: 0.82 },
    { frequencies: [49, 73.42, 98, 146.83], volumes: [0.21, 0.13, 0.075, 0.035], tremolo: [1.5, 0.75, 0.38, 0.24], depth: 0.32, lowpass: 1500, echo: "360|720:0.11|0.055", gain: 0.93 },
    { frequencies: [65.41, 82.41, 110, 164.81], volumes: [0.13, 0.09, 0.055, 0.032], tremolo: [0.1, 0.13, 0.17, 0.21], depth: 0.12, lowpass: 2100, echo: "720|1440:0.14|0.065", gain: 0.72 },
  ];
  const inputs = [];
  const filters = [];
  let inputIndex = 0;
  sections.forEach((section, sectionIndex) => {
    const labels = [];
    section.frequencies.forEach((frequency, toneIndex) => {
      inputs.push("-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${durations[sectionIndex]}`);
      const label = `s${sectionIndex}t${toneIndex}`;
      filters.push(`[${inputIndex}:a]volume=${section.volumes[toneIndex]},tremolo=f=${Math.max(0.1, section.tremolo[toneIndex])}:d=${section.depth}[${label}]`);
      labels.push(`[${label}]`);
      inputIndex += 1;
    });
    filters.push(`${labels.join("")}amix=inputs=4:normalize=0,highpass=f=32,lowpass=f=${section.lowpass},aecho=0.75:0.5:${section.echo},volume=${section.gain},aformat=channel_layouts=stereo[section${sectionIndex}]`);
  });
  filters.push(`[section0][section1]acrossfade=d=${CROSSFADE_SECONDS}:c1=tri:c2=tri[x01]`);
  filters.push(`[x01][section2]acrossfade=d=${CROSSFADE_SECONDS}:c1=tri:c2=tri[x012]`);
  filters.push(`[x012][section3]acrossfade=d=${CROSSFADE_SECONDS}:c1=tri:c2=tri,afade=t=in:st=0:d=2,afade=t=out:st=116:d=4,alimiter=limit=0.82[bed]`);
  await command("ffmpeg", ["-hide_banner", "-nostats", "-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[bed]", "-t", String(PREVIEW_SCORE_SECONDS), "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", output]);
  return output;
}

async function prepareNarrator({ dir, audioDir, sourceVoice, sourceDuration }) {
  const repairPath = path.join(dir, "voice", "audio_repair.json");
  const repair = await readOptionalJson(repairPath);
  if (!repair) return { voice: sourceVoice, repair: null };
  if (repair.operation !== "rotate") throw new Error(`Unsupported narrator repair operation: ${repair.operation}`);
  const rotateAt = Number(repair.rotate_at_seconds);
  if (!Number.isFinite(rotateAt) || rotateAt <= 0 || rotateAt >= sourceDuration) throw new Error(`Invalid narrator rotate_at_seconds: ${repair.rotate_at_seconds}`);
  const reorderedVoice = path.join(audioDir, "final_voice.reordered.wav");
  const filter = [`[0:a]atrim=start=${rotateAt},asetpts=PTS-STARTPTS[first]`, `[0:a]atrim=end=${rotateAt},asetpts=PTS-STARTPTS[second]`, "[first][second]concat=n=2:v=0:a=1[out]"].join(";");
  await command("ffmpeg", ["-hide_banner", "-nostats", "-y", "-i", sourceVoice, "-filter_complex", filter, "-map", "[out]", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", reorderedVoice]);
  return { voice: reorderedVoice, repair: { operation: "rotate", rotate_at_seconds: rotateAt, config: "voice/audio_repair.json", reason: repair.reason || null } };
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
  const narrationDuration = Number.isFinite(requestedNarration) && requestedNarration > 0 ? Math.min(outputDuration, requestedNarration) : outputDuration;
  const hasApprovedMusic = await exists(approvedMusic);
  if (!hasApprovedMusic && outputDuration > PREVIEW_SCORE_SECONDS + 0.1) throw new Error("Full ORVYQ render requires an approved full-duration music bed or an explicit full cue sheet; repeating the two-minute proof score is forbidden");
  const music = hasApprovedMusic ? approvedMusic : await generateOriginalSectionedScore(musicDir);
  const inputs = ["-i", prepared.voice, ...(hasApprovedMusic ? ["-stream_loop", "-1"] : []), "-i", music];
  const firstPass = await command("ffmpeg", ["-hide_banner", "-nostats", ...inputs, "-filter_complex", voiceAndMusicFilter(narrationDuration, outputDuration), "-map", "[mix]", "-t", String(outputDuration), "-f", "null", "-"]);
  const analysis = extractLoudnorm(`${firstPass.stdout}\n${firstPass.stderr}`);
  await command("ffmpeg", ["-hide_banner", "-nostats", "-y", ...inputs, "-filter_complex", voiceAndMusicFilter(narrationDuration, outputDuration, analysis), "-map", "[mix]", "-t", String(outputDuration), "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", mix]);
  const verification = await command("ffmpeg", ["-hide_banner", "-nostats", "-i", mix, "-filter:a", "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"]);
  const measured = extractLoudnorm(`${verification.stdout}\n${verification.stderr}`);
  const musicRelative = hasApprovedMusic ? "assets/music/approved_bed.mp3" : "assets/music/orvyq_original_tonal_bed.mp3";
  const musicProfile = hasApprovedMusic ? "approved_licensed_bed" : "original_tonal_score";
  await writeJsonAtomic(path.join(audioDir, "final_mix.metadata.json"), {
    generated_by: "scripts/orvyq_audio_mix.mjs", voice_source: "assets/audio/final_voice.mp3", processed_voice_source: prepared.repair ? "assets/audio/final_voice.reordered.wav" : "assets/audio/final_voice.mp3", voice_repair: prepared.repair, mix_asset: "assets/audio/final_mix.mp3", music_asset: musicRelative, music_profile: musicProfile, music_origin: hasApprovedMusic ? "user-approved licensed asset" : "original sectioned ORVYQ score generated from harmonic oscillators only", music_sections: hasApprovedMusic ? [{ id: "approved_full_bed", start: 0, end: outputDuration, purpose: "User-approved full mix" }] : MUSIC_SECTIONS, procedural_noise_generation: false, sfx_assets: [], source_duration_seconds: sourceDuration, narration_duration_seconds: narrationDuration, duration_seconds: outputDuration, preview_limited: outputDuration < sourceDuration, target: { integrated_lufs: -16, true_peak_dbtp: -1.5 }, measured: { integrated_lufs: Number(measured.input_i), true_peak_dbtp: Number(measured.input_tp), loudness_range: Number(measured.input_lra) }, licensing: hasApprovedMusic ? "Narration plus user-approved licensed music bed." : "Narration plus an original four-movement ORVYQ score generated locally without noise sources or third-party audio."
  });
  return { outputDuration, narrationDuration, sourceDuration, repair: prepared.repair, measured, music_profile: musicProfile, music_sections: hasApprovedMusic ? 1 : MUSIC_SECTIONS.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
}
