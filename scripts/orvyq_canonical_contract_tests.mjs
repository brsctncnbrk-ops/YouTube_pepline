#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  projectDir,
  readJson,
} from './lib/fs-utils.mjs';
import {
  validateCanonicalTimelineContract,
  preflightCanonicalGeneration,
} from './lib/orvyq-canonical-contract.mjs';
import { resolveDynamicProofWindow } from './orvyq_dynamic_proof.mjs';

const PROJECT_ID = '001-the-ai-race-no-one-can-afford-to-win';
const dir = projectDir(PROJECT_ID);
const planPath = path.join(dir, 'direction', 'production_plan.json');
const timelinePath = path.join(dir, 'direction', 'narration_timeline.json');
const planRaw = await fs.readFile(planPath, 'utf8');
const timelineRaw = await fs.readFile(timelinePath, 'utf8');

async function restore() {
  await Promise.all([
    fs.writeFile(planPath, planRaw, 'utf8'),
    fs.writeFile(timelinePath, timelineRaw, 'utf8'),
  ]);
}

try {
  const baseline = await validateCanonicalTimelineContract(PROJECT_ID, {
    writeReport: false,
  });
  assert.equal(baseline.valid, true, JSON.stringify(baseline.issues));
  assert.equal(baseline.terminal_brand_shot, 'shot_130');
  assert.equal(baseline.semantic_proof_output_seconds, 157.82);

  const { result: proof } = await resolveDynamicProofWindow(PROJECT_ID, {
    requireAssets: false,
    requireAudio: false,
  });
  assert.equal(proof.semantic_terminal_text, 'building.');
  assert.equal(proof.duration_frames, 4800);
  assert.equal(proof.duration_seconds, 160);
  assert.ok(proof.duration_seconds > proof.minimum_duration_seconds);

  await assert.rejects(
    () => preflightCanonicalGeneration(PROJECT_ID),
    (error) => error.code === 'CANONICAL_PLAN_REGENERATION_FORBIDDEN',
  );

  const internalClosePlan = JSON.parse(planRaw);
  internalClosePlan.shots[31].graphic = {
    type: 'brand_close',
    kicker: 'ORVYQ',
    title: 'INVALID INTERNAL CLOSE',
  };
  internalClosePlan.shots[31].motif = 'brand_close';
  await fs.writeFile(planPath, `${JSON.stringify(internalClosePlan, null, 2)}\n`, 'utf8');
  const internalClose = await validateCanonicalTimelineContract(PROJECT_ID, {
    writeReport: false,
  });
  assert.equal(internalClose.valid, false);
  assert.ok(internalClose.issues.some((entry) => entry.code === 'BRAND_CLOSE_COUNT'));
  await restore();

  const brokenTimeline = JSON.parse(timelineRaw);
  brokenTimeline.proof.terminal_text = 'building';
  await fs.writeFile(timelinePath, `${JSON.stringify(brokenTimeline, null, 2)}\n`, 'utf8');
  const brokenEnding = await validateCanonicalTimelineContract(PROJECT_ID, {
    writeReport: false,
  });
  assert.equal(brokenEnding.valid, false);
  assert.ok(brokenEnding.issues.some((entry) => entry.code === 'TIMELINE_TERMINAL_TEXT'));
  await restore();

  const driftPlan = JSON.parse(planRaw);
  driftPlan.quality_policy.narration_timeline_sha256 = '0'.repeat(64);
  await fs.writeFile(planPath, `${JSON.stringify(driftPlan, null, 2)}\n`, 'utf8');
  const drift = await validateCanonicalTimelineContract(PROJECT_ID, {
    writeReport: false,
  });
  assert.equal(drift.valid, false);
  assert.ok(drift.issues.some((entry) => entry.code === 'TIMELINE_HASH'));
  await restore();

  const finalPlan = await readJson(planPath);
  const closes = finalPlan.shots.filter(
    (shot) =>
      shot.graphic?.type === 'brand_close' ||
      shot.motif === 'brand_close' ||
      shot.motif === 'orvyq_close',
  );
  assert.equal(closes.length, 1);
  assert.equal(closes[0].shot_id, finalPlan.shots.at(-1).shot_id);
  assert.equal(closes[0].end_frame, finalPlan.duration_frames);

  console.log(
    JSON.stringify({
      ok: true,
      project_id: PROJECT_ID,
      semantic_proof_seconds: proof.duration_seconds,
      semantic_terminal_text: proof.semantic_terminal_text,
      terminal_brand_shot: closes[0].shot_id,
      regression_cases: [
        'ready-plan-regeneration-blocked',
        'internal-brand-close-blocked',
        'incomplete-semantic-ending-blocked',
        'narration-timeline-hash-drift-blocked',
      ],
    }),
  );
} finally {
  await restore();
}
