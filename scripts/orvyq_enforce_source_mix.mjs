#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import {
  projectDir,
  readJson,
  readJsonSafe,
  writeJsonAtomic,
} from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const POLICY_PATH = path.join("config", "orvyq-production-policy.json");
const OFFICIAL_KINDS = new Set([
  "split_documents",
  "official_document",
  "official_figure",
  "official_screen",
  "image_sequence",
  "recap",
]);
const DERIVED_KINDS = new Set([
  "source_timeline",
  "source_article",
  "concept_map",
  "boundary",
  "comparison",
  "evidence_chain",
]);

const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function finiteFraction(value, fallback, label) {
  const resolved = value == null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(resolved) || resolved < 0 || resolved > 1) {
    throw new Error(`${label} must be a finite fraction between 0 and 1`);
  }
  return resolved;
}

function classifyShot(shot) {
  if (shot?.asset_type === "evidence") {
    if (OFFICIAL_KINDS.has(shot.evidence?.kind)) return "official";
    if (DERIVED_KINDS.has(shot.evidence?.kind)) return "derived";
    return "unknown_evidence";
  }
  if (
    shot?.asset_type === "graphic" &&
    shot.graphic?.source_backed === true &&
    shot.graphic?.provenance_mode === "source_derived_graphic" &&
    Array.isArray(shot.graphic?.source_ids) &&
    shot.graphic.source_ids.length > 0 &&
    String(shot.graphic?.source || "").trim()
  ) {
    return "derived";
  }
  return null;
}

export function measureSourceMix(plan) {
  const fps = Number(plan.fps || 30);
  const durationFrames = Math.max(1, Number(plan.duration_frames || 0));
  let officialFrames = 0;
  let derivedFrames = 0;
  let graphicFrames = 0;
  let contextualFrames = 0;
  let currentEvidenceFrames = 0;
  let maximumEvidenceFrames = 0;
  const unknownEvidenceShots = [];

  for (const shot of plan.shots || []) {
    const frames = Math.max(0, framesOf(shot));
    const classification = classifyShot(shot);
    if (classification === "official") officialFrames += frames;
    if (classification === "derived") derivedFrames += frames;
    if (classification === "unknown_evidence") unknownEvidenceShots.push(shot.shot_id);
    if (shot.asset_type === "graphic") graphicFrames += frames;
    if (
      shot.asset_type === "footage" &&
      shot.contextual_footage === true &&
      shot.provenance_mode === "approved_contextual_footage"
    ) {
      contextualFrames += frames;
    }
    if (shot.asset_type === "evidence") {
      currentEvidenceFrames += frames;
      maximumEvidenceFrames = Math.max(maximumEvidenceFrames, currentEvidenceFrames);
    } else {
      currentEvidenceFrames = 0;
    }
  }

  return {
    duration_frames: durationFrames,
    official_frames: officialFrames,
    derived_frames: derivedFrames,
    source_backed_frames: officialFrames + derivedFrames,
    graphic_frames: graphicFrames,
    contextual_frames: contextualFrames,
    official_fraction: officialFrames / durationFrames,
    derived_fraction: derivedFrames / durationFrames,
    source_backed_fraction: (officialFrames + derivedFrames) / durationFrames,
    graphic_fraction: graphicFrames / durationFrames,
    contextual_fraction: contextualFrames / durationFrames,
    maximum_uninterrupted_evidence_seconds: maximumEvidenceFrames / fps,
    unknown_evidence_shots: unknownEvidenceShots,
  };
}

function graphicTypeFor(evidence, ordinal) {
  if (evidence?.kind === "comparison") return "audit_tradeoff";
  if (evidence?.kind === "boundary") return "open_closed";
  if (evidence?.kind === "evidence_chain") return "safeguards";
  if (evidence?.kind === "concept_map") return "forecast_diverge";
  return ordinal % 2 === 0 ? "report_scan" : "compute_threshold";
}

function labelsFor(evidence) {
  const labels = [
    ...(Array.isArray(evidence?.steps) ? evidence.steps : []),
    evidence?.left,
    evidence?.right,
    evidence?.limitation,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());
  return [...new Set(labels)].slice(0, 4);
}

