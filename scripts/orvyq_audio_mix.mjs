#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const PROOF_SECONDS = 150;
const PROOF_MUSIC_SECTIONS = [
  { id: "controlled_tension", start: 0, end: 35, purpose: "Opening paradox and competitive pressure", energy_start: 0.3, energy_end: 0.48 },
  { id: "present_tense_turn", start: 35, end: 59.62, purpose: "Safety frameworks, governance lag, and the present-tense emphasis beat", energy_start: 0.42, energy_end: 0.62 },
  { id: "analytical_unease", start: 59.62, end: 93.4, purpose: "Controlled evaluation evidence and scenario mechanics", energy_start: 0.5, energy_end: 0.7 },
  { id: "engineered_pressure", start: 93.4, end: 126.56, purpose: "Replacement condition, deliberation, result, and limitation setup", energy_start: 0.64, energy_end: 0.84 },
  { id: "reflective_release", start: 126.56, end: 150, purpose: "Controlled-test limitation, recap, and clean branded release", energy_start: 0.58, energy_end: 0.2 },
];

async function command(binary, args) {
  try {
    return await exec(binary, args, { maxBuffer: 64 * 1024 * 1024 });
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
  const candidates = [...String(text).matchAll(/\{\s*"input_i"[\s\S]*?\n\}/g)].map((match) => match[0]);
  if (!candidates.length)
    throw new Error("FFmpeg loudnorm analysis did not return JSON");
  return JSON.parse(candidates.at(-1));
}
async function durationSeconds(file) {
  const { stdout } = await command("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=nk=1:nw=1", file,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error(`Could not determine duration for ${file}`);
  return duration;
}
async function measureLoudness(file, target = { i: -16, tp: -1.5, lra: 9 }) {
  const result = await command("ffmpeg", [
    "-hide_banner", "-nostats", "-i", file,
    "-filter:a", `loudnorm=I=${target.i}:TP=${target.tp}:LRA=${target.lra}:print_format=json`,
    "-f", "null", "-",
  ]);
  return extractLoudnorm(`${result.stdout}\n${result.stderr}`);
}
function normalizeFilter(loudnorm = null) {
  if (!loudnorm)
    return "loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json";
  return `loudnorm=I=-16:TP=-1.5:LRA=9:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:linear=true:print_format=summary`;
}

async function prepareNarrator({ dir, audioDir, sourceVoice, sourceDuration }) {
  const repairPath = path.join(dir, "voice", "audio_repair.json");
  const repair = await readOptionalJson(repairPath);
  if (!repair) return { voice: sourceVoice, repair: null };
  if (repair.operation !== "rotate")
    throw new Error(`Unsupported narrator repair operation: ${repair.operation}`);
  const rotateAt = Number(repair.rotate_at_seconds);
  if (!Number.isFinite(rotateAt) || rotateAt <= 0 || rotateAt >= sourceDuration)
    throw new Error(`Invalid narrator rotate_at_seconds: ${repair.rotate_at_seconds}`);
  const reorderedVoice = path.join(audioDir, "final_voice.reordered.wav");
  const filter = [
    `[0:a]atrim=start=${rotateAt},asetpts=PTS-STARTPTS[first]`,
    `[0:a]atrim=end=${rotateAt},asetpts=PTS-STARTPTS[second]`,
    "[first][second]concat=n=2:v=0:a=1[out]",
  ].join(";");
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", "-i", sourceVoice,
    "-filter_complex", filter, "-map", "[out]", "-ac", "2", "-ar", "48000",
    "-c:a", "pcm_s16le", reorderedVoice,
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

async function prepareEditorialNarration({ dir, audioDir, voice, availableDuration, requestedNarration }) {
  const sourceNarrationDuration = Number.isFinite(requestedNarration) && requestedNarration > 0
    ? Math.min(availableDuration, requestedNarration)
    : availableDuration;
  if (process.env.ORVYQ_EDITORIAL_PAUSES !== "1") {
    return {
      voice,
      sourceNarrationDuration,
      timelineNarrationDuration: sourceNarrationDuration,
      editorialPauseSeconds: 0,
      pauseWindows: [],
      pauseMap: null,
    };
  }

  const pauseMapPath = path.join(dir, "direction", "editorial_pause_map.json");
  const pauseMap = await readOptionalJson(pauseMapPath);
  const configuredPauses = pauseMap?.proof?.pauses || [];
  if (!configuredPauses.length)
    throw new Error("Editorial pause mode requires direction/editorial_pause_map.json proof pauses");
  const pauses = [...configuredPauses].sort(
    (a, b) => Number(a.source_time_seconds) - Number(b.source_time_seconds),
  );
  const filters = [];
  const labels = [];
  const pauseWindows = [];
  let sourceCursor = 0;
  let insertedSeconds = 0;

  pauses.forEach((pause, index) => {
    const sourceTime = Number(pause.source_time_seconds);
    const duration = Number(pause.duration_seconds);
    if (
      !Number.isFinite(sourceTime) || !Number.isFinite(duration) ||
      sourceTime <= sourceCursor || sourceTime >= sourceNarrationDuration || duration <= 0
    )
      throw new Error(`Invalid editorial pause ${pause.pause_id || index + 1}`);
    const voiceLabel = `voice_part_${index}`;
    const silenceLabel = `pause_part_${index}`;
    filters.push(
      `[0:a]atrim=start=${sourceCursor}:end=${sourceTime},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo[${voiceLabel}]`,
    );
    filters.push(
      `anullsrc=r=48000:cl=stereo,atrim=duration=${duration},asetpts=PTS-STARTPTS[${silenceLabel}]`,
    );
    labels.push(`[${voiceLabel}]`, `[${silenceLabel}]`);
    const outputStart = sourceTime + insertedSeconds;
    pauseWindows.push({
      pause_id: pause.pause_id,
      source_time_seconds: sourceTime,
      start: outputStart,
      end: outputStart + duration,
      duration,
      emphasis: pause.emphasis,
      sound_cue: pause.sound_cue,
    });
    sourceCursor = sourceTime;
    insertedSeconds += duration;
  });
  const finalLabel = "voice_part_final";
  filters.push(
    `[0:a]atrim=start=${sourceCursor}:end=${sourceNarrationDuration},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo[${finalLabel}]`,
  );
  labels.push(`[${finalLabel}]`);
  filters.push(`${labels.join("")}concat=n=${labels.length}:v=0:a=1[paused_voice]`);

  const timelineNarrationDuration = sourceNarrationDuration + insertedSeconds;
  const editorialVoice = path.join(audioDir, "final_voice.editorial.wav");
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", "-i", voice,
    "-filter_complex", filters.join(";"), "-map", "[paused_voice]",
    "-t", String(timelineNarrationDuration), "-ac", "2", "-ar", "48000",
    "-c:a", "pcm_s16le", editorialVoice,
  ]);
  return {
    voice: editorialVoice,
    sourceNarrationDuration,
    timelineNarrationDuration,
    editorialPauseSeconds: insertedSeconds,
    pauseWindows,
    pauseMap: "direction/editorial_pause_map.json",
  };
}

async function generateFallbackScore(musicDir, duration) {
  const output = path.join(musicDir, "orvyq_original_tonal_bed.mp3");
  const inputs = [55, 82.41, 110, 164.81].flatMap((frequency) => [
    "-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${duration}`,
  ]);
  const filter = [
    "[0:a]volume=0.24,tremolo=f=0.13:d=0.18[t0]",
    "[1:a]volume=0.14,tremolo=f=0.19:d=0.2[t1]",
    "[2:a]volume=0.08,tremolo=f=0.27:d=0.22[t2]",
    "[3:a]volume=0.045,tremolo=f=0.34:d=0.18[t3]",
    `[t0][t1][t2][t3]amix=inputs=4:normalize=0,highpass=f=32,lowpass=f=1900,aecho=0.72:0.42:520|1040:0.12|0.055,afade=t=in:st=0:d=2.2,afade=t=out:st=${Math.max(0, duration - 2)}:d=2,loudnorm=I=-24:TP=-3:LRA=11,aformat=channel_layouts=stereo[bed]`,
  ].join(";");
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", ...inputs,
    "-filter_complex", filter, "-map", "[bed]", "-t", String(duration),
    "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", output,
  ]);
  return output;
}

