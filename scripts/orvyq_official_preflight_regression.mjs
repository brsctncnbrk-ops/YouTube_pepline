#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const EXPECTED_PROOF_RUN_ID = "29701621699";
const OFFICIAL_KINDS = new Set([
  "split_documents",
  "official_document",
  "official_figure",
  "official_screen",
  "image_sequence",
  "recap",
]);
const framesOf = (shot) => Number(shot.end_frame) - Number(shot.start_frame);
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isOfficial = (shot) =>
  shot?.asset_type === "evidence" &&
  OFFICIAL_KINDS.has(shot.evidence?.kind) &&
  Array.isArray(shot.evidence?.image_assets) &&
  shot.evidence.image_assets.length > 0;

export async function runOfficialPreflightRegression(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, approval] = await Promise.all([
    readJson(path.join(dir, "direction", "production_plan.json")),
    readJson(path.join(dir, "qa", "proof_approval.json")),
  ]);
  const fps = Number(plan.fps || 30);
  const durationFrames = Math.max(1, Number(plan.duration_frames || 0));
  const lockedBoundaryFrame = Number(plan.quality_policy?.proof_prefix_locked_through_frame || 0);
  const minimumSeconds = Math.max(4, Number(plan.quality_policy?.minimum_official_capture_seconds || 4));
  const requiredOfficialFraction = Math.max(0.3, Number(plan.quality_policy?.official_capture_fraction_min || 0.3));

  if (String(approval.proof_run_id) !== EXPECTED_PROOF_RUN_ID) {
    throw new Error(`Approved proof run changed: ${approval.proof_run_id || "missing"}`);
  }
  if (!lockedBoundaryFrame) throw new Error("Locked proof boundary is missing");

  const lockedPrefix = (plan.shots || []).filter((shot) => Number(shot.end_frame) <= lockedBoundaryFrame);
  const currentPrefixHash = hash(lockedPrefix);
  const expectedPrefixHash = String(plan.quality_policy?.proof_prefix_sha256 || "");
  if (expectedPrefixHash && currentPrefixHash !== expectedPrefixHash) {
    throw new Error(`Approved proof prefix drifted: ${currentPrefixHash} != ${expectedPrefixHash}`);
  }

  const officialShots = (plan.shots || []).filter(isOfficial);
  const shortOfficial = officialShots
    .filter((shot) => Number(shot.end_frame) > lockedBoundaryFrame && framesOf(shot) / fps + 0.001 < minimumSeconds)
    .map((shot) => `${shot.shot_id}=${(framesOf(shot) / fps).toFixed(2)}s`);
  if (shortOfficial.length) {
    throw new Error(`Short official captures remain after normalization: ${shortOfficial.join(", ")}`);
  }

  const officialFrames = officialShots.reduce((sum, shot) => sum + framesOf(shot), 0);
  const officialFraction = officialFrames / durationFrames;
  if (officialFraction < requiredOfficialFraction - 0.0001) {
    throw new Error(`Official capture preflight remains below target: ${(officialFraction * 100).toFixed(2)}% < ${(requiredOfficialFraction * 100).toFixed(2)}%`);
  }

  const report = {
    schema_version: "1.0-official-preflight-regression",
    project_id: projectId,
    proof_run_id: EXPECTED_PROOF_RUN_ID,
    locked_proof_boundary_frame: lockedBoundaryFrame,
    proof_prefix_sha256: currentPrefixHash,
    prefix_unchanged: !expectedPrefixHash || currentPrefixHash === expectedPrefixHash,
    minimum_official_capture_seconds: minimumSeconds,
    official_capture_fraction: officialFraction,
    required_official_capture_fraction: requiredOfficialFraction,
    short_official_capture_count: 0,
    pass: true,
  };
  await writeJsonAtomic(path.join(dir, "qa", "official_preflight_regression.json"), report);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runOfficialPreflightRegression(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
