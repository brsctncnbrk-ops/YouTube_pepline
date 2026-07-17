#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const VALID_ROLES = new Set(["evidence", "archive", "context", "metaphor", "graphic"]);
const CRITICAL_IMPORTANCE = 5;

export async function runSemanticVisualAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, blueprint, evidenceMap] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
    readJson(path.join(dir, "research", "evidence_map.json")),
  ]);

  const rules = blueprint.global_rules;
  const claimById = new Map(evidenceMap.claims.map((claim) => [claim.claim_id, claim]));
  const failures = [];
  const warnings = [];
  let genericFrames = 0;
  let evidenceFrames = 0;
  let fullScreenGraphicFrames = 0;
  const roleFrames = {};
  const motifUses = new Map();

  for (const shot of plan.shots) {
    const frames = shot.end_frame - shot.start_frame;
    if (!VALID_ROLES.has(shot.visual_role)) failures.push(`${shot.shot_id} has invalid visual_role ${shot.visual_role}`);
    if (!shot.editorial_purpose || shot.editorial_purpose.length < 18) failures.push(`${shot.shot_id} lacks a specific editorial_purpose`);
    if (!shot.claim_id || !claimById.has(shot.claim_id)) failures.push(`${shot.shot_id} lacks a mapped claim`);
    roleFrames[shot.visual_role] = (roleFrames[shot.visual_role] || 0) + frames;
    if (shot.generic_stock === true) genericFrames += frames;
    if (["evidence", "archive"].includes(shot.visual_role)) evidenceFrames += frames;
    if (shot.asset_type === "graphic") fullScreenGraphicFrames += frames;
    const motif = shot.motif || shot.video_asset || shot.graphic?.type;
    if (motif) motifUses.set(motif, (motifUses.get(motif) || 0) + 1);
  }

  const duration = plan.duration_frames || 1;
  const genericFraction = genericFrames / duration;
  const evidenceFraction = evidenceFrames / duration;
  const graphicFraction = fullScreenGraphicFrames / duration;

  if (genericFraction > rules.generic_stock_fraction_max) failures.push(`generic stock occupies ${(genericFraction * 100).toFixed(1)}%, above ${(rules.generic_stock_fraction_max * 100).toFixed(1)}%`);
  if (evidenceFraction < rules.evidence_and_archive_fraction_min) failures.push(`evidence/archive occupies ${(evidenceFraction * 100).toFixed(1)}%, below ${(rules.evidence_and_archive_fraction_min * 100).toFixed(1)}%`);
  if (graphicFraction > rules.full_screen_graphic_fraction_max) failures.push(`full-screen graphics occupy ${(graphicFraction * 100).toFixed(1)}%, above ${(rules.full_screen_graphic_fraction_max * 100).toFixed(1)}%`);

  for (const claim of evidenceMap.claims.filter((item) => item.importance >= CRITICAL_IMPORTANCE)) {
    const shots = plan.shots.filter((shot) => shot.claim_id === claim.claim_id);
    if (!shots.length) continue;
    const onlyGeneric = shots.every((shot) => shot.generic_stock === true || shot.visual_role === "context");
    const hasEvidence = shots.some((shot) => ["evidence", "archive"].includes(shot.visual_role) || (shot.editorial_overlay?.source_ids || []).length);
    if (onlyGeneric || !hasEvidence) failures.push(`${claim.claim_id} is critical but is represented without claim-specific evidence`);
  }

  const overusedMotifs = [...motifUses.entries()].filter(([, count]) => count > rules.max_uses_per_source);
  if (overusedMotifs.length) failures.push(`visual motifs exceed the two-use limit: ${overusedMotifs.map(([name, count]) => `${name}=${count}`).join(", ")}`);

  for (let index = 1; index < plan.shots.length; index += 1) {
    const previous = plan.shots[index - 1];
    const current = plan.shots[index];
    if (previous.video_asset && previous.video_asset === current.video_asset) failures.push(`${current.shot_id} repeats the same source consecutively`);
    if (previous.visual_role === "metaphor" && current.visual_role === "metaphor" && previous.claim_id === current.claim_id) {
      warnings.push(`${previous.shot_id}/${current.shot_id} use consecutive metaphors for the same claim; confirm they add distinct meaning`);
    }
  }

  const report = {
    schema_version: "1.0",
    project_id: projectId,
    preview: Boolean(plan.preview),
    role_fractions: Object.fromEntries(Object.entries(roleFrames).map(([role, frames]) => [role, frames / duration])),
    generic_stock_fraction: genericFraction,
    evidence_archive_fraction: evidenceFraction,
    full_screen_graphic_fraction: graphicFraction,
    motif_uses: Object.fromEntries([...motifUses.entries()].sort((a, b) => b[1] - a[1])),
    warnings,
    failures,
    pass: failures.length === 0,
  };

  await writeJsonAtomic(path.join(dir, "qa", "semantic_visual_audit.json"), report);
  if (!report.pass) throw new Error(`ORVYQ semantic visual audit failed: ${failures.join("; ")}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSemanticVisualAudit().then((report) => console.log(JSON.stringify({ ok: true, ...report }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
