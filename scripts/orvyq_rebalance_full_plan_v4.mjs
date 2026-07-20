#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import {
  projectDir,
  readJson,
  readJsonSafe,
  writeJsonAtomic,
} from "./lib/fs-utils.mjs";
import { rebalanceFullPlanV3 } from "./orvyq_rebalance_full_plan_v3.mjs";

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
const secondsOf = (shot, fps) => framesOf(shot) / fps;
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function isOfficialCapture(shot) {
  return Boolean(
    shot?.asset_type === "evidence" &&
      OFFICIAL_KINDS.has(shot.evidence?.kind) &&
      Array.isArray(shot.evidence?.image_assets) &&
      shot.evidence.image_assets.length > 0 &&
      shot.evidence?.provenance_mode === "official_primary_capture",
  );
}

function isDerivedEvidence(shot) {
  return Boolean(
    shot?.asset_type === "evidence" &&
      DERIVED_KINDS.has(shot.evidence?.kind) &&
      Array.isArray(shot.evidence?.source_ids) &&
      shot.evidence.source_ids.length > 0,
  );
}

function isSourceBackedGraphic(shot) {
  return Boolean(
    shot?.asset_type === "graphic" &&
      shot.graphic?.source_backed === true &&
      shot.graphic?.provenance_mode === "source_derived_graphic" &&
      Array.isArray(shot.graphic?.source_ids) &&
      shot.graphic.source_ids.length > 0 &&
      String(shot.graphic?.source || "").trim(),
  );
}

function measure(plan, minimumOfficialSeconds) {
  const fps = Number(plan.fps || 30);
  const durationFrames = Math.max(1, Number(plan.duration_frames || 0));
  let officialFrames = 0;
  let sourceBackedFrames = 0;
  let graphicFrames = 0;
  let currentEvidenceFrames = 0;
  let maximumEvidenceFrames = 0;
  const unknownEvidenceShots = [];

  for (const shot of plan.shots || []) {
    const frames = Math.max(0, framesOf(shot));
    if (shot.asset_type === "evidence") {
      currentEvidenceFrames += frames;
      maximumEvidenceFrames = Math.max(maximumEvidenceFrames, currentEvidenceFrames);
      if (isOfficialCapture(shot)) {
        sourceBackedFrames += frames;
        if (secondsOf(shot, fps) + 0.001 >= minimumOfficialSeconds) {
          officialFrames += frames;
        }
      } else if (isDerivedEvidence(shot)) {
        sourceBackedFrames += frames;
      } else {
        unknownEvidenceShots.push(shot.shot_id);
      }
    } else {
      currentEvidenceFrames = 0;
      if (shot.asset_type === "graphic") {
        graphicFrames += frames;
        if (isSourceBackedGraphic(shot)) sourceBackedFrames += frames;
      }
    }
  }

  return {
    duration_frames: durationFrames,
    official_frames: officialFrames,
    official_fraction: officialFrames / durationFrames,
    source_backed_frames: sourceBackedFrames,
    source_backed_fraction: sourceBackedFrames / durationFrames,
    graphic_frames: graphicFrames,
    graphic_fraction: graphicFrames / durationFrames,
    maximum_uninterrupted_evidence_seconds: maximumEvidenceFrames / fps,
    unknown_evidence_shots: unknownEvidenceShots,
  };
}

function buildAssetsBySource(manifest) {
  const map = new Map();
  for (const asset of manifest.assets || []) {
    if (!asset.local_asset || !asset.evidence_asset_id) continue;
    for (const sourceId of asset.source_ids || []) {
      const entries = map.get(sourceId) || [];
      entries.push(asset);
      map.set(sourceId, entries);
    }
  }
  return map;
}

