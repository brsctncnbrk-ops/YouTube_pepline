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
const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function isOfficial(shot, minimumFrames) {
  return Boolean(
    shot?.asset_type === "evidence" &&
      OFFICIAL_KINDS.has(shot.evidence?.kind) &&
      Array.isArray(shot.evidence?.image_assets) &&
      shot.evidence.image_assets.length > 0 &&
      shot.evidence?.provenance_mode === "official_primary_capture" &&
      framesOf(shot) >= minimumFrames,
  );
}

function metrics(plan, minimumFrames) {
  const durationFrames = Math.max(1, Number(plan.duration_frames || 0));
  let officialFrames = 0;
  let currentEvidenceFrames = 0;
  let maximumEvidenceFrames = 0;
  for (const shot of plan.shots || []) {
    if (isOfficial(shot, minimumFrames)) officialFrames += framesOf(shot);
    if (shot.asset_type === "evidence") {
      currentEvidenceFrames += framesOf(shot);
      maximumEvidenceFrames = Math.max(maximumEvidenceFrames, currentEvidenceFrames);
    } else {
      currentEvidenceFrames = 0;
    }
  }
  return {
    duration_frames: durationFrames,
    official_frames: officialFrames,
    official_fraction: officialFrames / durationFrames,
    maximum_uninterrupted_evidence_seconds:
      maximumEvidenceFrames / Number(plan.fps || 30),
  };
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

function nextInsetId(plan) {
  const used = new Set((plan.shots || []).map((shot) => shot.shot_id));
  for (let value = 1001; value <= 9999; value += 1) {
    const id = `shot_${value}`;
    if (!used.has(id)) return id;
  }
  throw new Error("No available four-digit shot id for official inset recovery");
}

function currentImageUses(plan) {
  const uses = new Map();
  for (const shot of plan.shots || []) {
    for (const image of shot.evidence?.image_assets || []) {
      uses.set(image, (uses.get(image) || 0) + 1);
    }
  }
  return uses;
}

function adjacentImages(shots, index) {
  return new Set([
    ...(shots[index - 1]?.evidence?.image_assets || []),
    ...(shots[index + 1]?.evidence?.image_assets || []),
  ]);
}

function candidateAssets(
  originalEvidence,
  assetsBySource,
  imageUses,
  maxUses,
  blockedImages,
) {
  return (originalEvidence.source_ids || [])
    .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
    .filter(
      (asset, index, list) =>
        list.findIndex(
          (item) => item.evidence_asset_id === asset.evidence_asset_id,
        ) === index,
    )
    .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
    .filter((asset) => !blockedImages.has(asset.local_asset))
    .sort(
      (a, b) =>
        (imageUses.get(a.local_asset) || 0) -
        (imageUses.get(b.local_asset) || 0),
    );
}

function officialSegmentFrom(
  shot,
  startFrame,
  endFrame,
  selected,
  shotId,
  originalEvidence,
) {
  const segment = structuredClone(shot);
  segment.shot_id = shotId;
  segment.start_frame = startFrame;
  segment.end_frame = endFrame;
  segment.asset_type = "evidence";
  segment.visual_role = "evidence";
  segment.generic_stock = false;
  segment.transition_in = "cut";
  segment.transition_out = "cut";
  segment.editorial_purpose = `${shot.editorial_purpose} Present a readable four-second official-source inset while retaining motion as the surrounding sequence breaker.`;
  segment.evidence = {
    ...originalEvidence,
    derived_kind: originalEvidence.kind,
    kind: "official_screen",
    eyebrow: "OFFICIAL PRIMARY SOURCE",
    image_assets: [selected.local_asset],
    evidence_asset_ids: [selected.evidence_asset_id],
    provenance_mode: "official_primary_capture",
  };
  segment.motif = `${shot.claim_id || shot.shot_id}:official-inset:${selected.evidence_asset_id}`;
  segment.rebalanced_from = {
    ...(shot.rebalanced_from || {}),
    split_recovery: {
      source_shot_id: shot.shot_id,
      mode: "four_second_official_inset",
    },
  };
  delete segment.video_asset;
  delete segment.trim_in_sec;
  delete segment.trim_out_sec;
  delete segment.motion_variant;
  delete segment.contextual_footage;
  delete segment.hook_footage;
  delete segment.provenance_mode;
  delete segment.graphic;
  return segment;
}

function footageSegmentFrom(shot, startFrame, endFrame, trimIn, trimOut) {
  const segment = structuredClone(shot);
  segment.start_frame = startFrame;
  segment.end_frame = endFrame;
  segment.trim_in_sec = Math.round(trimIn * 1000) / 1000;
  segment.trim_out_sec = Math.round(trimOut * 1000) / 1000;
  segment.transition_in = "cut";
  segment.transition_out = "cut";
  segment.editorial_purpose = `${shot.editorial_purpose} Retain contextual motion so adjacent evidence blocks remain visually and structurally separated.`;
  return segment;
}

function splitOptions(plan, index, selected, minimumFrames, maximumEvidenceSeconds) {
  const shot = plan.shots[index];
  const originalEvidence = structuredClone(shot.rebalanced_from?.evidence || {});
  const totalFrames = framesOf(shot);
  const remainderFrames = totalFrames - minimumFrames;
  const fps = Number(plan.fps || 30);
  const minimumMotionFrames = Math.max(24, Math.ceil(0.8 * fps));
  if (remainderFrames < minimumMotionFrames) return [];
  const trimIn = Number(shot.trim_in_sec || 0);
  const trimOut = Number(shot.trim_out_sec || trimIn + totalFrames / fps);
  const insetSeconds = minimumFrames / fps;
  const insetId = nextInsetId(plan);
  const options = [];

  const officialFirst = officialSegmentFrom(
    shot,
    shot.start_frame,
    shot.start_frame + minimumFrames,
    selected,
    insetId,
    originalEvidence,
  );
  officialFirst.transition_in = shot.transition_in;
  const motionLast = footageSegmentFrom(
    shot,
    shot.start_frame + minimumFrames,
    shot.end_frame,
    trimIn + insetSeconds,
    trimOut,
  );
  motionLast.transition_out = shot.transition_out;
  options.push({ orientation: "official_then_motion", replacement: [officialFirst, motionLast] });

  const motionFirst = footageSegmentFrom(
    shot,
    shot.start_frame,
    shot.end_frame - minimumFrames,
    trimIn,
    trimOut - insetSeconds,
  );
  motionFirst.transition_in = shot.transition_in;
  const officialLast = officialSegmentFrom(
    shot,
    shot.end_frame - minimumFrames,
    shot.end_frame,
    selected,
    insetId,
    originalEvidence,
  );
  officialLast.transition_out = shot.transition_out;
  options.push({ orientation: "motion_then_official", replacement: [motionFirst, officialLast] });

  return options
    .map((option) => {
      const candidate = structuredClone(plan);
      candidate.shots.splice(index, 1, ...option.replacement);
      return { ...option, projected: metrics(candidate, minimumFrames) };
    })
    .filter(
      (option) =>
        option.projected.maximum_uninterrupted_evidence_seconds <=
        maximumEvidenceSeconds + 0.001,
    )
    .sort(
      (a, b) =>
        a.projected.maximum_uninterrupted_evidence_seconds -
        b.projected.maximum_uninterrupted_evidence_seconds,
    );
}

export async function recoverOfficialFloorWithInset(projectId = PROJECT_ID) {
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
  const maximumEvidenceSeconds = Math.min(
    Number(policy.maximum_uninterrupted_evidence_seconds || 16),
    Number(plan.quality_policy?.maximum_uninterrupted_evidence_seconds || 16),
  );
  const maxUses = Math.min(
    Number(plan.quality_policy?.max_uses_per_source || 5),
    Number(blueprint.global_rules?.max_uses_per_source || 5),
  );
  const lockedBoundaryFrame = Number(
    plan.quality_policy?.proof_prefix_locked_through_frame ||
      plan.proof?.duration_frames,
  );
  const prefixHashBefore = hash(
    (plan.shots || []).filter(
      (shot) => shot.end_frame <= lockedBoundaryFrame,
    ),
  );
  const assetsBySource = buildAssetsBySource(manifest);
  const imageUses = currentImageUses(plan);
  const before = metrics(plan, minimumFrames);
  const recoveries = [];

  while (metrics(plan, minimumFrames).official_fraction < targetFraction - 0.0001) {
    let applied = false;
    for (let index = 0; index < plan.shots.length; index += 1) {
      const shot = plan.shots[index];
      if (
        shot.end_frame <= lockedBoundaryFrame ||
        shot.asset_type !== "footage" ||
        !shot.rebalanced_from?.evidence
      )
        continue;
      const blocked = adjacentImages(plan.shots, index);
      const selected = candidateAssets(
        shot.rebalanced_from.evidence,
        assetsBySource,
        imageUses,
        maxUses,
        blocked,
      )[0];
      if (!selected) continue;
      const options = splitOptions(
        plan,
        index,
        selected,
        minimumFrames,
        maximumEvidenceSeconds,
      );
      const chosen = options[0];
      if (!chosen) continue;
      plan.shots.splice(index, 1, ...chosen.replacement);
      imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
      recoveries.push({
        source_shot_id: shot.shot_id,
        inset_shot_id: chosen.replacement.find((item) => item.asset_type === "evidence")?.shot_id,
        orientation: chosen.orientation,
        evidence_asset_id: selected.evidence_asset_id,
        local_asset: selected.local_asset,
        official_inset_seconds: minimumSeconds,
        retained_motion_seconds: (framesOf(shot) - minimumFrames) / fps,
        projected_official_fraction: chosen.projected.official_fraction,
        projected_maximum_evidence_seconds:
          chosen.projected.maximum_uninterrupted_evidence_seconds,
      });
      applied = true;
      break;
    }
    if (!applied) {
      throw new Error(
        `Official inset recovery cannot reach ${(targetFraction * 100).toFixed(2)}% without violating the ${maximumEvidenceSeconds}s evidence ceiling`,
      );
    }
    if (recoveries.length > 10) {
      throw new Error("Official inset recovery exceeded safety iteration limit");
    }
  }

  const after = metrics(plan, minimumFrames);
  const prefixHashAfter = hash(
    (plan.shots || []).filter(
      (shot) => shot.end_frame <= lockedBoundaryFrame,
    ),
  );
  const failures = [];
  if (prefixHashBefore !== prefixHashAfter) failures.push("approved proof prefix changed");
  if (after.official_fraction < targetFraction - 0.0001)
    failures.push(
      `official fraction ${(after.official_fraction * 100).toFixed(2)}% < ${(targetFraction * 100).toFixed(2)}%`,
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
    official_floor_inset_recovery_version: "1.0-motion-preserving-split",
    official_capture_fraction_min: targetFraction,
    minimum_official_capture_seconds: minimumSeconds,
  };
  await writeJsonAtomic(planPath, plan);
  const report = {
    schema_version: "1.0-motion-preserving-split",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    locked_proof_boundary_frame: lockedBoundaryFrame,
    prefix_unchanged: prefixHashBefore === prefixHashAfter,
    proof_prefix_sha256: prefixHashAfter,
    target_official_fraction: targetFraction,
    minimum_official_seconds: minimumSeconds,
    maximum_evidence_seconds: maximumEvidenceSeconds,
    before,
    after,
    recovery_count: recoveries.length,
    recoveries,
    failures,
    pass: failures.length === 0,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "official_floor_inset_recovery.json"),
    report,
  );
  if (!report.pass) {
    throw new Error(`Official inset recovery failed: ${failures.join("; ")}`);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  recoverOfficialFloorWithInset(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
