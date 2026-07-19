#!/usr/bin/env node
/**
 * The single place that reads or writes projects/<id>/manifest.json.
 *
 * ORVYQ v3 adds a canonical full-duration production plan and a hash-bound
 * human proof approval. A project can no longer become READY_FOR_RENDER from
 * legacy Remotion readiness alone.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  INDEX_PATH,
  projectDir,
  pathExists,
  readJson,
  readJsonSafe,
  writeJsonAtomic,
  appendLine,
  nowIso,
  parseArgs,
  printJson,
  CliError,
} from "./lib/fs-utils.mjs";
import {
  STAGE_ORDER,
  STAGE_REQUIRED_FILES,
  STAGE_OUTPUT_FILES,
  GATES,
  ERROR_CODES,
  SCHEMA_VERSION,
  nextStage,
} from "./lib/pipeline.mjs";
import { scaffoldProject } from "./scaffold_project.mjs";
import { validateAssets, validateAll, toHuman } from "./validate.mjs";
import { reconcileProjectIndex } from "./index_reconciliation.mjs";
import {
  validateProductionPlan,
  validateProofApproval,
  writeProofApproval,
  buildEditPlanFromProduction,
} from "./lib/orvyq-production.mjs";

function manifestPath(projectId) {
  return path.join(projectDir(projectId), "manifest.json");
}

async function loadManifest(projectId) {
  const p = manifestPath(projectId);
  if (!(await pathExists(p))) {
    throw new CliError(`No manifest.json for project "${projectId}" (${p})`, "UNKNOWN_ERROR");
  }
  return readJson(p);
}

async function saveManifest(projectId, manifest) {
  manifest.schema_version = SCHEMA_VERSION;
  manifest.last_updated = nowIso();
  await writeJsonAtomic(manifestPath(projectId), manifest);
}

async function logSkillRun(projectId, line) {
  await appendLine(path.join(projectDir(projectId), "logs", "skill_runs.log"), `${nowIso()} ${line}`);
}

async function logOrchestrator(projectId, line) {
  await appendLine(path.join(projectDir(projectId), "logs", "orchestrator.log"), `${nowIso()} ${line}`);
}

async function logError(projectId, line) {
  await appendLine(path.join(projectDir(projectId), "logs", "errors.log"), line);
}

function summarizeCheck(check) {
  if (!check) return null;
  return {
    valid: check.valid,
    error_code: check.error_code || null,
    issues: check.issues || [],
    plan_sha256: check.plan_sha256 || null,
  };
}

async function cmdInit(args) {
  const result = await scaffoldProject({
    projectId: args["project-id"],
    name: args.name,
    idea: args.idea,
    duration: args.duration,
    audience: args.audience,
    language: args.language,
    styleRef: args["style-ref"],
  });
  await logOrchestrator(result.project_id, `PROJECT_CREATED name="${args.name}"`);
  return result;
}

async function projectSummary(id) {
  const manifest = await readJsonSafe(manifestPath(id), null);
  if (!manifest) return { project_id: id, status: "UNKNOWN (manifest.json missing)" };
  const planPath = path.join(projectDir(id), "direction", "production_plan.json");
  const approvalPath = path.join(projectDir(id), "qa", "proof_approval.json");
  return {
    project_id: manifest.project_id,
    project_name: manifest.project_name,
    schema_version: manifest.schema_version,
    status: manifest.status,
    current_stage: manifest.current_stage,
    waiting_for: manifest.waiting_for,
    canonical_plan_present: await pathExists(planPath),
    proof_approval_present: await pathExists(approvalPath),
    paused: manifest.paused,
    open_errors: manifest.errors.length,
    last_updated: manifest.last_updated,
  };
}

async function cmdStatus(args) {
  if (args.all) {
    const index = await readJsonSafe(INDEX_PATH, { projects: [] });
    const summaries = [];
    for (const p of index.projects) summaries.push(await projectSummary(p.id));
    return { projects: summaries };
  }
  if (!args["project-id"]) throw new CliError("--project-id or --all is required", "UNKNOWN_ERROR");
  return projectSummary(args["project-id"]);
}

async function cmdCheckRequired(args) {
  const { "project-id": projectId, stage } = args;
  if (!projectId || !stage) throw new CliError("--project-id and --stage are required", "UNKNOWN_ERROR");
  if (!STAGE_ORDER.includes(stage)) throw new CliError(`Unknown stage "${stage}"`, "UNKNOWN_ERROR");

  const dir = projectDir(projectId);
  const staticFiles = STAGE_REQUIRED_FILES[stage] || [];
  const missing = [];
  for (const rel of staticFiles) {
    if (!(await pathExists(path.join(dir, rel)))) missing.push(rel);
  }

  if (stage === GATES.visual_assets.beforeStage) {
    const visualCheck = await validateAssets({ projectId, check: "visual_assets" });
    if (!visualCheck.valid) missing.push(...visualCheck.missing);
  }

  return { project_id: projectId, stage, required_files: staticFiles, missing, pass: missing.length === 0 };
}

async function cmdAdvance(args) {
  const { "project-id": projectId, stage, result } = args;
  if (!projectId || !stage || !result) throw new CliError("--project-id, --stage, --result are required", "UNKNOWN_ERROR");
  if (!STAGE_ORDER.includes(stage)) throw new CliError(`Unknown stage "${stage}"`, "UNKNOWN_ERROR");
  if (!["success", "fail"].includes(result)) throw new CliError('--result must be "success" or "fail"', "UNKNOWN_ERROR");

  const manifest = await loadManifest(projectId);
  await logSkillRun(projectId, `STAGE=${stage} RESULT=${result}`);

  if (result === "fail") {
    await saveManifest(projectId, manifest);
    return { project_id: projectId, stage, result, manifest };
  }

  manifest.pending_skills = manifest.pending_skills.filter((s) => s !== stage);
  if (!manifest.completed_skills.includes(stage)) manifest.completed_skills.push(stage);
  manifest.completed_skills = STAGE_ORDER.filter((s) => manifest.completed_skills.includes(s));
  manifest.last_successful_stage = stage;
  manifest.current_stage = nextStage(stage);
  manifest.status = manifest.pending_skills.length === 0 ? "DONE" : "IN_PROGRESS";
  if (stage === "proof_qa") manifest.status = "READY_FOR_PROOF_RENDER";

  await saveManifest(projectId, manifest);
  return { project_id: projectId, stage, result, manifest };
}

async function cmdGate(args) {
  const { "project-id": projectId, gate: gateName } = args;
  if (!projectId || !gateName) throw new CliError("--project-id and --gate are required", "UNKNOWN_ERROR");
  const gate = GATES[gateName];
  if (!gate) throw new CliError(`Unknown gate "${gateName}" (expected audio|visual_assets)`, "UNKNOWN_ERROR");

  const manifest = await loadManifest(projectId);
  const check = await validateAssets({ projectId, check: gateName });

  if (check.valid) {
    if (manifest.status === gate.waitStatus) manifest.status = "IN_PROGRESS";
    manifest.waiting_for = manifest.waiting_for.filter((f) =>
      gateName === "audio" ? f !== gate.requiredFile : !f.startsWith("assets/images/") && !f.startsWith("assets/footage/"),
    );
  } else {
    manifest.status = gate.waitStatus;
    const others = manifest.waiting_for.filter((f) =>
      gateName === "audio" ? f !== gate.requiredFile : !f.startsWith("assets/images/") && !f.startsWith("assets/footage/"),
    );
    manifest.waiting_for = [...others, ...check.missing];
  }

  await saveManifest(projectId, manifest);
  return { project_id: projectId, gate: gateName, ...check, manifest_status: manifest.status };
}

async function cmdQa(args) {
  const { "project-id": projectId, gate: gateName } = args;
  if (!projectId || !gateName) throw new CliError("--project-id and --gate are required", "UNKNOWN_ERROR");

  const result = await validateAll({ projectId, stage: gateName });
  const automated = toHuman(result);
  const qaPath = path.join(projectDir(projectId), "qa", `${gateName}.md`);
  const content = [
    `# ${gateName} QA — ${projectId}`,
    "",
    automated.trim(),
    "",
    "### Judgment-Based Checks",
    "",
    "_Not yet completed. Run the corresponding ORVYQ / FactForge QA skill._",
    "",
  ].join("\n");
  await fs.mkdir(path.dirname(qaPath), { recursive: true });
  await fs.writeFile(qaPath, content, "utf8");

  if (!result.valid) {
    let code = "SCHEMA_VALIDATION_FAILED";
    if (result.error_code) code = result.error_code;
    else if (result.reasons?.[0]) code = result.reasons[0].split(":")[0];
    else if (result.productionPlanCheck && !result.productionPlanCheck.valid) code = result.productionPlanCheck.error_code || "PRODUCTION_PLAN_INCOMPLETE";
    else if (result.proofApprovalCheck && !result.proofApprovalCheck.valid) code = result.proofApprovalCheck.error_code || "PROOF_APPROVAL_REQUIRED";
    else if (result.assetCheck && !result.assetCheck.valid && result.assetCheck.error_code) code = result.assetCheck.error_code;
    else if (result.filenamesCheck && !result.filenamesCheck.valid) code = "BROKEN_ASSET_PATH";
    else if (result.coverageCheck && !result.coverageCheck.valid) code = "BROKEN_ASSET_PATH";
    else if (result.footageCheck && !result.footageCheck.valid) code = result.footageCheck.error_code || "BROKEN_ASSET_PATH";
    else if (result.factAuditCheck && !result.factAuditCheck.valid) code = result.factAuditCheck.error_code || "UNRESOLVED_CLAIM";
    else if (result.hedgeCheck && !result.hedgeCheck.valid) code = result.hedgeCheck.error_code || "UNKNOWN_ERROR";
    else if (result.packagingCheck && !result.packagingCheck.valid) code = result.packagingCheck.error_code || "UNKNOWN_ERROR";

    await cmdError({
      "project-id": projectId,
      code,
      stage: gateName,
      message: `Automated QA checks failed for ${gateName}`,
      action: `Review qa/${gateName}.md and fix the reported issues before proceeding.`,
    });
  }

  return { project_id: projectId, gate: gateName, valid: result.valid, qa_file: path.relative(process.cwd(), qaPath) };
}

async function cmdError(args) {
  const { "project-id": projectId, code, stage, message, action } = args;
  if (!projectId || !code || !stage || !message) {
    throw new CliError("--project-id, --code, --stage, --message are required", "UNKNOWN_ERROR");
  }
  const errorCode = ERROR_CODES.includes(code) ? code : "UNKNOWN_ERROR";
  const entry = {
    error_code: errorCode,
    stage,
    message,
    required_action: action || "Investigate and resolve, then run `retry`.",
    timestamp: nowIso(),
  };

  const manifest = await loadManifest(projectId);
  manifest.errors.push(entry);
  manifest.status = "ERROR";
  await saveManifest(projectId, manifest);
  await logError(projectId, JSON.stringify(entry));

  return { project_id: projectId, logged: entry };
}

async function cmdRetry(args) {
  const { "project-id": projectId } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");

  const manifest = await loadManifest(projectId);
  manifest.status = "IN_PROGRESS";
  manifest.current_stage = nextStage(manifest.last_successful_stage);
  await saveManifest(projectId, manifest);
  await logOrchestrator(projectId, `RETRY resumed_at=${manifest.current_stage ?? "end"}`);

  return { project_id: projectId, manifest };
}

async function cmdPauseResume(args, paused) {
  const { "project-id": projectId } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");
  const manifest = await loadManifest(projectId);
  manifest.paused = paused;
  await saveManifest(projectId, manifest);
  await logOrchestrator(projectId, paused ? "PAUSED" : "RESUMED");
  return { project_id: projectId, paused: manifest.paused };
}

async function cmdResetStage(args) {
  const { "project-id": projectId, stage } = args;
  const forceClean = Boolean(args["force-clean"]);
  if (!projectId || !stage) throw new CliError("--project-id and --stage are required", "UNKNOWN_ERROR");
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) throw new CliError(`Unknown stage "${stage}"`, "UNKNOWN_ERROR");

  const manifest = await loadManifest(projectId);
  const rewound = STAGE_ORDER.slice(idx);
  manifest.completed_skills = manifest.completed_skills.filter((s) => !rewound.includes(s));
  const pendingSet = new Set(manifest.pending_skills);
  for (const s of rewound) pendingSet.add(s);
  manifest.pending_skills = STAGE_ORDER.filter((s) => pendingSet.has(s));
  manifest.current_stage = stage;
  const completedInOrder = STAGE_ORDER.filter((s) => manifest.completed_skills.includes(s));
  manifest.last_successful_stage = completedInOrder.length ? completedInOrder[completedInOrder.length - 1] : null;
  manifest.status = manifest.completed_skills.length === 0 ? "NOT_STARTED" : "IN_PROGRESS";

  const cleaned = [];
  if (forceClean) {
    const dir = projectDir(projectId);
    for (const s of rewound) {
      for (const rel of STAGE_OUTPUT_FILES[s] || []) {
        const full = path.join(dir, rel);
        if (await pathExists(full)) {
          await fs.rm(full, { recursive: true, force: true });
          cleaned.push(rel);
        }
      }
    }
  }

  await saveManifest(projectId, manifest);
  await logOrchestrator(projectId, `RESET_STAGE stage=${stage} force_clean=${forceClean} cleaned=${cleaned.length}`);

  return { project_id: projectId, stage, force_clean: forceClean, cleaned_files: cleaned, manifest };
}

async function cmdMigrateV3(args) {
  const { "project-id": projectId } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");
  const manifest = await loadManifest(projectId);
  const previous = {
    schema_version: manifest.schema_version,
    status: manifest.status,
    current_stage: manifest.current_stage,
    completed_skills: [...manifest.completed_skills],
  };

  const productionIndex = STAGE_ORDER.indexOf("production_plan");
  const priorStages = STAGE_ORDER.slice(0, productionIndex);
  const completedSet = new Set(manifest.completed_skills || []);
  manifest.completed_skills = priorStages.filter((stage) => completedSet.has(stage));
  if (!manifest.completed_skills.includes("remotion") && completedSet.has("remotion")) manifest.completed_skills.push("remotion");
  manifest.completed_skills = STAGE_ORDER.filter((stage) => manifest.completed_skills.includes(stage));
  manifest.pending_skills = STAGE_ORDER.slice(productionIndex);
  manifest.current_stage = "production_plan";
  manifest.last_successful_stage = "remotion";
  manifest.status = "IN_PROGRESS";
  manifest.waiting_for = [];
  manifest.errors = [];
  delete manifest.render;
  manifest.migration = {
    migrated_to: SCHEMA_VERSION,
    migrated_at: nowIso(),
    reason: "Canonical full-duration production plan and hash-bound proof approval are now mandatory",
    previous,
  };
  await saveManifest(projectId, manifest);
  await logOrchestrator(projectId, `MIGRATE_V3 previous_status=${previous.status} reset_to=production_plan`);
  return { project_id: projectId, migrated: true, previous, manifest };
}

async function cmdPrepareProof(args) {
  const { "project-id": projectId } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");
  const manifest = await loadManifest(projectId);
  const planCheck = await validateProductionPlan({ projectId, requireReady: true });
  if (!planCheck.valid) {
    return { project_id: projectId, ready: false, check: summarizeCheck(planCheck) };
  }
  const editPlan = await buildEditPlanFromProduction({ projectId, mode: "proof" });
  manifest.status = "READY_FOR_PROOF_RENDER";
  manifest.current_stage = "render_qa";
  manifest.proof = {
    status: "ready_for_render",
    production_plan_sha256: planCheck.plan_sha256,
    duration_frames: editPlan.duration_frames,
  };
  await saveManifest(projectId, manifest);
  await logOrchestrator(projectId, `PROOF_PREPARED plan_sha256=${planCheck.plan_sha256}`);
  return {
    project_id: projectId,
    ready: true,
    manifest_status: manifest.status,
    production_plan_sha256: planCheck.plan_sha256,
    next_step: `gh workflow run orvyq-proof.yml -f project_id=${projectId}`,
  };
}

async function cmdProofComplete(args) {
  const { "project-id": projectId, "proof-run-id": proofRunId, "render-source-sha": renderSourceSha } = args;
  if (!projectId || !proofRunId || !renderSourceSha) {
    throw new CliError("--project-id, --proof-run-id, and --render-source-sha are required", "PROOF_APPROVAL_REQUIRED");
  }
  const manifest = await loadManifest(projectId);
  manifest.status = "WAITING_FOR_PROOF_APPROVAL";
  manifest.proof = {
    ...(manifest.proof || {}),
    status: "rendered_waiting_for_human_review",
    proof_run_id: String(proofRunId),
    render_source_sha: String(renderSourceSha),
    rendered_at: nowIso(),
  };
  await saveManifest(projectId, manifest);
  await logSkillRun(projectId, `PROOF_COMPLETE run=${proofRunId} source=${renderSourceSha}`);
  return { project_id: projectId, status: manifest.status, proof: manifest.proof };
}

async function cmdApproveProof(args) {
  const { "project-id": projectId } = args;
  if (!projectId) throw new CliError("--project-id is required", "PROOF_APPROVAL_REQUIRED");
  const approval = await writeProofApproval({
    projectId,
    proofRunId: args["proof-run-id"],
    humanScore: args["human-score"],
    renderSourceSha: args["render-source-sha"],
    reviewNotes: args["review-notes"] || "",
  });
  const manifest = await loadManifest(projectId);
  manifest.status = "PROOF_APPROVED";
  manifest.current_stage = "render_qa";
  manifest.proof = {
    status: "approved",
    proof_run_id: approval.proof_run_id,
    render_source_sha: approval.render_source_sha,
    human_score: approval.human_score,
    production_plan_sha256: approval.production_plan_sha256,
    approved_at: approval.approved_at,
  };
  await saveManifest(projectId, manifest);
  await logOrchestrator(projectId, `PROOF_APPROVED run=${approval.proof_run_id} score=${approval.human_score} plan_sha256=${approval.production_plan_sha256}`);
  return { project_id: projectId, status: manifest.status, approval };
}

async function cmdPrepareRender(args) {
  const { "project-id": projectId } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");

  const manifest = await loadManifest(projectId);
  const planCheck = await validateProductionPlan({ projectId, requireReady: true });
  if (!planCheck.valid) {
    return {
      project_id: projectId,
      ready: false,
      reasons: planCheck.issues.map((entry) => `${entry.code}: ${entry.message}`),
      production_plan_check: summarizeCheck(planCheck),
    };
  }
  const approvalCheck = await validateProofApproval({ projectId });
  if (!approvalCheck.valid) {
    return {
      project_id: projectId,
      ready: false,
      reasons: approvalCheck.issues.map((entry) => `${entry.code}: ${entry.message}`),
      proof_approval_check: summarizeCheck(approvalCheck),
    };
  }

  const fullPlan = await buildEditPlanFromProduction({ projectId, mode: "full" });
  const { validateRenderReady } = await import("./validate.mjs");
  const check = await validateRenderReady({ projectId });

  if (check.valid) {
    manifest.status = "READY_FOR_RENDER";
    manifest.full_render = {
      status: "ready",
      production_plan_sha256: planCheck.plan_sha256,
      approved_proof_run_id: approvalCheck.approval.proof_run_id,
      duration_frames: fullPlan.duration_frames,
    };
    await saveManifest(projectId, manifest);
    return {
      project_id: projectId,
      ready: true,
      manifest_status: manifest.status,
      production_plan_sha256: planCheck.plan_sha256,
      approved_proof_run_id: approvalCheck.approval.proof_run_id,
      next_step: `gh workflow run render.yml -f project_id=${projectId}`,
    };
  }

  return { project_id: projectId, ready: false, reasons: check.reasons, checks: check.checks };
}

async function cmdRenderComplete(args) {
  const { "project-id": projectId, "output-file": outputFile, duration } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");

  const manifest = await loadManifest(projectId);
  const dir = projectDir(projectId);
  const outRel = outputFile || "output/final_video.mp4";
  const outputExists = await pathExists(path.join(dir, outRel));
  if (!outputExists) {
    throw new CliError(`Render output ${outRel} not found - refusing to mark RENDER_DONE`, "RENDER_CONFIG_MISSING");
  }

  const approvalCheck = await validateProofApproval({ projectId });
  if (!approvalCheck.valid) {
    throw new CliError("Proof approval no longer matches the production plan; refusing to mark RENDER_DONE", approvalCheck.error_code || "PROOF_PLAN_DRIFT");
  }

  manifest.status = "RENDER_DONE";
  manifest.render = {
    output: outRel,
    rendered_at: nowIso(),
    duration_seconds: duration ? Number(duration) : null,
    production_plan_sha256: approvalCheck.plan_sha256,
    approved_proof_run_id: approvalCheck.approval.proof_run_id,
  };
  await saveManifest(projectId, manifest);
  await logSkillRun(projectId, `RENDER_COMPLETE output=${outRel} plan_sha256=${approvalCheck.plan_sha256}`);

  return { project_id: projectId, status: manifest.status, output: outRel };
}

async function cmdClearError(args) {
  const { "project-id": projectId, stage, contains } = args;
  if (!projectId || !stage || !contains) {
    throw new CliError("--project-id, --stage, and --contains are required", "UNKNOWN_ERROR");
  }
  const manifest = await loadManifest(projectId);
  const before = manifest.errors.length;
  manifest.errors = manifest.errors.filter((entry) => {
    const text = JSON.stringify(entry).toLowerCase();
    return !(entry.stage === stage && text.includes(String(contains).toLowerCase()));
  });
  const removed = before - manifest.errors.length;
  if (removed !== 1) {
    throw new CliError(`Expected to clear exactly one active error, cleared ${removed}`, "UNKNOWN_ERROR");
  }
  if (manifest.errors.length === 0 && manifest.status === "ERROR") manifest.status = "IN_PROGRESS";
  await saveManifest(projectId, manifest);
  await logOrchestrator(projectId, `CLEAR_ERROR stage=${stage} removed=${removed}`);
  return { project_id: projectId, removed, open_errors: manifest.errors.length, manifest_status: manifest.status };
}

async function cmdIndexCheck(args) {
  return reconcileProjectIndex({ projectId: args["project-id"] || null, apply: false });
}

async function cmdIndexSync(args) {
  return reconcileProjectIndex({
    projectId: args["project-id"] || null,
    apply: true,
    expectedIndexSha: args["expected-index-sha"] || null,
  });
}

const SUBCOMMANDS = {
  init: cmdInit,
  status: cmdStatus,
  "check-required": cmdCheckRequired,
  advance: cmdAdvance,
  gate: cmdGate,
  qa: cmdQa,
  error: cmdError,
  retry: cmdRetry,
  pause: (args) => cmdPauseResume(args, true),
  resume: (args) => cmdPauseResume(args, false),
  "reset-stage": cmdResetStage,
  "migrate-v3": cmdMigrateV3,
  "prepare-proof": cmdPrepareProof,
  "proof-complete": cmdProofComplete,
  "approve-proof": cmdApproveProof,
  "prepare-render": cmdPrepareRender,
  "render-complete": cmdRenderComplete,
  "clear-error": cmdClearError,
  "index-check": cmdIndexCheck,
  "index-sync": cmdIndexSync,
};

function printUsage() {
  console.log([
    "Usage: node scripts/manifest_cli.mjs <subcommand> [--flag value ...]",
    "",
    "Subcommands: " + Object.keys(SUBCOMMANDS).join(", "),
  ].join("\n"));
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  const handler = SUBCOMMANDS[subcommand];
  if (!handler) {
    printUsage();
    process.exitCode = subcommand ? 1 : 0;
    return;
  }
  const args = parseArgs(rest);
  try {
    const result = await handler(args);
    printJson({ ok: true, ...result });
  } catch (err) {
    printJson({ ok: false, error_code: err.code || "UNKNOWN_ERROR", message: err.message });
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
