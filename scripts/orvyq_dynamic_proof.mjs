#!/usr/bin/env node
import path from "node:path";
import { validateProductionPlan } from "./lib/orvyq-production.mjs";
import { resolveEditorialMode } from "./lib/orvyq-visual-policy.mjs";
import {
  parseArgs,
  printJson,
  projectDir,
  readJson,
  writeJsonAtomic,
} from "./lib/fs-utils.mjs";

function finitePositive(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export async function resolveDynamicProofWindow(
  projectId,
  { requireAssets = true } = {},
) {
  const check = await validateProductionPlan({
    projectId,
    requireReady: true,
    requireAssets,
  });
  if (!check.valid) {
    const error = new Error(check.issues.map((entry) => entry.message).join("; "));
    error.code = check.error_code;
    throw error;
  }

  const dir = projectDir(projectId);
  const metadata = await readJson(
    path.join(dir, "assets", "audio", "final_mix.metadata.json"),
  );
  const plan = check.plan;
  const fps = Number(plan.fps);
  const minimumFrames = Number(plan.proof.duration_frames);
  const narrationTimelineSeconds = finitePositive(
    metadata.speech_timeline_end_seconds,
    finitePositive(metadata.narration_duration_seconds),
  );
  if (!narrationTimelineSeconds) {
    throw new Error(
      "final_mix.metadata.json does not contain a valid narration timeline duration",
    );
  }

  const narrationEndFrame = Math.ceil(narrationTimelineSeconds * fps);
  const requiredFrame = Math.max(minimumFrames, narrationEndFrame);
  const boundaryShot = plan.shots.find(
    (shot) => Number(shot.end_frame) >= requiredFrame,
  );
  if (
    !boundaryShot ||
    Number(boundaryShot.end_frame) >= Number(plan.duration_frames)
  ) {
    throw new Error(
      "Unable to resolve a proof boundary inside the canonical full timeline",
    );
  }

  const durationFrames = Number(boundaryShot.end_frame);
  const result = {
    schema_version: "1.0",
    project_id: projectId,
    policy:
      "minimum_duration_expands_to_cover_paused_narration_at_next_canonical_shot_boundary",
    minimum_duration_frames: minimumFrames,
    minimum_duration_seconds: minimumFrames / fps,
    narration_timeline_seconds: narrationTimelineSeconds,
    narration_end_frame: narrationEndFrame,
    duration_frames: durationFrames,
    duration_seconds: durationFrames / fps,
    last_frame: durationFrames - 1,
    boundary_shot_id: boundaryShot.shot_id,
    expanded: durationFrames > minimumFrames,
    production_plan_sha256: check.plan_sha256,
  };

  await writeJsonAtomic(
    path.join(dir, "qa", "effective_proof_window.json"),
    result,
  );
  return { result, check };
}

export async function buildDynamicProofEditPlan(projectId) {
  const { result: proof, check } = await resolveDynamicProofWindow(projectId, {
    requireAssets: true,
  });
  const plan = check.plan;
  const durationFrames = proof.duration_frames;
  const proofShots = plan.shots
    .filter((shot) => shot.end_frame <= durationFrames)
    .map((shot) => ({ ...shot }));
  const editorial = resolveEditorialMode({
    ...plan,
    preview: true,
    duration_frames: durationFrames,
    shots: proofShots,
  });
  const cinematic = editorial.mode === "cinematic_contextual";
  const compiled = {
    schema_version: "8.3-compatible-dynamic-canonical-proof",
    project_id: projectId,
    production_mode:
      plan.production_mode ||
      plan.art_direction?.production_mode ||
      "evidence_led_video_essay",
    fps: plan.fps,
    duration_frames: durationFrames,
    preview: true,
    render_mode: "proof",
    production_plan_sha256: check.plan_sha256,
    effective_proof_window: proof,
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: plan.art_direction || null,
    quality_policy: {
      ...plan.quality_policy,
      editorial_mode: editorial.mode,
      cinematic_body_footage: cinematic,
      require_sound_design_sfx: cinematic,
      proof_body_stock_assets_forbidden: !cinematic,
      motion_hook_required: true,
      metadata_cannot_define_evidence: true,
      motion_hook_fraction_max:
        plan.quality_policy?.motion_hook_fraction_max ?? 0.12,
      contextual_body_footage_fraction_min:
        plan.quality_policy?.contextual_body_footage_fraction_min ??
        (cinematic ? 0.25 : 0),
      contextual_body_footage_fraction_max:
        plan.quality_policy?.contextual_body_footage_fraction_max ??
        (cinematic ? 0.4 : 0),
      official_capture_fraction_min:
        plan.quality_policy?.official_capture_fraction_min ??
        (cinematic ? 0.3 : 0.55),
      evidence_asset_fraction_min:
        plan.quality_policy?.evidence_asset_fraction_min ??
        (cinematic ? 0.6 : 0.75),
      canonical_full_plan_required: true,
      proof_is_exact_prefix_of_full_plan: true,
      proof_duration_is_minimum_not_cap: true,
      proof_expands_to_paused_narration_boundary: true,
      approval_invalidated_on_plan_change: true,
    },
    sections: plan.sections
      .filter((section) => section.start_frame < durationFrames)
      .map((section) => ({
        ...section,
        end_frame: Math.min(section.end_frame, durationFrames),
      })),
    physical_asset_usage: check.physical_asset_usage,
    motif_usage: check.motif_usage,
    evidence_source_usage: check.evidence_source_usage,
    shots: proofShots,
  };

  await writeJsonAtomic(
    path.join(projectDir(projectId), "direction", "edit_plan.json"),
    compiled,
  );
  return compiled;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const projectId = args["project-id"];
  if (!projectId) throw new Error("--project-id is required");

  if (command === "resolve") {
    const { result } = await resolveDynamicProofWindow(projectId, {
      requireAssets: args["skip-assets"] !== true,
    });
    printJson({ ok: true, command, project_id: projectId, result });
    return;
  }
  if (command === "build") {
    const result = await buildDynamicProofEditPlan(projectId);
    printJson({ ok: true, command, project_id: projectId, result });
    return;
  }
  throw new Error("Use resolve|build");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    printJson({
      ok: false,
      error_code: error.code || "DYNAMIC_PROOF_FAILED",
      message: error.message,
    });
    process.exitCode = 1;
  });
}
