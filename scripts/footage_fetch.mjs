#!/usr/bin/env node
/**
 * Mechanical downloader: reads footage/footage_manifest.json and pulls each
 * non-fallback scene's selected_url into assets/footage/<scene_id>.mp4.
 * Kept separate from factforge-footage-retrieval (which does the searching/
 * scoring/reasoning) so binary I/O stays out of the judgment-driven skill,
 * mirroring how remotion_build.mjs keeps mechanical build steps out of the
 * skills that use it.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { projectDir, pathExists, readJsonSafe, parseArgs, printJson, CliError } from "./lib/fs-utils.mjs";

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buf);
}

async function cmdFetch(args) {
  const { "project-id": projectId, force } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");

  const dir = projectDir(projectId);
  const manifestPath = path.join(dir, "footage", "footage_manifest.json");
  const manifest = await readJsonSafe(manifestPath, null);
  if (!manifest) {
    throw new CliError("footage/footage_manifest.json not found - run factforge-footage-retrieval first", "UNKNOWN_ERROR");
  }

  const downloaded = [];
  const skipped = [];
  const failed = [];

  for (const scene of manifest.scenes || []) {
    if (scene.fallback_to_ai_visual || !scene.selected_url) {
      skipped.push({ scene_id: scene.scene_id, reason: "fallback_to_ai_visual or no selected_url" });
      continue;
    }
    const destRel = `assets/footage/${scene.scene_id}.mp4`;
    const destPath = path.join(dir, destRel);
    if (!force && (await pathExists(destPath))) {
      skipped.push({ scene_id: scene.scene_id, reason: "already downloaded" });
      continue;
    }
    try {
      await downloadFile(scene.selected_url, destPath);
      downloaded.push({ scene_id: scene.scene_id, file: destRel });
    } catch (err) {
      failed.push({ scene_id: scene.scene_id, error: err.message });
    }
  }

  return { project_id: projectId, downloaded, skipped, failed };
}

const SUBCOMMANDS = { fetch: cmdFetch };

function printUsage() {
  console.log("Usage: node scripts/footage_fetch.mjs fetch --project-id <id> [--force]");
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  const handler = SUBCOMMANDS[subcommand];
  if (!handler) {
    printUsage();
    process.exitCode = subcommand ? 1 : 0;
    return;
  }
  const args = parseArgs(rest);
  try {
    const result = await handler(args);
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
