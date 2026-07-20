#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  measureFullPlanVisualMix,
  promoteSourceBackedBreakers,
} from "./orvyq_rebalance_full_plan.mjs";

const evidence = (shotId, start, end) => ({
  shot_id: shotId,
  scene_id: shotId,
  section_id: "SEC_TEST",
  start_frame: start,
  end_frame: end,
  claim_id: "CLM_TEST",
  asset_type: "evidence",
  visual_role: "evidence",
  editorial_purpose: "Keep the approved source-backed test context visible.",
  evidence: {
    kind: "official_screen",
    title: "Published safety evaluation",
    subtitle: "A controlled test with explicit limitations.",
    source_label: "Anthropic · controlled evaluation",
    source_ids: ["SRC_TEST"],
    image_assets: ["assets/evidence/test.png"],
    steps: ["Published result", "Scope", "Limitation"],
  },
});

const plan = {
  fps: 30,
  duration_frames: 1000,
  shots: [
    evidence("proof_locked", 0, 100),
    evidence("evidence_body", 100, 550),
    {
      shot_id: "breaker",
      scene_id: "breaker",
      section_id: "SEC_TEST",
      start_frame: 550,
      end_frame: 600,
      claim_id: "CLM_TEST",
      asset_type: "footage",
      visual_role: "context",
      editorial_purpose: "Break the evidence sequence with motion.",
      video_asset: "assets/footage/test.mp4",
      trim_in_sec: 0,
      trim_out_sec: 1.667,
      contextual_footage: true,
      hook_footage: false,
      provenance_mode: "approved_contextual_footage",
      generic_stock: false,
      rebalanced_from: {
        asset_type: "evidence",
        motif: "source-test",
        evidence: {
          kind: "comparison",
          title: "What the test establishes",
          subtitle: "The result is bounded by the published setup.",
          source_label: "Anthropic · controlled evaluation",
          source_ids: ["SRC_TEST"],
          steps: ["Observed behavior", "Controlled conditions", "No real-world prevalence claim"],
        },
      },
    },
    {
      shot_id: "context_body",
      scene_id: "context_body",
      section_id: "SEC_TEST",
      start_frame: 600,
      end_frame: 950,
      asset_type: "footage",
      visual_role: "context",
      editorial_purpose: "Licensed contextual footage remains in the film.",
      video_asset: "assets/footage/context.mp4",
      contextual_footage: true,
      hook_footage: false,
      provenance_mode: "approved_contextual_footage",
      generic_stock: false,
    },
    {
      shot_id: "brand_close",
      scene_id: "brand_close",
      section_id: "SEC_TEST",
      start_frame: 950,
      end_frame: 1000,
      asset_type: "graphic",
      visual_role: "graphic",
      editorial_purpose: "Close the film with the approved brand mark.",
      graphic: { type: "brand_close", title: "ORVYQ" },
    },
  ],
};

const lockedPrefixBefore = JSON.stringify(plan.shots.filter((shot) => shot.end_frame <= 100));
const before = measureFullPlanVisualMix(plan);
assert.equal(before.evidence_fraction, 0.55);
assert.equal(before.graphic_fraction, 0.05);

const result = promoteSourceBackedBreakers(plan, {
  lockedBoundaryFrame: 100,
  targetEvidenceFraction: 0.6,
  maximumGraphicFraction: 0.1,
});

assert.equal(result.converted.length, 1);
assert.equal(result.metrics.evidence_fraction, 0.6);
assert.equal(result.metrics.graphic_fraction, 0.1);
assert.equal(result.metrics.source_backed_graphic_frames, 50);
assert.equal(plan.shots[2].asset_type, "graphic");
assert.equal(plan.shots[2].graphic.source_backed, true);
assert.equal(plan.shots[2].graphic.provenance_mode, "source_derived_graphic");
assert.deepEqual(plan.shots[2].graphic.source_ids, ["SRC_TEST"]);
assert.ok(plan.shots[2].graphic.source);
assert.equal(JSON.stringify(plan.shots.filter((shot) => shot.end_frame <= 100)), lockedPrefixBefore);

console.log(JSON.stringify({
  ok: true,
  evidence_fraction_before: before.evidence_fraction,
  evidence_fraction_after: result.metrics.evidence_fraction,
  graphic_fraction_after: result.metrics.graphic_fraction,
  proof_prefix_unchanged: true,
}));
