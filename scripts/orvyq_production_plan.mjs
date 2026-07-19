#!/usr/bin/env node
import {
  validateProofApproval,
  writeProofApproval,
  buildEditPlanFromProduction,
  writeProductionAudit,
  finalizeProductionPlan,
} from "./lib/orvyq-production.mjs";
import { generateProductionPlan } from "./orvyq_generate_production_plan.mjs";
import { parseArgs, printJson } from "./lib/fs-utils.mjs";

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const projectId = args["project-id"];
  if (!projectId) throw new Error("--project-id is required");

  let result;
  switch (command) {
    case "generate":
      result = await generateProductionPlan(projectId, {
        proofSeconds: Number(args["proof-seconds"] || 150),
      });
      break;
    case "validate":
      result = await writeProductionAudit({
        projectId,
        requireReady: args.draft !== true,
        requireAssets: args["skip-assets"] !== true,
      });
      break;
    case "finalize":
      result = await finalizeProductionPlan({ projectId });
      break;
    case "build-proof":
      result = await buildEditPlanFromProduction({ projectId, mode: "proof" });
      break;
    case "build-full":
      result = await buildEditPlanFromProduction({ projectId, mode: "full" });
      break;
    case "check-approval":
      result = await validateProofApproval({ projectId });
      break;
    case "approve-proof":
      result = await writeProofApproval({
        projectId,
        proofRunId: args["proof-run-id"],
        humanScore: args["human-score"],
        renderSourceSha: args["render-source-sha"],
        reviewNotes: args["review-notes"] || "",
      });
      break;
    default:
      throw new Error(
        "Use generate|validate|finalize|build-proof|build-full|check-approval|approve-proof",
      );
  }

  const output =
    result && typeof result === "object"
      ? {
          ...result,
          plan: undefined,
          physical_asset_usage: undefined,
          motif_usage: undefined,
          evidence_source_usage: undefined,
        }
      : result;
  printJson({
    ok: result?.valid !== false,
    command,
    project_id: projectId,
    result: output,
  });
  if (result?.valid === false) process.exitCode = 1;
}

main().catch((error) => {
  const command = process.argv[2] || "";
  const productionCommands = new Set(["generate", "validate", "finalize", "build-proof", "build-full"]);
  printJson({
    ok: false,
    error_code:
      error.code ||
      (productionCommands.has(command)
        ? "PRODUCTION_PLAN_INCOMPLETE"
        : "UNKNOWN_ERROR"),
    message: error.message,
  });
  process.exitCode = 1;
});
