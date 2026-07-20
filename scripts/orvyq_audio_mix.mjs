#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildOrvyqAudioMix as buildV2 } from "./orvyq_audio_mix_v2.mjs";

const exec = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

async function durationSeconds(file) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file,
  ]);
  const value = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid audio duration: ${value}`);
  return value;
}

async function withCanonicalNarrator(projectId, callback) {
  const dir = path.join("projects", projectId);
  const voice = path.join(dir, "assets", "audio", "final_voice.mp3");
  const repairPath = path.join(dir, "voice", "audio_repair.json");
  let repair;
  try {
    repair = JSON.parse(await fs.readFile(repairPath, "utf8"));
  } catch {
    return callback(null);
  }
  if (repair.operation !== "rotate") return callback(null);

  const rotateAt = Number(repair.rotate_at_seconds);
  const sourceDuration = await durationSeconds(voice);
  if (!Number.isFinite(rotateAt) || rotateAt <= 0 || rotateAt >= sourceDuration) {
    throw new Error(`Invalid narrator rotate_at_seconds: ${repair.rotate_at_seconds}`);
  }

  const canonicalDuration = sourceDuration - rotateAt;
  const tempo = canonicalDuration / sourceDuration;
  if (tempo < 0.5 || tempo > 2) throw new Error(`Unsupported canonical narrator tempo: ${tempo}`);

  const repaired = `${voice}.canonical-repaired.mp3`;
  const sourceBackup = `${voice}.raw-backup`;
  const repairBackup = `${repairPath}.runtime-backup`;
  await exec("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", voice,
    "-filter:a", `atrim=start=${rotateAt},asetpts=PTS-STARTPTS,atempo=${tempo}`,
    "-t", String(sourceDuration), "-ac", "2", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", repaired,
  ]);

  await fs.rename(voice, sourceBackup);
  await fs.rename(repairPath, repairBackup);
  await fs.rename(repaired, voice);
  try {
    return await callback({
      operation: "drop_duplicate_prefix_and_retime",
      source_operation: "rotate",
      removed_prefix_seconds: rotateAt,
      canonical_content_seconds: canonicalDuration,
      retimed_duration_seconds: sourceDuration,
      tempo,
      config: "voice/audio_repair.json",
      reason: repair.reason || null,
    });
  } finally {
    await fs.rm(voice, { force: true });
    await fs.rename(sourceBackup, voice);
    await fs.rename(repairBackup, repairPath);
  }
}

export async function buildOrvyqAudioMix(projectId = PROJECT_ID) {
  return withCanonicalNarrator(projectId, async (canonicalRepair) => {
    const result = await buildV2(projectId);
    if (!canonicalRepair) return result;
    const metadataPath = path.join("projects", projectId, "assets", "audio", "final_mix.metadata.json");
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    metadata.voice_repair = canonicalRepair;
    metadata.processed_voice_source = "assets/audio/final_voice.canonical-repaired.runtime.mp3";
    metadata.canonical_narrator_reconstruction = true;
    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    return { ...result, repair: canonicalRepair };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix()
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
