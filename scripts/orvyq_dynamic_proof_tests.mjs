#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { projectDir, readJson } from "./lib/fs-utils.mjs";

const projectId = process.argv[2] || "001-the-ai-race-no-one-can-afford-to-win";
const dir = projectDir(projectId);
const [productionPlan, editPlan, audioMetadata, proofWindow] = await Promise.all([
  readJson(path.join(dir, "direction", "production_plan.json")),
  readJson(path.join(dir, "direction", "edit_plan.json")),
  readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
  readJson(path.join(dir, "qa", "effective_proof_window.json")),
]);

assert.equal(editPlan.preview, true);
assert.equal(editPlan.render_mode, "proof");
assert.equal(editPlan.duration_frames, proofWindow.duration_frames);
assert.equal(editPlan.effective_proof_window.duration_frames, proofWindow.duration_frames);
assert.ok(proofWindow.duration_frames >= productionPlan.proof.duration_frames);
assert.ok(
  proofWindow.duration_seconds + 0.001 >= Number(audioMetadata.speech_timeline_end_seconds),
  "proof must cover the paused narration timeline",
);
assert.ok(
  Number(audioMetadata.duration_seconds) + 0.001 >= proofWindow.duration_seconds,
  "final audio mix must cover the full effective proof window",
);
assert.equal(editPlan.shots[0].start_frame, 0);
assert.equal(editPlan.shots.at(-1).end_frame, proofWindow.duration_frames);
for (let index = 1; index < editPlan.shots.length; index += 1) {
  assert.equal(editPlan.shots[index].start_frame, editPlan.shots[index - 1].end_frame);
}
const canonicalPrefix = productionPlan.shots.filter(
  (shot) => shot.end_frame <= proofWindow.duration_frames,
);
assert.deepEqual(
  editPlan.shots.map((shot) => shot.shot_id),
  canonicalPrefix.map((shot) => shot.shot_id),
  "proof must remain the exact canonical prefix",
);
assert.equal(
  productionPlan.shots.some((shot) => shot.end_frame === proofWindow.duration_frames),
  true,
  "effective duration must end on a canonical shot boundary",
);

console.log(JSON.stringify({
  ok: true,
  project_id: projectId,
  minimum_seconds: proofWindow.minimum_duration_seconds,
  narration_timeline_seconds: proofWindow.narration_timeline_seconds,
  effective_seconds: proofWindow.duration_seconds,
  boundary_shot_id: proofWindow.boundary_shot_id,
}));
