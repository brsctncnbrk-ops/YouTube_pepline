#!/usr/bin/env node
/**
 * Deterministic Remotion assembly helpers. Two subcommands:
 *
 *   derive-configs --project-id <id>
 *     Splits the authored remotion/composition.json (the single schema-valid
 *     source of truth authored by factforge-motion) into the two files the
 *     Remotion app actually consumes at render time - remotion/scene_config.json
 *     (timing + per-scene structure) and remotion/asset_map.json (asset paths).
 *     Deriving them mechanically means the three files can never drift.
 *
 *   build-project --project-id <id>
 *     Assembles remotion/render_ready_project/ by copying templates/remotion/
 *     into it and copying the tiny scene_config.json + asset_map.json into
 *     src/data/ so the app imports them locally. Large binaries (audio/images)
 *     are NOT copied - the Remotion app references them in place via a
 *     public dir pointed at the project root, so LFS assets aren't duplicated.
 *     Also refreshes assets/asset_manifest.json to reflect the real assets.
 *
 * Both are mechanical (no LLM judgment) so they live here, not in a skill.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  TEMPLATES_DIR,
  projectDir,
  pathExists,
  readJson,
  writeJsonAtomic,
  copyDir,
  parseArgs,
  printJson,
  CliError,
} from "./lib/fs-utils.mjs";


function isPathInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export async function assertSafeBundleOutput({ publicDir, outputDir, sourceRoot }) {
  const resolvedPublic = path.resolve(publicDir);
  const resolvedOutput = path.resolve(outputDir);
  const resolvedSource = path.resolve(sourceRoot);
  if (resolvedOutput === resolvedPublic) {
    throw new CliError("Bundle output directory cannot equal the Remotion public directory", "RENDER_CONFIG_MISSING");
  }
  if (isPathInside(resolvedOutput, resolvedPublic)) {
    throw new CliError("Bundle output directory cannot be inside the Remotion public directory", "RENDER_CONFIG_MISSING");
  }
  if (isPathInside(resolvedPublic, resolvedOutput)) {
    throw new CliError("Remotion public directory cannot be inside the bundle output directory", "RENDER_CONFIG_MISSING");
  }
  if (resolvedOutput === resolvedSource || isPathInside(resolvedOutput, resolvedSource)) {
    throw new CliError("Bundle output directory cannot be inside the source tree", "RENDER_CONFIG_MISSING");
  }
  return { public_dir: resolvedPublic, output_dir: resolvedOutput, source_root: resolvedSource };
}

async function loadComposition(projectId) {
  const compPath = path.join(projectDir(projectId), "remotion", "composition.json");
  if (!(await pathExists(compPath))) {
    throw new CliError(`remotion/composition.json not found for ${projectId}`, "RENDER_CONFIG_MISSING");
  }
  return readJson(compPath);
}

export async function deriveConfigs({ projectId }) {
  const comp = await loadComposition(projectId);
  const dir = projectDir(projectId);

  const sceneConfig = {
    fps: comp.fps,
    width: comp.width,
    height: comp.height,
    duration_frames: comp.duration_frames,
    scenes: comp.scenes.map((s) => {
      const base = {
        scene_id: s.scene_id,
        start_frame: s.start_frame,
        end_frame: s.end_frame,
        asset_type: s.asset_type,
        text_overlay: s.text_overlay ?? null,
        transition_in: s.transition_in,
        transition_out: s.transition_out,
      };
      // camera_motion only applies to ai_fallback scenes (Ken Burns pan/zoom
      // on a still); footage scenes carry trim points instead - there's no
      // image_asset field kept here either way (Video.tsx resolves the
      // actual src via asset_map, keyed by scene_id).
      return s.asset_type === "footage"
        ? { ...base, trim_in_sec: s.trim_in_sec, trim_out_sec: s.trim_out_sec }
        : { ...base, camera_motion: s.camera_motion };
    }),
  };

  const assetMap = {
    audio_asset: comp.audio_asset,
    asset_map: comp.asset_map,
  };

  await writeJsonAtomic(path.join(dir, "remotion", "scene_config.json"), sceneConfig);
  await writeJsonAtomic(path.join(dir, "remotion", "asset_map.json"), assetMap);

  return {
    project_id: projectId,
    derived: ["remotion/scene_config.json", "remotion/asset_map.json"],
    scene_count: sceneConfig.scenes.length,
    duration_frames: sceneConfig.duration_frames,
  };
}

/**
 * asset_manifest.json is informational only (never schema-validated), so its
 * shape can move freely. Since the footage-primary migration, per-scene
 * `source` is dynamic: read from footage/footage_manifest.json for footage
 * scenes (pexels/pixabay/coverr/mixkit), "Leonardo AI" for ai_fallback
 * scenes as before. The old `images` key is renamed `visuals` since it now
 * covers both asset types.
 */
