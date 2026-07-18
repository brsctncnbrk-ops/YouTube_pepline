#!/usr/bin/env node
import path from "node:path";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
  pathExists,
} from "./lib/fs-utils.mjs";
import { auditMotionHook } from "./lib/orvyq-motion-hook.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const FPS = 30;
const IMAGE_KINDS = new Set([
  "split_documents",
  "official_document",
  "official_figure",
  "official_screen",
  "image_sequence",
  "recap",
]);
const NATIVE_KINDS = new Set([
  "source_timeline",
  "source_article",
  "concept_map",
  "boundary",
  "comparison",
  "evidence_chain",
]);
const round = (value) => Math.round(value * 1000) / 1000;

function sceneForFrame(composition, frame) {
  return (
    composition.scenes.find(
      (scene) => frame >= scene.start_frame && frame < scene.end_frame,
    )?.scene_id ||
    composition.scenes.at(-1)?.scene_id ||
    "scene_001"
  );
}
function transitionFor(spec, index) {
  return spec.transition_in || (index === 0 ? "cut" : "cut");
}
function defaultFocus(evidence) {
  if (evidence.focus) return evidence.focus;
  if (evidence.kind === "official_document")
    return { scale: 1.12, x: 0, y: -3 };
  return undefined;
}

export async function buildOrvyqPreviewPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const cinematicProof = process.env.ORVYQ_CINEMATIC_PROOF === "1";
  const [
    composition,
    blueprint,
    proofCut,
    cinematicCut,
    motionHook,
    evidenceManifest,
    runtimeManifest,
  ] = await Promise.all([
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
    readJson(path.join(dir, "direction", "proof_preview_cut.json")),
    readJson(path.join(dir, "direction", "cinematic_proof_cut.json")),
    readJson(path.join(dir, "direction", "motion_hook.json")),
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJson(
      path.join(dir, "assets", "evidence", "primary_evidence.runtime.json"),
    ),
  ]);
  const cut = cinematicProof ? cinematicCut : proofCut;
  if (composition.fps !== FPS)
    throw new Error(`Preview plan expects ${FPS} fps, got ${composition.fps}`);
  if (
    !cinematicProof &&
    !evidenceManifest.policy?.proof_body_forbids_legacy_footage
  )
    throw new Error(
      "Primary evidence policy must restrict footage to the opening hook",
    );
  if (!runtimeManifest.pass)
    throw new Error("Primary evidence runtime manifest did not pass");

  const evidenceBridge = (motionHook.evidence_bridge || []).map((entry) => {
    const source = proofCut.shots[entry.source_shot_index];
    if (!source || source.asset_type !== "evidence")
      throw new Error(
        `Invalid evidence bridge source ${entry.source_shot_index}`,
      );
    return {
      ...source,
      duration: entry.duration,
      transition_in: entry.transition_in || "cut",
    };
  });
  const resolvedCinematicShots = (cinematicCut.shots || []).map((entry) => {
    let source = null;
    if (Number.isInteger(entry.source_motion_hook_index))
      source = motionHook.shots?.[entry.source_motion_hook_index];
    if (Number.isInteger(entry.source_evidence_index))
      source = proofCut.shots?.[entry.source_evidence_index];
    if (
      (entry.source_motion_hook_index !== undefined ||
        entry.source_evidence_index !== undefined) &&
      !source
    )
      throw new Error("Cinematic proof references a missing source shot");
    const resolved = source
      ? {
          ...source,
          ...entry,
          ...(source.evidence || entry.evidence
            ? { evidence: { ...(source.evidence || {}), ...(entry.evidence || {}) } }
            : {}),
          ...(source.graphic || entry.graphic
            ? { graphic: { ...(source.graphic || {}), ...(entry.graphic || {}) } }
            : {}),
        }
      : { ...entry };
    delete resolved.source_motion_hook_index;
    delete resolved.source_evidence_index;
    return resolved;
  });
  const cutShots = cinematicProof
    ? resolvedCinematicShots
    : [
        ...(motionHook.shots || []),
        ...evidenceBridge,
        ...proofCut.shots.slice(
          Number(motionHook.replace_opening_shot_count || 0),
        ),
      ];

  const manifestById = new Map(
    (evidenceManifest.assets || []).map((asset) => [
      asset.evidence_asset_id,
      asset,
    ]),
  );
  const runtimeById = new Map(
    (runtimeManifest.assets || []).map((asset) => [
      asset.evidence_asset_id,
      asset,
    ]),
  );
  const sourceLimit = blueprint.global_rules.max_uses_per_source;
  const assetUsage = new Map();
  const evidenceIdUsage = new Map();
  let cursorSeconds = 0;
  const shots = [];

  for (let index = 0; index < cutShots.length; index += 1) {
    const spec = cutShots[index];
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
      generic_stock: Boolean(spec.generic_stock),
      editorial_purpose: spec.editorial_purpose,
      editorial_overlay: null,
      transition_in: transitionFor(spec, index),
      transition_out:
        spec.transition_out || (index === cutShots.length - 1 ? "fade" : "cut"),
      text_overlay: null,
      sound_cue: spec.sound_cue || null,
      emphasis_card: spec.emphasis_card || null,
    };

    if (spec.asset_type === "graphic") {
      shots.push({
        ...common,
        asset_type: "graphic",
        graphic: spec.graphic,
        motif: spec.graphic.type,
      });
      continue;
    }
    if (spec.asset_type === "footage") {
      const isHookFootage = spec.hook_footage === true;
      const isContextualFootage = spec.contextual_footage === true;
      if (
        !isHookFootage &&
        !(cinematicProof && isContextualFootage)
      )
        throw new Error(
          `${common.shot_id} footage is not approved for this proof mode`,
        );
      const absoluteVideo = path.join(dir, spec.video_asset || "");
      const provenancePath = path.join(
        dir,
        `${spec.video_asset}.provenance.json`,
      );
      if (!(await pathExists(absoluteVideo)))
        throw new Error(
          `${common.shot_id} hook footage is missing: ${spec.video_asset}`,
        );
      if (!(await pathExists(provenancePath)))
        throw new Error(`${common.shot_id} hook provenance is missing`);
      const provenance = await readJson(provenancePath);
      if (!provenance.approved_for_final_edit || !provenance.license_url)
        throw new Error(
          `${common.shot_id} hook footage is not licensed and approved`,
        );
      const sourceDuration = Number(
        provenance.actual_duration_seconds || provenance.duration,
      );
      if (
        !Number.isFinite(sourceDuration) ||
        spec.trim_in_sec < 0 ||
        spec.trim_out_sec <= spec.trim_in_sec ||
        spec.trim_out_sec > sourceDuration + 0.02
      ) {
        throw new Error(`${common.shot_id} has an invalid hook trim`);
      }
      if (
        Math.abs(spec.trim_out_sec - spec.trim_in_sec - Number(spec.duration)) >
        0.02
      )
        throw new Error(
          `${common.shot_id} hook trim does not match shot duration`,
        );
      shots.push({
        ...common,
        asset_type: "footage",
        video_asset: spec.video_asset,
        trim_in_sec: spec.trim_in_sec,
        trim_out_sec: spec.trim_out_sec,
        motion_variant: spec.motion_variant || "hold",
        hook_footage: isHookFootage,
        contextual_footage: isContextualFootage,
        provenance_mode: isHookFootage
          ? "approved_motion_hook"
          : "approved_contextual_footage",
        motif: spec.video_asset,
      });
      continue;
    }
    if (spec.asset_type !== "evidence")
      throw new Error(
        `${common.shot_id} is not evidence, graphic, or approved hook footage`,
      );
    const evidence = spec.evidence;
    if (
      !evidence?.kind ||
      (!IMAGE_KINDS.has(evidence.kind) && !NATIVE_KINDS.has(evidence.kind))
    )
      throw new Error(
        `${common.shot_id} has unsupported evidence kind ${evidence?.kind}`,
      );
    if (!(evidence.source_ids || []).length || !evidence.source_label)
      throw new Error(`${common.shot_id} lacks visible source attribution`);
    if (
      (evidence.font_px || 0) < blueprint.global_rules.minimum_overlay_font_px
    )
      throw new Error(`${common.shot_id} evidence typography is too small`);

    const images = evidence.image_assets || [];
    const ids = evidence.evidence_asset_ids || [];
    if (IMAGE_KINDS.has(evidence.kind)) {
      if (!images.length || images.length !== ids.length)
        throw new Error(
          `${common.shot_id} image evidence must pair every image with an evidence_asset_id`,
        );
      for (let assetIndex = 0; assetIndex < ids.length; assetIndex += 1) {
        const id = ids[assetIndex];
        const declared = manifestById.get(id);
        const runtime = runtimeById.get(id);
        const image = images[assetIndex];
        if (!declared || !runtime)
          throw new Error(
            `${common.shot_id} references unavailable primary evidence ${id}`,
          );
        if (declared.local_asset !== image || runtime.local_asset !== image)
          throw new Error(
            `${common.shot_id} primary evidence path mismatch for ${id}`,
          );
        if (!(await pathExists(path.join(dir, image))))
          throw new Error(
            `${common.shot_id} primary evidence file is missing: ${image}`,
          );
        assetUsage.set(image, (assetUsage.get(image) || 0) + 1);
        evidenceIdUsage.set(id, (evidenceIdUsage.get(id) || 0) + 1);
        if (assetUsage.get(image) > sourceLimit)
          throw new Error(
            `${image} exceeds the ${sourceLimit}-use proof limit`,
          );
      }
    } else if (images.length || ids.length) {
      throw new Error(
        `${common.shot_id} native source-derived graphic cannot smuggle image assets`,
      );
    }

    const focus = defaultFocus(evidence);
    shots.push({
      ...common,
      asset_type: "evidence",
      evidence: {
        ...evidence,
        ...(focus ? { focus } : {}),
        provenance_mode: IMAGE_KINDS.has(evidence.kind)
          ? "official_primary_capture"
          : "source_derived_graphic",
      },
      motif: evidence.kind,
    });
  }

  if (Math.abs(cursorSeconds - cut.duration_seconds) > 0.001)
    throw new Error(
      `Proof cut must total ${cut.duration_seconds}s, got ${cursorSeconds}s`,
    );

  const hookAudit = auditMotionHook({
    preview: true,
    fps: FPS,
    shots,
    quality_policy: {
      motion_hook_min_seconds: motionHook.minimum_seconds,
      motion_hook_max_seconds: motionHook.maximum_seconds,
    },
  });
  if (!hookAudit.pass)
    throw new Error(`Motion hook failed: ${hookAudit.failures.join("; ")}`);

  const fullScreenGraphicFrames = shots
    .filter((shot) => shot.asset_type === "graphic")
    .reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const evidenceFrames = shots
    .filter((shot) => shot.asset_type === "evidence")
    .reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const footageFrames = shots
    .filter((shot) => shot.asset_type === "footage")
    .reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const hookFrames = shots
    .filter((shot) => shot.hook_footage === true)
    .reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const contextualBodyFrames = shots
    .filter((shot) => shot.contextual_footage === true)
    .reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const genericStockFrames = shots
    .filter((shot) => shot.generic_stock === true)
    .reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const roleFrames = {};
  for (const shot of shots)
    roleFrames[shot.visual_role] =
      (roleFrames[shot.visual_role] || 0) + shot.end_frame - shot.start_frame;

  const plan = {
    schema_version: cinematicProof
      ? "7.0-cinematic-proof"
      : "6.3-motion-hook-evidence-proof",
    project_id: projectId,
    fps: FPS,
    duration_frames: cut.duration_seconds * FPS,
    preview: true,
    production_mode: blueprint.production_mode,
    preview_strategy: cinematicProof ? cinematicCut.strategy : motionHook.purpose,
    render_source_sha: process.env.GITHUB_SHA || null,
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: {
      principle:
        cinematicProof
          ? "short licensed motion hook first; then alternate source-backed evidence with semantically relevant licensed context footage and deliberate emphasis beats"
          : "short licensed motion hook first; official primary evidence and source-derived graphics throughout the body",
      topic:
        "AI competition, safety frameworks, governance, and controlled agentic-misalignment evaluations",
      palette: {
        ink: "#F5F0E7",
        accent: "#D95B53",
        information: "#86A9CC",
        ground: "#07101A",
      },
      source_treatment:
        "full-screen official captures and explicit source-derived graphics",
    },
    quality_policy: {
      ...blueprint.global_rules,
      keyword_only_visual_matching_forbidden: true,
      fake_data_graphics_forbidden: true,
      automatic_asset_fallback_forbidden: true,
      unrelated_stock_fallback_forbidden: true,
      proof_stock_assets_forbidden: false,
      proof_body_stock_assets_forbidden: !cinematicProof,
      cinematic_body_footage: cinematicProof,
      contextual_footage_must_not_claim_literal_evidence: cinematicProof,
      minimum_emphasis_beats: cinematicProof ? 4 : 0,
      maximum_uninterrupted_evidence_seconds: cinematicProof ? 15 : null,
      motion_hook_required: true,
      motion_hook_min_seconds: motionHook.minimum_seconds,
      motion_hook_max_seconds: motionHook.maximum_seconds,
      metadata_cannot_define_evidence: true,
      non_overlapping_dissolves_forbidden: true,
      document_focus_required: true,
      actual_generic_stock_fraction: round(
        genericStockFrames / (cut.duration_seconds * FPS),
      ),
      actual_motion_hook_fraction: round(
        hookFrames / (cut.duration_seconds * FPS),
      ),
      actual_total_footage_fraction: round(
        footageFrames / (cut.duration_seconds * FPS),
      ),
      actual_contextual_body_footage_fraction: round(
        contextualBodyFrames / (cut.duration_seconds * FPS),
      ),
      actual_primary_evidence_fraction: round(
        evidenceFrames / (cut.duration_seconds * FPS),
      ),
      actual_full_screen_graphic_fraction: round(
        fullScreenGraphicFrames / (cut.duration_seconds * FPS),
      ),
    },
    role_fractions: Object.fromEntries(
      Object.entries(roleFrames).map(([role, frames]) => [
        role,
        round(frames / (cut.duration_seconds * FPS)),
      ]),
    ),
    motion_hook: hookAudit,
    forbidden_asset_prefixes: [],
    blacklisted_assets: [],
    source_usage: Object.fromEntries(
      [...assetUsage.entries()].sort((a, b) => b[1] - a[1]),
    ),
    evidence_asset_usage: Object.fromEntries(
      [...evidenceIdUsage.entries()].sort((a, b) => b[1] - a[1]),
    ),
    shots,
  };

  await writeJsonAtomic(path.join(dir, "direction", "edit_plan.json"), plan);
  return plan;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqPreviewPlan()
    .then((plan) =>
      console.log(
        JSON.stringify({
          ok: true,
          shot_count: plan.shots.length,
          footage_count: plan.shots.filter(
            (shot) => shot.asset_type === "footage",
          ).length,
          evidence_count: plan.shots.filter(
            (shot) => shot.asset_type === "evidence",
          ).length,
          source_usage: plan.source_usage,
          primary_evidence_fraction:
            plan.quality_policy.actual_primary_evidence_fraction,
          output: "direction/edit_plan.json",
        }),
      ),
    )
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
