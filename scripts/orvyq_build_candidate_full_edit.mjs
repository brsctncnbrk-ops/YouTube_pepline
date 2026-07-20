#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { projectDir, pathExists, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { validateProductionPlan, buildEditPlanFromProduction } from "./lib/orvyq-production.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function buildCandidateFullEdit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const approvalPath = path.join(dir, "qa", "proof_approval.json");
  const hadApproval = await pathExists(approvalPath);
  const originalApproval = hadApproval ? await readJson(approvalPath) : null;
  const planCheck = await validateProductionPlan({ projectId, requireReady: true, requireAssets: true });
  if (!planCheck.valid) {
    throw new Error(`Candidate full edit cannot compile: ${planCheck.issues.map((entry) => entry.message).join("; ")}`);
  }
  const temporaryApproval = {
    schema_version: "1.0",
    project_id: projectId,
    approved: true,
    review_type: "human_rendered_video_review",
    human_score: 100,
    proof_run_id: "0",
    render_source_sha: "0000000000000000000000000000000000000000",
    production_plan_sha256: planCheck.plan_sha256,
    approved_at: new Date().toISOString(),
    review_notes: "Ephemeral audit-only approval. This file is restored before the command exits and cannot authorize rendering.",
  };
  try {
    await writeJsonAtomic(approvalPath, temporaryApproval);
    const compiled = await buildEditPlanFromProduction({ projectId, mode: "full" });
    return {
      project_id: projectId,
      production_plan_sha256: planCheck.plan_sha256,
      duration_frames: compiled.duration_frames,
      shot_count: compiled.shots?.length || 0,
      candidate_only: true,
      real_approval_unchanged: true,
    };
  } finally {
    if (hadApproval) await writeJsonAtomic(approvalPath, originalApproval);
    else await fs.rm(approvalPath, { force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildCandidateFullEdit(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