async function refreshAssetManifest(projectId, comp) {
  const dir = projectDir(projectId);
  const durationSeconds = comp.fps ? Math.round((comp.duration_frames / comp.fps) * 100) / 100 : null;

  const footageManifestPath = path.join(dir, "footage", "footage_manifest.json");
  const footageManifest = (await pathExists(footageManifestPath)) ? await readJson(footageManifestPath) : null;
  const footageById = new Map((footageManifest?.scenes || []).map((s) => [s.scene_id, s]));

  const manifest = {
    audio: {
      main_voice: {
        path: comp.audio_asset,
        status: (await pathExists(path.join(dir, comp.audio_asset))) ? "available" : "missing",
        duration_seconds: durationSeconds,
      },
    },
    visuals: [],
    music: [],
    sfx: [],
  };
  for (const scene of comp.scenes) {
    const isFootage = scene.asset_type === "footage";
    const rel = isFootage ? scene.video_asset : scene.image_asset;
    const footageEntry = footageById.get(scene.scene_id);
    manifest.visuals.push({
      scene_id: scene.scene_id,
      asset_type: scene.asset_type,
      file: rel,
      status: (await pathExists(path.join(dir, rel))) ? "available" : "missing",
      source: isFootage ? footageEntry?.source || "unknown" : "Leonardo AI",
      license: isFootage ? footageEntry?.license || null : null,
      seed: null,
      style_reference: null,
    });
  }
  await writeJsonAtomic(path.join(dir, "assets", "asset_manifest.json"), manifest);
  return manifest;
}

export async function buildProject({ projectId }) {
  const dir = projectDir(projectId);
  const comp = await loadComposition(projectId);

  for (const rel of ["remotion/scene_config.json", "remotion/asset_map.json"]) {
    if (!(await pathExists(path.join(dir, rel)))) {
      throw new CliError(`${rel} missing - run 'derive-configs' first`, "RENDER_CONFIG_MISSING");
    }
  }

  const templateDir = path.join(TEMPLATES_DIR, "remotion");
  if (!(await pathExists(templateDir))) {
    throw new CliError("templates/remotion/ is missing from the repo", "RENDER_CONFIG_MISSING");
  }

  const dest = path.join(dir, "remotion", "render_ready_project");
  await fs.rm(dest, { recursive: true, force: true });
  await copyDir(templateDir, dest);

  // Copy the tiny config JSON into the app so it imports them locally rather
  // than reaching outside the project root (which bundlers dislike). Big
  // binaries stay in place and are served via the public dir (project root).
  const dataDir = path.join(dest, "src", "data");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.copyFile(path.join(dir, "remotion", "scene_config.json"), path.join(dataDir, "scene_config.json"));
  await fs.copyFile(path.join(dir, "remotion", "asset_map.json"), path.join(dataDir, "asset_map.json"));

  const assetManifest = await refreshAssetManifest(projectId, comp);
  const missingAssets = [
    ...(assetManifest.audio.main_voice.status === "missing" ? [assetManifest.audio.main_voice.path] : []),
    ...assetManifest.visuals.filter((v) => v.status === "missing").map((v) => v.file),
  ];

  return {
    project_id: projectId,
    render_ready_project: "remotion/render_ready_project",
    copied_configs: ["src/data/scene_config.json", "src/data/asset_map.json"],
    asset_manifest_refreshed: true,
    missing_assets: missingAssets,
  };
}

async function validateBundleOutputCommand(args) {
  const result = await assertSafeBundleOutput({
    publicDir: args["public-dir"],
    outputDir: args["output-dir"],
    sourceRoot: args["source-root"] || process.cwd(),
  });
  return result;
}

const SUBCOMMANDS = {
  "derive-configs": deriveConfigs,
  "build-project": buildProject,
  "validate-bundle-output": validateBundleOutputCommand,
};

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  const handler = SUBCOMMANDS[subcommand];
  if (!handler) {
    console.log("Usage: node scripts/remotion_build.mjs <derive-configs|build-project> --project-id <id>");
    process.exitCode = subcommand ? 1 : 0;
    return;
  }
  const args = parseArgs(rest);
  try {
    const result = subcommand === "validate-bundle-output" ? await handler(args) : await handler({ projectId: args["project-id"] });
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
