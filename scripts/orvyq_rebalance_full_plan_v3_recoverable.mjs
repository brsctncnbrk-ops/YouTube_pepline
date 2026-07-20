#!/usr/bin/env node
import path from "node:path";
import {
  projectDir,
  readJson,
} from "./lib/fs-utils.mjs";
import { rebalanceFullPlanV3 } from "./orvyq_rebalance_full_plan_v3.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function runRecoverableRebalance(projectId = PROJECT_ID) {
  try {
    return await rebalanceFullPlanV3(projectId);
  } catch (error) {
    const report = await readJson(
      path.join(projectDir(projectId), "qa", "full_film_rebalance.json"),
    );
    const failures = report.failures || [];
    const recoverable =
      report.prefix_unchanged === true &&
      failures.length === 1 &&
      /^official fraction [0-9.]+% < [0-9.]+%$/.test(failures[0]) &&
      Number(report.after?.maximum_uninterrupted_evidence_seconds) <=
        Number(report.maximum_evidence_seconds) + 0.001 &&
      Number(report.after?.graphic_fraction) <=
        Number(report.maximum_graphic_fraction) + 0.0001 &&
      Number(report.after?.source_backed_fraction) >=
        Number(report.target_source_backed_fraction) - 0.0001;
    if (!recoverable) throw error;
    report.recoverable_handoff = {
      required: true,
      next_stage: "official_floor_inset_recovery",
      reason: failures[0],
      all_other_structural_gates_passed: true,
    };
    console.log(
      JSON.stringify({
        ok: true,
        recoverable: true,
        project_id: projectId,
        report,
      }),
    );
    return report;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRecoverableRebalance(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
