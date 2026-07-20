#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { chooseBreakerShot, measureFullPlanVisualMix, restoreOfficialBreakers } from "./orvyq_rebalance_full_plan.mjs";

const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const official = (shot_id, start_frame, end_frame) => ({
  shot_id,
  start_frame,
  end_frame,
  asset_type: "evidence",
  visual_role: "evidence",
  evidence: {
    kind: "official_screen",
    source_ids: ["SRC_A"],
    image_assets: [`assets/evidence/${shot_id}.png`],
    provenance_mode: "official_primary_capture",
  },
});
const derived = (shot_id, start_frame, end_frame) => ({
  shot_id,
  start_frame,
  end_frame,
  asset_type: "evidence",
  visual_role: "evidence",
  evidence: {
    kind: "comparison",
    source_ids: ["SRC_A"],
    source_label: "Official source",
    title: "Source-backed finding",
    provenance_mode: "source_derived_graphic",
  },
});
const breaker = (shot_id, start_frame, end_frame) => ({
  shot_id,
  start_frame,
  end_frame,
  asset_type: "footage",
  visual_role: "context",
  video_asset: "assets/footage/context.mp4",
  contextual_footage: true,
  provenance_mode: "approved_contextual_footage",
  editorial_purpose: "Break the evidence run with licensed contextual motion.",
  rebalanced_from: {
    motif: "original",
    evidence: {
      kind: "comparison",
      title: "Source-backed finding",
      source_label: "Official source",
      source_ids: ["SRC_A"],
      image_assets: [],
    },
  },
});

const plan = {
  fps: 30,
  duration_frames: 1000,
  shots: [
    { shot_id: "locked", start_frame: 0, end_frame: 100, asset_type: "graphic", visual_role: "graphic", graphic: { type: "hook" } },
    official("official_a", 100, 250),
    breaker("recoverable_breaker", 250, 370),
    official("official_b", 370, 470),
    { shot_id: "tail", start_frame: 470, end_frame: 1000, asset_type: "graphic", visual_role: "graphic", graphic: { type: "brand_close" } },
  ],
};
const prefixBefore = hash(plan.shots.filter((shot) => shot.end_frame <= 100));
const assetsBySource = new Map([["SRC_A", [{
  evidence_asset_id: "EVID_A",
  local_asset: "assets/evidence/source_a.png",
  source_ids: ["SRC_A"],
}]]]);
const result = restoreOfficialBreakers(plan, {
  lockedBoundaryFrame: 100,
  targetOfficialFraction: 0.3,
  maximumEvidenceSeconds: 16,
  minimumOfficialSeconds: 4,
  assetsBySource,
  imageUses: new Map(),
  maxUses: 5,
});
assert.equal(result.converted.length, 1, "a legible breaker must be restored when the official ratio is below target");
assert.ok(result.metrics.official_fraction >= 0.3, "official ratio must reach the unchanged 30% target");
assert.ok(result.metrics.maximum_uninterrupted_evidence_seconds <= 16, "recovery must preserve the 16-second evidence-run limit");
assert.equal(hash(plan.shots.filter((shot) => shot.end_frame <= 100)), prefixBefore, "approved proof prefix must remain byte-stable");
assert.equal(plan.shots[2].evidence.provenance_mode, "official_primary_capture");

const blocked = {
  fps: 30,
  duration_frames: 1000,
  shots: [
    official("long_a", 0, 300),
    breaker("unsafe_breaker", 300, 420),
    official("long_b", 420, 700),
    { shot_id: "tail", start_frame: 700, end_frame: 1000, asset_type: "graphic", visual_role: "graphic", graphic: { type: "brand_close" } },
  ],
};
const blockedResult = restoreOfficialBreakers(blocked, {
  lockedBoundaryFrame: 0,
  targetOfficialFraction: 0.8,
  maximumEvidenceSeconds: 16,
  minimumOfficialSeconds: 4,
  assetsBySource,
  imageUses: new Map(),
  maxUses: 5,
});
assert.equal(blockedResult.converted.length, 0, "recovery must reject a conversion that would exceed the evidence-run ceiling");
assert.equal(blocked.shots[1].asset_type, "footage", "rejected recovery must roll the shot back exactly");
assert.equal(measureFullPlanVisualMix(blocked).maximum_uninterrupted_evidence_seconds, 10);

// Regression: breaking an overlong evidence run must never consume the official floor.
const floorPlan = {
  fps: 30,
  duration_frames: 1000,
  shots: [
    official("floor_official_a", 0, 150),
    derived("safe_derived_breaker", 150, 300),
    official("floor_official_b", 300, 450),
    { shot_id: "tail", start_frame: 450, end_frame: 1000, asset_type: "graphic", graphic: { type: "brand_close" } },
  ],
};
const selected = chooseBreakerShot(floorPlan.shots.slice(0, 3), floorPlan, 0.3);
assert.equal(selected?.shot_id, "safe_derived_breaker", "rebalance must prefer a non-official breaker at the official floor");

const noSafeBreakerPlan = {
  fps: 30,
  duration_frames: 1000,
  shots: [
    official("only_official_a", 0, 150),
    official("only_official_b", 150, 300),
    { shot_id: "tail", start_frame: 300, end_frame: 1000, asset_type: "graphic", graphic: { type: "brand_close" } },
  ],
};
assert.equal(
  chooseBreakerShot(noSafeBreakerPlan.shots.slice(0, 2), noSafeBreakerPlan, 0.3),
  null,
  "rebalance must fail explicitly instead of lowering the official capture floor",
);

console.log(JSON.stringify({
  ok: true,
  regression: "official-floor-preserving-rebalance-v2",
  official_fraction: result.metrics.official_fraction,
  selected_breaker: selected?.shot_id,
}));
