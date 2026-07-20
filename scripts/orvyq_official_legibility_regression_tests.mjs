#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const policy = JSON.parse(fs.readFileSync("config/orvyq-production-policy.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/orvyq-full-plan-rebalance.yml", "utf8");
const normalizer = fs.readFileSync("scripts/orvyq_normalize_official_legibility.mjs", "utf8");
const rebalancer = fs.readFileSync("scripts/orvyq_rebalance_full_plan_v3.mjs", "utf8");
const recoverable = fs.readFileSync("scripts/orvyq_rebalance_full_plan_v3_recoverable.mjs", "utf8");
const inset = fs.readFileSync("scripts/orvyq_recover_official_floor_with_inset.mjs", "utf8");
const reconciler = fs.readFileSync("scripts/orvyq_reconcile_structural_recovery.mjs", "utf8");

assert.equal(policy.proof_run_id, "29701621699", "Approved proof run must remain centralized and immutable");
assert.equal(policy.official_capture_minimum_fraction, 0.3, "Official capture threshold must not be lowered");
assert.equal(policy.source_derived_minimum_fraction, 0.6, "Source-derived threshold must not be lowered");
assert.equal(policy.official_capture_minimum_seconds, 4, "Official capture legibility must remain at least four seconds");
assert.equal(policy.maximum_uninterrupted_evidence_seconds, 16, "Evidence-chain ceiling must remain sixteen seconds");
assert.equal(policy.allow_stock_as_official_capture, false, "Stock must never count as official capture");

const preflight = 'node scripts/orvyq_normalize_official_legibility.mjs "$PROJECT_ID" --mode preflight';
const rebalance = 'node scripts/orvyq_rebalance_full_plan_v3_recoverable.mjs "$PROJECT_ID"';
const insetRecovery = 'node scripts/orvyq_recover_official_floor_with_inset.mjs "$PROJECT_ID"';
const finalGate = 'node scripts/orvyq_normalize_official_legibility.mjs "$PROJECT_ID" --mode final';
const sourceMix = 'node scripts/orvyq_enforce_source_mix.mjs "$PROJECT_ID"';
const reconciliation = 'node scripts/orvyq_reconcile_structural_recovery.mjs "$PROJECT_ID"';
const preflightIndex = workflow.indexOf(preflight);
const rebalanceIndex = workflow.indexOf(rebalance);
const insetIndex = workflow.indexOf(insetRecovery);
const finalIndex = workflow.indexOf(finalGate);
const sourceMixIndex = workflow.indexOf(sourceMix);
const reconcileIndex = workflow.indexOf(reconciliation);
assert.ok(preflightIndex >= 0, "Workflow must run official-legibility preflight");
assert.ok(rebalanceIndex > preflightIndex, "Recoverable v3 rebalance must run after read-only preflight");
assert.ok(insetIndex > rebalanceIndex, "Motion-preserving official inset recovery must follow v3 rebalance");
assert.ok(finalIndex > insetIndex, "Final official normalization must run after inset recovery");
assert.ok(sourceMixIndex > finalIndex, "Source-mix enforcement must run after the official floor is restored");
assert.ok(reconcileIndex > sourceMixIndex, "Structural reconciliation must run after all recovery phases");
assert.match(normalizer, /mode === "preflight" \? structuredClone\(sourcePlan\) : sourcePlan/, "Preflight must operate on a clone");
assert.match(normalizer, /if \(mode === "final"\)[\s\S]*writeJsonAtomic\(planPath, plan\)/, "Only final mode may persist plan changes");
assert.match(rebalancer, /safe_breaker_recovery/, "Rebalancer must attempt safe breaker recovery");
assert.match(recoverable, /failures\.length === 1/, "Recoverable handoff must accept exactly one failure");
assert.match(recoverable, /official fraction/, "Recoverable handoff must be limited to the official floor");
assert.match(inset, /four_second_official_inset/, "Inset recovery must retain a four-second official source scene");
assert.match(inset, /Retain contextual motion/, "Inset recovery must preserve a moving breaker segment");
assert.match(reconciler, /report\.pass = failures\.length === 0/, "Reconciliation alone may declare final structural PASS");

console.log(JSON.stringify({
  ok: true,
  contract: "orvyq-break-restore-inset-enforce-reconcile-v3.1",
  proof_run_id: policy.proof_run_id,
  official_capture_minimum_fraction: policy.official_capture_minimum_fraction,
  source_derived_minimum_fraction: policy.source_derived_minimum_fraction,
  official_capture_minimum_seconds: policy.official_capture_minimum_seconds,
  maximum_uninterrupted_evidence_seconds: policy.maximum_uninterrupted_evidence_seconds,
}));
