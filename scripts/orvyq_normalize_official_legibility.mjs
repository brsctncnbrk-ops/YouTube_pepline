#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const OFFICIAL_KINDS = new Set([
  "split_documents",
  "official_document",
  "official_figure",
  "official_screen",
  "image_sequence",
  "recap",
]);
const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);
const durationSeconds = (shot, fps) => framesOf(shot) / fps;
const isOfficialCapture = (shot) =>
  shot?.asset_type === "evidence" &&
  OFFICIAL_KINDS.has(shot.evidence?.kind) &&
  Array.isArray(shot.evidence?.image_assets) &&
  shot.evidence.image_assets.length > 0;

export async function normalizeOfficialLegibility(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [plan, manifest, blueprint] = await Promise.all([
    readJson(planPath),
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
  ]);
  const fps = Number(plan.fps || 30);
  const durationFrames = Math.max(1, Number(plan.duration_frames));
  const lockedBoundaryFrame = Number(plan.quality_policy?.proof_prefix_locked_through_frame || 0);
  const minimumSeconds = Math.max(4, Number(blueprint.global_rules?.minimum_official_capture_seconds || 4));
  const targetOfficialFraction = Math.max(0.3, Number(plan.quality_policy?.official_capture_fraction_min || 0.3));
  const maxUses = Math.min(
    Number(plan.quality_policy?.max_uses_per_source || 5),
    Number(blueprint.global_rules?.max_uses_per_source || 5),
  );

  const assetsBySource = new Map();
  for (const asset of manifest.assets || []) {
    if (!asset.local_asset || !asset.evidence_asset_id) continue;
    for (const sourceId of asset.source_ids || []) {
      const list = assetsBySource.get(sourceId) || [];
      list.push(asset);
      assetsBySource.set(sourceId, list);
    }
  }

  const imageUses = new Map();
  for (const shot of plan.shots || []) {
    for (const image of shot.evidence?.image_assets || []) {
      imageUses.set(image, (imageUses.get(image) || 0) + 1);
    }
  }

  const demoted = [];
  for (const shot of plan.shots || []) {
    if (shot.end_frame <= lockedBoundaryFrame || !isOfficialCapture(shot)) continue;
    if (durationSeconds(shot, fps) + 0.001 >= minimumSeconds) continue;
    const priorKind = shot.evidence?.derived_kind || "source_article";
    for (const image of shot.evidence.image_assets || []) {
      imageUses.set(image, Math.max(0, (imageUses.get(image) || 0) - 1));
    }
    shot.evidence = {
      ...shot.evidence,
      kind: priorKind,
      eyebrow: "SOURCE-DERIVED CONTEXT",
      provenance_mode: "source_derived_graphic",
    };
    delete shot.evidence.image_assets;
    delete shot.evidence.evidence_asset_ids;
    shot.motif = `${shot.claim_id || shot.shot_id}:derived:mobile-legibility`;
    demoted.push({ shot_id: shot.shot_id, duration_seconds: durationSeconds(shot, fps) });
  }

  const officialFrames = () => (plan.shots || [])
    .filter(isOfficialCapture)
    .reduce((sum, shot) => sum + framesOf(shot), 0);

  const promoted = [];
  let previousImage = null;
  for (let index = 0; index < (plan.shots || []).length; index += 1) {
    if (officialFrames() / durationFrames >= targetOfficialFraction - 0.0001) break;
    const shot = plan.shots[index];
    if (shot.end_frame <= lockedBoundaryFrame || shot.asset_type !== "evidence" || isOfficialCapture(shot)) continue;
    if (durationSeconds(shot, fps) + 0.001 < minimumSeconds) continue;
    const sourceIds = shot.evidence?.source_ids || [];
    const candidates = sourceIds
      .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
      .filter((asset, candidateIndex, list) => list.findIndex((item) => item.evidence_asset_id === asset.evidence_asset_id) === candidateIndex)
      .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
      .filter((asset) => asset.local_asset !== previousImage)
      .sort((a, b) => (imageUses.get(a.local_asset) || 0) - (imageUses.get(b.local_asset) || 0));
    const selected = candidates[0];
    if (!selected) continue;
    shot.evidence = {
      ...shot.evidence,
      derived_kind: shot.evidence?.kind,
      kind: "official_screen",
      eyebrow: "OFFICIAL PRIMARY SOURCE",
      image_assets: [selected.local_asset],
      evidence_asset_ids: [selected.evidence_asset_id],
      provenance_mode: "official_primary_capture",
      source_ids: sourceIds,
    };
    shot.motif = `${shot.claim_id || shot.shot_id}:official:${selected.evidence_asset_id}`;
    imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
    previousImage = selected.local_asset;
    promoted.push({
      shot_id: shot.shot_id,
      duration_seconds: durationSeconds(shot, fps),
      evidence_asset_id: selected.evidence_asset_id,
    });
  }

  const remainingShort = (plan.shots || [])
    .filter((shot) => shot.end_frame > lockedBoundaryFrame && isOfficialCapture(shot) && durationSeconds(shot, fps) + 0.001 < minimumSeconds)
    .map((shot) => `${shot.shot_id}=${durationSeconds(shot, fps).toFixed(2)}s`);
  const finalOfficialFraction = officialFrames() / durationFrames;
  if (remainingShort.length) {
    throw new Error(`Official capture mobile-legibility invariant failed: ${remainingShort.join(", ")}`);
  }
  if (finalOfficialFraction < targetOfficialFraction - 0.0001) {
    throw new Error(`Official capture target cannot be met with mobile-legible scenes: ${(finalOfficialFraction * 100).toFixed(2)}% < ${(targetOfficialFraction * 100).toFixed(2)}%`);
  }

  plan.generated_at = new Date().toISOString();
  plan.quality_policy = {
    ...plan.quality_policy,
    minimum_official_capture_seconds: minimumSeconds,
    official_legibility_normalization_version: "1.0",
  };
  await writeJsonAtomic(planPath, plan);
  const report = {
    schema_version: "1.0-official-mobile-legibility",
    project_id: projectId,
    locked_proof_boundary_frame: lockedBoundaryFrame,
    minimum_official_capture_seconds: minimumSeconds,
    target_official_capture_fraction: targetOfficialFraction,
    final_official_capture_fraction: finalOfficialFraction,
    demoted,
    promoted,
    pass: true,
  };
  await writeJsonAtomic(path.join(dir, "qa", "official_legibility_normalization.json"), report);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  normalizeOfficialLegibility(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
