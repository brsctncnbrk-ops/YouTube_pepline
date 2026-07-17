#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic, pathExists } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const FPS = 30;
const IMAGE_KINDS = new Set(["split_documents", "official_document", "official_figure", "official_screen", "image_sequence", "recap"]);
const NATIVE_KINDS = new Set(["source_timeline", "source_article", "concept_map", "boundary", "comparison", "evidence_chain"]);
const round = (value) => Math.round(value * 1000) / 1000;

function sceneForFrame(composition, frame) {
  return composition.scenes.find((scene) => frame >= scene.start_frame && frame < scene.end_frame)?.scene_id
    || composition.scenes.at(-1)?.scene_id
    || "scene_001";
}

function transitionFor(_spec, index) {
  // These sequences do not overlap. A dissolve would fade the incoming scene up from black,
  // so interior evidence changes use motivated hard cuts and fades are reserved for boundaries.
  return index === 0 ? "fade" : "cut";
}

export async function buildOrvyqPreviewPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [composition, blueprint, cut, evidenceManifest, runtimeManifest] = await Promise.all([
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
    readJson(path.join(dir, "direction", "proof_preview_cut.json")),
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJson(path.join(dir, "assets", "evidence", "primary_evidence.runtime.json")),
  ]);
  if (composition.fps !== FPS) throw new Error(`Preview plan expects ${FPS} fps, got ${composition.fps}`);
  if (!evidenceManifest.policy?.proof_forbids_legacy_footage) throw new Error("Primary evidence policy must forbid legacy footage in the proof");
  if (!runtimeManifest.pass) throw new Error("Primary evidence runtime manifest did not pass");

  const manifestById = new Map((evidenceManifest.assets || []).map((asset) => [asset.evidence_asset_id, asset]));
  const runtimeById = new Map((runtimeManifest.assets || []).map((asset) => [asset.evidence_asset_id, asset]));
  const sourceLimit = blueprint.global_rules.max_uses_per_source;
  const assetUsage = new Map();
  const evidenceIdUsage = new Map();
  let cursorSeconds = 0;

  const shots = [];
  for (let index = 0; index < cut.shots.length; index += 1) {
    const spec = cut.shots[index];
    const startFrame = Math.round(cursorSeconds * FPS);
    cursorSeconds += Number(spec.duration);
    const endFrame = Math.round(cursorSeconds * FPS);
    const common = {
      shot_id: `shot_${String(index + 1).padStart(3, "0")}`,
      scene_id: sceneForFrame(composition, startFrame),
      start_frame: startFrame,
      end_frame: endFrame,
      claim_id: spec.claim_id,
      visual_role: spec.visual_role,
      generic_stock: false,
      editorial_purpose: spec.editorial_purpose,
      editorial_overlay: null,
      transition_in: transitionFor(spec, index),
      transition_out: index === cut.shots.length - 1 ? "fade" : "cut",
      text_overlay: null,
      sound_cue: null,
    };

    if (spec.asset_type === "graphic") {
      shots.push({ ...common, asset_type: "graphic", graphic: spec.graphic, motif: spec.graphic.type });
      continue;
    }
    if (spec.asset_type !== "evidence") throw new Error(`${common.shot_id} is not evidence/graphic; proof footage is forbidden`);
    const evidence = spec.evidence;
    if (!evidence?.kind || (!IMAGE_KINDS.has(evidence.kind) && !NATIVE_KINDS.has(evidence.kind))) {
      throw new Error(`${common.shot_id} has unsupported evidence kind ${evidence?.kind}`);
    }
    if (!(evidence.source_ids || []).length || !evidence.source_label) throw new Error(`${common.shot_id} lacks visible source attribution`);
    if ((evidence.font_px || 0) < blueprint.global_rules.minimum_overlay_font_px) throw new Error(`${common.shot_id} evidence typography is too small`);

    const images = evidence.image_assets || [];
    const ids = evidence.evidence_asset_ids || [];
    if (IMAGE_KINDS.has(evidence.kind)) {
      if (!images.length || images.length !== ids.length) throw new Error(`${common.shot_id} image evidence must pair every image with an evidence_asset_id`);
      for (let assetIndex = 0; assetIndex < ids.length; assetIndex += 1) {
        const id = ids[assetIndex];
        const declared = manifestById.get(id);
        const runtime = runtimeById.get(id);
        const image = images[assetIndex];
        if (!declared || !runtime) throw new Error(`${common.shot_id} references unavailable primary evidence ${id}`);
        if (declared.local_asset !== image || runtime.local_asset !== image) throw new Error(`${common.shot_id} primary evidence path mismatch for ${id}`);
        if (!(await pathExists(path.join(dir, image)))) throw new Error(`${common.shot_id} primary evidence file is missing: ${image}`);
        assetUsage.set(image, (assetUsage.get(image) || 0) + 1);
        evidenceIdUsage.set(id, (evidenceIdUsage.get(id) || 0) + 1);
        if (assetUsage.get(image) > sourceLimit) throw new Error(`${image} exceeds the ${sourceLimit}-use proof limit`);
      }
    } else if (images.length || ids.length) {
      throw new Error(`${common.shot_id} native source-derived graphic cannot smuggle image assets`);
    }

    shots.push({
      ...common,
      asset_type: "evidence",
      evidence: {
        ...evidence,
        provenance_mode: IMAGE_KINDS.has(evidence.kind) ? "official_primary_capture" : "source_derived_graphic",
      },
      motif: evidence.kind,
    });
  }

  if (Math.abs(cursorSeconds - cut.duration_seconds) > 0.001) throw new Error(`Proof cut must total ${cut.duration_seconds}s, got ${cursorSeconds}s`);
  if (shots.some((shot) => shot.asset_type === "footage")) throw new Error("Legacy footage remained in the primary-evidence proof");

  const fullScreenGraphicFrames = shots.filter((shot) => shot.asset_type === "graphic").reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const evidenceFrames = shots.filter((shot) => shot.asset_type === "evidence").reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const roleFrames = {};
  for (const shot of shots) roleFrames[shot.visual_role] = (roleFrames[shot.visual_role] || 0) + shot.end_frame - shot.start_frame;

  const plan = {
    schema_version: "6.1-primary-evidence-proof",
    project_id: projectId,
    fps: FPS,
    duration_frames: cut.duration_seconds * FPS,
    preview: true,
    production_mode: blueprint.production_mode,
    preview_strategy: cut.purpose,
    render_source_sha: process.env.GITHUB_SHA || null,
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: {
      principle: "official primary evidence first; source-derived graphics second; legacy stock forbidden",
      topic: "AI competition, safety frameworks, governance, and controlled agentic-misalignment evaluations",
      palette: { ink: "#F5F0E7", accent: "#D95B53", information: "#86A9CC", ground: "#07101A" },
      source_treatment: "full-screen official captures and explicit source-derived graphics",
    },
    quality_policy: {
      ...blueprint.global_rules,
      keyword_only_visual_matching_forbidden: true,
      fake_data_graphics_forbidden: true,
      automatic_asset_fallback_forbidden: true,
      unrelated_stock_fallback_forbidden: true,
      proof_stock_assets_forbidden: true,
      metadata_cannot_define_evidence: true,
      non_overlapping_dissolves_forbidden: true,
      actual_generic_stock_fraction: 0,
      actual_primary_evidence_fraction: round(evidenceFrames / (cut.duration_seconds * FPS)),
      actual_full_screen_graphic_fraction: round(fullScreenGraphicFrames / (cut.duration_seconds * FPS)),
    },
    role_fractions: Object.fromEntries(Object.entries(roleFrames).map(([role, frames]) => [role, round(frames / (cut.duration_seconds * FPS))])),
    forbidden_asset_prefixes: cut.forbidden_asset_prefixes || ["assets/footage/"],
    blacklisted_assets: [],
    source_usage: Object.fromEntries([...assetUsage.entries()].sort((a, b) => b[1] - a[1])),
    evidence_asset_usage: Object.fromEntries([...evidenceIdUsage.entries()].sort((a, b) => b[1] - a[1])),
    shots,
  };

  await writeJsonAtomic(path.join(dir, "direction", "edit_plan.json"), plan);
  return plan;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqPreviewPlan().then((plan) => console.log(JSON.stringify({
    ok: true,
    shot_count: plan.shots.length,
    footage_count: plan.shots.filter((shot) => shot.asset_type === "footage").length,
    evidence_count: plan.shots.filter((shot) => shot.asset_type === "evidence").length,
    source_usage: plan.source_usage,
    primary_evidence_fraction: plan.quality_policy.actual_primary_evidence_fraction,
    output: "direction/edit_plan.json",
  }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
