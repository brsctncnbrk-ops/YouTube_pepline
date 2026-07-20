#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { projectDir, readJson, writeJsonAtomic, pathExists } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function bindFullRenderEvidenceBundle(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const manifestPath = path.join(dir, "research", "primary_evidence_manifest.json");
  const runtimePath = path.join(dir, "assets", "evidence", "primary_evidence.runtime.json");
  const planPath = path.join(dir, "direction", "production_plan.json");
  const [manifest, runtime, plan] = await Promise.all([
    readJson(manifestPath),
    readJson(runtimePath),
    readJson(planPath),
  ]);

  const usedIds = new Set(
    (plan.shots || []).flatMap((shot) => shot.evidence?.evidence_asset_ids || []),
  );
  const originallyRequiredIds = new Set(
    (manifest.assets || [])
      .filter((asset) => asset.required_for_full === true)
      .map((asset) => asset.evidence_asset_id),
  );
  const bundleIds = [...new Set([...usedIds, ...originallyRequiredIds])];
  const manifestById = new Map(
    (manifest.assets || []).map((asset) => [asset.evidence_asset_id, asset]),
  );
  const runtimeById = new Map(
    (runtime.assets || []).map((asset) => [asset.evidence_asset_id, asset]),
  );
  const bundledAssets = [];
  const localAssets = [];

  for (const assetId of bundleIds) {
    const declared = manifestById.get(assetId);
    const produced = runtimeById.get(assetId);
    if (!declared) throw new Error(`${assetId} is required or used but missing from the evidence manifest`);
    if (!produced) throw new Error(`${assetId} is required or used but missing from the runtime evidence manifest`);
    const localAsset = declared.local_asset;
    const absolute = path.join(dir, localAsset);
    if (!(await pathExists(absolute))) throw new Error(`${assetId} physical capture is missing: ${localAsset}`);
    const stat = await fs.stat(absolute);
    if (stat.size !== Number(produced.bytes)) throw new Error(`${assetId} physical capture size differs from runtime metadata`);

    declared.required_for_full = true;
    declared.deterministic_full_render_bundle = true;
    declared.bundled_sha256 = produced.sha256;
    declared.bundled_bytes = produced.bytes;
    declared.bundled_width = produced.width;
    declared.bundled_height = produced.height;
    localAssets.push(localAsset);
    bundledAssets.push({
      evidence_asset_id: assetId,
      local_asset: localAsset,
      source_url: declared.source_url,
      sha256: produced.sha256,
      bytes: produced.bytes,
      width: produced.width,
      height: produced.height,
      source_ids: declared.source_ids || [],
      used_in_plan: usedIds.has(assetId),
      originally_required: originallyRequiredIds.has(assetId),
    });
  }

  const retainedIds = new Set(bundleIds);
  manifest.assets = (manifest.assets || []).filter((asset) => {
    if (retainedIds.has(asset.evidence_asset_id)) return true;
    if (asset.required_for_proof === true) return true;
    return asset.availability_policy !== "best_effort_with_global_quality_gate";
  });
  manifest.schema_version = "2.8-deterministic-minimal-full-render-evidence-bundle";
  manifest.policy = {
    ...(manifest.policy || {}),
    deterministic_full_render_bundle_required: true,
    bundled_asset_count: bundledAssets.length,
    live_network_not_required_for_bundled_assets: true,
    optional_unselected_captures_removed: true,
  };

  const report = {
    schema_version: "1.1-deterministic-full-render-evidence-bundle",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    used_evidence_asset_count: usedIds.size,
    originally_required_asset_count: originallyRequiredIds.size,
    bundled_asset_count: bundledAssets.length,
    local_assets: [...new Set(localAssets)],
    runtime_manifest: "assets/evidence/primary_evidence.runtime.json",
    assets: bundledAssets,
    pass: bundledAssets.length === bundleIds.length,
  };
  await Promise.all([
    writeJsonAtomic(manifestPath, manifest),
    writeJsonAtomic(path.join(dir, "qa", "full_render_evidence_bundle.json"), report),
  ]);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  bindFullRenderEvidenceBundle(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
