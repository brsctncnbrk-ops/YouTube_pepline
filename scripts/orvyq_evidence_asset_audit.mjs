#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const READY_STATUSES = new Set(["ready"]);

export async function runEvidenceAssetAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [manifest, plan, evidenceMap] = await Promise.all([
    readJson(path.join(dir, "research", "evidence_asset_manifest.json")),
    readJson(path.join(dir, "direction", "edit_plan.json")),
    loadResolvedEvidenceMap(dir),
  ]);

  const claimIds = new Set(evidenceMap.claims.filter((claim) => claim.status !== "removed").map((claim) => claim.claim_id));
  const sourceIds = new Set(evidenceMap.source_catalog.map((source) => source.source_id));
  const activePlanClaimIds = new Set(plan.shots.map((shot) => shot.claim_id));
  const failures = [];
  const warnings = [];
  const assetReports = [];

  for (const asset of manifest.assets || []) {
    const unknownClaims = (asset.claim_ids || []).filter((claimId) => !claimIds.has(claimId));
    const unknownSources = (asset.source_ids || []).filter((sourceId) => !sourceIds.has(sourceId));
    if (unknownClaims.length) failures.push(`${asset.evidence_asset_id} references unknown or removed claims: ${unknownClaims.join(", ")}`);
    if (unknownSources.length) failures.push(`${asset.evidence_asset_id} references unknown sources: ${unknownSources.join(", ")}`);
    if (!(manifest.policy.allowed_modes || []).includes(asset.mode)) failures.push(`${asset.evidence_asset_id} uses disallowed mode ${asset.mode}`);
    if (!asset.render_component) failures.push(`${asset.evidence_asset_id} has no render_component`);
    if (!(asset.content || []).length) failures.push(`${asset.evidence_asset_id} has no declared content`);
    if (asset.mode === "labelled_recreation" && !asset.limitation) failures.push(`${asset.evidence_asset_id} recreation lacks a visible limitation`);

    const requiredNow = plan.preview ? asset.required_for_proof === true : asset.required_for_full === true;
    const ready = READY_STATUSES.has(asset.status);
    if (requiredNow && !ready) failures.push(`${asset.evidence_asset_id} is required for ${plan.preview ? "proof" : "full render"} but status is ${asset.status}`);
    if (!requiredNow && !ready) warnings.push(`${asset.evidence_asset_id} remains ${asset.status}`);

    assetReports.push({
      evidence_asset_id: asset.evidence_asset_id,
      status: asset.status,
      required_now: requiredNow,
      ready,
      active_claim_overlap: (asset.claim_ids || []).filter((claimId) => activePlanClaimIds.has(claimId)),
      mode: asset.mode,
      render_component: asset.render_component,
    });
  }

  for (const claimId of activePlanClaimIds) {
    const matching = (manifest.assets || []).filter((asset) => (asset.claim_ids || []).includes(claimId));
    const claim = evidenceMap.claims.find((item) => item.claim_id === claimId);
    if ((claim?.importance || 0) >= 5 && !matching.some((asset) => READY_STATUSES.has(asset.status))) {
      failures.push(`${claimId} is critical but has no ready evidence asset`);
    }
  }

  const requiredAssets = assetReports.filter((asset) => asset.required_now);
  const report = {
    schema_version: "1.0",
    project_id: projectId,
    preview: Boolean(plan.preview),
    required_asset_count: requiredAssets.length,
    ready_required_asset_count: requiredAssets.filter((asset) => asset.ready).length,
    readiness_fraction: requiredAssets.length ? requiredAssets.filter((asset) => asset.ready).length / requiredAssets.length : 1,
    assets: assetReports,
    warnings,
    failures,
    pass: failures.length === 0,
  };

  await writeJsonAtomic(path.join(dir, "qa", "evidence_asset_audit.json"), report);
  if (!report.pass) throw new Error(`ORVYQ evidence asset audit failed: ${failures.join("; ")}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEvidenceAssetAudit().then((report) => console.log(JSON.stringify({ ok: true, ...report }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
