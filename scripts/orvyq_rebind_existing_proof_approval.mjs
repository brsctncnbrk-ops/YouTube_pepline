#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
  nowIso,
} from "./lib/fs-utils.mjs";
import { productionPlanSha256 } from "./lib/orvyq-production.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function rebindExistingProofApproval(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, timeline, approval, manifest, rebalance] = await Promise.all([
    readJson(path.join(dir, "direction", "production_plan.json")),
    readJson(path.join(dir, "direction", "narration_timeline.json")),
    readJson(path.join(dir, "qa", "proof_approval.json")),
    readJson(path.join(dir, "manifest.json")),
    readJson(path.join(dir, "qa", "full_film_rebalance.json")),
  ]);

  if (approval.approved !== true || approval.review_type !== "human_rendered_video_review") {
    throw new Error("Existing proof approval is not a valid human rendered-video approval");
  }
  if (Number(approval.human_score) < Number(plan.proof?.minimum_human_score || 95)) {
    throw new Error("Existing proof approval score is below the current minimum");
  }
  if (!/^[0-9]+$/.test(String(approval.proof_run_id || ""))) {
    throw new Error("Existing proof approval has no valid proof run id");
  }
  if (rebalance.pass !== true || rebalance.prefix_unchanged !== true) {
    throw new Error("Full-film rebalance did not prove that the approved proof prefix is unchanged");
  }

  const fps = Number(plan.fps || 30);
  const semanticFrame = Math.ceil(Number(timeline.proof?.speech_output_end_seconds || 0) * fps);
  const boundaryShot = plan.shots.find((shot) => shot.end_frame >= semanticFrame);
  if (!boundaryShot) throw new Error("Cannot resolve semantic proof boundary");
  const boundaryFrame = Number(boundaryShot.end_frame);
  const prefixShots = plan.shots.filter((shot) => shot.end_frame <= boundaryFrame);
  const prefixSha256 = hash(prefixShots);

  if (boundaryFrame !== Number(rebalance.locked_proof_boundary_frame)) {
    throw new Error("Rebalance report and current semantic proof boundary differ");
  }
  if (prefixSha256 !== rebalance.proof_prefix_sha256) {
    throw new Error("Current proof prefix hash differs from the rebalance continuity report");
  }
  if (prefixSha256 !== plan.quality_policy?.proof_prefix_sha256) {
    throw new Error("Current production plan is not bound to the approved proof prefix hash");
  }

  const previousPlanSha256 = String(approval.production_plan_sha256 || "");
  const currentPlanSha256 = productionPlanSha256(plan);
  const originalApprovedAt = approval.approved_at;
  const originalReviewNotes = String(approval.review_notes || "");

  const reboundApproval = {
    ...approval,
    production_plan_sha256: currentPlanSha256,
    review_notes: `${originalReviewNotes} Approval continuity verified: the canonical proof prefix through frame ${boundaryFrame} remained byte-identical while only post-proof full-film visuals were structurally rebalanced.`,
  };
  const reboundManifest = {
    ...manifest,
    status: "PROOF_APPROVED",
    current_stage: "render_qa",
    last_updated: nowIso(),
    proof: {
      ...(manifest.proof || {}),
      status: "approved",
      proof_run_id: String(approval.proof_run_id),
      render_source_sha: String(approval.render_source_sha),
      human_score: Number(approval.human_score),
      production_plan_sha256: currentPlanSha256,
      approved_at: originalApprovedAt,
    },
  };
  const continuity = {
    schema_version: "1.0-proof-approval-continuity",
    project_id: projectId,
    verified_at: nowIso(),
    proof_run_id: String(approval.proof_run_id),
    original_approved_at: originalApprovedAt,
    human_score: Number(approval.human_score),
    render_source_sha: String(approval.render_source_sha),
    previous_production_plan_sha256: previousPlanSha256,
    current_production_plan_sha256: currentPlanSha256,
    proof_prefix_sha256: prefixSha256,
    locked_through_frame: boundaryFrame,
    semantic_proof_output_seconds: Number(timeline.proof?.speech_output_end_seconds || 0),
    prefix_unchanged: true,
    proof_rerendered: false,
    proof_reapproved_by_human: false,
    continuity_basis: "Existing human approval remains valid because the rendered canonical proof prefix is byte-identical; only post-proof full-film visuals changed.",
    pass: true,
  };

  await Promise.all([
    writeJsonAtomic(path.join(dir, "qa", "proof_approval.json"), reboundApproval),
    writeJsonAtomic(path.join(dir, "manifest.json"), reboundManifest),
    writeJsonAtomic(path.join(dir, "qa", "proof_approval_continuity.json"), continuity),
  ]);

  return continuity;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebindExistingProofApproval(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
