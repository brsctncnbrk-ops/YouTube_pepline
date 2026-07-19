#!/usr/bin/env node
import path from "node:path";
import { projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { runCompatibilityAudit } from "./orvyq_compatibility_audit.mjs";
import { runEvidenceAudit } from "./orvyq_evidence_audit.mjs";
import { runEvidenceAssetAudit } from "./orvyq_evidence_asset_audit.mjs";
import { runSemanticVisualAudit } from "./orvyq_semantic_visual_audit.mjs";
import { runPacingAudit } from "./orvyq_pacing_audit.mjs";
import { runMobileLegibilityAudit } from "./orvyq_mobile_legibility_audit.mjs";
import { runMusicCueAudit } from "./orvyq_music_cue_audit.mjs";
import { runTimelineAudit } from "./orvyq_timeline_audit.mjs";
import { validateOrvyqEditPlan } from "./orvyq_edit_plan_tests.mjs";
import { buildLicenseAudit } from "./orvyq_license_audit.mjs";
import { buildAlignmentReadiness } from "./orvyq_alignment_score.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function runAuditSuite(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const definitions = [
    ["compatibility", runCompatibilityAudit],
    ["canonical_timeline", runTimelineAudit],
    ["evidence_coverage", runEvidenceAudit],
    ["evidence_assets", runEvidenceAssetAudit],
    ["semantic_visual", runSemanticVisualAudit],
    ["pacing", runPacingAudit],
    ["mobile_legibility", runMobileLegibilityAudit],
    ["music_cues", runMusicCueAudit],
    ["edit_plan_contract", validateOrvyqEditPlan],
    ["license_provenance", buildLicenseAudit],
    ["alignment_readiness", buildAlignmentReadiness],
  ];
  const checks = [];
  for (const [name, execute] of definitions) {
    const startedAt = new Date().toISOString();
    try {
      const result = await execute(projectId);
      checks.push({
        name,
        pass: result?.pass !== false,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        summary: {
          editorial_mode: result?.editorial_mode ?? null,
          warnings: result?.warnings?.length ?? 0,
          failures: result?.failures?.length ?? 0,
          score: result?.pre_render_readiness_score ?? null,
        },
      });
    } catch (error) {
      checks.push({
        name,
        pass: false,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        error: error.message,
      });
    }
  }
  const failed = checks.filter((check) => !check.pass);
  const report = {
    schema_version: "1.1-aggregate-pre-render-gate",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    check_count: checks.length,
    passed_count: checks.length - failed.length,
    failed_count: failed.length,
    checks,
    failures: failed.map((check) => ({
      check: check.name,
      error: check.error || "Audit returned pass=false",
    })),
    pass: failed.length === 0,
  };
  await writeJsonAtomic(path.join(dir, "qa", "audit_suite.json"), report);
  console.log(JSON.stringify({ ok: report.pass, ...report }));
  if (!report.pass) {
    const error = new Error(
      `ORVYQ audit suite failed ${failed.length}/${checks.length} checks: ${failed
        .map((check) => check.name)
        .join(", ")}`,
    );
    error.report = report;
    throw error;
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`)
  runAuditSuite(process.argv[2] || PROJECT_ID).catch((error) => {
    if (!error.report)
      console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