function convertContextualFootageToSourceGraphic(shot, ordinal) {
  const originalEvidence = structuredClone(shot.rebalanced_from?.evidence || {});
  const sourceIds = originalEvidence.source_ids || [];
  const source = String(
    originalEvidence.source_label ||
      originalEvidence.source ||
      sourceIds.join(" · "),
  ).trim();
  if (!sourceIds.length || !source) return false;

  const original = {
    asset_type: shot.asset_type,
    video_asset: shot.video_asset,
    trim_in_sec: shot.trim_in_sec,
    trim_out_sec: shot.trim_out_sec,
    motif: shot.motif,
  };
  delete shot.video_asset;
  delete shot.trim_in_sec;
  delete shot.trim_out_sec;
  delete shot.contextual_footage;
  delete shot.hook_footage;
  delete shot.provenance_mode;
  delete shot.evidence;

  shot.asset_type = "graphic";
  shot.visual_role = "graphic";
  shot.generic_stock = false;
  shot.graphic = {
    type: graphicTypeFor(originalEvidence, ordinal),
    family: "animated_source_context",
    kicker: "SOURCE-DERIVED ANALYSIS",
    title: originalEvidence.title || "What the source establishes",
    subtitle:
      originalEvidence.subtitle ||
      originalEvidence.limitation ||
      shot.editorial_purpose,
    labels: labelsFor(originalEvidence),
    source,
    source_ids: sourceIds,
    source_backed: true,
    provenance_mode: "source_derived_graphic",
  };
  shot.rebalanced_from = {
    ...(shot.rebalanced_from || {}),
    evidence: originalEvidence,
    source_mix_conversion: original,
  };
  shot.motif = `animated-source:${shot.claim_id || shot.shot_id}:${ordinal}`;
  return true;
}

function orderedCandidates(plan, lockedBoundaryFrame) {
  const candidates = (plan.shots || []).filter(
    (shot) =>
      Number(shot.end_frame) > lockedBoundaryFrame &&
      shot.asset_type === "footage" &&
      shot.contextual_footage === true &&
      shot.provenance_mode === "approved_contextual_footage" &&
      shot.rebalanced_from?.evidence,
  );
  const sectionUse = new Map();
  const ordered = [];
  const remaining = [...candidates];
  while (remaining.length) {
    remaining.sort((a, b) => {
      const sectionDelta =
        (sectionUse.get(a.section_id) || 0) -
        (sectionUse.get(b.section_id) || 0);
      if (sectionDelta !== 0) return sectionDelta;
      return framesOf(b) - framesOf(a);
    });
    const selected = remaining.shift();
    ordered.push(selected);
    sectionUse.set(
      selected.section_id,
      (sectionUse.get(selected.section_id) || 0) + 1,
    );
  }
  return ordered;
}

