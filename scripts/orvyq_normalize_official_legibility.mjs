#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import { projectDir, readJson, readJsonSafe, writeJsonAtomic } from "./lib/fs-utils.mjs";

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
const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);
const durationSeconds = (shot, fps) => framesOf(shot) / fps;
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isOfficialCapture = (shot) =>
  shot?.asset_type === "evidence" &&
  OFFICIAL_KINDS.has(shot.evidence?.kind) &&
  Array.isArray(shot.evidence?.image_assets) &&
  shot.evidence.image_assets.length > 0 &&
  shot.evidence?.provenance_mode === "official_primary_capture";

function resolveLockedBoundaryFrame(plan, timeline, fps) {
  const configured = Number(plan.quality_policy?.proof_prefix_locked_through_frame || 0);
  if (configured > 0) return configured;
  const semanticFrame = Math.ceil(Number(timeline.proof?.speech_output_end_seconds || 0) * fps);
  const boundaryShot = (plan.shots || []).find((shot) => Number(shot.end_frame) >= semanticFrame);
  if (!boundaryShot) throw new Error("Cannot resolve the locked semantic proof boundary for official legibility normalization");
  return Number(boundaryShot.end_frame);
}

function buildAssetsBySource(manifest) {
  const assetsBySource = new Map();
  for (const asset of manifest.assets || []) {
    if (!asset.local_asset || !asset.evidence_asset_id) continue;
    for (const sourceId of asset.source_ids || []) {
      const list = assetsBySource.get(sourceId) || [];
      list.push(asset);
      assetsBySource.set(sourceId, list);
    }
  }
  return assetsBySource;
}

export async function normalizeOfficialLegibility(projectId = PROJECT_ID, { mode = "final" } = {}) {
  if (!["preflight", "final"].includes(mode)) throw new Error(`Unsupported normalization mode: ${mode}`);
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [plan, timeline, manifest, blueprint, policy] = await Promise.all([
    readJson(planPath),
    readJson(path.join(dir, "direction", "narration_timeline.json")),
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJsonSafe(path.join(dir, "direction", "editorial_blueprint.json"), { global_rules: {} }),
    readJsonSafe(POLICY_PATH, {}),
  ]);
  const fps = Number(plan.fps || 30);
  const durationFrames = Math.max(1, Number(plan.duration_frames));
  const lockedBoundaryFrame = resolveLockedBoundaryFrame(plan, timeline, fps);
  const lockedPrefixBefore = (plan.shots || []).filter((shot) => shot.end_frame <= lockedBoundaryFrame);
  const prefixHashBefore = hash(lockedPrefixBefore);
  const minimumSeconds = Math.max(
    Number(policy.official_capture_minimum_seconds || 4),
    Number(blueprint.global_rules?.minimum_official_capture_seconds || 4),
  );
  const targetOfficialFraction = Math.max(
    Number(policy.official_capture_minimum_fraction || 0.3),
    Number(plan.quality_policy?.official_capture_fraction_min || 0.3),
  );
  const maxUses = Math.min(
    Number(plan.quality_policy?.max_uses_per_source || 5),
    Number(blueprint.global_rules?.max_uses_per_source || 5),
  );
  const assetsBySource = buildAssetsBySource(manifest);

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
      derived_kind: priorKind,
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
    .filter((shot) => isOfficialCapture(shot) && durationSeconds(shot, fps) + 0.001 >= minimumSeconds)
    .reduce((sum, shot) => sum + framesOf(shot), 0);

  const promoted = [];
  let previousImage = null;
  for (const shot of plan.shots || []) {
    if (officialFrames() / durationFrames >= targetOfficialFraction - 0.0001) break;
    if (shot.end_frame <= lockedBoundaryFrame || shot.asset_type !== "evidence" || isOfficialCapture(shot)) continue;
    if (durationSeconds(shot, fps) + 0.001 < minimumSeconds) continue;
    const sourceIds = shot.evidence?.source_ids || [];
    const candidates = sourceIds
      .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
      .filter((asset, index, list) => list.findIndex((item) => item.evidence_asset_id === asset.evidence_asset_id) === index)
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
  const lockedPrefixAfter = (plan.shots || []).filter((shot) => shot.end_frame <= lockedBoundaryFrame);
  const prefixHashAfter = hash(lockedPrefixAfter);
  if (prefixHashBefore !== prefixHashAfter) throw new Error("Approved proof prefix changed during official legibility normalization");
  if (remainingShort.length) throw new Error(`Official capture mobile-legibility invariant failed: ${remainingShort.join(", ")}`);
  if (mode === "final" && finalOfficialFraction < targetOfficialFraction - 0.0001) {
    throw new Error(`Official capture target cannot be met with mobile-legible scenes: ${(finalOfficialFraction * 100).toFixed(2)}% < ${(targetOfficialFraction * 100).toFixed(2)}%`);
  }

  plan.generated_at = new Date().toISOString();
  plan.quality_policy = {
    ...plan.quality_policy,
    proof_prefix_locked_through_frame: lockedBoundaryFrame,
    proof_prefix_sha256: prefixHashAfter,
    minimum_official_capture_seconds: minimumSeconds,
    official_capture_fraction_min: targetOfficialFraction,
    official_legibility_normalization_version: "2.0-two-phase",
  };
  await writeJsonAtomic(planPath, plan);
  const report = {
    schema_version: "2.0-two-phase-official-mobile-legibility",
    project_id: projectId,
    mode,
    locked_proof_boundary_frame: lockedBoundaryFrame,
    proof_prefix_sha256: prefixHashAfter,
    prefix_unchanged: true,
    minimum_official_capture_seconds: minimumSeconds,
    target_official_capture_fraction: targetOfficialFraction,
    final_official_capture_fraction: finalOfficialFraction,
    target_enforced: mode === "final",
    target_met: finalOfficialFraction >= targetOfficialFraction - 0.0001,
    demoted,
    promoted,
    pass: mode === "preflight" || finalOfficialFraction >= targetOfficialFraction - 0.0001,
  };
  await writeJsonAtomic(path.join(dir, "qa", "official_legibility_normalization.json"), report);
  return report;
}

function parseMode(argv) {
  const index = argv.indexOf("--mode");
  return index >= 0 ? argv[index + 1] : "final";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  normalizeOfficialLegibility(process.argv[2] || PROJECT_ID, { mode: parseMode(process.argv.slice(2)) })
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
