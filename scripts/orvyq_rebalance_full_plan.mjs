#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import { projectDir, readJson, readJsonSafe, writeJsonAtomic, pathExists } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const OFFICIAL_KINDS = new Set(["split_documents", "official_document", "official_figure", "official_screen", "image_sequence", "recap"]);
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);
const sectionForFrame = (sections, frame) => sections.find((section) => frame >= section.start_frame && frame < section.end_frame) || sections.at(-1);
const isSourceBackedGraphic = (shot) => Boolean(
  shot?.asset_type === "graphic" &&
  shot.graphic?.source_backed === true &&
  shot.graphic?.provenance_mode === "source_derived_graphic" &&
  Array.isArray(shot.graphic?.source_ids) &&
  shot.graphic.source_ids.length > 0 &&
  String(shot.graphic?.source || "").trim(),
);

async function loadFootagePool(dir, plan, composition) {
  const unique = new Map();
  for (const scene of composition.scenes || []) {
    if (!scene.video_asset || unique.has(scene.video_asset)) continue;
    const provenancePath = path.join(dir, `${scene.video_asset}.provenance.json`);
    if (!(await pathExists(path.join(dir, scene.video_asset))) || !(await pathExists(provenancePath))) continue;
    const provenance = await readJson(provenancePath);
    if (provenance.approved_for_final_edit !== true || !provenance.license_url) continue;
    const duration = Number(provenance.actual_duration_seconds || provenance.duration || scene.trim_out_sec || 0);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    unique.set(scene.video_asset, {
      asset: scene.video_asset,
      duration,
      section_id: sectionForFrame(plan.sections, scene.start_frame)?.section_id || null,
      purpose: scene.text_overlay || `Context footage for ${scene.scene_id}`,
    });
  }
  return [...unique.values()];
}

