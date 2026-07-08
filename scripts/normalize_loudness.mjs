#!/usr/bin/env node
/**
 * Two-pass EBU R128 loudness normalization (ffmpeg's loudnorm filter) on
 * assets/audio/final_voice.mp3 - the source narration, not the rendered
 * output. Normalizing the source (rather than patching output/final_video.mp4
 * after the fact) means every future render picks up correctly-normalized
 * audio automatically, and avoids ever needing to touch the large rendered
 * video file locally. Run this before (re-)triggering a render.
 *
 * Targets -14 LUFS integrated / -1.5 dBTP true peak / 11 LU range, the
 * commonly cited YouTube loudness target for spoken-narration content.
 * Mechanical, no LLM judgment - lives here, not in a skill.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { projectDir, pathExists, parseArgs, printJson, CliError } from "./lib/fs-utils.mjs";

const TARGET_I = -14;
const TARGET_TP = -1.5;
const TARGET_LRA = 11;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-2000)}`));
      else resolve({ stdout, stderr });
    });
  });
}

function extractLoudnormJson(ffmpegStderr) {
  const start = ffmpegStderr.lastIndexOf("{");
  const end = ffmpegStderr.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Could not find loudnorm measurement JSON in ffmpeg output");
  }
  return JSON.parse(ffmpegStderr.slice(start, end + 1));
}

export async function normalizeLoudness({ projectId }) {
  const dir = projectDir(projectId);
  const inputPath = path.join(dir, "assets", "audio", "final_voice.mp3");
  if (!(await pathExists(inputPath))) {
    throw new CliError(`assets/audio/final_voice.mp3 not found for ${projectId}`, "MISSING_AUDIO");
  }

  // Pass 1: measure.
  const measurePass = await run("ffmpeg", [
    "-i", inputPath,
    "-af", `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`,
    "-f", "null",
    "-",
  ]);
  const measured = extractLoudnormJson(measurePass.stderr);

  // Pass 2: apply, using the pass-1 measurements for a linear, single-pass-quality result.
  const tmpPath = path.join(dir, "assets", "audio", "final_voice.normalized.tmp.mp3");
  await run("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-af",
    `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:` +
      `measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:` +
      `measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:` +
      `offset=${measured.target_offset}:linear=true:print_format=summary`,
    "-c:a", "libmp3lame",
    "-b:a", "192k",
    "-f", "mp3",
    tmpPath,
  ]);

  await fs.rename(tmpPath, inputPath);

  return {
    project_id: projectId,
    normalized: "assets/audio/final_voice.mp3",
    target: { integrated_lufs: TARGET_I, true_peak_dbtp: TARGET_TP, lra: TARGET_LRA },
    measured_before: {
      integrated_lufs: Number(measured.input_i),
      true_peak_dbtp: Number(measured.input_tp),
      lra: Number(measured.input_lra),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  try {
    const result = await normalizeLoudness({ projectId: args["project-id"] });
    printJson({ ok: true, ...result });
  } catch (err) {
    printJson({ ok: false, error_code: err.code || "UNKNOWN_ERROR", message: err.message });
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
