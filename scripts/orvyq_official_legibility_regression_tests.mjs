#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const policy = JSON.parse(fs.readFileSync("config/orvyq-production-policy.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/orvyq-full-plan-rebalance.yml", "utf8");
const normalizer = fs.readFileSync("scripts/orvyq_normalize_official_legibility.mjs", "utf8");

assert.equal(policy.proof_run_id, "29701621699", "Approved proof run must remain centralized and immutable");
assert.equal(policy.official_capture_minimum_fraction, 0.3, "Official capture threshold must not be lowered");
assert.equal(policy.source_derived_minimum_fraction, 0.6, "Source-derived threshold must not be lowered");
assert.equal(policy.official_capture_minimum_seconds, 4, "Official capture legibility must remain at least four seconds");
assert.equal(policy.maximum_uninterrupted_evidence_seconds, 16, "Evidence-chain ceiling must remain sixteen seconds");
assert.equal(policy.allow_stock_as_official_capture, false, "Stock must never count as official capture");

const preflight = 'node scripts/orvyq_normalize_official_legibility.mjs "$PROJECT_ID" --mode preflight';
const rebalance = 'node scripts/orvyq_rebalance_full_plan.mjs "$PROJECT_ID"';
const finalGate = 'node scripts/orvyq_normalize_official_legibility.mjs "$PROJECT_ID" --mode final';
const preflightIndex = workflow.indexOf(preflight);
const rebalanceIndex = workflow.indexOf(rebalance);
const finalIndex = workflow.indexOf(finalGate);
assert.ok(preflightIndex >= 0, "Workflow must run official-legibility preflight");
assert.ok(rebalanceIndex > preflightIndex, "Rebalance must run after official-legibility preflight");
assert.ok(finalIndex > rebalanceIndex, "Final official-legibility gate must run after rebalance");
assert.match(normalizer, /mode === "final"/, "Normalizer must distinguish final enforcement from preflight cleanup");
assert.match(normalizer, /prefixHashBefore !== prefixHashAfter/, "Normalizer must preserve the approved proof prefix");
assert.match(normalizer, /durationSeconds\(shot, fps\).*minimumSeconds/s, "Normalizer must enforce minimum readable duration");

console.log(JSON.stringify({
  ok: true,
  contract: "orvyq-official-legibility-two-phase-v2",
  proof_run_id: policy.proof_run_id,
  official_capture_minimum_fraction: policy.official_capture_minimum_fraction,
  official_capture_minimum_seconds: policy.official_capture_minimum_seconds,
  maximum_uninterrupted_evidence_seconds: policy.maximum_uninterrupted_evidence_seconds,
}));