async function generateOriginalSfx(sfxDir) {
  await fs.mkdir(sfxDir, { recursive: true });
  const lowImpact = path.join(sfxDir, "orvyq_low_impact.wav");
  const tonalBloom = path.join(sfxDir, "orvyq_tonal_bloom.wav");
  const uiTick = path.join(sfxDir, "orvyq_ui_tick.wav");
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-f", "lavfi", "-i", "sine=frequency=62:sample_rate=48000:duration=0.7",
    "-f", "lavfi", "-i", "sine=frequency=124:sample_rate=48000:duration=0.7",
    "-filter_complex", "[0:a]volume='0.42*exp(-5*t)':eval=frame[a];[1:a]volume='0.13*exp(-7*t)':eval=frame[b];[a][b]amix=inputs=2:normalize=0,lowpass=f=720,afade=t=out:st=0.18:d=0.52,aformat=channel_layouts=stereo[out]",
    "-map", "[out]", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", lowImpact,
  ]);
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-f", "lavfi", "-i", "sine=frequency=164.81:sample_rate=48000:duration=1.5",
    "-f", "lavfi", "-i", "sine=frequency=246.94:sample_rate=48000:duration=1.5",
    "-filter_complex", "[0:a]volume=0.16[a];[1:a]volume=0.09[b];[a][b]amix=inputs=2:normalize=0,aecho=0.72:0.38:240|480:0.14|0.06,afade=t=in:st=0:d=0.18,afade=t=out:st=0.65:d=0.85,aformat=channel_layouts=stereo[out]",
    "-map", "[out]", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", tonalBloom,
  ]);
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=0.09",
    "-f", "lavfi", "-i", "sine=frequency=1320:sample_rate=48000:duration=0.09",
    "-filter_complex", "[0:a]volume=0.12[a];[1:a]volume=0.055[b];[a][b]amix=inputs=2:normalize=0,afade=t=out:st=0.025:d=0.065,aformat=channel_layouts=stereo[out]",
    "-map", "[out]", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", uiTick,
  ]);
  return { lowImpact, tonalBloom, uiTick };
}

