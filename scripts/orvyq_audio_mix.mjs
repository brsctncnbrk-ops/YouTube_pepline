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
    return await exec(binary, args, { maxBuffer: 24 * 1024 * 1024 });
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

function sectionEnvelope(duration, levels) {
  const stops = [0.08, 0.24, 0.42, 0.64, 0.82, 0.94].map((value) => (duration * value).toFixed(3));
  return `if(lt(t,${stops[0]}),${levels[0]},if(lt(t,${stops[1]}),${levels[1]},if(lt(t,${stops[2]}),${levels[2]},if(lt(t,${stops[3]}),${levels[3]},if(lt(t,${stops[4]}),${levels[4]},if(lt(t,${stops[5]}),${levels[5]},${levels[6]}))))))`;
}

function musicFilter(duration) {
  const droneEnv = sectionEnvelope(duration, [0.62, 0.82, 0.72, 0.95, 0.78, 0.58, 0.38]);
  const rhythmEnv = sectionEnvelope(duration, [0.08, 0.32, 0.68, 0.9, 0.55, 0.2, 0.05]);
  const motifEnv = sectionEnvelope(duration, [0.06, 0.38, 0.18, 0.42, 0.66, 0.24, 0.08]);
  return [
    `[0:a]volume='0.18*${droneEnv}':eval=frame,lowpass=f=175[drone]`,
    `[1:a]volume='0.105*${droneEnv}':eval=frame,lowpass=f=260[lowpad]`,
    `[2:a]volume='0.065*${motifEnv}':eval=frame,tremolo=f=0.19:d=0.55,lowpass=f=720[pad]`,
    `[3:a]volume='0.045*${motifEnv}':eval=frame,vibrato=f=4:d=0.045,lowpass=f=1050[motif]`,
    `[4:a]volume='0.085*${rhythmEnv}':eval=frame,tremolo=f=1.533:d=0.92,lowpass=f=330[rhythm]`,
    `[5:a]volume=0.018,highpass=f=180,lowpass=f=2800[air]`,
    `[drone][lowpad][pad][motif][rhythm][air]amix=inputs=6:normalize=0,acompressor=threshold=-18dB:ratio=2.2:attack=30:release=320,afade=t=in:st=0:d=4,afade=t=out:st=${Math.max(0, duration - 7)}:d=7,aformat=channel_layouts=stereo[music]`,
  ].join(";");
}

function mixFilter(duration, loudnorm = null) {
  const normalize = loudnorm
    ? `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:linear=true:print_format=summary`
    : "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json";
  return [
    `[0:a]atrim=duration=${duration},volume=0.82[music]`,
    "[1:a]aformat=channel_layouts=stereo[voice]",
    "[music][voice]sidechaincompress=threshold=0.025:ratio=7:attack=18:release=420[ducked]",
    `[voice][ducked]amix=inputs=2:normalize=0,${normalize}[mix]`,
  ].join(";");
}

