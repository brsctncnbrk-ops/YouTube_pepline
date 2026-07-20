#!/usr/bin/env node
import path from "node:path";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
} from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function reconcileStructuralRecovery(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const reportPath = path.join(dir, "qa", "full_film_rebalance.json");
  const [report, inset, sourceMix, normalization] = await Promise.all([
    readJson(reportPath),
    readJson(path.join(dir, "qa", "official_floor_inset_recovery.json")),
    readJson(path.join(dir, "qa", "source_mix_enforcement.json")),
    readJson(path.join(dir, "qa", "official_legibility_normalization.json")),
  ]);
  const finalMetrics = sourceMix.after;
  const failures = [];
  if (!report.prefix_unchanged || !inset.prefix_unchanged)
    failures.push("approved proof prefix changed");
  if (!inset.pass) failures.push("official inset recovery failed");
  if (!sourceMix.pass) failures.push("source-mix enforcement failed");
  if (!normalization.pass || !normalization.target_met)
    failures.push("official legibility normalization failed");
  if (
    Number(finalMetrics.official_fraction) <
    Number(report.target_official_capture_fraction) - 0.0001
  )
    failures.push(
      `official fraction ${(Number(finalMetrics.official_fraction) * 100).toFixed(2)}% < ${(Number(report.target_official_capture_fraction) * 100).toFixed(2)}%`,
    );
  if (
    Number(finalMetrics.source_backed_fraction) <
    Number(report.target_source_backed_fraction) - 0.0001
  )
    failures.push(
      `source-backed fraction ${(Number(finalMetrics.source_backed_fraction) * 100).toFixed(2)}% < ${(Number(report.target_source_backed_fraction) * 100).toFixed(2)}%`,
    );
  if (
    Number(finalMetrics.maximum_uninterrupted_evidence_seconds) >
    Number(report.maximum_evidence_seconds) + 0.001
  )
    failures.push(
      `evidence run ${Number(finalMetrics.maximum_uninterrupted_evidence_seconds).toFixed(2)}s > ${report.maximum_evidence_seconds}s`,
    );
  if (
    Number(finalMetrics.graphic_fraction) >
    Number(report.maximum_graphic_fraction) + 0.0001
  )
    failures.push(
      `graphic fraction ${(Number(finalMetrics.graphic_fraction) * 100).toFixed(2)}% > ${(Number(report.maximum_graphic_fraction) * 100).toFixed(2)}%`,
    );

  report.schema_version = "3.1-break-restore-inset-enforce";
  report.final_after = finalMetrics;
  report.inset_recovery = {
    recovery_count: inset.recovery_count,
    recoveries: inset.recoveries,
  };
  report.source_mix_completion = {
    converted_count: sourceMix.converted_count,
    converted: sourceMix.converted,
  };
  report.recoverable_handoff = {
    ...(report.recoverable_handoff || {}),
    required: Boolean(report.recoverable_handoff?.required),
    completed: failures.length === 0,
    completed_at: new Date().toISOString(),
    next_stage: null,
  };
  report.source_mix_pending = false;
  report.failures = failures;
  report.pass = failures.length === 0;
  report.reconciled_at = new Date().toISOString();
  await writeJsonAtomic(reportPath, report);
  if (!report.pass) {
    throw new Error(`ORVYQ structural recovery reconciliation failed: ${failures.join("; ")}`);
  }
  console.log(JSON.stringify({ ok: true, project_id: projectId, report }));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reconcileStructuralRecovery(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