function nextShotId(usedIds) {
  for (let value = 9000; value <= 9999; value += 1) {
    const id = `shot_${value}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
  throw new Error("No reserved ORVYQ recovery shot id is available");
}

function candidateAssets(originalEvidence, assetsBySource, imageUses, maxUses) {
  return (originalEvidence.source_ids || [])
    .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
    .filter(
      (asset, index, list) =>
        list.findIndex(
          (entry) => entry.evidence_asset_id === asset.evidence_asset_id,
        ) === index,
    )
    .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
    .sort(
      (a, b) =>
        (imageUses.get(a.local_asset) || 0) -
        (imageUses.get(b.local_asset) || 0),
    );
}

function splitGraphicWithIsolatedOfficialCapture({
  plan,
  shotIndex,
  selected,
  originalEvidence,
  usedIds,
  imageUses,
  minimumOfficialSeconds,
}) {
  const fps = Number(plan.fps || 30);
  const original = plan.shots[shotIndex];
  const totalFrames = framesOf(original);
  const officialFrames = Math.ceil(minimumOfficialSeconds * fps);
  const separatorFrames = Math.max(1, Math.min(Math.round(0.5 * fps), Math.floor((totalFrames - officialFrames) / 2)));
  const tailFrames = totalFrames - officialFrames - separatorFrames;
  if (separatorFrames < 1 || tailFrames < 1) return null;

  const lead = structuredClone(original);
  const official = structuredClone(original);
  const tail = structuredClone(original);
  const officialStart = Number(original.start_frame) + separatorFrames;
  const officialEnd = officialStart + officialFrames;

  lead.end_frame = officialStart;
  lead.transition_out = "cut";

  official.shot_id = nextShotId(usedIds);
  official.start_frame = officialStart;
  official.end_frame = officialEnd;
  official.transition_in = "cut";
  official.transition_out = "cut";
  official.asset_type = "evidence";
  official.visual_role = "evidence";
  official.generic_stock = false;
  official.editorial_purpose = `${original.editorial_purpose} Verify the underlying primary source at mobile-legible scale.`;
  official.evidence = {
    ...structuredClone(originalEvidence),
    derived_kind: originalEvidence.kind,
    kind: "official_screen",
    eyebrow: "OFFICIAL PRIMARY SOURCE",
    image_assets: [selected.local_asset],
    evidence_asset_ids: [selected.evidence_asset_id],
    provenance_mode: "official_primary_capture",
  };
  official.motif = `${original.claim_id || original.shot_id}:isolated-official-recovery:${selected.evidence_asset_id}`;
  delete official.graphic;
  delete official.video_asset;
  delete official.trim_in_sec;
  delete official.trim_out_sec;
  delete official.contextual_footage;
  delete official.hook_footage;
  delete official.provenance_mode;
  delete official.rebalanced_from;

  tail.shot_id = nextShotId(usedIds);
  tail.start_frame = officialEnd;
  tail.transition_in = "cut";
  tail.motif = `${original.motif}:recovery-tail`;

  plan.shots.splice(shotIndex, 1, lead, official, tail);
  imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
  return {
    shot_id: original.shot_id,
    official_shot_id: official.shot_id,
    tail_shot_id: tail.shot_id,
    evidence_asset_id: selected.evidence_asset_id,
    local_asset: selected.local_asset,
    official_duration_seconds: officialFrames / fps,
    lead_separator_seconds: separatorFrames / fps,
    tail_separator_seconds: tailFrames / fps,
  };
}

export async function rebalanceFullPlanV4(projectId = PROJECT_ID) {
  try {
    return await rebalanceFullPlanV3(projectId);
  } catch (error) {
    const dir = projectDir(projectId);
    const reportPath = path.join(dir, "qa", "full_film_rebalance.json");
    const priorReport = await readJsonSafe(reportPath, null);
    const recoverable =
      priorReport &&
      Array.isArray(priorReport.failures) &&
      priorReport.failures.length === 1 &&
      /^official fraction /.test(priorReport.failures[0]);
    if (!recoverable) throw error;

    const [plan, manifest, policy, blueprint] = await Promise.all([
      readJson(path.join(dir, "direction", "production_plan.json")),
      readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
      readJsonSafe(POLICY_PATH, {}),
      readJsonSafe(path.join(dir, "direction", "editorial_blueprint.json"), {
        global_rules: {},
      }),
    ]);

    const targetOfficialFraction = Number(
      priorReport.target_official_capture_fraction ||
        policy.official_capture_minimum_fraction ||
        0.3,
    );
    const targetSourceFraction = Number(
      priorReport.target_source_backed_fraction ||
        policy.source_derived_minimum_fraction ||
        0.6,
    );
    const minimumOfficialSeconds = Math.max(
      Number(policy.official_capture_minimum_seconds || 4),
      Number(blueprint.global_rules?.minimum_official_capture_seconds || 4),
    );
    const maximumEvidenceSeconds = Number(
      priorReport.maximum_evidence_seconds ||
        policy.maximum_uninterrupted_evidence_seconds ||
        16,
    );
    const maximumGraphicFraction = Number(
      priorReport.maximum_graphic_fraction ||
        plan.quality_policy?.full_screen_graphic_fraction_max ||
        0.1,
    );
    const maxUses = Math.min(
      Number(plan.quality_policy?.max_uses_per_source || 5),
      Number(blueprint.global_rules?.max_uses_per_source || 5),
    );
    const lockedBoundaryFrame = Number(priorReport.locked_proof_boundary_frame);
    const prefixBefore = hash(
      (plan.shots || []).filter(
        (shot) => Number(shot.end_frame) <= lockedBoundaryFrame,
      ),
    );
    const assetsBySource = buildAssetsBySource(manifest);
    const imageUses = new Map();
    const usedIds = new Set((plan.shots || []).map((shot) => shot.shot_id));
    for (const shot of plan.shots || []) {
      for (const image of shot.evidence?.image_assets || []) {
        imageUses.set(image, (imageUses.get(image) || 0) + 1);
      }
    }

    let recovery = null;
    for (let index = 0; index < plan.shots.length; index += 1) {
      const shot = plan.shots[index];
      if (
        Number(shot.end_frame) <= lockedBoundaryFrame ||
        !isSourceBackedGraphic(shot) ||
        !shot.rebalanced_from?.evidence
      ) {
        continue;
      }
      const originalEvidence = structuredClone(shot.rebalanced_from.evidence);
      const selected = candidateAssets(
        originalEvidence,
        assetsBySource,
        imageUses,
        maxUses,
      )[0];
      if (!selected) continue;

      const snapshot = structuredClone(plan.shots);
      const usageSnapshot = new Map(imageUses);
      const idSnapshot = new Set(usedIds);
      const candidateRecovery = splitGraphicWithIsolatedOfficialCapture({
        plan,
        shotIndex: index,
        selected,
        originalEvidence,
        usedIds,
        imageUses,
        minimumOfficialSeconds,
      });
      if (!candidateRecovery) continue;
      const metrics = measure(plan, minimumOfficialSeconds);
      const valid =
        metrics.official_fraction >= targetOfficialFraction - 0.0001 &&
        metrics.source_backed_fraction >= targetSourceFraction - 0.0001 &&
        metrics.maximum_uninterrupted_evidence_seconds <=
          maximumEvidenceSeconds + 0.001 &&
        metrics.graphic_fraction <= maximumGraphicFraction + 0.0001 &&
        metrics.unknown_evidence_shots.length === 0;
      if (valid) {
        recovery = candidateRecovery;
        break;
      }
      plan.shots = snapshot;
      imageUses.clear();
      for (const [key, value] of usageSnapshot) imageUses.set(key, value);
      usedIds.clear();
      for (const id of idSnapshot) usedIds.add(id);
    }

    if (!recovery) {
      throw new Error(
        `ORVYQ v4 could not recover the official floor without violating source, graphic, or evidence-run limits; prior error: ${error.message}`,
      );
    }

    const after = measure(plan, minimumOfficialSeconds);
    const prefixAfter = hash(
      (plan.shots || []).filter(
        (shot) => Number(shot.end_frame) <= lockedBoundaryFrame,
      ),
    );
    if (prefixBefore !== prefixAfter) {
      throw new Error("Approved proof prefix changed during isolated official recovery");
    }

    plan.generated_at = new Date().toISOString();
    plan.quality_policy = {
      ...plan.quality_policy,
      full_film_rebalance_version: "4.0-isolated-official-floor-recovery",
      proof_prefix_sha256: prefixAfter,
      proof_prefix_locked_through_frame: lockedBoundaryFrame,
    };
    await writeJsonAtomic(
      path.join(dir, "direction", "production_plan.json"),
      plan,
    );

    const report = {
      ...priorReport,
      schema_version: "4.0-isolated-official-floor-recovery",
      generated_at: new Date().toISOString(),
      proof_prefix_sha256: prefixAfter,
      prefix_unchanged: true,
      after,
      converted_official_count:
        Number(priorReport.converted_official_count || 0) + 1,
      isolated_official_recovery: recovery,
      failures: [],
      source_mix_pending: false,
      pass: true,
    };
    await writeJsonAtomic(reportPath, report);
    return report;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebalanceFullPlanV4(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
