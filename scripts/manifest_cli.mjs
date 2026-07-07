#!/usr/bin/env node
/**
 * The single place that reads or writes projects/<id>/manifest.json.
 * The factforge-orchestrator Skill calls these subcommands via Bash instead
 * of editing manifest.json directly, so state transitions are enforced by
 * code rather than by an LLM remembering the rules correctly.
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
import { STAGE_ORDER, STAGE_REQUIRED_FILES, STAGE_OUTPUT_FILES, GATES, ERROR_CODES, nextStage } from "./lib/pipeline.mjs";
import { scaffoldProject } from "./scaffold_project.mjs";
import { validateAssets, validateAll, toHuman } from "./validate.mjs";

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

// ---- subcommands ----

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
  return {
    project_id: manifest.project_id,
    project_name: manifest.project_name,
    status: manifest.status,
    current_stage: manifest.current_stage,
    waiting_for: manifest.waiting_for,
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

  if (stage === GATES.images.beforeStage) {
    const imgCheck = await validateAssets({ projectId, check: "images" });
    if (!imgCheck.valid) missing.push(...imgCheck.missing);
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
  manifest.last_successful_stage = stage;
  manifest.current_stage = nextStage(stage);
  manifest.status = manifest.pending_skills.length === 0 ? "DONE" : "IN_PROGRESS";

  await saveManifest(projectId, manifest);
  return { project_id: projectId, stage, result, manifest };
}

async function cmdGate(args) {
  const { "project-id": projectId, gate: gateName } = args;
  if (!projectId || !gateName) throw new CliError("--project-id and --gate are required", "UNKNOWN_ERROR");
  const gate = GATES[gateName];
  if (!gate) throw new CliError(`Unknown gate "${gateName}" (expected audio|images)`, "UNKNOWN_ERROR");

  const manifest = await loadManifest(projectId);
  const check = await validateAssets({ projectId, check: gateName });

  if (check.valid) {
    if (manifest.status === gate.waitStatus) manifest.status = "IN_PROGRESS";
    manifest.waiting_for = manifest.waiting_for.filter((f) =>
      gateName === "audio" ? f !== gate.requiredFile : !f.startsWith("assets/images/")
    );
  } else {
    manifest.status = gate.waitStatus;
    const others = manifest.waiting_for.filter((f) =>
      gateName === "audio" ? f !== gate.requiredFile : !f.startsWith("assets/images/")
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
    "_Not yet completed. Run the corresponding FactForge QA skill to fill in the qualitative assessment (Phase 1 only wires the mechanical checks above)._",
    "",
  ].join("\n");
  await fs.mkdir(path.dirname(qaPath), { recursive: true });
  await fs.writeFile(qaPath, content, "utf8");

  if (!result.valid) {
    let code = "SCHEMA_VALIDATION_FAILED";
    if (result.error_code) code = result.error_code;
    else if (result.reasons?.[0]) code = result.reasons[0].split(":")[0];
    else if (result.assetCheck && !result.assetCheck.valid && result.assetCheck.error_code) code = result.assetCheck.error_code;
    else if (result.filenamesCheck && !result.filenamesCheck.valid) code = "BROKEN_ASSET_PATH";
    else if (result.sceneTypeVarietyCheck && !result.sceneTypeVarietyCheck.valid) code = "SCENE_VARIETY_VIOLATION";
    else if (result.coverageCheck && !result.coverageCheck.valid) code = "BROKEN_ASSET_PATH";
    else if (result.packagingCheck && !result.packagingCheck.valid) code = result.packagingCheck.error_code || "UNKNOWN_ERROR";

    await cmdError({
      "project-id": projectId,
      code,
      stage: gateName,
      message: `Automated QA checks failed for ${gateName}`,
      action: "Review qa/" + gateName + ".md and fix the reported issues before proceeding.",
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

async function cmdPrepareRender(args) {
  const { "project-id": projectId } = args;
  if (!projectId) throw new CliError("--project-id is required", "UNKNOWN_ERROR");

  const { validateRenderReady } = await import("./validate.mjs");
  const check = await validateRenderReady({ projectId });
  const manifest = await loadManifest(projectId);

  if (check.valid) {
    manifest.status = "READY_FOR_RENDER";
    await saveManifest(projectId, manifest);
    return {
      project_id: projectId,
      ready: true,
      manifest_status: manifest.status,
      next_step:
        "Trigger the render on GitHub Actions (never locally): " +
        `gh workflow run render.yml -f project_id=${projectId}. ` +
        "The workflow renders the Remotion project, commits output/final_video.mp4 back to the branch, " +
        "and marks the manifest RENDER_DONE (via `manifest_cli.mjs render-complete`).",
    };
  }

  return { project_id: projectId, ready: false, reasons: check.reasons, checks: check.checks };
}

/**
 * Called by the GitHub Actions render workflow after a successful render.
 * Sets status RENDER_DONE and records render metadata. Kept separate from
 * `advance` because the render is an external step, not one of STAGE_ORDER.
 */
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

  manifest.status = "RENDER_DONE";
  manifest.render = { output: outRel, rendered_at: nowIso(), duration_seconds: duration ? Number(duration) : null };
  await saveManifest(projectId, manifest);
  await logSkillRun(projectId, `RENDER_COMPLETE output=${outRel}`);

  return { project_id: projectId, status: manifest.status, output: outRel };
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
  "prepare-render": cmdPrepareRender,
  "render-complete": cmdRenderComplete,
};

function printUsage() {
  console.log(
    [
      "Usage: node scripts/manifest_cli.mjs <subcommand> [--flag value ...]",
      "",
      "Subcommands: " + Object.keys(SUBCOMMANDS).join(", "),
    ].join("\n")
  );
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
if (isMain) {
  main();
}
