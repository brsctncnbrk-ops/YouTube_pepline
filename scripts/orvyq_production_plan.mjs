#!/usr/bin/env node
import {
  validateProofApproval,
  writeProofApproval,
  buildEditPlanFromProduction,
  writeProductionAudit,
  finalizeProductionPlan,
} from "./lib/orvyq-production.mjs";
import { generateProductionPlan } from "./orvyq_generate_production_plan.mjs";
import { buildDynamicProofEditPlan } from "./orvyq_dynamic_proof.mjs";
import {
  preflightCanonicalGeneration,
  bindGeneratedPlanToCanonicalTimeline,
  validateCanonicalTimelineContract,
  assertCanonicalTimelineContract,
} from "./lib/orvyq-canonical-contract.mjs";
import { bindCompiledEditPlanToCanonicalTimeline } from "./lib/orvyq-edit-plan-contract.mjs";
import { parseArgs, printJson } from "./lib/fs-utils.mjs";

function combineChecks(base, contract) {
  const issues = [...(base?.issues || []), ...(contract?.issues || [])];
  return {
    ...base,
    valid: base?.valid !== false && contract?.valid !== false,
    error_code:
      base?.valid === false
        ? base.error_code || "PRODUCTION_PLAN_INCOMPLETE"
        : contract?.valid === false
          ? "CANONICAL_TIMELINE_CONTRACT_FAILED"
          : null,
    canonical_timeline_contract: contract,
    issues,
  };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const projectId = args["project-id"];
  if (!projectId) throw new Error("--project-id is required");

  let result;
  switch (command) {
    case "generate": {
      await preflightCanonicalGeneration(projectId);
      const generated = await generateProductionPlan(projectId, {
        proofSeconds: Number(args["proof-seconds"] || 150),
      });
      const contract = await bindGeneratedPlanToCanonicalTimeline(projectId);
      result = {
        ...generated,
        valid: contract.valid,
        canonical_timeline_contract: contract,
      };
      break;
    }
    case "validate": {
      const base = await writeProductionAudit({
        projectId,
        requireReady: args.draft !== true,
        requireAssets: args["skip-assets"] !== true,
      });
      const contract = await validateCanonicalTimelineContract(projectId, {
        writeReport: true,
      });
      result = combineChecks(base, contract);
      break;
    }
    case "finalize": {
      await assertCanonicalTimelineContract(projectId);
      const finalized = await finalizeProductionPlan({ projectId });
      const contract = await assertCanonicalTimelineContract(projectId);
      result = { ...finalized, canonical_timeline_contract: contract };
      break;
    }
    case "build-proof": {
      const contract = await assertCanonicalTimelineContract(projectId);
      const built = await buildDynamicProofEditPlan(projectId);
      result = { ...built, canonical_timeline_contract: contract };
      break;
    }
    case "build-full": {
      const contract = await assertCanonicalTimelineContract(projectId);
      await buildEditPlanFromProduction({ projectId, mode: "full" });
      const built = await bindCompiledEditPlanToCanonicalTimeline(projectId, {
        mode: "full",
      });
      result = { ...built, canonical_timeline_contract: contract };
      break;
    }
    case "check-approval": {
      const contract = await assertCanonicalTimelineContract(projectId);
      const approval = await validateProofApproval({ projectId });
      result = { ...approval, canonical_timeline_contract: contract };
      break;
    }
    case "approve-proof": {
      const contract = await assertCanonicalTimelineContract(projectId);
      const approval = await writeProofApproval({
        projectId,
        proofRunId: args["proof-run-id"],
        humanScore: args["human-score"],
        renderSourceSha: args["render-source-sha"],
        reviewNotes: args["review-notes"] || "",
      });
      result = { ...approval, canonical_timeline_contract: contract };
      break;
    }
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
  const productionCommands = new Set([
    "generate",
    "validate",
    "finalize",
    "build-proof",
    "build-full",
    "check-approval",
    "approve-proof",
  ]);
  printJson({
    ok: false,
    error_code:
      error.code ||
      (productionCommands.has(command)
        ? "PRODUCTION_PLAN_INCOMPLETE"
        : "UNKNOWN_ERROR"),
    message: error.message,
    issues: error.issues || error.check?.issues || undefined,
  });
  process.exitCode = 1;
});