export function measureFullPlanVisualMix(plan) {
  let officialFrames = 0;
  let evidenceFrames = 0;
  let sourceBackedGraphicFrames = 0;
  let contextualFrames = 0;
  let graphicFrames = 0;
  let currentEvidence = 0;
  let maximumEvidence = 0;
  for (const shot of plan.shots || []) {
    const frames = framesOf(shot);
    if (shot.asset_type === "evidence") {
      evidenceFrames += frames;
      currentEvidence += frames;
      maximumEvidence = Math.max(maximumEvidence, currentEvidence);
      if (OFFICIAL_KINDS.has(shot.evidence?.kind) && (shot.evidence?.image_assets || []).length) officialFrames += frames;
    } else {
      currentEvidence = 0;
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
    maximum_uninterrupted_evidence_seconds: maximumEvidence / Number(plan.fps || 30),
  };
}

export function promoteSourceBackedBreakers(plan, {
  lockedBoundaryFrame,
  targetEvidenceFraction,
  maximumGraphicFraction,
}) {
  const converted = [];
  let metrics = measureFullPlanVisualMix(plan);
  for (const shot of plan.shots || []) {
    if (metrics.evidence_fraction >= targetEvidenceFraction - 0.0001) break;
    if (shot.end_frame <= lockedBoundaryFrame) continue;
    if (shot.asset_type !== "footage" || !shot.rebalanced_from?.evidence) continue;
    const frames = framesOf(shot);
    const projectedGraphicFraction = (metrics.graphic_frames + frames) / Math.max(1, Number(plan.duration_frames));
    if (projectedGraphicFraction > maximumGraphicFraction + 0.0001) continue;
    const originalEvidence = shot.rebalanced_from.evidence;
    const sourceIds = originalEvidence.source_ids || [];
    const source = String(originalEvidence.source_label || originalEvidence.source || sourceIds.join(" · ")).trim();
    if (!sourceIds.length || !source) continue;
    const originalMotif = shot.rebalanced_from.motif || shot.motif;
    delete shot.video_asset;
    delete shot.trim_in_sec;
    delete shot.trim_out_sec;
    delete shot.motion_variant;
    delete shot.contextual_footage;
    delete shot.hook_footage;
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
    shot.motif = `source-backed:${shot.claim_id || shot.shot_id}:${originalMotif || "context"}`;
    shot.editorial_purpose = `${shot.editorial_purpose} Present the same source context as a visibly attributed moving graphic so it resets the screenshot run without weakening evidence provenance.`;
    converted.push({
      shot_id: shot.shot_id,
      section_id: shot.section_id,
      source_ids: sourceIds,
      duration_seconds: frames / Number(plan.fps || 30),
    });
    metrics = measureFullPlanVisualMix(plan);
  }
  return { converted, metrics };
}

export function restoreOfficialBreakers(plan, {
  lockedBoundaryFrame,
  targetOfficialFraction,
  maximumEvidenceSeconds,
  minimumOfficialSeconds = 4,
  assetsBySource,
  imageUses,
  maxUses,
}) {
  const converted = [];
  const fps = Number(plan.fps || 30);
  let metrics = measureFullPlanVisualMix(plan);
  for (const shot of plan.shots || []) {
    if (metrics.official_fraction >= targetOfficialFraction - 0.0001) break;
    if (shot.end_frame <= lockedBoundaryFrame) continue;
    if (shot.asset_type !== "footage" || !shot.rebalanced_from?.evidence) continue;
    const frames = framesOf(shot);
    if (frames / fps < minimumOfficialSeconds) continue;

    const originalEvidence = shot.rebalanced_from.evidence;
    const sourceIds = originalEvidence.source_ids || [];
    const candidates = sourceIds
      .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
      .filter((asset, index, list) => list.findIndex((item) => item.evidence_asset_id === asset.evidence_asset_id) === index)
      .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
      .sort((a, b) => (imageUses.get(a.local_asset) || 0) - (imageUses.get(b.local_asset) || 0));
    const selected = candidates[0];
    if (!selected) continue;

    const snapshot = structuredClone(shot);
    delete shot.video_asset;
    delete shot.trim_in_sec;
    delete shot.trim_out_sec;
    delete shot.motion_variant;
    delete shot.contextual_footage;
    delete shot.hook_footage;
    delete shot.provenance_mode;
    delete shot.graphic;
    shot.asset_type = "evidence";
    shot.visual_role = "evidence";
    shot.generic_stock = false;
    shot.evidence = {
      ...originalEvidence,
      kind: "official_screen",
      eyebrow: "OFFICIAL PRIMARY SOURCE",
      image_assets: [selected.local_asset],
      evidence_asset_ids: [selected.evidence_asset_id],
      provenance_mode: "official_primary_capture",
      source_ids: sourceIds,
    };
    shot.motif = `${shot.claim_id}:official-recovered:${selected.evidence_asset_id}`;
    shot.editorial_purpose = `${snapshot.editorial_purpose} Restore a legible official primary-source capture while preserving the approved proof boundary and the uninterrupted-evidence limit.`;

    const projected = measureFullPlanVisualMix(plan);
    if (projected.maximum_uninterrupted_evidence_seconds > maximumEvidenceSeconds + 0.001) {
      Object.keys(shot).forEach((key) => delete shot[key]);
      Object.assign(shot, snapshot);
      continue;
    }
    imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
    converted.push({
      shot_id: shot.shot_id,
      section_id: shot.section_id,
      evidence_asset_id: selected.evidence_asset_id,
      local_asset: selected.local_asset,
      duration_seconds: frames / fps,
    });
    metrics = projected;
  }
  return { converted, metrics };
}

export async function rebalanceFullPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [plan, timeline, manifest, composition, blueprint] = await Promise.all([
    readJson(planPath),
    readJson(path.join(dir, "direction", "narration_timeline.json")),
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJson(path.join(dir, "remotion", "composition.json")),
    readJsonSafe(path.join(dir, "direction", "editorial_blueprint.json"), { global_rules: {} }),
  ]);
  const fps = Number(plan.fps || 30);
  const semanticFrame = Math.ceil(Number(timeline.proof?.speech_output_end_seconds || 0) * fps);
  const boundaryShot = plan.shots.find((shot) => shot.end_frame >= semanticFrame);
  if (!boundaryShot) throw new Error("Cannot resolve the locked semantic proof boundary");
  const lockedBoundaryFrame = Number(boundaryShot.end_frame);
  const lockedPrefixBefore = plan.shots.filter((shot) => shot.end_frame <= lockedBoundaryFrame);
  const prefixHashBefore = hash(lockedPrefixBefore);
  const maxUses = Math.min(Number(plan.quality_policy?.max_uses_per_source || 5), Number(blueprint.global_rules?.max_uses_per_source || 5));
  const targetOfficialFraction = Math.max(0.3, Number(manifest.policy?.minimum_official_capture_fraction || 0.3));
  const targetEvidenceFraction = Math.max(0.6, Number(plan.quality_policy?.evidence_asset_fraction_min || 0.6));
  const maxEvidenceSeconds = Math.min(16, Number(manifest.policy?.maximum_uninterrupted_evidence_seconds || 16));
  const maximumGraphicFraction = Math.min(
    Number(plan.quality_policy?.full_screen_graphic_fraction_max || 0.1),
    Number(blueprint.global_rules?.full_screen_graphic_fraction_max || 0.1),
  );

  const assetsBySource = new Map();
  for (const asset of manifest.assets || []) {
    for (const sourceId of asset.source_ids || []) {
      const list = assetsBySource.get(sourceId) || [];
      list.push(asset);
      assetsBySource.set(sourceId, list);
    }
  }
  const imageUses = new Map();
  const footageUses = new Map();
  for (const shot of plan.shots || []) {
    for (const image of shot.evidence?.image_assets || []) imageUses.set(image, (imageUses.get(image) || 0) + 1);
    if (shot.asset_type === "footage") footageUses.set(shot.video_asset, (footageUses.get(shot.video_asset) || 0) + 1);
  }
  const footagePool = await loadFootagePool(dir, plan, composition);
  if (!footagePool.length) throw new Error("No approved contextual footage pool is available");
  const trimCursor = new Map();
  const convertedBreakers = [];
  let evidenceRunFrames = 0;

  for (const shot of plan.shots) {
    if (shot.end_frame <= lockedBoundaryFrame) {
      evidenceRunFrames = shot.asset_type === "evidence" ? evidenceRunFrames + framesOf(shot) : 0;
      continue;
    }
    if (shot.asset_type !== "evidence") {
      evidenceRunFrames = 0;
      continue;
    }
    const shotFrames = framesOf(shot);
    if ((evidenceRunFrames + shotFrames) / fps <= maxEvidenceSeconds - 0.25) {
      evidenceRunFrames += shotFrames;
      continue;
    }
    const duration = shotFrames / fps;
    const preferred = footagePool.filter((entry) => entry.section_id === shot.section_id);
    const candidates = [...preferred, ...footagePool.filter((entry) => entry.section_id !== shot.section_id)]
      .filter((entry, index, list) => list.findIndex((item) => item.asset === entry.asset) === index)
      .filter((entry) => (footageUses.get(entry.asset) || 0) < maxUses && entry.duration >= duration + 0.02)
      .sort((a, b) => (footageUses.get(a.asset) || 0) - (footageUses.get(b.asset) || 0));
    const selected = candidates[0];
    if (!selected) throw new Error(`No approved contextual footage can break the evidence run at ${shot.shot_id}`);
    const priorCursor = trimCursor.get(selected.asset) || 0;
    let trimIn = priorCursor;
    if (trimIn + duration > selected.duration) trimIn = 0;
    const trimOut = trimIn + duration;
    const originalEvidence = shot.evidence;
    const originalMotif = shot.motif;
    delete shot.evidence;
    shot.asset_type = "footage";
    shot.visual_role = "context";
    shot.editorial_purpose = `${shot.editorial_purpose} Break the evidence sequence with licensed, section-relevant moving context; the footage is not presented as literal proof of the cited claim.`;
    shot.video_asset = selected.asset;
    shot.trim_in_sec = Math.round(trimIn * 1000) / 1000;
    shot.trim_out_sec = Math.round(trimOut * 1000) / 1000;
    shot.motion_variant = "hold";
    shot.contextual_footage = true;
    shot.hook_footage = false;
    shot.provenance_mode = "approved_contextual_footage";
    shot.generic_stock = false;
    shot.motif = selected.asset;
    shot.rebalanced_from = { asset_type: "evidence", kind: originalEvidence?.kind || null, evidence: originalEvidence, motif: originalMotif };
    footageUses.set(selected.asset, (footageUses.get(selected.asset) || 0) + 1);
    trimCursor.set(selected.asset, trimOut);
    convertedBreakers.push({ shot_id: shot.shot_id, section_id: shot.section_id, video_asset: selected.asset, duration_seconds: duration });
    evidenceRunFrames = 0;
  }

  let metrics = measureFullPlanVisualMix(plan);
  const convertedOfficial = [];
  let previousImage = null;
  for (const shot of plan.shots) {
    if (metrics.official_fraction >= targetOfficialFraction) break;
    if (shot.end_frame <= lockedBoundaryFrame || shot.asset_type !== "evidence") continue;
    if (OFFICIAL_KINDS.has(shot.evidence?.kind) && (shot.evidence?.image_assets || []).length) {
      previousImage = shot.evidence.image_assets[0] || previousImage;
      continue;
    }
    const sourceIds = shot.evidence?.source_ids || [];
    const candidates = sourceIds
      .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
      .filter((asset, index, list) => list.findIndex((item) => item.evidence_asset_id === asset.evidence_asset_id) === index)
      .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
      .sort((a, b) => {
        const repeatA = a.local_asset === previousImage ? 1 : 0;
        const repeatB = b.local_asset === previousImage ? 1 : 0;
        if (repeatA !== repeatB) return repeatA - repeatB;
        return (imageUses.get(a.local_asset) || 0) - (imageUses.get(b.local_asset) || 0);
      });
    const selected = candidates[0];
    if (!selected) continue;
    shot.evidence = {
      ...shot.evidence,
      kind: "official_screen",
      eyebrow: "OFFICIAL PRIMARY SOURCE",
      image_assets: [selected.local_asset],
      evidence_asset_ids: [selected.evidence_asset_id],
      provenance_mode: "official_primary_capture",
      source_ids: sourceIds,
    };
    shot.motif = `${shot.claim_id}:official:${selected.evidence_asset_id}`;
    imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
    previousImage = selected.local_asset;
    convertedOfficial.push({ shot_id: shot.shot_id, section_id: shot.section_id, evidence_asset_id: selected.evidence_asset_id, local_asset: selected.local_asset });
    metrics = measureFullPlanVisualMix(plan);
  }

  const officialRecovery = restoreOfficialBreakers(plan, {
    lockedBoundaryFrame,
    targetOfficialFraction,
    maximumEvidenceSeconds: maxEvidenceSeconds,
    minimumOfficialSeconds: 4,
    assetsBySource,
    imageUses,
    maxUses,
  });
  const recoveredOfficialBreakers = officialRecovery.converted;
  metrics = officialRecovery.metrics;

  const sourceBackedPromotion = promoteSourceBackedBreakers(plan, {
    lockedBoundaryFrame,
    targetEvidenceFraction,
    maximumGraphicFraction,
  });
  const convertedSourceBackedGraphics = sourceBackedPromotion.converted;
  metrics = sourceBackedPromotion.metrics;

  if (metrics.official_fraction < targetOfficialFraction - 0.0001) throw new Error(`Official capture target not reached: ${(metrics.official_fraction * 100).toFixed(2)}% < ${(targetOfficialFraction * 100).toFixed(2)}%`);
  if (metrics.evidence_fraction < targetEvidenceFraction - 0.0001) throw new Error(`Evidence/source-derived target not reached: ${(metrics.evidence_fraction * 100).toFixed(2)}% < ${(targetEvidenceFraction * 100).toFixed(2)}%`);
  if (metrics.graphic_fraction > maximumGraphicFraction + 0.0001) throw new Error(`Full-screen graphic fraction ${(metrics.graphic_fraction * 100).toFixed(2)}% exceeds ${(maximumGraphicFraction * 100).toFixed(2)}%`);
  if (metrics.maximum_uninterrupted_evidence_seconds > maxEvidenceSeconds + 0.001) throw new Error(`Evidence run remains ${metrics.maximum_uninterrupted_evidence_seconds.toFixed(2)}s`);
  const lockedPrefixAfter = plan.shots.filter((shot) => shot.end_frame <= lockedBoundaryFrame);
  const prefixHashAfter = hash(lockedPrefixAfter);
  if (prefixHashBefore !== prefixHashAfter) throw new Error("The approved semantic proof prefix changed during full-film rebalance");
  const terminal = plan.shots.filter((shot) => shot.graphic?.type === "brand_close");
  if (terminal.length !== 1 || terminal[0] !== plan.shots.at(-1)) throw new Error("Terminal brand close invariant failed after rebalance");

  plan.generated_at = new Date().toISOString();
  plan.art_direction = { ...plan.art_direction, source_treatment: "official primary-source captures across the full film, alternated with visibly attributed source-derived motion graphics and licensed contextual motion" };
  plan.quality_policy = {
    ...plan.quality_policy,
    editorial_mode: "cinematic_contextual",
    cinematic_body_footage: true,
    official_capture_fraction_min: 0.3,
    evidence_asset_fraction_min: 0.6,
    maximum_uninterrupted_evidence_seconds: 16,
    full_film_rebalance_version: "1.2-official-breaker-recovery",
    proof_prefix_sha256: prefixHashAfter,
    proof_prefix_locked_through_frame: lockedBoundaryFrame,
  };
  await writeJsonAtomic(planPath, plan);
  const report = {
    schema_version: "1.2-official-breaker-recovery",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    locked_proof_boundary_frame: lockedBoundaryFrame,
    proof_prefix_sha256: prefixHashAfter,
    prefix_unchanged: true,
    target_official_capture_fraction: targetOfficialFraction,
    target_evidence_fraction: targetEvidenceFraction,
    maximum_graphic_fraction: maximumGraphicFraction,
    maximum_evidence_seconds: maxEvidenceSeconds,
    converted_official_count: convertedOfficial.length,
    recovered_official_breaker_count: recoveredOfficialBreakers.length,
    converted_breaker_count: convertedBreakers.length,
    converted_source_backed_graphic_count: convertedSourceBackedGraphics.length,
    converted_official: convertedOfficial,
    recovered_official_breakers: recoveredOfficialBreakers,
    converted_breakers: convertedBreakers,
    converted_source_backed_graphics: convertedSourceBackedGraphics,
    metrics,
    pass: true,
  };
  await writeJsonAtomic(path.join(dir, "qa", "full_film_rebalance.json"), report);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebalanceFullPlan(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
}