function musicSectionsForDuration(duration) {
  if (Math.abs(duration - PROOF_SECONDS) < 0.01) return PROOF_MUSIC_SECTIONS;
  const boundaries = [0, 0.23, 0.4, 0.63, 0.84, 1].map((ratio) => ratio * duration);
  return PROOF_MUSIC_SECTIONS.map((section, index) => ({
    ...section,
    start: boundaries[index],
    end: boundaries[index + 1],
  }));
}

function musicVolumeExpression(pauseWindows) {
  let expression = "if(lt(t,35),0.72,if(lt(t,59.62),0.78,if(lt(t,93.4),0.82,if(lt(t,126.56),0.86,0.7))))";
  for (const pause of [...pauseWindows].reverse())
    expression = `if(between(t,${pause.start},${pause.end}),1.02,${expression})`;
  return expression;
}

function mixFilter({ timelineNarrationDuration, outputDuration, pauseWindows, loudnorm = null }) {
  const fadeOut = Math.max(0, outputDuration - 2);
  const musicArc = musicVolumeExpression(pauseWindows);
  return [
    `[0:a]atrim=duration=${timelineNarrationDuration},apad=pad_dur=${Math.max(0, outputDuration - timelineNarrationDuration)},atrim=duration=${outputDuration},highpass=f=70,lowpass=f=15500,acompressor=threshold=-20dB:ratio=2.2:attack=15:release=180,asplit=2[voice_sc][voice_mix]`,
    `[1:a]atrim=duration=${outputDuration},loudnorm=I=-23:TP=-3:LRA=11,volume='${musicArc}':eval=frame,afade=t=in:st=0:d=2.2,afade=t=out:st=${fadeOut}:d=2[music]`,
    "[music][voice_sc]sidechaincompress=threshold=0.028:ratio=4:attack=18:release=480[ducked]",
    "[2:a]asplit=2[impact_a][impact_b]",
    "[impact_a]adelay=23740|23740,volume=0.52[sfx_impact_a]",
    "[impact_b]adelay=93400|93400,volume=0.48[sfx_impact_b]",
    "[3:a]asplit=2[bloom_a][bloom_b]",
    "[bloom_a]adelay=52620|52620,volume=0.72[sfx_bloom_a]",
    "[bloom_b]adelay=126560|126560,volume=0.68[sfx_bloom_b]",
    "[4:a]adelay=11000|11000,volume=0.65[sfx_tick]",
    `[voice_mix][ducked][sfx_impact_a][sfx_impact_b][sfx_bloom_a][sfx_bloom_b][sfx_tick]amix=inputs=7:normalize=0,${normalizeFilter(loudnorm)},aformat=channel_layouts=stereo[mix]`,
  ].join(";");
}

