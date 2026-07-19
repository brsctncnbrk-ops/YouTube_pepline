#!/usr/bin/env node
import path from 'node:path';
import { validateProductionPlan } from './lib/orvyq-production.mjs';
import { resolveEditorialMode } from './lib/orvyq-visual-policy.mjs';
import { parseArgs, printJson, projectDir, readJson, readJsonSafe, writeJsonAtomic } from './lib/fs-utils.mjs';

function near(a, b, tolerance = 0.08) {
  return Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) <= tolerance;
}

export async function resolveDynamicProofWindow(projectId, { requireAssets = true, requireAudio = false } = {}) {
  const check = await validateProductionPlan({ projectId, requireReady: true, requireAssets });
  if (!check.valid) {
    const error = new Error(check.issues.map((entry) => entry.message).join('; '));
    error.code = check.error_code;
    throw error;
  }
  const dir = projectDir(projectId);
  const timeline = await readJson(path.join(dir, 'direction', 'narration_timeline.json'));
  const plan = check.plan;
  const fps = Number(plan.fps);
  if (timeline.project_id !== projectId || Number(timeline.fps) !== fps) {
    throw new Error('narration_timeline.json does not match the project/fps');
  }
  if (Number(timeline.full_duration_frames) !== Number(plan.duration_frames)) {
    throw new Error(`Canonical plan duration ${plan.duration_frames} does not match narration timeline ${timeline.full_duration_frames}`);
  }
  const minimumFrames = Number(plan.proof.duration_frames);
  const semanticOutputSeconds = Number(timeline.proof?.speech_output_end_seconds);
  const semanticSourceSeconds = Number(timeline.proof?.source_end_seconds);
  if (!Number.isFinite(semanticOutputSeconds) || !Number.isFinite(semanticSourceSeconds)) {
    throw new Error('Narration timeline lacks a semantic proof boundary');
  }
  const requiredFrame = Math.max(minimumFrames, Math.ceil(semanticOutputSeconds * fps));
  const boundaryShot = plan.shots.find((shot) => Number(shot.end_frame) >= requiredFrame);
  if (!boundaryShot || Number(boundaryShot.end_frame) >= Number(plan.duration_frames)) {
    throw new Error('Unable to resolve a proof boundary inside the canonical full timeline');
  }
  if (boundaryShot.graphic?.type === 'brand_close' || boundaryShot.motif === 'brand_close') {
    throw new Error('Proof boundary cannot resolve to a terminal brand graphic');
  }
  const durationFrames = Number(boundaryShot.end_frame);
  const result = {
    schema_version: '2.0-semantic-canonical-proof',
    project_id: projectId,
    policy: 'minimum_duration_expands_to_first_complete_script_paragraph_then_next_canonical_shot_boundary',
    minimum_duration_frames: minimumFrames,
    minimum_duration_seconds: minimumFrames / fps,
    semantic_source_end_seconds: semanticSourceSeconds,
    semantic_speech_output_end_seconds: semanticOutputSeconds,
    semantic_terminal_text: timeline.proof?.terminal_text || null,
    semantic_paragraph_index: timeline.proof?.paragraph_index ?? null,
    duration_frames: durationFrames,
    duration_seconds: durationFrames / fps,
    last_frame: durationFrames - 1,
    boundary_shot_id: boundaryShot.shot_id,
    expanded: durationFrames > minimumFrames,
    production_plan_sha256: check.plan_sha256,
    narration_timeline_ref: 'direction/narration_timeline.json',
  };
  if (requireAudio) {
    const metadata = await readJsonSafe(path.join(dir, 'assets', 'audio', 'final_mix.metadata.json'), null);
    if (!metadata) throw new Error('final_mix.metadata.json is required after proof audio construction');
    if (!near(metadata.narration_source_duration_seconds, semanticSourceSeconds, 0.15)) {
      throw new Error(`Proof audio source cutoff ${metadata.narration_source_duration_seconds}s does not match semantic boundary ${semanticSourceSeconds}s`);
    }
    if (!near(metadata.speech_timeline_end_seconds, semanticOutputSeconds, 0.15)) {
      throw new Error(`Paused speech end ${metadata.speech_timeline_end_seconds}s does not match semantic boundary ${semanticOutputSeconds}s`);
    }
    if (!near(metadata.duration_seconds, result.duration_seconds, 0.15)) {
      throw new Error(`Proof audio duration ${metadata.duration_seconds}s does not match canonical proof ${result.duration_seconds}s`);
    }
  }
  await writeJsonAtomic(path.join(dir, 'qa', 'effective_proof_window.json'), result);
  return { result, check, timeline };
}

