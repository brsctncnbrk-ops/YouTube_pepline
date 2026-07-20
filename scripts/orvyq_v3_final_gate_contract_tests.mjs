#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const policy = JSON.parse(
  fs.readFileSync("config/orvyq-production-policy.json", "utf8"),
);
const wrapper = fs.readFileSync(
  "scripts/orvyq_rebalance_full_plan_v3_with_final_gate.mjs",
  "utf8",
);
const multiBridge = fs.readFileSync(
  "scripts/orvyq_insert_official_bridges_v3.mjs",
  "utf8",
);
const workflow = fs.readFileSync(
  ".github/workflows/orvyq-full-render-recovery-v4.yml",
  "utf8",
);

assert.equal(policy.proof_run_id, "29701621699");
assert.equal(policy.official_capture_minimum_fraction, 0.3);
assert.equal(policy.source_derived_minimum_fraction, 0.6);
assert.equal(policy.maximum_uninterrupted_evidence_seconds, 16);
assert.match(wrapper, /official_normalization_pending: true/);
assert.match(wrapper, /otherFailures\.length === 0/);
assert.match(wrapper, /insertOfficialBridgesV3\(projectId\)/);
assert.match(wrapper, /render_dispatch_forbidden_before_final_gate: true/);
assert.match(multiBridge, /remainingFrames/);
assert.match(multiBridge, /selections\.length \* 3/);
assert.match(multiBridge, /for \(let value = 9001; value <= 9999/);
assert.match(multiBridge, /leadingFrames < sideFrames \|\| trailingFrames < sideFrames/);
assert.match(multiBridge, /maximum_uninterrupted_evidence_seconds/);
assert.match(multiBridge, /canonical_ids_valid: true/);
assert.match(multiBridge, /inserted_bridge_count: bridges\.length/);

const rebalance = workflow.indexOf(
  'node scripts/orvyq_rebalance_full_plan_v3_with_final_gate.mjs "$PROJECT_ID"',
);
const finalGate = workflow.indexOf(
  'node scripts/orvyq_normalize_official_legibility.mjs "$PROJECT_ID" --mode final',
);
const sourceMix = workflow.indexOf(
  'node scripts/orvyq_enforce_source_mix.mjs "$PROJECT_ID"',
);
const audits = workflow.indexOf(
  'node scripts/orvyq_audit_suite.mjs "$PROJECT_ID"',
);
const dispatch = workflow.indexOf("gh workflow run render.yml");

assert.ok(rebalance >= 0, "Recovery must execute guarded v3 rebalance");
assert.ok(finalGate > rebalance, "Final official gate must follow multi-bridge insertion");
assert.ok(sourceMix > finalGate, "Source mix must be enforced after final official normalization");
assert.ok(audits > sourceMix, "All audits must run after structural correction");
assert.ok(dispatch > audits, "Render dispatch must remain after every gate");

console.log(
  JSON.stringify({
    ok: true,
    contract: "orvyq-v3-multi-isolated-official-bridges-final-gate",
    proof_run_id: policy.proof_run_id,
    official_capture_minimum_fraction:
      policy.official_capture_minimum_fraction,
    source_derived_minimum_fraction:
      policy.source_derived_minimum_fraction,
    maximum_uninterrupted_evidence_seconds:
      policy.maximum_uninterrupted_evidence_seconds,
  }),
);