export async function buildOrvyqAudioMix(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const audioDir = path.join(dir, "assets", "audio");
  const musicDir = path.join(dir, "assets", "music");
  const sfxDir = path.join(dir, "assets", "sfx");
  await Promise.all([
    fs.mkdir(audioDir, { recursive: true }),
    fs.mkdir(musicDir, { recursive: true }),
    fs.mkdir(sfxDir, { recursive: true }),
  ]);
  const sourceVoice = path.join(audioDir, "final_voice.mp3");
  const approvedMusic = path.join(musicDir, "approved_bed.mp3");
  const approvedMusicProvenancePath = path.join(musicDir, "approved_bed.provenance.json");
  const mix = path.join(audioDir, "final_mix.mp3");
  if (!(await exists(sourceVoice)))
    throw new Error("Missing required narrator file: assets/audio/final_voice.mp3");

  const sourceDuration = await durationSeconds(sourceVoice);
  const prepared = await prepareNarrator({ dir, audioDir, sourceVoice, sourceDuration });
  const availableDuration = await durationSeconds(prepared.voice);
  const requestedNarration = Number.parseFloat(process.env.ORVYQ_NARRATION_LIMIT_SECONDS || "0");
  const narration = await prepareEditorialNarration({
    dir,
    audioDir,
    voice: prepared.voice,
    availableDuration,
    requestedNarration,
  });
  const requestedOutput = Number.parseFloat(process.env.ORVYQ_AUDIO_LIMIT_SECONDS || "0");
  const outputDuration = Number.isFinite(requestedOutput) && requestedOutput > 0
    ? requestedOutput
    : narration.timelineNarrationDuration;
  if (outputDuration + 0.001 < narration.timelineNarrationDuration)
    throw new Error(
      `Output duration ${outputDuration}s is shorter than the paused narration timeline ${narration.timelineNarrationDuration}s`,
    );

  const hasApprovedMusic = await exists(approvedMusic);
  if (!hasApprovedMusic && process.env.ORVYQ_REQUIRE_APPROVED_MUSIC === "1")
    throw new Error("This proof requires assets/music/approved_bed.mp3");
  if (!hasApprovedMusic && outputDuration > PROOF_SECONDS + 0.1)
    throw new Error("Full ORVYQ render requires an approved full-duration music bed");
  const music = hasApprovedMusic
    ? approvedMusic
    : await generateFallbackScore(musicDir, outputDuration);
  const provenance = hasApprovedMusic
    ? await readOptionalJson(approvedMusicProvenancePath)
    : null;
  if (hasApprovedMusic && !provenance)
    throw new Error("Approved music requires approved_bed.provenance.json");

  const sfx = await generateOriginalSfx(sfxDir);
  const inputs = [
    "-i", narration.voice,
    "-stream_loop", "-1", "-i", music,
    "-i", sfx.lowImpact,
    "-i", sfx.tonalBloom,
    "-i", sfx.uiTick,
  ];
  const filterOptions = {
    timelineNarrationDuration: narration.timelineNarrationDuration,
    outputDuration,
    pauseWindows: narration.pauseWindows,
  };
  const firstPass = await command("ffmpeg", [
    "-hide_banner", "-nostats", ...inputs,
    "-filter_complex", mixFilter(filterOptions),
    "-map", "[mix]", "-t", String(outputDuration), "-f", "null", "-",
  ]);
  const analysis = extractLoudnorm(`${firstPass.stdout}\n${firstPass.stderr}`);
  await command("ffmpeg", [
    "-hide_banner", "-nostats", "-y", ...inputs,
    "-filter_complex", mixFilter({ ...filterOptions, loudnorm: analysis }),
    "-map", "[mix]", "-t", String(outputDuration), "-ac", "2", "-ar", "48000",
    "-c:a", "libmp3lame", "-b:a", "192k", mix,
  ]);
  const measured = await measureLoudness(mix);
  const musicMeasured = await measureLoudness(music, { i: -23, tp: -3, lra: 11 });
  const relative = (file) => path.relative(dir, file).split(path.sep).join("/");
  const musicRelative = relative(music);
  const musicProfile = hasApprovedMusic ? "approved_licensed_bed" : "original_tonal_score";
  const sfxAssets = [sfx.lowImpact, sfx.tonalBloom, sfx.uiTick].map(relative);
  const sfxPlacements = [
    { asset: relative(sfx.uiTick), start: 11, purpose: "First primary-evidence reveal" },
    { asset: relative(sfx.lowImpact), start: 23.74, purpose: "Competitive-incentive emphasis" },
    { asset: relative(sfx.tonalBloom), start: 52.62, purpose: "Present-tense emphasis" },
    { asset: relative(sfx.lowImpact), start: 93.4, purpose: "Replacement-condition emphasis" },
    { asset: relative(sfx.tonalBloom), start: 126.56, purpose: "Controlled-test limitation emphasis" },
  ];
  await writeJsonAtomic(path.join(audioDir, "final_mix.metadata.json"), {
    schema_version: "3.0-cinematic-proof",
    generated_by: "scripts/orvyq_audio_mix.mjs",
    voice_source: "assets/audio/final_voice.mp3",
    processed_voice_source: relative(narration.voice),
    voice_repair: prepared.repair,
    editorial_pause_map: narration.pauseMap,
    pause_windows: narration.pauseWindows,
    editorial_pause_seconds: narration.editorialPauseSeconds,
    mix_asset: "assets/audio/final_mix.mp3",
    music_asset: musicRelative,
    music_profile: musicProfile,
    music_origin: hasApprovedMusic
      ? "CC BY 4.0 licensed cinematic bed downloaded from the composer's official library"
      : "Original sectioned ORVYQ fallback score generated from harmonic oscillators only",
    music_provenance: hasApprovedMusic
      ? "assets/music/approved_bed.provenance.json"
      : null,
    music_attribution: provenance?.attribution || null,
    music_sections: musicSectionsForDuration(outputDuration),
    music_mix_target_lufs: -23,
    music_source_measured: {
      integrated_lufs: Number(musicMeasured.input_i),
      true_peak_dbtp: Number(musicMeasured.input_tp),
      loudness_range: Number(musicMeasured.input_lra),
    },
    narration_ducking: {
      enabled: true,
      ratio: 4,
      release_ms: 480,
      music_rises_during_editorial_pauses: true,
      under_speech_gain_range: [0.7, 0.86],
      editorial_pause_gain: 1.02,
    },
    procedural_noise_generation: false,
    sfx_origin: "original_synthesized_sfx",
    sfx_assets: sfxAssets,
    sfx_placements: sfxPlacements,
    source_duration_seconds: sourceDuration,
    narration_source_duration_seconds: narration.sourceNarrationDuration,
    narration_duration_seconds: narration.timelineNarrationDuration,
    speech_timeline_end_seconds: narration.timelineNarrationDuration,
    duration_seconds: outputDuration,
    preview_limited: outputDuration < sourceDuration,
    target: { integrated_lufs: -16, true_peak_dbtp: -1.5, loudness_range: 9 },
    measured: {
      integrated_lufs: Number(measured.input_i),
      true_peak_dbtp: Number(measured.input_tp),
      loudness_range: Number(measured.input_lra),
    },
    licensing: hasApprovedMusic
      ? `Narration, original synthesized SFX, and CC BY 4.0 music. ${provenance.attribution}`
      : "Narration plus an original tonal score and original synthesized SFX; no third-party audio.",
  });
  return {
    outputDuration,
    narrationSourceDuration: narration.sourceNarrationDuration,
    narrationTimelineDuration: narration.timelineNarrationDuration,
    editorialPauseSeconds: narration.editorialPauseSeconds,
    sourceDuration,
    repair: prepared.repair,
    measured,
    music_profile: musicProfile,
    music_sections: musicSectionsForDuration(outputDuration).length,
    sfx_assets: sfxAssets.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix()
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