export async function buildDynamicProofEditPlan(projectId) {
  const { result: proof, check } = await resolveDynamicProofWindow(projectId, { requireAssets: true, requireAudio: true });
  const plan = check.plan;
  const durationFrames = proof.duration_frames;
  const proofShots = plan.shots.filter((shot) => shot.end_frame <= durationFrames).map((shot) => ({ ...shot }));
  const editorial = resolveEditorialMode({ ...plan, preview: true, duration_frames: durationFrames, shots: proofShots });
  const cinematic = editorial.mode === 'cinematic_contextual';
  const compiled = {
    schema_version: '9.0-semantic-canonical-proof',
    project_id: projectId,
    production_mode: plan.production_mode || plan.art_direction?.production_mode || 'evidence_led_video_essay',
    fps: plan.fps,
    duration_frames: durationFrames,
    preview: true,
    render_mode: 'proof',
    production_plan_sha256: check.plan_sha256,
    effective_proof_window: proof,
    narration_timeline_asset: 'direction/narration_timeline.json',
    audio_mix_asset: 'assets/audio/final_mix.mp3',
    captions_asset: 'remotion/captions.json',
    art_direction: plan.art_direction || null,
    quality_policy: {
      ...plan.quality_policy,
      editorial_mode: editorial.mode,
      cinematic_body_footage: cinematic,
      require_sound_design_sfx: cinematic,
      motion_hook_fraction_max: plan.quality_policy?.motion_hook_fraction_max ?? 0.12,
      contextual_body_footage_fraction_min: plan.quality_policy?.contextual_body_footage_fraction_min ?? (cinematic ? 0.25 : 0),
      contextual_body_footage_fraction_max: plan.quality_policy?.contextual_body_footage_fraction_max ?? (cinematic ? 0.4 : 0),
      official_capture_fraction_min: plan.quality_policy?.official_capture_fraction_min ?? (cinematic ? 0.3 : 0.55),
      evidence_asset_fraction_min: plan.quality_policy?.evidence_asset_fraction_min ?? (cinematic ? 0.6 : 0.75),
      canonical_full_plan_required: true,
      proof_is_exact_prefix_of_full_plan: true,
      proof_duration_is_minimum_not_cap: true,
      proof_requires_complete_paragraph: true,
      audio_visual_timeline_identity_required: true,
      terminal_graphic_only_at_final_frame: true,
      proof_body_stock_assets_forbidden: !cinematic,
      motion_hook_required: true,
      metadata_cannot_define_evidence: true,
      approval_invalidated_on_plan_change: true,
    },
    sections: plan.sections.filter((section) => section.start_frame < durationFrames).map((section) => ({ ...section, end_frame: Math.min(section.end_frame, durationFrames) })),
    physical_asset_usage: check.physical_asset_usage,
    motif_usage: check.motif_usage,
    evidence_source_usage: check.evidence_source_usage,
    shots: proofShots,
  };
  await writeJsonAtomic(path.join(projectDir(projectId), 'direction', 'edit_plan.json'), compiled);
  return compiled;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const projectId = args['project-id'];
  if (!projectId) throw new Error('--project-id is required');
  if (command === 'resolve') {
    const { result } = await resolveDynamicProofWindow(projectId, {
      requireAssets: args['skip-assets'] !== true,
      requireAudio: args['require-audio'] === true,
    });
    printJson({ ok: true, command, project_id: projectId, result });
    return;
  }
  if (command === 'build') {
    const result = await buildDynamicProofEditPlan(projectId);
    printJson({ ok: true, command, project_id: projectId, result });
    return;
  }
  throw new Error('Use resolve|build');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    printJson({ ok: false, error_code: error.code || 'DYNAMIC_PROOF_FAILED', message: error.message });
    process.exitCode = 1;
  });
}
