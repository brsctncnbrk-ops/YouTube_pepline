#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function pruneUnavailableOptionalCaptures(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const manifestPath = path.join(dir, "research", "primary_evidence_manifest.json");
  const runtimePath = path.join(dir, "assets", "evidence", "primary_evidence.runtime.json");
  const [manifest, runtime] = await Promise.all([
    readJson(manifestPath),
    readJson(runtimePath),
  ]);
  if (runtime.pass !== true || Number(runtime.required_failure_count || 0) !== 0) {
    throw new Error("Required primary evidence did not pass before optional capture pruning");
  }
  const availableIds = new Set((runtime.assets || []).map((asset) => asset.evidence_asset_id));
  const kept = [];
  const removed = [];
  for (const asset of manifest.assets || []) {
    const optionalWeb =
      asset.capture_type === "webpage" &&
      asset.required_for_full !== true &&
      asset.availability_policy === "best_effort_with_global_quality_gate";
    if (optionalWeb && !availableIds.has(asset.evidence_asset_id)) {
      removed.push({
        evidence_asset_id: asset.evidence_asset_id,
        source_ids: asset.source_ids || [],
        source_url: asset.source_url,
        reason:
          (runtime.failures || []).find(
            (failure) => failure.evidence_asset_id === asset.evidence_asset_id,
          )?.error || "capture unavailable in this run",
      });
      continue;
    }
    kept.push(asset);
  }
  manifest.assets = kept;
  manifest.schema_version = "2.6-runtime-available-official-capture-set";
  manifest.policy = {
    ...(manifest.policy || {}),
    optional_capture_failures_last_run: removed,
    optional_capture_failure_count_last_run: removed.length,
    effective_capture_asset_count: kept.length,
    availability_binding:
      "Only successfully validated optional webpage captures remain eligible; final plan quality gates remain mandatory.",
  };
  const report = {
    schema_version: "1.0-optional-capture-availability",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    runtime_asset_count: (runtime.assets || []).length,
    required_failure_count: Number(runtime.required_failure_count || 0),
    optional_failure_count: Number(runtime.optional_failure_count || 0),
    removed_optional_count: removed.length,
    retained_asset_count: kept.length,
    removed,
    pass: true,
  };
  await Promise.all([
    writeJsonAtomic(manifestPath, manifest),
    writeJsonAtomic(path.join(dir, "qa", "optional_capture_availability.json"), report),
  ]);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  pruneUnavailableOptionalCaptures(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