export async function enforceSourceMix(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [plan, policy] = await Promise.all([
    readJson(planPath),
    readJsonSafe(POLICY_PATH, {}),
  ]);
  const lockedBoundaryFrame = Number(
    plan.quality_policy?.proof_prefix_locked_through_frame ||
      plan.proof?.duration_frames,
  );
  if (!Number.isFinite(lockedBoundaryFrame) || lockedBoundaryFrame <= 0) {
    throw new Error("Locked proof boundary is missing or invalid");
  }

  const targetSourceFraction = Math.max(
    finiteFraction(policy.source_derived_minimum_fraction, 0.6, "Policy source minimum"),
    finiteFraction(
      plan.quality_policy?.evidence_asset_fraction_min,
      0.6,
      "Plan source minimum",
    ),
  );
  const targetOfficialFraction = Math.max(
    finiteFraction(policy.official_capture_minimum_fraction, 0.3, "Policy official minimum"),
    finiteFraction(
      plan.quality_policy?.official_capture_fraction_min,
      0.3,
      "Plan official minimum",
    ),
  );
  const maximumGraphicFraction = finiteFraction(
    plan.quality_policy?.full_screen_graphic_fraction_max,
    0.1,
    "Graphic maximum",
  );
  const maximumEvidenceSeconds = Number(
    plan.quality_policy?.maximum_uninterrupted_evidence_seconds ||
      policy.maximum_uninterrupted_evidence_seconds ||
      16,
  );
  if (!Number.isFinite(maximumEvidenceSeconds) || maximumEvidenceSeconds <= 0) {
    throw new Error("Maximum uninterrupted evidence duration is invalid");
  }

  const prefixShots = (plan.shots || []).filter(
    (shot) => Number(shot.end_frame) <= lockedBoundaryFrame,
  );
  const prefixHashBefore = hash(prefixShots);
  const before = measureSourceMix(plan);
  if (before.unknown_evidence_shots.length) {
    throw new Error(
      `Unknown evidence kinds prevent deterministic source accounting: ${before.unknown_evidence_shots.join(", ")}`,
    );
  }

  const requiredFrames = Math.max(
    0,
    Math.ceil(targetSourceFraction * before.duration_frames - before.source_backed_frames),
  );
  const graphicHeadroomFrames = Math.max(
    0,
    Math.floor(maximumGraphicFraction * before.duration_frames - before.graphic_frames),
  );
  const candidates = orderedCandidates(plan, lockedBoundaryFrame);
  const availableCandidateFrames = candidates.reduce(
    (sum, shot) => sum + framesOf(shot),
    0,
  );
  if (requiredFrames > graphicHeadroomFrames) {
    throw new Error(
      `Source-mix target needs ${requiredFrames} frames but graphic headroom is ${graphicHeadroomFrames}`,
    );
  }
  if (requiredFrames > availableCandidateFrames) {
    throw new Error(
      `Source-mix target needs ${requiredFrames} frames but only ${availableCandidateFrames} eligible contextual frames are available`,
    );
  }

  const converted = [];
  let metrics = before;
  for (const shot of candidates) {
    if (metrics.source_backed_fraction >= targetSourceFraction - 0.0001) break;
    const projectedGraphicFraction =
      (metrics.graphic_frames + framesOf(shot)) / metrics.duration_frames;
    if (projectedGraphicFraction > maximumGraphicFraction + 0.0001) continue;
    const ordinal = converted.length + 1;
    if (!convertContextualFootageToSourceGraphic(shot, ordinal)) continue;
    converted.push({
      shot_id: shot.shot_id,
      section_id: shot.section_id,
      duration_seconds: framesOf(shot) / Number(plan.fps || 30),
      graphic_type: shot.graphic.type,
      source_ids: shot.graphic.source_ids,
    });
    metrics = measureSourceMix(plan);
  }

  const after = measureSourceMix(plan);
  const prefixHashAfter = hash(
    (plan.shots || []).filter(
      (shot) => Number(shot.end_frame) <= lockedBoundaryFrame,
    ),
  );
  const failures = [];
  if (prefixHashBefore !== prefixHashAfter) failures.push("approved proof prefix changed");
  if (after.unknown_evidence_shots.length)
    failures.push(`unknown evidence kinds: ${after.unknown_evidence_shots.join(", ")}`);
  if (after.source_backed_fraction < targetSourceFraction - 0.0001)
    failures.push(
      `source-backed fraction ${(after.source_backed_fraction * 100).toFixed(2)}% < ${(targetSourceFraction * 100).toFixed(2)}%`,
    );
  if (after.official_fraction < targetOfficialFraction - 0.0001)
    failures.push(
      `official fraction ${(after.official_fraction * 100).toFixed(2)}% < ${(targetOfficialFraction * 100).toFixed(2)}%`,
    );
  if (after.graphic_fraction > maximumGraphicFraction + 0.0001)
    failures.push(
      `graphic fraction ${(after.graphic_fraction * 100).toFixed(2)}% > ${(maximumGraphicFraction * 100).toFixed(2)}%`,
    );
  if (
    after.maximum_uninterrupted_evidence_seconds >
    maximumEvidenceSeconds + 0.001
  )
    failures.push(
      `evidence run ${after.maximum_uninterrupted_evidence_seconds.toFixed(2)}s > ${maximumEvidenceSeconds}s`,
    );

  plan.generated_at = new Date().toISOString();
  plan.quality_policy = {
    ...plan.quality_policy,
    evidence_asset_fraction_min: targetSourceFraction,
    official_capture_fraction_min: targetOfficialFraction,
    source_mix_enforcement_version: "1.0-shared-semantic-accounting",
    source_mix_locked_proof_boundary_frame: lockedBoundaryFrame,
  };
  await writeJsonAtomic(planPath, plan);

  const report = {
    schema_version: "1.0-shared-semantic-accounting",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    locked_proof_boundary_frame: lockedBoundaryFrame,
    prefix_sha256: prefixHashAfter,
    prefix_unchanged: prefixHashBefore === prefixHashAfter,
    target_source_backed_fraction: targetSourceFraction,
    target_official_fraction: targetOfficialFraction,
    maximum_graphic_fraction: maximumGraphicFraction,
    maximum_uninterrupted_evidence_seconds: maximumEvidenceSeconds,
    required_additional_source_frames: requiredFrames,
    graphic_headroom_frames: graphicHeadroomFrames,
    available_candidate_frames: availableCandidateFrames,
    converted_count: converted.length,
    converted,
    before,
    after,
    failures,
    pass: failures.length === 0,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "source_mix_enforcement.json"),
    report,
  );
  if (!report.pass) {
    throw new Error(`ORVYQ source-mix enforcement failed: ${failures.join("; ")}`);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enforceSourceMix(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
