#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

function textLength(value) {
  return String(value || "").trim().length;
}

export async function runMobileLegibilityAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, blueprint] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
  ]);
  const rules = blueprint.global_rules;
  const failures = [];
  const warnings = [];
  const overlayReports = [];

  for (const shot of plan.shots) {
    const overlay = shot.editorial_overlay;
    if (!overlay) continue;
    const fontPx = Number(overlay.font_px || 0);
    const titleChars = textLength(overlay.title);
    const bodyChars = textLength(overlay.body);
    if (fontPx < rules.minimum_overlay_font_px) failures.push(`${shot.shot_id} overlay font ${fontPx}px is below ${rules.minimum_overlay_font_px}px`);
    if (titleChars > rules.mobile_safe_title_chars) failures.push(`${shot.shot_id} title has ${titleChars} characters, above ${rules.mobile_safe_title_chars}`);
    if (bodyChars > rules.mobile_safe_body_chars) failures.push(`${shot.shot_id} body has ${bodyChars} characters, above ${rules.mobile_safe_body_chars}`);
    if ((overlay.limitation || "").length > 92) warnings.push(`${shot.shot_id} limitation is long; verify on the mobile review sheet`);
    if ((overlay.source_ids || []).length && !overlay.eyebrow) failures.push(`${shot.shot_id} sourced overlay requires a visible source/date eyebrow`);
    if (["document", "email_recreation"].includes(overlay.type) && !overlay.recreation_label) failures.push(`${shot.shot_id} recreated evidence requires a recreation label`);
    overlayReports.push({
      shot_id: shot.shot_id,
      type: overlay.type,
      font_px: fontPx,
      title_chars: titleChars,
      body_chars: bodyChars,
      source_count: (overlay.source_ids || []).length,
    });
  }

  const report = {
    schema_version: "1.0",
    project_id: projectId,
    minimum_overlay_font_px: rules.minimum_overlay_font_px,
    mobile_safe_title_chars: rules.mobile_safe_title_chars,
    mobile_safe_body_chars: rules.mobile_safe_body_chars,
    overlays: overlayReports,
    warnings,
    failures,
    pass: failures.length === 0,
  };
  await writeJsonAtomic(path.join(dir, "qa", "mobile_legibility_audit.json"), report);
  if (!report.pass) throw new Error(`ORVYQ mobile legibility audit failed: ${failures.join("; ")}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMobileLegibilityAudit().then((report) => console.log(JSON.stringify({ ok: true, ...report }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
