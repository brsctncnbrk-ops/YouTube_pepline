#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import { projectDir, readJson, readJsonSafe, writeJsonAtomic, pathExists } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const POLICY_PATH = path.join("config", "orvyq-production-policy.json");
const OFFICIAL_KINDS = new Set(["split_documents", "official_document", "official_figure", "official_screen", "image_sequence", "recap"]);
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);
const secondsOf = (shot, fps) => framesOf(shot) / fps;
const isOfficialCapture = (shot) => Boolean(
  shot?.asset_type === "evidence" &&
  OFFICIAL_KINDS.has(shot.evidence?.kind) &&
  Array.isArray(shot.evidence?.image_assets) &&
  shot.evidence.image_assets.length > 0 &&
  shot.evidence?.provenance_mode === "official_primary_capture",
);
const isSourceBackedGraphic = (shot) => Boolean(
  shot?.asset_type === "graphic" &&
  shot.graphic?.source_backed === true &&
  shot.graphic?.provenance_mode === "source_derived_graphic" &&
  Array.isArray(shot.graphic?.source_ids) &&
  shot.graphic.source_ids.length > 0,
);
const sectionForFrame = (sections, frame) => sections.find((section) => frame >= section.start_frame && frame < section.end_frame) || sections.at(-1);

export function measureFullPlanVisualMix(plan) {
  let officialFrames = 0;
  let evidenceFrames = 0;
  let sourceBackedGraphicFrames = 0;
  let contextualFrames = 0;
  let graphicFrames = 0;
  let currentEvidenceFrames = 0;
  let maximumEvidenceFrames = 0;
  for (const shot of plan.shots || []) {
    const frames = framesOf(shot);
    if (shot.asset_type === "evidence") {
      evidenceFrames += frames;
      currentEvidenceFrames += frames;
      maximumEvidenceFrames = Math.max(maximumEvidenceFrames, currentEvidenceFrames);
      if (isOfficialCapture(shot)) officialFrames += frames;
    } else {
      currentEvidenceFrames = 0;
      if (shot.asset_type === "footage" && shot.contextual_footage === true) contextualFrames += frames;
      if (shot.asset_type === "graphic") {
        graphicFrames += frames;
        if (isSourceBackedGraphic(shot)) sourceBackedGraphicFrames += frames;
      }
    }
  }
  const duration = Math.max(1, Number(plan.duration_frames));
  return {
    official_frames: officialFrames,
    official_fraction: officialFrames / duration,
    physical_evidence_frames: evidenceFrames,
    source_backed_graphic_frames: sourceBackedGraphicFrames,
    evidence_frames: evidenceFrames + sourceBackedGraphicFrames,
    evidence_fraction: (evidenceFrames + sourceBackedGraphicFrames) / duration,
    contextual_frames: contextualFrames,
    contextual_fraction: contextualFrames / duration,
    graphic_frames: graphicFrames,
    graphic_fraction: graphicFrames / duration,
    maximum_uninterrupted_evidence_seconds: maximumEvidenceFrames / Number(plan.fps || 30),
  };
}

async function loadFootagePool(dir, plan, composition) {
  const unique = new Map();
  for (const scene of composition.scenes || []) {
    if (!scene.video_asset || unique.has(scene.video_asset)) continue;
    const localPath = path.join(dir, scene.video_asset);
    const provenancePath = `${localPath}.provenance.json`;
    if (!(await pathExists(localPath)) || !(await pathExists(provenancePath))) continue;
    const provenance = await readJson(provenancePath);
    if (provenance.approved_for_final_edit !== true || !provenance.license_url) continue;
    const duration = Number(provenance.actual_duration_seconds || provenance.duration || scene.trim_out_sec || 0);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    unique.set(scene.video_asset, {
      asset: scene.video_asset,
      duration,
      section_id: sectionForFrame(plan.sections || [], scene.start_frame)?.section_id || null,
    });
  }
  return [...unique.values()];
}

function buildAssetsBySource(manifest) {
  const map = new Map();
  for (const asset of manifest.assets || []) {
    if (!asset.local_asset || !asset.evidence_asset_id) continue;
    for (const sourceId of asset.source_ids || []) {
      const list = map.get(sourceId) || [];
      list.push(asset);
      map.set(sourceId, list);
    }
  }
  return map;
}

