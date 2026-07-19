#!/usr/bin/env node
import {
  validateProductionPlan,
  validateProofApproval,
  writeProofApproval,
  buildEditPlanFromProduction,
  writeProductionAudit,
} from "./lib/orvyq-production.mjs";
import { parseArgs, printJson } from "./lib/fs-utils.mjs";

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const projectId = args["project-id"];
  if (!projectId) throw new Error("--project-id is required");

  let result;
  switch (command) {
    case "validate":
      result = await writeProductionAudit({ projectId });
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
        "Use validate|build-proof|build-full|check-approval|approve-proof",
      );
  }

  const output = result?.plan ? { ...result, plan: undefined } : result;
  printJson({ ok: result?.valid !== false, command, project_id: projectId, result: output });
  if (result?.valid === false) process.exitCode = 1;
}

main().catch((error) => {
  printJson({ ok: false, error_code: error.code || "UNKNOWN_ERROR", message: error.message });
  process.exitCode = 1;
});