async function generateSfx(sfxDir) {
  const specs = [
    ["orvyq-pulse.wav", ["-f", "lavfi", "-i", "sine=frequency=185:sample_rate=48000:duration=0.72", "-f", "lavfi", "-i", "sine=frequency=370:sample_rate=48000:duration=0.72", "-filter_complex", "[0:a]volume=0.42,lowpass=f=900[a];[1:a]volume=0.16,lowpass=f=1400[b];[a][b]amix=2:normalize=0,afade=t=in:st=0:d=0.025,afade=t=out:st=0.13:d=0.57", "-ac", "2"]],
    ["orvyq-impact.wav", ["-f", "lavfi", "-i", "sine=frequency=62:sample_rate=48000:duration=1.15", "-f", "lavfi", "-i", "anoisesrc=color=brown:sample_rate=48000:duration=1.15", "-filter_complex", "[0:a]volume=0.62,lowpass=f=220[a];[1:a]volume=0.18,lowpass=f=1200[b];[a][b]amix=2:normalize=0,afade=t=out:st=0.08:d=1.02", "-ac", "2"]],
    ["orvyq-whoosh.wav", ["-f", "lavfi", "-i", "anoisesrc=color=white:sample_rate=48000:duration=1.1", "-af", "highpass=f=420,lowpass=f=6200,volume=0.22,afade=t=in:st=0:d=0.38,afade=t=out:st=0.66:d=0.42", "-ac", "2"]],
    ["orvyq-riser.wav", ["-f", "lavfi", "-i", "anoisesrc=color=pink:sample_rate=48000:duration=1.8", "-af", "highpass=f=380,lowpass=f=5200,volume='0.035+0.16*t/1.8':eval=frame,afade=t=in:st=0:d=0.18,afade=t=out:st=1.58:d=0.22", "-ac", "2"]],
    ["orvyq-glitch.wav", ["-f", "lavfi", "-i", "anoisesrc=color=white:sample_rate=48000:duration=0.48", "-af", "bandpass=f=2100:w=1100,tremolo=f=19:d=0.96,volume=0.2,afade=t=out:st=0.22:d=0.25", "-ac", "2"]],
    ["orvyq-tick.wav", ["-f", "lavfi", "-i", "sine=frequency=1120:sample_rate=48000:duration=0.18", "-af", "volume=0.36,highpass=f=700,afade=t=out:st=0.035:d=0.14", "-ac", "2"]],
    ["orvyq-low-boom.wav", ["-f", "lavfi", "-i", "sine=frequency=42:sample_rate=48000:duration=1.65", "-f", "lavfi", "-i", "anoisesrc=color=brown:sample_rate=48000:duration=1.65", "-filter_complex", "[0:a]volume=0.72,lowpass=f=150[a];[1:a]volume=0.1,lowpass=f=500[b];[a][b]amix=2:normalize=0,afade=t=out:st=0.12:d=1.5", "-ac", "2"]],
  ];
  for (const [name, args] of specs) {
    await command("ffmpeg", ["-hide_banner", "-nostats", "-y", ...args, "-c:a", "pcm_s16le", path.join(sfxDir, name)]);
  }
  return specs.map(([name]) => `assets/sfx/${name}`);
}

export async function buildOrvyqAudioMix(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const audioDir = path.join(dir, "assets", "audio");
  const musicDir = path.join(dir, "assets", "music");
  const sfxDir = path.join(dir, "assets", "sfx");
  await Promise.all([fs.mkdir(musicDir, { recursive: true }), fs.mkdir(sfxDir, { recursive: true })]);

  const voice = path.join(audioDir, "final_voice.mp3");
  const music = path.join(musicDir, "orvyq_cinematic_score.mp3");
  const mix = path.join(audioDir, "final_mix.mp3");
  const duration = await durationSeconds(voice);
  const cueAssets = await generateSfx(sfxDir);

  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-f", "lavfi", "-i", `sine=frequency=55:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `sine=frequency=82.41:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `sine=frequency=110:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `sine=frequency=164.81:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `sine=frequency=49:sample_rate=48000:duration=${duration}`,
    "-f", "lavfi", "-i", `anoisesrc=color=pink:sample_rate=48000:duration=${duration}`,
    "-filter_complex", musicFilter(duration), "-map", "[music]", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", music,
  ]);

  const firstPass = await command("ffmpeg", ["-hide_banner", "-nostats", "-i", music, "-i", voice, "-filter_complex", mixFilter(duration), "-map", "[mix]", "-t", String(duration), "-f", "null", "-"]);
  const analysis = extractLoudnorm(`${firstPass.stdout}\n${firstPass.stderr}`);
  await command("ffmpeg", ["-hide_banner", "-nostats", "-y", "-i", music, "-i", voice, "-filter_complex", mixFilter(duration, analysis), "-map", "[mix]", "-t", String(duration), "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", mix]);

  const verification = await command("ffmpeg", ["-hide_banner", "-nostats", "-i", mix, "-filter:a", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]);
  const measured = extractLoudnorm(`${verification.stdout}\n${verification.stderr}`);
  await writeJsonAtomic(path.join(audioDir, "final_mix.metadata.json"), {
    generated_by: "scripts/orvyq_audio_mix.mjs",
    voice_source: "assets/audio/final_voice.mp3",
    mix_asset: "assets/audio/final_mix.mp3",
    music_asset: "assets/music/orvyq_cinematic_score.mp3",
    music_profile: "dynamic_cinematic_original",
    music_sections: 7,
    sfx_assets: cueAssets,
    duration_seconds: duration,
    target: { integrated_lufs: -14, true_peak_dbtp: -1.5 },
    measured: { integrated_lufs: Number(measured.input_i), true_peak_dbtp: Number(measured.input_tp), loudness_range: Number(measured.input_lra) },
    licensing: "Original procedural ORVYQ score and sound design generated locally; no third-party music used.",
  });
  return { duration, measured, cue_count: cueAssets.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
