#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const OFFICIAL_KINDS = new Set([
  "split_documents",
  "official_document",
  "official_figure",
  "official_screen",
  "image_sequence",
  "recap",
]);

export async function runOfficialLegibilityGate(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, blueprint] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
  ]);
  const fps = Number(plan.fps || 30);
  const minimumSeconds = Math.max(4, Number(blueprint.global_rules?.minimum_official_capture_seconds || 4));
  const failures = [];
  for (const shot of plan.shots || []) {
    const isOfficial =
      shot.asset_type === "evidence" &&
      OFFICIAL_KINDS.has(shot.evidence?.kind) &&
      Array.isArray(shot.evidence?.image_assets) &&
      shot.evidence.image_assets.length > 0;
    if (!isOfficial) continue;
    const seconds = (Number(shot.end_frame) - Number(shot.start_frame)) / fps;
    if (seconds + 0.001 < minimumSeconds) {
      failures.push(`${shot.shot_id} official evidence lasts only ${seconds.toFixed(2)}s`);
    }
  }
  if (failures.length) {
    throw new Error(`ORVYQ official legibility regression gate failed: ${failures.join("; ")}`);
  }
  const result = {
    ok: true,
    project_id: projectId,
    minimum_official_capture_seconds: minimumSeconds,
    official_capture_count: (plan.shots || []).filter((shot) =>
      shot.asset_type === "evidence" &&
      OFFICIAL_KINDS.has(shot.evidence?.kind) &&
      Array.isArray(shot.evidence?.image_assets) &&
      shot.evidence.image_assets.length > 0,
    ).length,
  };
  console.log(JSON.stringify(result));
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runOfficialLegibilityGate(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
