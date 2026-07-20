#!/usr/bin/env node
import assert from "node:assert/strict";
import { measureSourceMix } from "./orvyq_enforce_source_mix.mjs";

const plan = {
  fps: 30,
  duration_frames: 1000,
  shots: [
    {
      shot_id: "official",
      start_frame: 0,
      end_frame: 300,
      asset_type: "evidence",
      evidence: { kind: "official_screen" },
    },
    {
      shot_id: "derived",
      start_frame: 300,
      end_frame: 500,
      asset_type: "evidence",
      evidence: { kind: "comparison" },
    },
    {
      shot_id: "breaker",
      start_frame: 500,
      end_frame: 600,
      asset_type: "footage",
      contextual_footage: true,
      provenance_mode: "approved_contextual_footage",
    },
    {
      shot_id: "source_graphic",
      start_frame: 600,
      end_frame: 700,
      asset_type: "graphic",
      graphic: {
        type: "report_scan",
        title: "Source context",
        source: "Official source",
        source_ids: ["SRC_1"],
        source_backed: true,
        provenance_mode: "source_derived_graphic",
      },
    },
    {
      shot_id: "pure_graphic",
      start_frame: 700,
      end_frame: 800,
      asset_type: "graphic",
      graphic: { type: "statement", title: "Editorial statement" },
    },
    {
      shot_id: "context",
      start_frame: 800,
      end_frame: 1000,
      asset_type: "footage",
      contextual_footage: true,
      provenance_mode: "approved_contextual_footage",
    },
  ],
};

const metrics = measureSourceMix(plan);
assert.equal(metrics.official_frames, 300);
assert.equal(metrics.derived_frames, 300);
assert.equal(metrics.source_backed_frames, 600);
assert.equal(metrics.source_backed_fraction, 0.6);
assert.equal(metrics.graphic_frames, 200);
assert.equal(metrics.graphic_fraction, 0.2);
assert.equal(metrics.contextual_frames, 300);
assert.equal(metrics.maximum_uninterrupted_evidence_seconds, 500 / 30);
assert.deepEqual(metrics.unknown_evidence_shots, []);

const invalid = structuredClone(plan);
invalid.shots[1].evidence.kind = "unregistered_kind";
assert.deepEqual(measureSourceMix(invalid).unknown_evidence_shots, ["derived"]);

console.log(JSON.stringify({ ok: true, source_backed_fraction: metrics.source_backed_fraction }));
