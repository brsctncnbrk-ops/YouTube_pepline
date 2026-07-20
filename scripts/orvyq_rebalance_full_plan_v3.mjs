#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import {
  projectDir,
  readJson,
  readJsonSafe,
  writeJsonAtomic,
  pathExists,
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
const secondsOf = (shot, fps) => framesOf(shot) / fps;
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function finiteNumber(value, fallback, label) {
  const resolved = value == null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(resolved)) throw new Error(`${label} must be finite`);
  return resolved;
}

function isOfficialCapture(shot) {
  return Boolean(
    shot?.asset_type === "evidence" &&
      OFFICIAL_KINDS.has(shot.evidence?.kind) &&
      Array.isArray(shot.evidence?.image_assets) &&
      shot.evidence.image_assets.length > 0 &&
      shot.evidence?.provenance_mode === "official_primary_capture",
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

function isDerivedEvidence(shot) {
  return Boolean(
    shot?.asset_type === "evidence" &&
      DERIVED_KINDS.has(shot.evidence?.kind) &&
      Array.isArray(shot.evidence?.source_ids) &&
      shot.evidence.source_ids.length > 0,
  );
}

function measure(plan, minimumOfficialSeconds = 4) {
  const fps = Number(plan.fps || 30);
  const durationFrames = Math.max(1, Number(plan.duration_frames || 0));
  let officialFrames = 0;
  let sourceBackedFrames = 0;
  let graphicFrames = 0;
  let contextualFrames = 0;
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
      if (
        shot.asset_type === "footage" &&
        shot.contextual_footage === true &&
        shot.provenance_mode === "approved_contextual_footage"
      ) {
        contextualFrames += frames;
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
    contextual_frames: contextualFrames,
    contextual_fraction: contextualFrames / durationFrames,
    maximum_uninterrupted_evidence_seconds: maximumEvidenceFrames / fps,
    unknown_evidence_shots: unknownEvidenceShots,
  };
}

function sectionForFrame(sections, frame) {
  return (
    sections.find(
      (section) => frame >= section.start_frame && frame < section.end_frame,
    ) || sections.at(-1)
  );
}

async function loadFootagePool(dir, plan, composition) {
  const unique = new Map();
  for (const scene of composition.scenes || []) {
    if (!scene.video_asset || unique.has(scene.video_asset)) continue;
    const localPath = path.join(dir, scene.video_asset);
    const provenancePath = `${localPath}.provenance.json`;
    if (!(await pathExists(localPath)) || !(await pathExists(provenancePath))) continue;
    const provenance = await readJson(provenancePath);
    if (
      provenance.approved_for_final_edit !== true ||
      !provenance.license_url
    )
      continue;
    const duration = Number(
      provenance.actual_duration_seconds ||
        provenance.duration ||
        scene.trim_out_sec ||
        0,
    );
    if (!Number.isFinite(duration) || duration <= 0) continue;
    unique.set(scene.video_asset, {
      asset: scene.video_asset,
      duration,
      section_id:
        sectionForFrame(plan.sections || [], scene.start_frame)?.section_id ||
        null,
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

function sourceBackedGraphicFromEvidence(shot, ordinal = 0) {
  const originalEvidence = structuredClone(shot.evidence || {});
  const sourceIds = originalEvidence.source_ids || [];
  const source = String(
    originalEvidence.source_label ||
      originalEvidence.source ||
      sourceIds.join(" · "),
  ).trim();
  if (!sourceIds.length || !source) return false;
  const originalMotif = shot.motif;
  delete shot.evidence;
  delete shot.video_asset;
  delete shot.trim_in_sec;
  delete shot.trim_out_sec;
  delete shot.contextual_footage;
  delete shot.hook_footage;
  delete shot.provenance_mode;
  shot.asset_type = "graphic";
  shot.visual_role = "graphic";
  shot.generic_stock = false;
  shot.graphic = {
    type: ordinal % 2 === 0 ? "report_scan" : "compute_threshold",
    family: "animated_source_context",
    kicker: "SOURCE-DERIVED ANALYSIS",
    title: originalEvidence.title || "What the source establishes",
    subtitle:
      originalEvidence.subtitle ||
      originalEvidence.limitation ||
      shot.editorial_purpose,
    labels: [
      ...(originalEvidence.steps || []),
      originalEvidence.left,
      originalEvidence.right,
    ]
      .filter((value) => typeof value === "string" && value.trim())
      .slice(0, 4),
    source,
    source_ids: sourceIds,
    source_backed: true,
    provenance_mode: "source_derived_graphic",
  };
  shot.rebalanced_from = {
    asset_type: "evidence",
    evidence: originalEvidence,
    motif: originalMotif,
  };
  shot.motif = `source-breaker:${shot.claim_id || shot.shot_id}:${ordinal}`;
  return true;
}

function selectFootage(footagePool, shot, footageUses, maxUses, fps) {
  const duration = secondsOf(shot, fps);
  const preferred = footagePool.filter(
    (entry) => entry.section_id === shot.section_id,
  );
  return (
    [...preferred, ...footagePool.filter((entry) => entry.section_id !== shot.section_id)]
      .filter(
        (entry, index, list) =>
          list.findIndex((item) => item.asset === entry.asset) === index,
      )
      .filter(
        (entry) =>
          (footageUses.get(entry.asset) || 0) < maxUses &&
          entry.duration >= duration + 0.02,
      )
      .sort(
        (a, b) =>
          (footageUses.get(a.asset) || 0) -
          (footageUses.get(b.asset) || 0),
      )[0] || null
  );
}

function convertEvidenceToFootage(
  shot,
  selected,
  trimCursor,
  footageUses,
  fps,
) {
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
  shot.rebalanced_from = {
    asset_type: "evidence",
    evidence: originalEvidence,
    motif: originalMotif,
  };
  footageUses.set(selected.asset, (footageUses.get(selected.asset) || 0) + 1);
  trimCursor.set(selected.asset, trimOut);
}

function chooseBreaker(run) {
  const midpoint =
    (Number(run[0].start_frame) + Number(run.at(-1).end_frame)) / 2;
  return [...run].sort((a, b) => {
    const officialPenalty = Number(isOfficialCapture(a)) - Number(isOfficialCapture(b));
    if (officialPenalty !== 0) return officialPenalty;
    const distanceA = Math.abs((a.start_frame + a.end_frame) / 2 - midpoint);
    const distanceB = Math.abs((b.start_frame + b.end_frame) / 2 - midpoint);
    return distanceA - distanceB;
  })[0];
}

function candidateOfficialAssets(shot, assetsBySource, imageUses, maxUses) {
  return (shot.evidence?.source_ids || [])
    .flatMap((sourceId) => assetsBySource.get(sourceId) || [])
    .filter(
      (asset, index, list) =>
        list.findIndex(
          (item) => item.evidence_asset_id === asset.evidence_asset_id,
        ) === index,
    )
    .filter((asset) => (imageUses.get(asset.local_asset) || 0) < maxUses)
    .sort(
      (a, b) =>
        (imageUses.get(a.local_asset) || 0) -
        (imageUses.get(b.local_asset) || 0),
    );
}

function promoteEvidenceShotToOfficial(shot, selected, imageUses) {
  shot.evidence = {
    ...shot.evidence,
    derived_kind: shot.evidence?.kind,
    kind: "official_screen",
    eyebrow: "OFFICIAL PRIMARY SOURCE",
    image_assets: [selected.local_asset],
    evidence_asset_ids: [selected.evidence_asset_id],
    provenance_mode: "official_primary_capture",
  };
  shot.motif = `${shot.claim_id || shot.shot_id}:official:${selected.evidence_asset_id}`;
  imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
}

function restoreFootageBreakerToOfficial(
  shot,
  selected,
  imageUses,
  plan,
  maximumEvidenceSeconds,
  minimumOfficialSeconds,
) {
  const fps = Number(plan.fps || 30);
  if (secondsOf(shot, fps) + 0.001 < minimumOfficialSeconds) return false;
  const snapshot = structuredClone(shot);
  const originalEvidence = structuredClone(shot.rebalanced_from?.evidence || {});
  Object.keys(shot).forEach((key) => delete shot[key]);
  Object.assign(shot, snapshot, {
    asset_type: "evidence",
    visual_role: "evidence",
    generic_stock: false,
    evidence: {
      ...originalEvidence,
      derived_kind: originalEvidence.kind,
      kind: "official_screen",
      eyebrow: "OFFICIAL PRIMARY SOURCE",
      image_assets: [selected.local_asset],
      evidence_asset_ids: [selected.evidence_asset_id],
      provenance_mode: "official_primary_capture",
    },
    motif: `${snapshot.claim_id || snapshot.shot_id}:official-recovery:${selected.evidence_asset_id}`,
  });
  delete shot.video_asset;
  delete shot.trim_in_sec;
  delete shot.trim_out_sec;
  delete shot.contextual_footage;
  delete shot.hook_footage;
  delete shot.provenance_mode;
  const projected = measure(plan, minimumOfficialSeconds);
  if (
    projected.maximum_uninterrupted_evidence_seconds >
    maximumEvidenceSeconds + 0.001
  ) {
    Object.keys(shot).forEach((key) => delete shot[key]);
    Object.assign(shot, snapshot);
    return false;
  }
  imageUses.set(selected.local_asset, (imageUses.get(selected.local_asset) || 0) + 1);
  return true;
}

export async function rebalanceFullPlanV3(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [plan, timeline, manifest, composition, blueprint, policy] =
    await Promise.all([
      readJson(planPath),
      readJson(path.join(dir, "direction", "narration_timeline.json")),
      readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
      readJson(path.join(dir, "remotion", "composition.json")),
      readJsonSafe(path.join(dir, "direction", "editorial_blueprint.json"), {
        global_rules: {},
      }),
      readJsonSafe(POLICY_PATH, {}),
    ]);

  const fps = finiteNumber(plan.fps, 30, "fps");
  const semanticFrame = Math.ceil(
    finiteNumber(
      timeline.proof?.speech_output_end_seconds,
      0,
      "semantic proof boundary",
    ) * fps,
  );
  const boundaryShot = (plan.shots || []).find(
    (shot) => Number(shot.end_frame) >= semanticFrame,
  );
  if (!boundaryShot) throw new Error("Cannot resolve locked proof boundary");
  const lockedBoundaryFrame = Number(boundaryShot.end_frame);
  const prefixHashBefore = hash(
    (plan.shots || []).filter(
      (shot) => shot.end_frame <= lockedBoundaryFrame,
    ),
  );
  const targetOfficialFraction = Math.max(
    finiteNumber(policy.official_capture_minimum_fraction, 0.3, "official floor"),
    finiteNumber(
      manifest.policy?.minimum_official_capture_fraction,
      0.3,
      "manifest official floor",
    ),
  );
  const targetSourceFraction = Math.max(
    finiteNumber(policy.source_derived_minimum_fraction, 0.6, "source floor"),
    finiteNumber(
      plan.quality_policy?.evidence_asset_fraction_min,
      0.6,
      "plan source floor",
    ),
  );
  const minimumOfficialSeconds = Math.max(
    finiteNumber(policy.official_capture_minimum_seconds, 4, "official duration"),
    finiteNumber(
      blueprint.global_rules?.minimum_official_capture_seconds,
      4,
      "blueprint official duration",
    ),
  );
  const maximumEvidenceSeconds = Math.min(
    finiteNumber(
      policy.maximum_uninterrupted_evidence_seconds,
      16,
      "evidence ceiling",
    ),
    finiteNumber(
      manifest.policy?.maximum_uninterrupted_evidence_seconds,
      16,
      "manifest evidence ceiling",
    ),
  );
  const maximumGraphicFraction = Math.min(
    finiteNumber(
      plan.quality_policy?.full_screen_graphic_fraction_max,
      0.1,
      "graphic ceiling",
    ),
    finiteNumber(
      blueprint.global_rules?.full_screen_graphic_fraction_max,
      0.1,
      "blueprint graphic ceiling",
    ),
  );
  const maxUses = Math.min(
    finiteNumber(plan.quality_policy?.max_uses_per_source, 5, "asset use ceiling"),
    finiteNumber(blueprint.global_rules?.max_uses_per_source, 5, "blueprint asset use ceiling"),
  );

  const assetsBySource = buildAssetsBySource(manifest);
  const imageUses = new Map();
  const footageUses = new Map();
  for (const shot of plan.shots || []) {
    for (const image of shot.evidence?.image_assets || []) {
      imageUses.set(image, (imageUses.get(image) || 0) + 1);
    }
    if (shot.asset_type === "footage" && shot.video_asset) {
      footageUses.set(
        shot.video_asset,
        (footageUses.get(shot.video_asset) || 0) + 1,
      );
    }
  }
  const footagePool = await loadFootagePool(dir, plan, composition);
  if (!footagePool.length) {
    throw new Error("No approved contextual footage pool is available");
  }

  const before = measure(plan, minimumOfficialSeconds);
  const trimCursor = new Map();
  const breakers = [];
  let iterations = 0;
  while (
    measure(plan, minimumOfficialSeconds)
      .maximum_uninterrupted_evidence_seconds >
    maximumEvidenceSeconds + 0.001
  ) {
    if (++iterations > 100) {
      throw new Error("Evidence-chain rebalance exceeded iteration limit");
    }
    const run = evidenceRuns(plan, lockedBoundaryFrame).find(
      (items) =>
        items.reduce((sum, shot) => sum + framesOf(shot), 0) / fps >
        maximumEvidenceSeconds + 0.001,
    );
    if (!run) break;
    const candidate = chooseBreaker(run);
    if (!candidate) throw new Error("No evidence-chain breaker candidate exists");
    const metrics = measure(plan, minimumOfficialSeconds);
    const projectedGraphicFraction =
      (metrics.graphic_frames + framesOf(candidate)) /
      metrics.duration_frames;
    if (
      !isOfficialCapture(candidate) &&
      projectedGraphicFraction <= maximumGraphicFraction + 0.0001 &&
      sourceBackedGraphicFromEvidence(candidate, breakers.length + 1)
    ) {
      breakers.push({
        shot_id: candidate.shot_id,
        mode: "animated_source_graphic",
        duration_seconds: framesOf(candidate) / fps,
      });
      continue;
    }
    const selected = selectFootage(
      footagePool,
      candidate,
      footageUses,
      maxUses,
      fps,
    );
    if (!selected) {
      if (
        projectedGraphicFraction <= maximumGraphicFraction + 0.0001 &&
        sourceBackedGraphicFromEvidence(candidate, breakers.length + 1)
      ) {
        breakers.push({
          shot_id: candidate.shot_id,
          mode: "animated_source_graphic",
          duration_seconds: framesOf(candidate) / fps,
        });
        continue;
      }
      throw new Error(
        `No approved breaker asset is available for ${candidate.shot_id}`,
      );
    }
    convertEvidenceToFootage(
      candidate,
      selected,
      trimCursor,
      footageUses,
      fps,
    );
    breakers.push({
      shot_id: candidate.shot_id,
      mode: "contextual_footage",
      video_asset: selected.asset,
      duration_seconds: framesOf(candidate) / fps,
    });
  }

  const promoted = [];
  let metrics = measure(plan, minimumOfficialSeconds);
  for (const shot of plan.shots || []) {
    if (metrics.official_fraction >= targetOfficialFraction - 0.0001) break;
    if (
      shot.end_frame <= lockedBoundaryFrame ||
      !isDerivedEvidence(shot) ||
      secondsOf(shot, fps) + 0.001 < minimumOfficialSeconds
    )
      continue;
    const selected = candidateOfficialAssets(
      shot,
      assetsBySource,
      imageUses,
      maxUses,
    )[0];
    if (!selected) continue;
    promoteEvidenceShotToOfficial(shot, selected, imageUses);
    promoted.push({
      shot_id: shot.shot_id,
      mode: "derived_evidence_promotion",
      evidence_asset_id: selected.evidence_asset_id,
      local_asset: selected.local_asset,
    });
    metrics = measure(plan, minimumOfficialSeconds);
  }

  const restored = [];
  for (const shot of plan.shots || []) {
    if (metrics.official_fraction >= targetOfficialFraction - 0.0001) break;
    if (
      shot.end_frame <= lockedBoundaryFrame ||
      shot.asset_type !== "footage" ||
      !shot.rebalanced_from?.evidence
    )
      continue;
    const pseudoShot = { evidence: shot.rebalanced_from.evidence };
    const selected = candidateOfficialAssets(
      pseudoShot,
      assetsBySource,
      imageUses,
      maxUses,
    )[0];
    if (!selected) continue;
    if (
      restoreFootageBreakerToOfficial(
        shot,
        selected,
        imageUses,
        plan,
        maximumEvidenceSeconds,
        minimumOfficialSeconds,
      )
    ) {
      restored.push({
        shot_id: shot.shot_id,
        mode: "safe_breaker_recovery",
        evidence_asset_id: selected.evidence_asset_id,
        local_asset: selected.local_asset,
      });
      metrics = measure(plan, minimumOfficialSeconds);
    }
  }

  const after = measure(plan, minimumOfficialSeconds);
  const prefixHashAfter = hash(
    (plan.shots || []).filter(
      (shot) => shot.end_frame <= lockedBoundaryFrame,
    ),
  );
  const failures = [];
  if (prefixHashAfter !== prefixHashBefore) failures.push("approved proof prefix changed");
  if (after.unknown_evidence_shots.length)
    failures.push(`unknown evidence kinds: ${after.unknown_evidence_shots.join(", ")}`);
  if (after.official_fraction < targetOfficialFraction - 0.0001)
    failures.push(
      `official fraction ${(after.official_fraction * 100).toFixed(2)}% < ${(targetOfficialFraction * 100).toFixed(2)}%`,
    );
  if (
    after.maximum_uninterrupted_evidence_seconds >
    maximumEvidenceSeconds + 0.001
  )
    failures.push(
      `evidence run ${after.maximum_uninterrupted_evidence_seconds.toFixed(2)}s > ${maximumEvidenceSeconds}s`,
    );
  if (after.graphic_fraction > maximumGraphicFraction + 0.0001)
    failures.push(
      `graphic fraction ${(after.graphic_fraction * 100).toFixed(2)}% > ${(maximumGraphicFraction * 100).toFixed(2)}%`,
    );
  const terminal = (plan.shots || []).filter(
    (shot) => shot.graphic?.type === "brand_close",
  );
  if (terminal.length !== 1 || terminal[0] !== plan.shots.at(-1)) {
    failures.push("terminal brand close invariant failed");
  }

  plan.generated_at = new Date().toISOString();
  plan.quality_policy = {
    ...plan.quality_policy,
    official_capture_fraction_min: targetOfficialFraction,
    evidence_asset_fraction_min: targetSourceFraction,
    minimum_official_capture_seconds: minimumOfficialSeconds,
    maximum_uninterrupted_evidence_seconds: maximumEvidenceSeconds,
    full_film_rebalance_version: "3.0-break-restore-enforce",
    proof_prefix_sha256: prefixHashAfter,
    proof_prefix_locked_through_frame: lockedBoundaryFrame,
  };
  await writeJsonAtomic(planPath, plan);

  const report = {
    schema_version: "3.0-break-restore-enforce",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    locked_proof_boundary_frame: lockedBoundaryFrame,
    proof_prefix_sha256: prefixHashAfter,
    prefix_unchanged: prefixHashBefore === prefixHashAfter,
    target_official_capture_fraction: targetOfficialFraction,
    target_source_backed_fraction: targetSourceFraction,
    maximum_graphic_fraction: maximumGraphicFraction,
    maximum_evidence_seconds: maximumEvidenceSeconds,
    before,
    after,
    converted_breaker_count: breakers.length,
    converted_official_count: promoted.length + restored.length,
    breakers,
    promoted,
    restored,
    source_mix_pending: after.source_backed_fraction < targetSourceFraction - 0.0001,
    failures,
    pass: failures.length === 0,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "full_film_rebalance.json"),
    report,
  );
  if (!report.pass) {
    throw new Error(`ORVYQ v3 rebalance failed: ${failures.join("; ")}`);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebalanceFullPlanV3(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
