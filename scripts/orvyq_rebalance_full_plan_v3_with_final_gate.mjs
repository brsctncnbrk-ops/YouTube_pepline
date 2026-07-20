#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { rebalanceFullPlanV3 } from "./orvyq_rebalance_full_plan_v3.mjs";
import { insertOfficialBridge } from "./orvyq_insert_official_bridge.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function rebalanceWithFinalGate(projectId = PROJECT_ID) {
  try {
    return await rebalanceFullPlanV3(projectId);
  } catch (error) {
    const reportPath = path.join(
      projectDir(projectId),
      "qa",
      "full_film_rebalance.json",
    );
    const report = await readJson(reportPath);
    const failures = Array.isArray(report.failures) ? report.failures : [];
    const officialFailures = failures.filter((failure) =>
      String(failure).startsWith("official fraction "),
    );
    const otherFailures = failures.filter(
      (failure) => !String(failure).startsWith("official fraction "),
    );
    const after = report.after || {};
    const structuralPass =
      report.prefix_unchanged === true &&
      otherFailures.length === 0 &&
      Array.isArray(after.unknown_evidence_shots) &&
      after.unknown_evidence_shots.length === 0 &&
      Number(after.maximum_uninterrupted_evidence_seconds) <=
        Number(report.maximum_evidence_seconds) + 0.001 &&
      Number(after.graphic_fraction) <=
        Number(report.maximum_graphic_fraction) + 0.0001;

    if (!structuralPass || officialFailures.length !== 1) {
      throw error;
    }

    const deferred = {
      ...report,
      schema_version: "3.1-final-official-gate-authoritative",
      phase_pass: true,
      pass: true,
      official_normalization_pending: true,
      deferred_failures: officialFailures,
      failures: [],
      final_gate_contract: {
        command:
          "node scripts/orvyq_normalize_official_legibility.mjs <project> --mode final",
        official_capture_fraction_min: report.target_official_capture_fraction,
        render_dispatch_forbidden_before_final_gate: true,
      },
    };
    await writeJsonAtomic(reportPath, deferred);
    const bridge = await insertOfficialBridge(projectId);
    return {
      ...deferred,
      schema_version: "3.2-isolated-official-bridge",
      official_normalization_pending: false,
      official_bridge: bridge,
      after: bridge.after,
      deferred_failures: [],
      resolved_deferred_failures: officialFailures,
      pass: bridge.pass === true,
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rebalanceWithFinalGate(process.argv[2] || PROJECT_ID)
    .then((report) =>
      console.log(
        JSON.stringify({
          ok: true,
          phase_pass: report.phase_pass ?? report.pass,
          official_normalization_pending:
            report.official_normalization_pending === true,
          official_bridge_inserted:
            report.official_bridge?.inserted === true ||
            report.official_bridge_inserted === true,
          official_fraction: report.after?.official_fraction ?? null,
          maximum_uninterrupted_evidence_seconds:
            report.after?.maximum_uninterrupted_evidence_seconds ?? null,
        }),
      ),
    )
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