function evidenceRuns(plan, lockedBoundaryFrame) {
  const runs = [];
  let current = [];
  for (const shot of plan.shots || []) {
    if (shot.end_frame <= lockedBoundaryFrame) continue;
    if (shot.asset_type === "evidence") current.push(shot);
    else if (current.length) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

function sourceBackedGraphicFromEvidence(shot) {
  const originalEvidence = structuredClone(shot.evidence || {});
  const sourceIds = originalEvidence.source_ids || [];
  const source = String(originalEvidence.source_label || originalEvidence.source || sourceIds.join(" · ")).trim();
  if (!sourceIds.length || !source) return false;
  delete shot.evidence;
  delete shot.video_asset;
  delete shot.trim_in_sec;
  delete shot.trim_out_sec;
  delete shot.contextual_footage;
  delete shot.provenance_mode;
  shot.asset_type = "graphic";
  shot.visual_role = "graphic";
  shot.generic_stock = false;
  shot.graphic = {
    type: "report_scan",
    family: "source_context",
    kicker: "SOURCE-BACKED CONTEXT",
    title: originalEvidence.title || "What the source establishes",
    subtitle: originalEvidence.subtitle || shot.editorial_purpose,
    labels: (originalEvidence.steps || []).slice(0, 3),
    source,
    source_ids: sourceIds,
    source_backed: true,
    provenance_mode: "source_derived_graphic",
  };
  shot.rebalanced_from = { asset_type: "evidence", evidence: originalEvidence, motif: shot.motif };
  shot.motif = `source-backed:${shot.claim_id || shot.shot_id}`;
  return true;
}

function selectFootage(footagePool, shot, footageUses, maxUses) {
  const duration = secondsOf(shot, Number(shot.fps || 30));
  const preferred = footagePool.filter((entry) => entry.section_id === shot.section_id);
  return [...preferred, ...footagePool.filter((entry) => entry.section_id !== shot.section_id)]
    .filter((entry, index, list) => list.findIndex((item) => item.asset === entry.asset) === index)
    .filter((entry) => (footageUses.get(entry.asset) || 0) < maxUses && entry.duration >= duration + 0.02)
    .sort((a, b) => (footageUses.get(a.asset) || 0) - (footageUses.get(b.asset) || 0))[0] || null;
}

function convertEvidenceToFootage(shot, selected, trimCursor, footageUses, fps) {
  const duration = secondsOf(shot, fps);
  let trimIn = trimCursor.get(selected.asset) || 0;
  if (trimIn + duration > selected.duration) trimIn = 0;
  const trimOut = trimIn + duration;
  const originalEvidence = structuredClone(shot.evidence || {});
  const originalMotif = shot.motif;
  delete shot.evidence;
  delete shot.graphic;
  shot.asset_type = "footage";
  shot.visual_role = "context";
  shot.video_asset = selected.asset;
  shot.trim_in_sec = Math.round(trimIn * 1000) / 1000;
  shot.trim_out_sec = Math.round(trimOut * 1000) / 1000;
  shot.motion_variant = "hold";
  shot.contextual_footage = true;
  shot.hook_footage = false;
  shot.provenance_mode = "approved_contextual_footage";
  shot.generic_stock = false;
  shot.motif = selected.asset;
  shot.rebalanced_from = { asset_type: "evidence", evidence: originalEvidence, motif: originalMotif };
  footageUses.set(selected.asset, (footageUses.get(selected.asset) || 0) + 1);
  trimCursor.set(selected.asset, trimOut);
}

export function chooseBreakerShot(run, plan, targetOfficialFraction) {
  const durationFrames = Math.max(1, Number(plan.duration_frames));
  const currentOfficialFrames = measureFullPlanVisualMix(plan).official_frames;
  const midpoint = (Number(run[0].start_frame) + Number(run.at(-1).end_frame)) / 2;
  return [...run]
    .filter((shot) => !isOfficialCapture(shot) || (currentOfficialFrames - framesOf(shot)) / durationFrames >= targetOfficialFraction - 0.0001)
    .sort((a, b) => {
      const officialPenalty = Number(isOfficialCapture(a)) - Number(isOfficialCapture(b));
      if (officialPenalty !== 0) return officialPenalty;
      const distanceA = Math.abs((a.start_frame + a.end_frame) / 2 - midpoint);
      const distanceB = Math.abs((b.start_frame + b.end_frame) / 2 - midpoint);
      return distanceA - distanceB;
    })[0] || null;
}

export function promoteSourceBackedBreakers(plan, { lockedBoundaryFrame, targetEvidenceFraction, maximumGraphicFraction }) {
  const converted = [];
  let metrics = measureFullPlanVisualMix(plan);
  for (const shot of plan.shots || []) {
    if (metrics.evidence_fraction >= targetEvidenceFraction - 0.0001) break;
    if (shot.end_frame <= lockedBoundaryFrame || shot.asset_type !== "footage" || !shot.rebalanced_from?.evidence) continue;
    const projectedGraphicFraction = (metrics.graphic_frames + framesOf(shot)) / Math.max(1, Number(plan.duration_frames));
    if (projectedGraphicFraction > maximumGraphicFraction + 0.0001) continue;
    const snapshot = structuredClone(shot);
    shot.evidence = structuredClone(shot.rebalanced_from.evidence);
    if (!sourceBackedGraphicFromEvidence(shot)) {
      Object.keys(shot).forEach((key) => delete shot[key]);
      Object.assign(shot, snapshot);
      continue;
    }
    converted.push({ shot_id: shot.shot_id, duration_seconds: framesOf(shot) / Number(plan.fps || 30) });
    metrics = measureFullPlanVisualMix(plan);
  }
  return { converted, metrics };
}

export function restoreOfficialBreakers(plan, { lockedBoundaryFrame, targetOfficialFraction, maximumEvidenceSeconds, minimumOfficialSeconds = 4, assetsBySource, imageUses, maxUses }) {
  const converted = [];
  const fps = Number(plan.fps || 30);
  let metrics = measureFullPlanVisualMix(plan);
  for (const shot of plan.shots || []) {
    if (metrics.official_fraction >= targetOfficialFraction - 0.0001) break;
    if (shot.end_frame <= lockedBoundaryFrame || shot.asset_type !== "footage" || !shot.rebalanced_from?.evidence || secondsOf(shot, fps) < minimumOfficialSeconds) continue;
    const originalEvidence = structuredClone(shot.rebalanced_from.evidence);
    const candidates = (originalEvidence.source_ids || [])
      .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
      .filter((asset, index, list) => list.findIndex((item) => item.evidence_asset_id === asset.evidence_asset_id) === index)
      .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
      .sort((a, b) => (imageUses.get(a.local_asset) || 0) - (imageUses.get(b.local_asset) || 0));
    const selected = candidates[0];
    if (!selected) continue;
    const snapshot = structuredClone(shot);
    Object.keys(shot).forEach((key) => delete shot[key]);
    Object.assign(shot, snapshot, {
      asset_type: "evidence",
      visual_role: "evidence",
      generic_stock: false,
      evidence: { ...originalEvidence, kind: "official_screen", eyebrow: "OFFICIAL PRIMARY SOURCE", image_assets: [selected.local_asset], evidence_asset_ids: [selected.evidence_asset_id], provenance_mode: "official_primary_capture" },
    });
    delete shot.video_asset;
    delete shot.trim_in_sec;
    delete shot.trim_out_sec;
    delete shot.contextual_footage;
    delete shot.provenance_mode;
    const projected = measureFullPlanVisualMix(plan);
    if (projected.maximum_uninterrupted_evidence_seconds > maximumEvidenceSeconds + 0.001) {
      Object.keys(shot).forEach((key) => delete shot[key]);
      Object.assign(shot, snapshot);
      continue;
    }
    imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
    converted.push({ shot_id: shot.shot_id, evidence_asset_id: selected.evidence_asset_id, local_asset: selected.local_asset });
    metrics = projected;
  }
  return { converted, metrics };
}

export async function rebalanceFullPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [plan, timeline, manifest, composition, blueprint, policy] = await Promise.all([
    readJson(planPath),
    readJson(path.join(dir, "direction", "narration_timeline.json")),
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJson(path.join(dir, "remotion", "composition.json")),
    readJsonSafe(path.join(dir, "direction", "editorial_blueprint.json"), { global_rules: {} }),
    readJsonSafe(POLICY_PATH, {}),
  ]);
  const fps = Number(plan.fps || 30);
  const semanticFrame = Math.ceil(Number(timeline.proof?.speech_output_end_seconds || 0) * fps);
  const boundaryShot = (plan.shots || []).find((shot) => Number(shot.end_frame) >= semanticFrame);
  if (!boundaryShot) throw new Error("Cannot resolve the locked semantic proof boundary");
  const lockedBoundaryFrame = Number(boundaryShot.end_frame);
  const prefixHashBefore = hash((plan.shots || []).filter((shot) => shot.end_frame <= lockedBoundaryFrame));
  const targetOfficialFraction = Math.max(Number(policy.official_capture_minimum_fraction || 0.3), Number(manifest.policy?.minimum_official_capture_fraction || 0.3));
  const targetEvidenceFraction = Math.max(Number(policy.source_derived_minimum_fraction || 0.6), Number(plan.quality_policy?.evidence_asset_fraction_min || 0.6));
  const minimumOfficialSeconds = Math.max(Number(policy.official_capture_minimum_seconds || 4), 4);
  const maxEvidenceSeconds = Math.min(Number(policy.maximum_uninterrupted_evidence_seconds || 16), Number(manifest.policy?.maximum_uninterrupted_evidence_seconds || 16));
  const maximumGraphicFraction = Math.min(Number(plan.quality_policy?.full_screen_graphic_fraction_max || 0.1), Number(blueprint.global_rules?.full_screen_graphic_fraction_max || 0.1));
  const maxUses = Math.min(Number(plan.quality_policy?.max_uses_per_source || 5), Number(blueprint.global_rules?.max_uses_per_source || 5));
  const assetsBySource = buildAssetsBySource(manifest);
  const imageUses = new Map();
  const footageUses = new Map();
  for (const shot of plan.shots || []) {
    shot.fps = fps;
    for (const image of shot.evidence?.image_assets || []) imageUses.set(image, (imageUses.get(image) || 0) + 1);
    if (shot.asset_type === "footage" && shot.video_asset) footageUses.set(shot.video_asset, (footageUses.get(shot.video_asset) || 0) + 1);
  }
  const footagePool = await loadFootagePool(dir, plan, composition);
  if (!footagePool.length) throw new Error("No approved contextual footage pool is available");
  const trimCursor = new Map();
  const convertedBreakers = [];
  let iterations = 0;
  while (measureFullPlanVisualMix(plan).maximum_uninterrupted_evidence_seconds > maxEvidenceSeconds + 0.001) {
    if (++iterations > 100) throw new Error("Evidence-chain rebalance exceeded deterministic iteration limit");
    const run = evidenceRuns(plan, lockedBoundaryFrame).find((items) => items.reduce((sum, shot) => sum + framesOf(shot), 0) / fps > maxEvidenceSeconds + 0.001);
    if (!run) break;
    const candidate = chooseBreakerShot(run, plan, targetOfficialFraction);
    if (!candidate) throw new Error("No breaker candidate can preserve the official capture floor");
    const projectedGraphicFraction = (measureFullPlanVisualMix(plan).graphic_frames + framesOf(candidate)) / Math.max(1, Number(plan.duration_frames));
    if (!isOfficialCapture(candidate) && projectedGraphicFraction <= maximumGraphicFraction + 0.0001 && sourceBackedGraphicFromEvidence(candidate)) {
      convertedBreakers.push({ shot_id: candidate.shot_id, mode: "source_backed_graphic", duration_seconds: framesOf(candidate) / fps });
      continue;
    }
    const selected = selectFootage(footagePool, candidate, footageUses, maxUses);
    if (!selected) throw new Error(`No approved contextual footage can break the evidence run at ${candidate.shot_id}`);
    convertEvidenceToFootage(candidate, selected, trimCursor, footageUses, fps);
    convertedBreakers.push({ shot_id: candidate.shot_id, mode: "contextual_footage", video_asset: selected.asset, duration_seconds: framesOf(candidate) / fps });
  }

  let metrics = measureFullPlanVisualMix(plan);
  const convertedOfficial = [];
  for (const shot of plan.shots || []) {
    if (metrics.official_fraction >= targetOfficialFraction - 0.0001) break;
    if (shot.end_frame <= lockedBoundaryFrame || shot.asset_type !== "evidence" || isOfficialCapture(shot) || secondsOf(shot, fps) + 0.001 < minimumOfficialSeconds) continue;
    const candidates = (shot.evidence?.source_ids || [])
      .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
      .filter((asset, index, list) => list.findIndex((item) => item.evidence_asset_id === asset.evidence_asset_id) === index)
      .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
      .sort((a, b) => (imageUses.get(a.local_asset) || 0) - (imageUses.get(b.local_asset) || 0));
    const selected = candidates[0];
    if (!selected) continue;
    shot.evidence = { ...shot.evidence, derived_kind: shot.evidence?.kind, kind: "official_screen", eyebrow: "OFFICIAL PRIMARY SOURCE", image_assets: [selected.local_asset], evidence_asset_ids: [selected.evidence_asset_id], provenance_mode: "official_primary_capture" };
    imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
    convertedOfficial.push({ shot_id: shot.shot_id, evidence_asset_id: selected.evidence_asset_id, local_asset: selected.local_asset });
    metrics = measureFullPlanVisualMix(plan);
  }

  const evidenceRecovery = promoteSourceBackedBreakers(plan, { lockedBoundaryFrame, targetEvidenceFraction, maximumGraphicFraction });
  metrics = evidenceRecovery.metrics;
  if (metrics.official_fraction < targetOfficialFraction - 0.0001) throw new Error(`Official capture target not reached: ${(metrics.official_fraction * 100).toFixed(2)}% < ${(targetOfficialFraction * 100).toFixed(2)}%`);
  if (metrics.evidence_fraction < targetEvidenceFraction - 0.0001) throw new Error(`Evidence/source-derived target not reached: ${(metrics.evidence_fraction * 100).toFixed(2)}% < ${(targetEvidenceFraction * 100).toFixed(2)}%`);
  if (metrics.maximum_uninterrupted_evidence_seconds > maxEvidenceSeconds + 0.001) throw new Error(`Evidence run remains ${metrics.maximum_uninterrupted_evidence_seconds.toFixed(2)}s`);
  if (metrics.graphic_fraction > maximumGraphicFraction + 0.0001) throw new Error(`Full-screen graphic fraction ${(metrics.graphic_fraction * 100).toFixed(2)}% exceeds ${(maximumGraphicFraction * 100).toFixed(2)}%`);
  const prefixHashAfter = hash((plan.shots || []).filter((shot) => shot.end_frame <= lockedBoundaryFrame));
  if (prefixHashBefore !== prefixHashAfter) throw new Error("The approved semantic proof prefix changed during full-film rebalance");
  const terminal = (plan.shots || []).filter((shot) => shot.graphic?.type === "brand_close");
  if (terminal.length !== 1 || terminal[0] !== plan.shots.at(-1)) throw new Error("Terminal brand close invariant failed after rebalance");
  for (const shot of plan.shots || []) delete shot.fps;
  plan.generated_at = new Date().toISOString();
  plan.quality_policy = { ...plan.quality_policy, official_capture_fraction_min: targetOfficialFraction, evidence_asset_fraction_min: targetEvidenceFraction, minimum_official_capture_seconds: minimumOfficialSeconds, maximum_uninterrupted_evidence_seconds: maxEvidenceSeconds, full_film_rebalance_version: "2.0-floor-preserving", proof_prefix_sha256: prefixHashAfter, proof_prefix_locked_through_frame: lockedBoundaryFrame };
  await writeJsonAtomic(planPath, plan);
  const report = { schema_version: "2.0-floor-preserving", project_id: projectId, generated_at: new Date().toISOString(), locked_proof_boundary_frame: lockedBoundaryFrame, proof_prefix_sha256: prefixHashAfter, prefix_unchanged: true, target_official_capture_fraction: targetOfficialFraction, target_evidence_fraction: targetEvidenceFraction, maximum_graphic_fraction: maximumGraphicFraction, maximum_evidence_seconds: maxEvidenceSeconds, converted_official_count: convertedOfficial.length, converted_breaker_count: convertedBreakers.length, converted_source_backed_graphic_count: evidenceRecovery.converted.length, converted_official: convertedOfficial, converted_breakers: convertedBreakers, converted_source_backed_graphics: evidenceRecovery.converted, metrics, pass: true };
  await writeJsonAtomic(path.join(dir, "qa", "full_film_rebalance.json"), report);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebalanceFullPlan(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
}
