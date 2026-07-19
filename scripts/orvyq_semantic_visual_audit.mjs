#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";
import { auditMotionHook } from "./lib/orvyq-motion-hook.mjs";
import {
  isApprovedContextualFootage,
  isOpeningHookFootage,
  resolveVisualThresholds,
} from "./lib/orvyq-visual-policy.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const VALID_ROLES = new Set([
  "evidence",
  "archive",
  "context",
  "metaphor",
  "graphic",
]);
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
const CRITICAL = 5;

export async function runSemanticVisualAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, blueprint, evidenceMap] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
    loadResolvedEvidenceMap(dir),
  ]);
  const rules = blueprint.global_rules;
  const resolved = resolveVisualThresholds(plan);
  const editorial = resolved.editorial;
  const cinematicProof =
    plan.preview && editorial.mode === "cinematic_contextual";
  const failures = [];
  const warnings = [];
  let footageFrames = 0;
  let hookFrames = 0;
  let genericStockFrames = 0;
  let contextualBodyFrames = 0;
  let officialFrames = 0;
  let derivedFrames = 0;
  let pureGraphicFrames = 0;
  let emphasisBeats = 0;
  let currentEvidenceRunFrames = 0;
  let maximumEvidenceRunFrames = 0;
  const roleFrames = {};
  const motifUses = new Map();
  const imageUses = new Map();

  if (!editorial.declaration_matches_timeline) {
    failures.push(
      `declared editorial mode ${editorial.declared_mode} conflicts with inferred mode ${editorial.inferred_mode}`,
    );
  }

  for (const shot of plan.shots) {
    const frames = shot.end_frame - shot.start_frame;
    if (!VALID_ROLES.has(shot.visual_role))
      failures.push(`${shot.shot_id} invalid visual_role`);
    if (!shot.editorial_purpose || shot.editorial_purpose.length < 18)
      failures.push(`${shot.shot_id} lacks editorial purpose`);
    roleFrames[shot.visual_role] = (roleFrames[shot.visual_role] || 0) + frames;

    if (shot.asset_type === "footage") {
      footageFrames += frames;
      if (shot.generic_stock === true) genericStockFrames += frames;
      if (isOpeningHookFootage(shot)) hookFrames += frames;
      if (isApprovedContextualFootage(shot)) contextualBodyFrames += frames;
      if (shot.emphasis_card) emphasisBeats += 1;
      if (
        plan.preview &&
        !isOpeningHookFootage(shot) &&
        !(
          editorial.allows_contextual_body_footage &&
          isApprovedContextualFootage(shot)
        )
      ) {
        failures.push(`${shot.shot_id} uses unapproved body footage`);
      }
      currentEvidenceRunFrames = 0;
    } else if (shot.asset_type === "evidence") {
      currentEvidenceRunFrames += frames;
      maximumEvidenceRunFrames = Math.max(
        maximumEvidenceRunFrames,
        currentEvidenceRunFrames,
      );
      const kind = shot.evidence?.kind;
      if (OFFICIAL.has(kind)) officialFrames += frames;
      else if (DERIVED.has(kind)) derivedFrames += frames;
      else failures.push(`${shot.shot_id} unknown evidence kind ${kind}`);
      if (!(shot.evidence?.source_ids || []).length)
        failures.push(`${shot.shot_id} evidence has no source IDs`);
      for (const image of shot.evidence?.image_assets || [])
        imageUses.set(image, (imageUses.get(image) || 0) + 1);
    } else if (shot.asset_type === "graphic") {
      pureGraphicFrames += frames;
      currentEvidenceRunFrames = 0;
    } else {
      currentEvidenceRunFrames = 0;
    }

    const motif =
      shot.asset_type === "evidence"
        ? `evidence:${shot.evidence?.kind}:${shot.evidence?.title}`
        : shot.graphic?.type || shot.video_asset;
    if (motif) motifUses.set(motif, (motifUses.get(motif) || 0) + 1);
  }

  const duration = plan.duration_frames || 1;
  const genericFraction = genericStockFrames / duration;
  const totalFootageFraction = footageFrames / duration;
  const hookFraction = hookFrames / duration;
  const contextualBodyFraction = contextualBodyFrames / duration;
  const officialFraction = officialFrames / duration;
  const derivedFraction = derivedFrames / duration;
  const graphicFraction = pureGraphicFrames / duration;
  const totalEvidenceFraction = (officialFrames + derivedFrames) / duration;
  const motionHook = auditMotionHook(plan);

  if (plan.preview && !motionHook.pass) failures.push(...motionHook.failures);
  if (plan.preview && hookFraction > resolved.motion_hook_fraction_max + 0.0001)
    failures.push(
      `opening hook ${(hookFraction * 100).toFixed(1)}%; maximum ${(resolved.motion_hook_fraction_max * 100).toFixed(1)}%`,
    );
  if (genericFraction > resolved.generic_stock_fraction_max + 0.0001)
    failures.push(
      `generic stock ${(genericFraction * 100).toFixed(1)}%; maximum ${(resolved.generic_stock_fraction_max * 100).toFixed(1)}%`,
    );
  if (officialFraction < resolved.official_capture_fraction_min - 0.0001)
    failures.push(
      `official captures ${(officialFraction * 100).toFixed(1)}%; required ${(resolved.official_capture_fraction_min * 100).toFixed(1)}%`,
    );
  if (totalEvidenceFraction < resolved.evidence_asset_fraction_min - 0.0001)
    failures.push(
      `evidence/source-derived scenes ${(totalEvidenceFraction * 100).toFixed(1)}%; required ${(resolved.evidence_asset_fraction_min * 100).toFixed(1)}%`,
    );

  if (cinematicProof) {
    if (
      contextualBodyFraction <
      resolved.contextual_body_footage_fraction_min - 0.0001
    )
      failures.push(
        `contextual body footage ${(contextualBodyFraction * 100).toFixed(1)}%; minimum ${(resolved.contextual_body_footage_fraction_min * 100).toFixed(1)}%`,
      );
    if (
      contextualBodyFraction >
      resolved.contextual_body_footage_fraction_max + 0.0001
    )
      failures.push(
        `contextual body footage ${(contextualBodyFraction * 100).toFixed(1)}%; maximum ${(resolved.contextual_body_footage_fraction_max * 100).toFixed(1)}%`,
      );
    if (emphasisBeats < 4)
      failures.push(
        `cinematic proof contains ${emphasisBeats} emphasis beats; 4 required`,
      );
  }

  if (
    maximumEvidenceRunFrames / plan.fps >
    resolved.maximum_uninterrupted_evidence_seconds + 0.001
  )
    failures.push(
      `uninterrupted evidence run ${(maximumEvidenceRunFrames / plan.fps).toFixed(2)}s exceeds ${resolved.maximum_uninterrupted_evidence_seconds}s`,
    );
  if (
    graphicFraction >
    Math.min(
      resolved.full_screen_graphic_fraction_max,
      Number(rules.full_screen_graphic_fraction_max || 1),
    )
  )
    failures.push(`pure graphics ${(graphicFraction * 100).toFixed(1)}%`);

  for (const claim of evidenceMap.claims.filter(
    (item) => item.importance >= CRITICAL && item.status !== "removed",
  )) {
    const shots = plan.shots.filter((shot) => shot.claim_id === claim.claim_id);
    if (!shots.length) continue;
    if (
      !shots.some(
        (shot) =>
          shot.asset_type === "evidence" &&
          (shot.evidence?.source_ids || []).length,
      )
    )
      failures.push(
        `${claim.claim_id} has no physical source-backed evidence scene`,
      );
  }

  const overusedImages = [...imageUses.entries()].filter(
    ([, count]) => count > Number(rules.max_uses_per_source || 2),
  );
  if (overusedImages.length)
    failures.push(
      `primary images exceed use limit: ${overusedImages.map(([name, count]) => `${name}=${count}`).join(", ")}`,
    );
  const repeatedMotifs = [...motifUses.entries()].filter(([, count]) => count > 2);
  if (repeatedMotifs.length)
    warnings.push(
      `repeated motifs: ${repeatedMotifs.map(([name, count]) => `${name}=${count}`).join(", ")}`,
    );
  for (let index = 1; index < plan.shots.length; index++) {
    const previous = new Set(
      plan.shots[index - 1].evidence?.image_assets || [],
    );
    const current = new Set(plan.shots[index].evidence?.image_assets || []);
    if (current.size && [...current].every((image) => previous.has(image)))
      failures.push(
        `${plan.shots[index].shot_id} immediately repeats identical primary evidence`,
      );
  }

  const report = {
    schema_version: "3.0-compatible-visual-policy",
    project_id: projectId,
    preview: Boolean(plan.preview),
    editorial_mode: editorial.mode,
    editorial_mode_resolution: editorial,
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
      maximum_uninterrupted_evidence_seconds:
        resolved.maximum_uninterrupted_evidence_seconds,
    },
    role_fractions: Object.fromEntries(
      Object.entries(roleFrames).map(([role, frames]) => [role, frames / duration]),
    ),
    opening_hook_fraction: hookFraction,
    generic_stock_fraction: genericFraction,
    total_footage_fraction: totalFootageFraction,
    contextual_body_footage_fraction: contextualBodyFraction,
    official_primary_capture_fraction: officialFraction,
    source_derived_graphic_fraction: derivedFraction,
    evidence_archive_fraction: totalEvidenceFraction,
    full_screen_graphic_fraction: graphicFraction,
    emphasis_beat_count: emphasisBeats,
    maximum_uninterrupted_evidence_seconds:
      maximumEvidenceRunFrames / plan.fps,
    image_uses: Object.fromEntries(
      [...imageUses.entries()].sort((a, b) => b[1] - a[1]),
    ),
    metadata_cannot_override_asset_class: true,
    motion_hook: motionHook,
    warnings,
    failures,
    pass: failures.length === 0,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "semantic_visual_audit.json"),
    report,
  );
  if (!report.pass)
    throw new Error(
      `ORVYQ semantic visual audit failed: ${failures.join("; ")}`,
    );
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`)
  runSemanticVisualAudit()
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
