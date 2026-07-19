import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  projectDir,
  readJson,
  readJsonSafe,
  writeJsonAtomic,
  pathExists,
} from './fs-utils.mjs';

const TIMELINE_REL = 'direction/narration_timeline.json';
const LEGACY_PROOF_FILES = [
  'direction/cinematic_proof_cut.json',
  'direction/proof_preview_cut.json',
  'direction/motion_hook.json',
];

const terminalPunctuation = (value) => /[.!?…]["')\]]*$/.test(String(value || '').trim());
const isBrandClose = (shot) =>
  shot?.graphic?.type === 'brand_close' ||
  shot?.motif === 'brand_close' ||
  shot?.motif === 'orvyq_close';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function addIssue(issues, code, message, details = null) {
  issues.push({ code, message, ...(details ? { details } : {}) });
}

async function loadInputs(projectId) {
  const dir = projectDir(projectId);
  const timelinePath = path.join(dir, TIMELINE_REL);
  const [plan, composition, timeline, timelineRaw] = await Promise.all([
    readJsonSafe(path.join(dir, 'direction', 'production_plan.json'), null),
    readJson(path.join(dir, 'remotion', 'composition.json')),
    readJsonSafe(timelinePath, null),
    pathExists(timelinePath).then((exists) =>
      exists ? fs.readFile(timelinePath, 'utf8') : null,
    ),
  ]);
  return { dir, plan, composition, timeline, timelineRaw };
}

function validateTimelineCore({ projectId, plan, composition, timeline, timelineRaw }) {
  const issues = [];
  if (!timeline || !timelineRaw) {
    addIssue(
      issues,
      'MISSING_NARRATION_TIMELINE',
      `${TIMELINE_REL} is required before canonical production planning`,
    );
    return issues;
  }
  if (timeline.project_id !== projectId) {
    addIssue(issues, 'TIMELINE_PROJECT', 'narration timeline project_id mismatch');
  }
  if (Number(timeline.fps) !== Number(composition.fps)) {
    addIssue(issues, 'TIMELINE_FPS', 'narration timeline fps differs from composition');
  }
  if (Number(timeline.full_duration_frames) !== Number(composition.duration_frames)) {
    addIssue(
      issues,
      'TIMELINE_COMPOSITION_DURATION',
      'composition must already use the pause-expanded canonical narration duration',
      {
        timeline: timeline.full_duration_frames,
        composition: composition.duration_frames,
      },
    );
  }
  const proof = timeline.proof || {};
  if (!(Number(proof.minimum_output_seconds) > 0)) {
    addIssue(issues, 'TIMELINE_PROOF_MINIMUM', 'narration timeline requires a positive proof minimum');
  }
  if (!(Number(proof.speech_output_end_seconds) >= Number(proof.minimum_output_seconds))) {
    addIssue(
      issues,
      'TIMELINE_SEMANTIC_BOUNDARY',
      'semantic proof boundary must be at or after the minimum output duration',
    );
  }
  if (!terminalPunctuation(proof.terminal_text)) {
    addIssue(
      issues,
      'TIMELINE_TERMINAL_TEXT',
      'semantic proof boundary must end on terminal punctuation',
      { terminal_text: proof.terminal_text || null },
    );
  }
  if (plan) {
    const expectedHash = plan.quality_policy?.narration_timeline_sha256;
    const actualHash = sha256(timelineRaw);
    if (!expectedHash || expectedHash !== actualHash) {
      addIssue(issues, 'TIMELINE_HASH', 'canonical plan is not bound to the exact narration timeline', {
        expected: expectedHash || null,
        actual: actualHash,
      });
    }
    if (Number(plan.fps) !== Number(timeline.fps)) {
      addIssue(issues, 'PLAN_TIMELINE_FPS', 'production plan fps differs from narration timeline');
    }
    if (Number(plan.duration_frames) !== Number(timeline.full_duration_frames)) {
      addIssue(
        issues,
        'PLAN_TIMELINE_DURATION',
        'production plan duration differs from pause-expanded narration timeline',
        { plan: plan.duration_frames, timeline: timeline.full_duration_frames },
      );
    }
  }
  return issues;
}

export async function preflightCanonicalGeneration(projectId) {
  const inputs = await loadInputs(projectId);
  const { dir, plan, composition, timeline, timelineRaw } = inputs;
  if (
    plan?.status === 'ready' &&
    plan?.quality_policy?.audio_visual_timeline_identity_required === true
  ) {
    const error = new Error(
      'A ready hash-bound canonical plan cannot be regenerated in place; create a new plan revision and invalidate proof approval explicitly',
    );
    error.code = 'CANONICAL_PLAN_REGENERATION_FORBIDDEN';
    throw error;
  }
  const issues = validateTimelineCore({
    projectId,
    plan: null,
    composition,
    timeline,
    timelineRaw,
  });
  const legacy = [];
  for (const rel of LEGACY_PROOF_FILES) {
    if (await pathExists(path.join(dir, rel))) legacy.push(rel);
  }
  if (legacy.length) {
    addIssue(
      issues,
      'LEGACY_STANDALONE_PROOF',
      'standalone proof cuts cannot seed a canonical full-film plan; migrate or remove them before generation',
      legacy,
    );
  }
  if (issues.length) {
    const error = new Error(issues.map((entry) => entry.message).join('; '));
    error.code = 'CANONICAL_TIMELINE_CONTRACT_FAILED';
    error.issues = issues;
    throw error;
  }
  return { valid: true, timeline, composition };
}

export async function bindGeneratedPlanToCanonicalTimeline(projectId) {
  const { dir, plan, composition, timeline, timelineRaw } = await loadInputs(projectId);
  if (!plan) throw new Error('Generated production plan is missing');
  const issues = validateTimelineCore({
    projectId,
    plan: null,
    composition,
    timeline,
    timelineRaw,
  });
  if (Number(plan.duration_frames) !== Number(timeline?.full_duration_frames)) {
    addIssue(
      issues,
      'GENERATED_PLAN_DURATION',
      'generated shots must already cover the pause-expanded narration timeline',
      { plan: plan.duration_frames, timeline: timeline?.full_duration_frames },
    );
  }
  const shots = Array.isArray(plan.shots) ? plan.shots : [];
  const closes = shots.filter(isBrandClose);
  if (closes.length !== 1 || closes[0] !== shots.at(-1)) {
    addIssue(
      issues,
      'TERMINAL_GRAPHIC',
      'generated canonical plan requires exactly one brand close and it must be the final shot',
      closes.map((shot) => shot.shot_id),
    );
  }
  if (shots.at(-1)?.end_frame !== plan.duration_frames) {
    addIssue(issues, 'TERMINAL_COVERAGE', 'final brand close must end at the canonical duration');
  }
  if (issues.length) {
    const error = new Error(issues.map((entry) => entry.message).join('; '));
    error.code = 'CANONICAL_TIMELINE_CONTRACT_FAILED';
    error.issues = issues;
    throw error;
  }
  plan.proof = {
    ...plan.proof,
    minimum_output_seconds: Number(timeline.proof.minimum_output_seconds),
    semantic_boundary_required: true,
  };
  plan.art_direction = {
    ...(plan.art_direction || {}),
    production_mode:
      plan.art_direction?.production_mode || 'evidence_led_video_essay',
    principle:
      'one canonical audio-visual timeline; proof ends only at a complete paragraph and the brand close appears only at the true end of the full film',
  };
  plan.quality_policy = {
    ...(plan.quality_policy || {}),
    narration_timeline_ref: TIMELINE_REL,
    narration_timeline_sha256: sha256(timelineRaw),
    audio_visual_timeline_identity_required: true,
    proof_requires_complete_paragraph: true,
    terminal_graphic_only_at_final_frame: true,
    proof_duration_is_minimum_not_cap: true,
  };
  await writeJsonAtomic(
    path.join(dir, 'direction', 'production_plan.json'),
    plan,
  );
  return validateCanonicalTimelineContract(projectId, { writeReport: true });
}

export async function validateCanonicalTimelineContract(
  projectId,
  { writeReport = true } = {},
) {
  const { dir, plan, composition, timeline, timelineRaw } = await loadInputs(projectId);
  const issues = [];
  if (!plan) {
    addIssue(issues, 'MISSING_PLAN', 'direction/production_plan.json is missing');
  } else {
    issues.push(
      ...validateTimelineCore({
        projectId,
        plan,
        composition,
        timeline,
        timelineRaw,
      }),
    );
    const quality = plan.quality_policy || {};
    if (plan.proof?.semantic_boundary_required !== true) {
      addIssue(issues, 'PROOF_SEMANTIC_POLICY', 'proof semantic boundary must be mandatory');
    }
    if (!(Number(plan.proof?.minimum_output_seconds) > 0)) {
      addIssue(issues, 'PROOF_MINIMUM_POLICY', 'proof minimum output seconds are missing');
    }
    for (const [key, code] of [
      ['audio_visual_timeline_identity_required', 'AUDIO_VISUAL_IDENTITY_POLICY'],
      ['proof_requires_complete_paragraph', 'COMPLETE_PARAGRAPH_POLICY'],
      ['terminal_graphic_only_at_final_frame', 'TERMINAL_GRAPHIC_POLICY'],
      ['proof_duration_is_minimum_not_cap', 'PROOF_MINIMUM_NOT_CAP_POLICY'],
    ]) {
      if (quality[key] !== true) addIssue(issues, code, `${key} must be true`);
    }
    const shots = Array.isArray(plan.shots) ? plan.shots : [];
    const closes = shots.filter(isBrandClose);
    if (closes.length !== 1) {
      addIssue(
        issues,
        'BRAND_CLOSE_COUNT',
        `canonical plan requires exactly one brand close; found ${closes.length}`,
      );
    }
    if (
      closes.length === 1 &&
      (closes[0] !== shots.at(-1) || Number(closes[0].end_frame) !== Number(plan.duration_frames))
    ) {
      addIssue(
        issues,
        'INTERNAL_BRAND_CLOSE',
        `${closes[0].shot_id} is not the final canonical shot`,
      );
    }
    const semanticFrame = Math.ceil(
      Number(timeline?.proof?.speech_output_end_seconds || 0) * Number(plan.fps || 30),
    );
    const semanticBoundary = shots.find((shot) => Number(shot.end_frame) >= semanticFrame);
    if (!semanticBoundary || isBrandClose(semanticBoundary)) {
      addIssue(
        issues,
        'SEMANTIC_PROOF_SHOT_BOUNDARY',
        'semantic proof boundary cannot resolve to a terminal brand close',
      );
    }
  }
  const report = {
    schema_version: '1.0-canonical-timeline-contract',
    project_id: projectId,
    generated_at: new Date().toISOString(),
    timeline_ref: TIMELINE_REL,
    canonical_duration_frames: plan?.duration_frames ?? null,
    semantic_proof_output_seconds:
      timeline?.proof?.speech_output_end_seconds ?? null,
    terminal_brand_shot:
      plan?.shots?.find(isBrandClose)?.shot_id ?? null,
    issues,
    valid: issues.length === 0,
    pass: issues.length === 0,
  };
  if (writeReport) {
    await writeJsonAtomic(
      path.join(dir, 'qa', 'canonical_timeline_contract.json'),
      report,
    );
  }
  return report;
}

export async function assertCanonicalTimelineContract(projectId) {
  const result = await validateCanonicalTimelineContract(projectId, {
    writeReport: true,
  });
  if (!result.valid) {
    const error = new Error(result.issues.map((entry) => entry.message).join('; '));
    error.code = 'CANONICAL_TIMELINE_CONTRACT_FAILED';
    error.check = result;
    throw error;
  }
  return result;
}
