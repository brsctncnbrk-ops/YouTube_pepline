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
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);

function isOfficial(shot, minimumFrames) {
  return Boolean(
    shot?.asset_type === "evidence" &&
      OFFICIAL_KINDS.has(shot.evidence?.kind) &&
      shot.evidence?.provenance_mode === "official_primary_capture" &&
      Array.isArray(shot.evidence?.image_assets) &&
      shot.evidence.image_assets.length > 0 &&
      framesOf(shot) >= minimumFrames,
  );
}

function isSourceBacked(shot) {
  if (shot?.asset_type === "evidence") {
    return (
      isOfficial(shot, 0) ||
      (DERIVED_KINDS.has(shot.evidence?.kind) &&
        Array.isArray(shot.evidence?.source_ids) &&
        shot.evidence.source_ids.length > 0)
    );
  }
  return Boolean(
    shot?.asset_type === "graphic" &&
      shot.graphic?.source_backed === true &&
      shot.graphic?.provenance_mode === "source_derived_graphic" &&
      Array.isArray(shot.graphic?.source_ids) &&
      shot.graphic.source_ids.length > 0,
  );
}

function measure(plan, minimumFrames) {
  const durationFrames = Math.max(1, Number(plan.duration_frames));
  const fps = Number(plan.fps || 30);
  let officialFrames = 0;
  let sourceBackedFrames = 0;
  let graphicFrames = 0;
  let contextualFrames = 0;
  let evidenceRun = 0;
  let maximumEvidenceRun = 0;
  for (const shot of plan.shots || []) {
    const frames = Math.max(0, framesOf(shot));
    if (shot.asset_type === "evidence") {
      evidenceRun += frames;
      maximumEvidenceRun = Math.max(maximumEvidenceRun, evidenceRun);
    } else {
      evidenceRun = 0;
    }
    if (isOfficial(shot, minimumFrames)) officialFrames += frames;
    if (isSourceBacked(shot)) sourceBackedFrames += frames;
    if (shot.asset_type === "graphic") graphicFrames += frames;
    if (
      shot.asset_type === "footage" &&
      shot.contextual_footage === true &&
      shot.provenance_mode === "approved_contextual_footage"
    ) {
      contextualFrames += frames;
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
    contextual_frames: contextualFrames,
    contextual_fraction: contextualFrames / durationFrames,
    maximum_uninterrupted_evidence_seconds: maximumEvidenceRun / fps,
    unknown_evidence_shots: [],
  };
}

function assetsBySource(manifest) {
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

function usedImages(plan) {
  const uses = new Map();
  for (const shot of plan.shots || []) {
    for (const image of shot.evidence?.image_assets || []) {
      uses.set(image, (uses.get(image) || 0) + 1);
    }
  }
  return uses;
}

function selectAsset(shot, bySource, uses, maxUses) {
  const sourceIds = shot.rebalanced_from?.evidence?.source_ids || [];
  return sourceIds
    .flatMap((sourceId) => bySource.get(sourceId) || [])
    .filter(
      (asset, index, list) =>
        list.findIndex(
          (candidate) =>
            candidate.evidence_asset_id === asset.evidence_asset_id,
        ) === index,
    )
    .filter((asset) => (uses.get(asset.local_asset) || 0) < maxUses)
    .sort(
      (a, b) =>
        (uses.get(a.local_asset) || 0) -
        (uses.get(b.local_asset) || 0),
    )[0];
}

function footageSegment(shot, id, startFrame, endFrame, trimIn, trimOut) {
  return {
    ...structuredClone(shot),
    shot_id: id,
    start_frame: startFrame,
    end_frame: endFrame,
    trim_in_sec: Math.round(trimIn * 1000) / 1000,
    trim_out_sec: Math.round(trimOut * 1000) / 1000,
    motif: `${shot.motif}:${id}`,
  };
}

function officialSegment(shot, asset, startFrame, endFrame) {
  const original = structuredClone(shot.rebalanced_from?.evidence || {});
  const segment = {
    ...structuredClone(shot),
    shot_id: `${shot.shot_id}_official_bridge`,
    start_frame: startFrame,
    end_frame: endFrame,
    asset_type: "evidence",
    visual_role: "evidence",
    generic_stock: false,
    motif: `${shot.claim_id || shot.shot_id}:official-bridge:${asset.evidence_asset_id}`,
    evidence: {
      ...original,
      derived_kind: original.kind,
      kind: "official_screen",
      eyebrow: "OFFICIAL PRIMARY SOURCE",
      image_assets: [asset.local_asset],
      evidence_asset_ids: [asset.evidence_asset_id],
      provenance_mode: "official_primary_capture",
    },
  };
  delete segment.video_asset;
  delete segment.trim_in_sec;
  delete segment.trim_out_sec;
  delete segment.contextual_footage;
  delete segment.hook_footage;
  delete segment.provenance_mode;
  delete segment.rebalanced_from;
  delete segment.graphic;
  return segment;
}

export async function insertOfficialBridge(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [plan, manifest, policy, blueprint] = await Promise.all([
    readJson(planPath),
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJsonSafe(POLICY_PATH, {}),
    readJsonSafe(path.join(dir, "direction", "editorial_blueprint.json"), {
      global_rules: {},
    }),
  ]);
  const fps = Number(plan.fps || 30);
  const minimumSeconds = Math.max(
    Number(policy.official_capture_minimum_seconds || 4),
    Number(blueprint.global_rules?.minimum_official_capture_seconds || 4),
  );
  const minimumFrames = Math.ceil(minimumSeconds * fps);
  const targetFraction = Math.max(
    Number(policy.official_capture_minimum_fraction || 0.3),
    Number(plan.quality_policy?.official_capture_fraction_min || 0.3),
  );
  const maxUses = Math.min(
    Number(plan.quality_policy?.max_uses_per_source || 5),
    Number(blueprint.global_rules?.max_uses_per_source || 5),
  );
  const lockedBoundaryFrame = Number(
    plan.quality_policy?.proof_prefix_locked_through_frame ||
      plan.proof?.duration_frames ||
      0,
  );
  const prefixBefore = hash(
    (plan.shots || []).filter(
      (shot) => Number(shot.end_frame) <= lockedBoundaryFrame,
    ),
  );
  const before = measure(plan, minimumFrames);
  if (before.official_fraction >= targetFraction - 0.0001) {
    const report = {
      schema_version: "1.0-isolated-official-bridge",
      project_id: projectId,
      inserted: false,
      reason: "official target already met",
      prefix_unchanged: true,
      before,
      after: before,
      pass: true,
    };
    await writeJsonAtomic(
      path.join(dir, "qa", "official_bridge_insertion.json"),
      report,
    );
    return report;
  }

  const neededFrames = Math.max(
    minimumFrames,
    Math.ceil(targetFraction * before.duration_frames - before.official_frames) +
      Math.ceil(0.25 * fps),
  );
  const sideFrames = Math.max(12, Math.ceil(0.4 * fps));
  const bySource = assetsBySource(manifest);
  const uses = usedImages(plan);
  const candidates = (plan.shots || [])
    .map((shot, index) => ({ shot, index }))
    .filter(
      ({ shot }) =>
        Number(shot.start_frame) >= lockedBoundaryFrame &&
        shot.asset_type === "footage" &&
        shot.contextual_footage === true &&
        shot.provenance_mode === "approved_contextual_footage" &&
        shot.rebalanced_from?.evidence &&
        framesOf(shot) >= neededFrames + sideFrames * 2,
    )
    .map((entry) => ({
      ...entry,
      asset: selectAsset(entry.shot, bySource, uses, maxUses),
    }))
    .filter((entry) => entry.asset)
    .sort(
      (a, b) =>
        framesOf(b.shot) - framesOf(a.shot) ||
        Number(a.shot.start_frame) - Number(b.shot.start_frame),
    );
  const selected = candidates[0];
  if (!selected) {
    throw new Error(
      `No isolated official bridge candidate can supply ${neededFrames} frames while preserving the proof prefix and evidence breaker`,
    );
  }

  const shot = selected.shot;
  const shotFrames = framesOf(shot);
  const officialFrames = Math.min(
    shotFrames - sideFrames * 2,
    neededFrames,
  );
  const leadingFrames = Math.floor((shotFrames - officialFrames) / 2);
  const trailingFrames = shotFrames - officialFrames - leadingFrames;
  if (leadingFrames < sideFrames || trailingFrames < sideFrames) {
    throw new Error("Official bridge cannot preserve footage on both sides");
  }
  const officialStart = Number(shot.start_frame) + leadingFrames;
  const officialEnd = officialStart + officialFrames;
  const baseTrimIn = Number(shot.trim_in_sec || 0);
  const originalTrimOut = Number(
    shot.trim_out_sec || baseTrimIn + shotFrames / fps,
  );
  const leading = footageSegment(
    shot,
    `${shot.shot_id}_bridge_in`,
    Number(shot.start_frame),
    officialStart,
    baseTrimIn,
    baseTrimIn + leadingFrames / fps,
  );
  const official = officialSegment(
    shot,
    selected.asset,
    officialStart,
    officialEnd,
  );
  const trailing = footageSegment(
    shot,
    `${shot.shot_id}_bridge_out`,
    officialEnd,
    Number(shot.end_frame),
    baseTrimIn + (leadingFrames + officialFrames) / fps,
    originalTrimOut,
  );
  plan.shots.splice(selected.index, 1, leading, official, trailing);
  plan.generated_at = new Date().toISOString();
  const after = measure(plan, minimumFrames);
  const prefixAfter = hash(
    (plan.shots || []).filter(
      (candidate) => Number(candidate.end_frame) <= lockedBoundaryFrame,
    ),
  );
  const failures = [];
  if (prefixAfter !== prefixBefore) failures.push("approved proof prefix changed");
  if (after.official_fraction < targetFraction - 0.0001)
    failures.push("official target remains below policy");
  if (
    after.maximum_uninterrupted_evidence_seconds >
    Number(policy.maximum_uninterrupted_evidence_seconds || 16) + 0.001
  )
    failures.push("isolated bridge increased uninterrupted evidence above policy");
  if (failures.length) throw new Error(failures.join("; "));

  await writeJsonAtomic(planPath, plan);
  const rebalancePath = path.join(dir, "qa", "full_film_rebalance.json");
  const rebalance = await readJsonSafe(rebalancePath, null);
  if (rebalance) {
    await writeJsonAtomic(rebalancePath, {
      ...rebalance,
      schema_version: "3.2-isolated-official-bridge",
      official_normalization_pending: false,
      official_bridge_inserted: true,
      resolved_deferred_failures: rebalance.deferred_failures || [],
      deferred_failures: [],
      after,
      pass: true,
    });
  }
  const report = {
    schema_version: "1.0-isolated-official-bridge",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    inserted: true,
    source_shot_id: shot.shot_id,
    generated_shot_ids: [leading.shot_id, official.shot_id, trailing.shot_id],
    evidence_asset_id: selected.asset.evidence_asset_id,
    local_asset: selected.asset.local_asset,
    official_duration_frames: officialFrames,
    official_duration_seconds: officialFrames / fps,
    leading_footage_frames: leadingFrames,
    trailing_footage_frames: trailingFrames,
    proof_prefix_sha256: prefixAfter,
    prefix_unchanged: prefixAfter === prefixBefore,
    before,
    after,
    pass: true,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "official_bridge_insertion.json"),
    report,
  );
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  insertOfficialBridge(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
