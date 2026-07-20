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
const bridge = fs.readFileSync(
  "scripts/orvyq_insert_official_bridge.mjs",
  "utf8",
);
const canonicalBridge = fs.readFileSync(
  "scripts/orvyq_insert_official_bridge_v2.mjs",
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
assert.match(wrapper, /insertOfficialBridgeV2\(projectId\)/);
assert.match(wrapper, /render_dispatch_forbidden_before_final_gate: true/);
assert.match(bridge, /shot\.shot_id}_bridge_in/);
assert.match(bridge, /shot\.shot_id}_official_bridge/);
assert.match(bridge, /shot\.shot_id}_bridge_out/);
assert.match(bridge, /framesOf\(shot\) >= neededFrames \+ sideFrames \* 2/);
assert.match(bridge, /prefixAfter !== prefixBefore/);
assert.match(bridge, /maximum_uninterrupted_evidence_seconds/);
assert.match(canonicalBridge, /VALID_SHOT_ID = \/\^shot_/);
assert.match(canonicalBridge, /for \(let value = 9001; value <= 9999/);
assert.match(canonicalBridge, /canonical_ids_valid: true/);

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
assert.ok(finalGate > rebalance, "Final official gate must follow canonical bridge insertion");
assert.ok(sourceMix > finalGate, "Source mix must be enforced after final official normalization");
assert.ok(audits > sourceMix, "All audits must run after structural correction");
assert.ok(dispatch > audits, "Render dispatch must remain after every gate");

console.log(
  JSON.stringify({
    ok: true,
    contract: "orvyq-v3-canonical-isolated-official-bridge-final-gate",
    proof_run_id: policy.proof_run_id,
    official_capture_minimum_fraction:
      policy.official_capture_minimum_fraction,
    source_derived_minimum_fraction:
      policy.source_derived_minimum_fraction,
    maximum_uninterrupted_evidence_seconds:
      policy.maximum_uninterrupted_evidence_seconds,
  }),
);
