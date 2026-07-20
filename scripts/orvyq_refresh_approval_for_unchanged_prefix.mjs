#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { productionPlanSha256 } from "./lib/orvyq-production.mjs";

const run = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => key !== "generated_at")
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

export function proofFingerprint(plan, timeline) {
  const fps = Number(plan.fps || timeline.fps || 30);
  const semanticFrame = Math.ceil(Number(timeline.proof?.speech_output_end_seconds || 0) * fps);
  const boundaryShot = (plan.shots || []).find((shot) => Number(shot.end_frame) >= semanticFrame);
  if (!boundaryShot) throw new Error("Cannot resolve semantic proof boundary from the canonical plan");
  const boundaryFrame = Number(boundaryShot.end_frame);
  const shots = (plan.shots || []).filter((shot) => Number(shot.end_frame) <= boundaryFrame);
  const sections = (plan.sections || [])
    .filter((section) => Number(section.start_frame) < boundaryFrame)
    .map((section) => ({ ...section, end_frame: Math.min(Number(section.end_frame), boundaryFrame) }));
  const proofTimeline = {
    schema_version: timeline.schema_version,
    project_id: timeline.project_id,
    voice_source: timeline.voice_source,
    voice_source_sha256: timeline.voice_source_sha256,
    voice_repair: timeline.voice_repair,
    fps: timeline.fps,
    canonical_pauses: (timeline.canonical_pauses || []).filter(
      (pause) => Number(pause.output_start_seconds) < boundaryFrame / fps,
    ),
    proof: timeline.proof,
  };
  const contract = {
    schema_version: "1.0-proof-prefix-contract",
    project_id: plan.project_id,
    fps,
    boundary_frame: boundaryFrame,
    shots,
    sections,
    narration: proofTimeline,
  };
  return {
    boundary_frame: boundaryFrame,
    prefix_sha256: sha256(contract),
    narration_prefix_sha256: sha256(proofTimeline),
    shot_count: shots.length,
    contract,
  };
}

async function gitJson(commitSha, repoPath) {
  const { stdout } = await run("git", ["show", `${commitSha}:${repoPath}`], {
    maxBuffer: 100 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

export async function refreshApproval(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const approvalPath = path.join(dir, "qa", "proof_approval.json");
  const manifestPath = path.join(dir, "manifest.json");
  const planPath = path.join(dir, "direction", "production_plan.json");
  const timelinePath = path.join(dir, "direction", "narration_timeline.json");
  const [approval, manifest, currentPlan, currentTimeline] = await Promise.all([
    readJson(approvalPath),
    readJson(manifestPath),
    readJson(planPath),
    readJson(timelinePath),
  ]);
  if (approval.approved !== true || approval.review_type !== "human_rendered_video_review") {
    throw new Error("Existing proof approval is not a valid human rendered-video approval");
  }
  if (!/^[0-9a-f]{40}$/.test(String(approval.render_source_sha || ""))) {
    throw new Error("Existing proof approval does not contain a valid render source commit");
  }

  const repoBase = `projects/${projectId}`;
  const [approvedPlan, approvedTimeline] = await Promise.all([
    gitJson(approval.render_source_sha, `${repoBase}/direction/production_plan.json`),
    gitJson(approval.render_source_sha, `${repoBase}/direction/narration_timeline.json`),
  ]);
  const approvedPrefix = proofFingerprint(approvedPlan, approvedTimeline);
  const currentPrefix = proofFingerprint(currentPlan, currentTimeline);
  if (approvedPrefix.prefix_sha256 !== currentPrefix.prefix_sha256) {
    throw new Error(
      `Approved proof prefix changed: ${approvedPrefix.prefix_sha256} != ${currentPrefix.prefix_sha256}`,
    );
  }
  if (approvedPrefix.narration_prefix_sha256 !== currentPrefix.narration_prefix_sha256) {
    throw new Error("Approved proof narration timeline changed");
  }

  const originalPlanSha = approval.production_plan_sha256;
  const currentPlanSha = productionPlanSha256(currentPlan);
  const note = `Approval continuity verified structurally: rendered prefix ${currentPrefix.prefix_sha256} and narration prefix ${currentPrefix.narration_prefix_sha256} are byte-stable through frame ${currentPrefix.boundary_frame}; post-prefix plan changes only.`;
  const updatedApproval = {
    ...approval,
    production_plan_sha256: currentPlanSha,
    review_notes: [approval.review_notes, note].filter(Boolean).join(" "),
  };
  const updatedManifest = {
    ...manifest,
    status: "PROOF_APPROVED",
    current_stage: "render_qa",
    last_updated: new Date().toISOString(),
    proof: {
      ...(manifest.proof || {}),
      status: "approved",
      proof_run_id: String(approval.proof_run_id),
      render_source_sha: String(approval.render_source_sha),
      human_score: Number(approval.human_score),
      production_plan_sha256: currentPlanSha,
      approved_at: approval.approved_at,
    },
  };
  await Promise.all([
    writeJsonAtomic(approvalPath, updatedApproval),
    writeJsonAtomic(manifestPath, updatedManifest),
  ]);

  const report = {
    schema_version: "1.1-proof-approval-continuity",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    proof_run_id: approval.proof_run_id,
    render_source_sha: approval.render_source_sha,
    approved_plan_sha256: originalPlanSha,
    current_plan_sha256: currentPlanSha,
    approved_prefix_sha256: approvedPrefix.prefix_sha256,
    current_prefix_sha256: currentPrefix.prefix_sha256,
    approved_narration_prefix_sha256: approvedPrefix.narration_prefix_sha256,
    current_narration_prefix_sha256: currentPrefix.narration_prefix_sha256,
    proof_boundary_frame: currentPrefix.boundary_frame,
    proof_shot_count: currentPrefix.shot_count,
    prefix_unchanged: true,
    narration_unchanged: true,
    approval_preserved: true,
    manifest_synchronized: true,
    new_proof_required: false,
    pass: true,
  };
  await writeJsonAtomic(path.join(dir, "qa", "proof_approval_continuity.json"), report);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refreshApproval(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
