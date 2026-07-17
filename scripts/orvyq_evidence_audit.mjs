#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const ALLOWED_STATUSES = new Set(["verified", "attributed_commentary"]);
const unique = (values) => [...new Set(values.filter(Boolean))];

export async function runEvidenceAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [map, plan] = await Promise.all([loadResolvedEvidenceMap(dir), readJson(path.join(dir, "direction", "edit_plan.json"))]);
  const claimById = new Map(map.claims.map((claim) => [claim.claim_id, claim]));
  const sourceById = new Map(map.source_catalog.map((source) => [source.source_id, source]));
  const activeClaimIds = unique(plan.shots.map((shot) => shot.claim_id));
  const failures = [];
  const warnings = [];
  const claimReports = [];
  let totalWeight = 0;
  let supportedWeight = 0;
  let evidenceWeight = 0;

  for (const shot of plan.shots) {
    if (!shot.claim_id || !claimById.has(shot.claim_id)) {
      failures.push(`${shot.shot_id} is missing a valid claim_id`);
      continue;
    }
    const overlaySources = shot.editorial_overlay?.source_ids || [];
    for (const sourceId of overlaySources) if (!sourceById.has(sourceId)) failures.push(`${shot.shot_id} references unknown source ${sourceId}`);
    if (["evidence", "archive"].includes(shot.visual_role) && overlaySources.length === 0 && !shot.evidence_asset) failures.push(`${shot.shot_id} is marked ${shot.visual_role} but declares neither source_ids nor an evidence_asset`);
  }

  for (const claimId of activeClaimIds) {
    const claim = claimById.get(claimId);
    if (!claim) continue;
    const weight = Number(claim.importance || 1);
    totalWeight += weight;
    const shots = plan.shots.filter((shot) => shot.claim_id === claimId);
    const evidenceShots = shots.filter((shot) => ["evidence", "archive"].includes(shot.visual_role) || (shot.editorial_overlay?.source_ids || []).length > 0 || shot.asset_type === "graphic");
    const usedSourceIds = unique(shots.flatMap((shot) => shot.editorial_overlay?.source_ids || []));
    const missingDeclaredSources = (claim.source_ids || []).filter((sourceId) => !sourceById.has(sourceId));
    if (missingDeclaredSources.length) failures.push(`${claimId} has unknown declared sources: ${missingDeclaredSources.join(", ")}`);

    const statusPass = ALLOWED_STATUSES.has(claim.status);
    if (statusPass) supportedWeight += weight;
    else failures.push(`${claimId} is active but status is ${claim.status}`);
    const critical = weight >= 5;
    const evidencePass = evidenceShots.length > 0 && (!critical || usedSourceIds.length > 0 || claim.status === "attributed_commentary");
    if (evidencePass) evidenceWeight += weight;
    else failures.push(`${claimId} has no claim-specific visual evidence`);
    if (claim.status === "attributed_commentary" && shots.every((shot) => !shot.editorial_overlay)) warnings.push(`${claimId} is attributed commentary but has no explicit editorial/source context overlay`);
    claimReports.push({ claim_id: claimId, status: claim.status, importance: weight, shot_count: shots.length, evidence_shot_count: evidenceShots.length, source_ids_used: usedSourceIds, status_pass: statusPass, evidence_pass: evidencePass });
  }

  const supportedCoverage = totalWeight ? supportedWeight / totalWeight : 0;
  const visualEvidenceCoverage = totalWeight ? evidenceWeight / totalWeight : 0;
  const minimum = plan.preview ? 0.85 : Number(map.full_render_gate?.minimum_weighted_verified_or_attributed_coverage || 0.9);
  if (supportedCoverage < minimum) failures.push(`weighted source coverage ${(supportedCoverage * 100).toFixed(1)}% is below ${(minimum * 100).toFixed(1)}%`);
  if (visualEvidenceCoverage < minimum) failures.push(`weighted visual-evidence coverage ${(visualEvidenceCoverage * 100).toFixed(1)}% is below ${(minimum * 100).toFixed(1)}%`);
  if (!plan.preview) {
    const unresolved = map.claims.filter((claim) => ["rewrite_required", "source_required"].includes(claim.status));
    if (unresolved.length) failures.push(`full render blocked by unresolved claims: ${unresolved.map((claim) => claim.claim_id).join(", ")}`);
  }

  const report = { schema_version: "1.1", project_id: projectId, preview: Boolean(plan.preview), resolved_evidence_schema: map.schema_version, active_claim_count: activeClaimIds.length, weighted_supported_coverage: supportedCoverage, weighted_visual_evidence_coverage: visualEvidenceCoverage, minimum_required: minimum, claim_reports: claimReports, warnings, failures, pass: failures.length === 0 };
  await writeJsonAtomic(path.join(dir, "qa", "evidence_coverage.json"), report);
  if (!report.pass) throw new Error(`ORVYQ evidence audit failed: ${failures.join("; ")}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEvidenceAudit().then((report) => console.log(JSON.stringify({ ok: true, ...report }))).catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
}
