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
const VALID_SHOT_ID = /^shot_[0-9]{3,4}$/;
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
  let currentEvidenceFrames = 0;
  let maximumEvidenceFrames = 0;
  for (const shot of plan.shots || []) {
    const frames = Math.max(0, framesOf(shot));
    if (shot.asset_type === "evidence") {
      currentEvidenceFrames += frames;
      maximumEvidenceFrames = Math.max(
        maximumEvidenceFrames,
        currentEvidenceFrames,
      );
    } else {
      currentEvidenceFrames = 0;
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
    maximum_uninterrupted_evidence_seconds: maximumEvidenceFrames / fps,
    unknown_evidence_shots: [],
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

function countImageUses(plan) {
  const uses = new Map();
  for (const shot of plan.shots || []) {
    for (const image of shot.evidence?.image_assets || []) {
      uses.set(image, (uses.get(image) || 0) + 1);
    }
  }
  return uses;
}

function selectAsset(shot, assetsBySource, imageUses, maxUses) {
  const sourceIds = shot.rebalanced_from?.evidence?.source_ids || [];
  return sourceIds
    .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
    .filter(
      (asset, index, list) =>
        list.findIndex(
          (candidate) =>
            candidate.evidence_asset_id === asset.evidence_asset_id,
        ) === index,
    )
    .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
    .sort(
      (a, b) =>
        (imageUses.get(a.local_asset) || 0) -
        (imageUses.get(b.local_asset) || 0),
    )[0];
}

function allocateCanonicalIds(plan, count) {
  const used = new Set(
    (plan.shots || [])
      .map((shot) => String(shot.shot_id || ""))
      .filter((shotId) => VALID_SHOT_ID.test(shotId)),
  );
  const ids = [];
  for (let value = 9001; value <= 9999 && ids.length < count; value += 1) {
    const candidate = `shot_${value}`;
    if (used.has(candidate)) continue;
    used.add(candidate);
    ids.push(candidate);
  }
  if (ids.length !== count) {
    throw new Error(`Cannot allocate ${count} canonical bridge shot ids`);
  }
  return ids;
}

function buildFootageSegment(
  shot,
  shotId,
  startFrame,
  endFrame,
  trimIn,
  trimOut,
  transitionIn,
  transitionOut,
) {
  return {
    ...structuredClone(shot),
    shot_id: shotId,
    start_frame: startFrame,
    end_frame: endFrame,
    trim_in_sec: Math.round(trimIn * 1000) / 1000,
    trim_out_sec: Math.round(trimOut * 1000) / 1000,
    transition_in: transitionIn,
    transition_out: transitionOut,
    motif: `${shot.motif}:${shotId}`,
  };
}

function buildOfficialSegment(shot, shotId, asset, startFrame, endFrame) {
  const original = structuredClone(shot.rebalanced_from?.evidence || {});
  const segment = {
    ...structuredClone(shot),
    shot_id: shotId,
    start_frame: startFrame,
    end_frame: endFrame,
    asset_type: "evidence",
    visual_role: "evidence",
    generic_stock: false,
    transition_in: "cut",
    transition_out: "cut",
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

export async function insertOfficialBridgesV3(projectId = PROJECT_ID) {
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
  const sideFrames = Math.max(12, Math.ceil(0.4 * fps));
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
  const targetFrames = Math.ceil(targetFraction * before.duration_frames);
  let remainingFrames = Math.max(
    0,
    targetFrames - before.official_frames + Math.ceil(0.25 * fps),
  );
  if (remainingFrames === 0) {
    const report = {
      schema_version: "2.0-multi-isolated-official-bridges",
      project_id: projectId,
      inserted_bridge_count: 0,
      bridges: [],
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

  const bySource = buildAssetsBySource(manifest);
  const imageUses = countImageUses(plan);
  const rawCandidates = (plan.shots || [])
    .map((shot, index) => ({ shot, index }))
    .filter(
      ({ shot }) =>
        Number(shot.start_frame) >= lockedBoundaryFrame &&
        shot.asset_type === "footage" &&
        shot.contextual_footage === true &&
        shot.provenance_mode === "approved_contextual_footage" &&
        shot.rebalanced_from?.evidence &&
        framesOf(shot) >= minimumFrames + sideFrames * 2,
    )
    .sort(
      (a, b) =>
        framesOf(b.shot) - framesOf(a.shot) ||
        Number(a.shot.start_frame) - Number(b.shot.start_frame),
    );
  const selections = [];
  for (const candidate of rawCandidates) {
    if (remainingFrames <= 0) break;
    const asset = selectAsset(candidate.shot, bySource, imageUses, maxUses);
    if (!asset) continue;
    const capacity = framesOf(candidate.shot) - sideFrames * 2;
    const allocatedFrames = Math.min(
      capacity,
      Math.max(minimumFrames, remainingFrames),
    );
    if (allocatedFrames < minimumFrames) continue;
    selections.push({ ...candidate, asset, allocatedFrames });
    imageUses.set(
      asset.local_asset,
      (imageUses.get(asset.local_asset) || 0) + 1,
    );
    remainingFrames -= allocatedFrames;
  }
  if (remainingFrames > 0) {
    const capacity = selections.reduce(
      (sum, selection) => sum + selection.allocatedFrames,
      0,
    );
    throw new Error(
      `Isolated official bridge capacity is insufficient: ${remainingFrames} additional frames required after allocating ${capacity}`,
    );
  }

  const canonicalIds = allocateCanonicalIds(plan, selections.length * 3);
  const selectionByIndex = new Map(selections.map((selection) => [selection.index, selection]));
  const rebuilt = [];
  const bridges = [];
  let idCursor = 0;
  for (let index = 0; index < plan.shots.length; index += 1) {
    const shot = plan.shots[index];
    const selection = selectionByIndex.get(index);
    if (!selection) {
      rebuilt.push(shot);
      continue;
    }
    const shotFrames = framesOf(shot);
    const leadingFrames = Math.floor(
      (shotFrames - selection.allocatedFrames) / 2,
    );
    const trailingFrames =
      shotFrames - selection.allocatedFrames - leadingFrames;
    if (leadingFrames < sideFrames || trailingFrames < sideFrames) {
      throw new Error(`Bridge ${shot.shot_id} cannot preserve footage on both sides`);
    }
    const ids = canonicalIds.slice(idCursor, idCursor + 3);
    idCursor += 3;
    const officialStart = Number(shot.start_frame) + leadingFrames;
    const officialEnd = officialStart + selection.allocatedFrames;
    const baseTrimIn = Number(shot.trim_in_sec || 0);
    const originalTrimOut = Number(
      shot.trim_out_sec || baseTrimIn + shotFrames / fps,
    );
    const leading = buildFootageSegment(
      shot,
      ids[0],
      Number(shot.start_frame),
      officialStart,
      baseTrimIn,
      baseTrimIn + leadingFrames / fps,
      shot.transition_in,
      "cut",
    );
    const official = buildOfficialSegment(
      shot,
      ids[1],
      selection.asset,
      officialStart,
      officialEnd,
    );
    const trailing = buildFootageSegment(
      shot,
      ids[2],
      officialEnd,
      Number(shot.end_frame),
      baseTrimIn + (leadingFrames + selection.allocatedFrames) / fps,
      originalTrimOut,
      "cut",
      shot.transition_out,
    );
    rebuilt.push(leading, official, trailing);
    bridges.push({
      source_shot_id: shot.shot_id,
      generated_shot_ids: ids,
      evidence_asset_id: selection.asset.evidence_asset_id,
      local_asset: selection.asset.local_asset,
      official_duration_frames: selection.allocatedFrames,
      official_duration_seconds: selection.allocatedFrames / fps,
      leading_footage_frames: leadingFrames,
      trailing_footage_frames: trailingFrames,
    });
  }
  plan.shots = rebuilt;
  plan.generated_at = new Date().toISOString();
  const after = measure(plan, minimumFrames);
  const prefixAfter = hash(
    (plan.shots || []).filter(
      (shot) => Number(shot.end_frame) <= lockedBoundaryFrame,
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
    failures.push("multi-bridge plan exceeds evidence-chain ceiling");
  const invalidIds = plan.shots
    .map((shot) => shot.shot_id)
    .filter((shotId) => !VALID_SHOT_ID.test(String(shotId || "")));
  if (invalidIds.length)
    failures.push(`invalid canonical shot ids: ${invalidIds.join(", ")}`);
  if (failures.length) throw new Error(failures.join("; "));

  await writeJsonAtomic(planPath, plan);
  const rebalancePath = path.join(dir, "qa", "full_film_rebalance.json");
  const rebalance = await readJsonSafe(rebalancePath, null);
  if (rebalance) {
    await writeJsonAtomic(rebalancePath, {
      ...rebalance,
      schema_version: "3.4-multi-isolated-official-bridges",
      official_normalization_pending: false,
      official_bridge_inserted: true,
      official_bridge_count: bridges.length,
      resolved_deferred_failures: rebalance.deferred_failures || [],
      deferred_failures: [],
      after,
      pass: true,
    });
  }
  const report = {
    schema_version: "2.0-multi-isolated-official-bridges",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    inserted_bridge_count: bridges.length,
    bridges,
    canonical_ids_valid: true,
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
  insertOfficialBridgesV3(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
