#!/usr/bin/env node
import path from "node:path";
import {
  projectDir,
  readJson,
  pathExists,
  writeJsonAtomic,
} from "./lib/fs-utils.mjs";
import {
  isApprovedContextualFootage,
  isOpeningHookFootage,
  measureVisualMix,
  resolveVisualThresholds,
} from "./lib/orvyq-visual-policy.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const OFFICIAL = new Set([
  "split_documents",
  "official_document",
  "official_figure",
  "official_screen",
  "image_sequence",
  "recap",
]);
const DERIVED = new Set([
  "source_timeline",
  "source_article",
  "concept_map",
  "boundary",
  "comparison",
  "evidence_chain",
]);

const classifyEvidence = (shot) => {
  if (shot.asset_type !== "evidence") return null;
  if (OFFICIAL.has(shot.evidence?.kind)) return "official";
  if (DERIVED.has(shot.evidence?.kind)) return "derived";
  return null;
};

export async function runCompatibilityAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const plan = await readJson(path.join(dir, "direction", "edit_plan.json"));
  const productionPlan = await readJson(
    path.join(dir, "direction", "production_plan.json"),
  );
  const effectivePath = path.join(dir, "qa", "effective_proof_window.json");
  const effective = (await pathExists(effectivePath))
    ? await readJson(effectivePath)
    : null;
  const resolved = resolveVisualThresholds(plan);
  const editorial = resolved.editorial;
  const mix = measureVisualMix(plan, classifyEvidence);
  const failures = [];
  const warnings = [];

  if (!editorial.declaration_matches_timeline)
    failures.push(
      `declared editorial mode ${editorial.declared_mode} conflicts with inferred ${editorial.inferred_mode}`,
    );
  if (!editorial.declared_mode)
    warnings.push(
      `editorial mode is inferred as ${editorial.mode}; future generated plans should declare it explicitly`,
    );
  if (mix.unapproved_footage_fraction > 0)
    failures.push(
      `unapproved footage occupies ${(mix.unapproved_footage_fraction * 100).toFixed(1)}% of the proof`,
    );
  if (plan.preview && mix.opening_hook_fraction > resolved.motion_hook_fraction_max)
    failures.push(
      `opening hook ${(mix.opening_hook_fraction * 100).toFixed(1)}% exceeds ${(resolved.motion_hook_fraction_max * 100).toFixed(1)}%`,
    );
  if (mix.generic_stock_fraction > resolved.generic_stock_fraction_max)
    failures.push(
      `generic stock ${(mix.generic_stock_fraction * 100).toFixed(1)}% exceeds ${(resolved.generic_stock_fraction_max * 100).toFixed(1)}%`,
    );
  if (
    mix.official_primary_capture_fraction <
    resolved.official_capture_fraction_min
  )
    failures.push(
      `official captures ${(mix.official_primary_capture_fraction * 100).toFixed(1)}% are below ${(resolved.official_capture_fraction_min * 100).toFixed(1)}%`,
    );
  if (mix.evidence_archive_fraction < resolved.evidence_asset_fraction_min)
    failures.push(
      `source-backed visuals ${(mix.evidence_archive_fraction * 100).toFixed(1)}% are below ${(resolved.evidence_asset_fraction_min * 100).toFixed(1)}%`,
    );

  if (editorial.mode === "cinematic_contextual") {
    if (
      mix.contextual_body_footage_fraction <
      resolved.contextual_body_footage_fraction_min
    )
      failures.push(
        `contextual footage ${(mix.contextual_body_footage_fraction * 100).toFixed(1)}% is below ${(resolved.contextual_body_footage_fraction_min * 100).toFixed(1)}%`,
      );
    if (
      mix.contextual_body_footage_fraction >
      resolved.contextual_body_footage_fraction_max
    )
      failures.push(
        `contextual footage ${(mix.contextual_body_footage_fraction * 100).toFixed(1)}% exceeds ${(resolved.contextual_body_footage_fraction_max * 100).toFixed(1)}%`,
      );
  } else if (mix.contextual_body_footage_fraction > 0) {
    failures.push("strict evidence mode cannot contain contextual body footage");
  }

  const invalidContextualShots = (plan.shots || []).filter(
    (shot) =>
      shot.asset_type === "footage" &&
      !isOpeningHookFootage(shot) &&
      !isApprovedContextualFootage(shot),
  );
  if (invalidContextualShots.length)
    failures.push(
      `invalid body footage: ${invalidContextualShots.map((shot) => shot.shot_id).join(", ")}`,
    );

  if (plan.preview && effective) {
    if (Number(plan.duration_frames) !== Number(effective.duration_frames))
      failures.push(
        `edit plan has ${plan.duration_frames} frames but effective proof has ${effective.duration_frames}`,
      );
    if (Number(effective.duration_frames) < Number(productionPlan.proof.duration_frames))
      failures.push("effective proof is shorter than the canonical minimum proof");
    if (
      Number(effective.narration_end_seconds) >
      Number(effective.duration_seconds) + 0.001
    )
      failures.push("effective proof ends before the paused narration timeline");
  }

  if (
    plan.quality_policy?.contextual_footage_must_not_claim_literal_evidence !==
      true &&
    editorial.mode === "cinematic_contextual"
  )
    warnings.push(
      "canonical policy should explicitly forbid contextual footage from claiming literal evidence",
    );

  const report = {
    schema_version: "1.0-old-new-compatibility",
    project_id: projectId,
    preview: Boolean(plan.preview),
    editorial_mode: editorial.mode,
    editorial_mode_resolution: editorial,
    dynamic_proof: effective,
    canonical_minimum_proof_frames: productionPlan.proof.duration_frames,
    resolved_thresholds: {
      motion_hook_fraction_max: resolved.motion_hook_fraction_max,
      contextual_body_footage_fraction_min:
        resolved.contextual_body_footage_fraction_min,
      contextual_body_footage_fraction_max:
        resolved.contextual_body_footage_fraction_max,
      official_capture_fraction_min: resolved.official_capture_fraction_min,
      evidence_asset_fraction_min: resolved.evidence_asset_fraction_min,
      generic_stock_fraction_max: resolved.generic_stock_fraction_max,
      full_screen_graphic_fraction_max:
        resolved.full_screen_graphic_fraction_max,
    },
    actual_mix: mix,
    compatible_rules: {
      opening_hook_seconds: "10–14",
      proof_duration: "canonical minimum plus paused narration to next shot boundary",
      contextual_footage: "licensed, approved_contextual_footage, non-literal evidence",
      evidence_strict_targets: {
        official_capture_fraction_min: 0.55,
        evidence_asset_fraction_min: 0.75,
      },
      cinematic_contextual_targets: {
        official_capture_fraction_min: 0.3,
        evidence_asset_fraction_min: 0.6,
        contextual_body_footage_fraction_min: 0.25,
        contextual_body_footage_fraction_max: 0.4,
      },
    },
    warnings,
    failures,
    pass: failures.length === 0,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "compatibility_audit.json"),
    report,
  );
  if (!report.pass)
    throw new Error(`ORVYQ compatibility audit failed: ${failures.join("; ")}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`)
  runCompatibilityAudit(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
