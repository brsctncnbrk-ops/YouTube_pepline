#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import "./orvyq_rebalance_full_plan_tests.mjs";
import { projectDir, readJson } from "./lib/fs-utils.mjs";
import { proofFingerprint } from "./orvyq_refresh_approval_for_unchanged_prefix.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

const clone = (value) => JSON.parse(JSON.stringify(value));

async function main(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, timeline] = await Promise.all([
    readJson(path.join(dir, "direction", "production_plan.json")),
    readJson(path.join(dir, "direction", "narration_timeline.json")),
  ]);

  const base = proofFingerprint(plan, timeline);
  assert.ok(base.boundary_frame > 0);
  assert.ok(base.shot_count > 0);

  const postProofMutation = clone(plan);
  const terminal = postProofMutation.shots.at(-1);
  assert.ok(Number(terminal.start_frame) >= base.boundary_frame);
  terminal.editorial_purpose = `${terminal.editorial_purpose || "Terminal"} post-proof regression mutation`;
  const postProof = proofFingerprint(postProofMutation, timeline);
  assert.equal(
    postProof.prefix_sha256,
    base.prefix_sha256,
    "post-proof-only mutations must preserve the approved proof fingerprint",
  );
  assert.equal(postProof.narration_prefix_sha256, base.narration_prefix_sha256);

  const proofMutation = clone(plan);
  proofMutation.shots[0].editorial_purpose = `${proofMutation.shots[0].editorial_purpose || "Opening"} proof regression mutation`;
  const changedProof = proofFingerprint(proofMutation, timeline);
  assert.notEqual(
    changedProof.prefix_sha256,
    base.prefix_sha256,
    "mutations inside the approved proof must invalidate continuity",
  );

  const narrationMutation = clone(timeline);
  narrationMutation.proof = {
    ...narrationMutation.proof,
    speech_output_end_seconds: Number(narrationMutation.proof.speech_output_end_seconds) + 0.1,
  };
  const changedNarration = proofFingerprint(plan, narrationMutation);
  assert.notEqual(
    changedNarration.narration_prefix_sha256,
    base.narration_prefix_sha256,
    "proof narration changes must invalidate continuity",
  );

  console.log(
    JSON.stringify({
      ok: true,
      project_id: projectId,
      proof_boundary_frame: base.boundary_frame,
      proof_shot_count: base.shot_count,
      post_proof_change_preserves_approval: true,
      proof_change_invalidates_approval: true,
      narration_change_invalidates_approval: true,
      source_backed_breaker_regression_gate: true,
    }),
  );
}

main(process.argv[2] || PROJECT_ID).catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
});
