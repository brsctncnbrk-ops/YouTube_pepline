#!/usr/bin/env node
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { projectDir, readJson, writeJsonAtomic } from './lib/fs-utils.mjs';

const PROJECT_ID = '001-the-ai-race-no-one-can-afford-to-win';

function shiftShot(shot, frames) {
  return { ...shot, start_frame: Number(shot.start_frame) + frames, end_frame: Number(shot.end_frame) + frames };
}

function footageShot({ sceneId, sectionId, start, end, claimId, asset, trimIn, trimOut, purpose, role = 'context', motion = 'hold' }) {
  return {
    shot_id: 'pending', scene_id: sceneId, section_id: sectionId,
    start_frame: start, end_frame: end, claim_id: claimId,
    generic_stock: false, transition_in: 'cut', transition_out: 'cut',
    text_overlay: null, sound_cue: null, emphasis_card: null, editorial_overlay: null,
    asset_type: 'footage', visual_role: role, editorial_purpose: purpose,
    video_asset: asset, trim_in_sec: trimIn, trim_out_sec: trimOut,
    motion_variant: motion, contextual_footage: true,
    provenance_mode: 'approved_contextual_footage', motif: asset,
  };
}

export async function migrateCanonicalTimeline(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, 'direction', 'production_plan.json');
  const compositionPath = path.join(dir, 'remotion', 'composition.json');
  const pausePath = path.join(dir, 'direction', 'editorial_pause_map.json');
  const timelinePath = path.join(dir, 'direction', 'narration_timeline.json');
  const [plan, composition, pauseMap, timeline, timelineRaw] = await Promise.all([
    readJson(planPath), readJson(compositionPath), readJson(pausePath), readJson(timelinePath), fs.readFile(timelinePath, 'utf8'),
  ]);
  if (plan.quality_policy?.timeline_migration_version === '2.0') {
    return { migrated: false, reason: 'already_migrated', duration_frames: plan.duration_frames };
  }
  const fps = Number(plan.fps || composition.fps || 30);
  const oldProofEnd = Number(plan.proof?.duration_frames || 0);
  const pauses = pauseMap.timeline_pauses || pauseMap.proof?.pauses || [];
  const pauseFrames = Math.round(pauses.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0) * fps);
  if (oldProofEnd !== 4500 || pauseFrames !== 780) {
    throw new Error(`Migration expects 4500-frame legacy proof and 780 pause frames; got ${oldProofEnd}/${pauseFrames}`);
  }
  const terminalIndex = plan.shots.findIndex((shot) => shot.graphic?.type === 'brand_close' && shot.end_frame === oldProofEnd);
  if (terminalIndex < 0) throw new Error('Legacy internal brand_close was not found at the proof boundary');
  const terminal = plan.shots[terminalIndex];
  const preShots = plan.shots.filter((shot) => shot.end_frame <= terminal.start_frame);
  const continuation = plan.shots.filter((shot) => shot.start_frame >= oldProofEnd).map((shot) => shiftShot(shot, pauseFrames));
  const filler = [
    footageShot({
      sceneId: 'scene_006', sectionId: 'SEC_02_CONTROLLED_EVIDENCE', start: 4365, end: 4500,
      claimId: 'CLM_006_NO_REAL_WORLD_INCIDENT',
      asset: 'assets/footage/scene_014_416086d1c7285d9e6a01fc67.mp4', trimIn: 13, trimOut: 17.5,
      purpose: 'Continue the research-context image while the narration explains that the engineered result was repeatedly shaped, avoiding any false sense of ending.',
      motion: 'drift_left',
    }),
    {
      shot_id: 'pending', scene_id: 'scene_006', section_id: 'SEC_02_CONTROLLED_EVIDENCE',
      start_frame: 4500, end_frame: 4650, claim_id: 'CLM_006_NO_REAL_WORLD_INCIDENT',
      generic_stock: false, transition_in: 'cut', transition_out: 'cut', text_overlay: null,
      sound_cue: null, emphasis_card: null, editorial_overlay: null, asset_type: 'evidence', visual_role: 'evidence',
      editorial_purpose: 'Land the distinction between a controlled stress test and a real deployment event at the exact point the narration makes that distinction.',
      evidence: {
        kind: 'boundary', eyebrow: 'CONTROLLED TEST · REAL WARNING',
        title: 'A FIRE DRILL IS NOT A FIRE — BUT IT CAN REVEAL A WEAK BUILDING',
        left: 'WHAT HAPPENED', left_detail: 'Researchers constructed a scenario and repeatedly tested model behaviour under pressure.',
        right: 'WHAT DID NOT HAPPEN', right_detail: 'No real person was blackmailed and no real deployment incident was documented.',
        source_ids: ['SRC_ANTHROPIC_AGENTIC_MISALIGNMENT_2025'],
        source_label: 'Anthropic controlled agentic-misalignment evaluation · stated limitations',
        limitation: 'The study is an early warning about a failure mode, not evidence that the scenario is common in deployment.',
        font_px: 32, provenance_mode: 'source_derived_graphic',
      },
      motif: 'CLM_006_NO_REAL_WORLD_INCIDENT:fire_drill_boundary:canonical',
    },
    {
      shot_id: 'pending', scene_id: 'scene_006', section_id: 'SEC_02_CONTROLLED_EVIDENCE',
      start_frame: 4650, end_frame: 4800, claim_id: 'CLM_006_NO_REAL_WORLD_INCIDENT',
      generic_stock: false, transition_in: 'cut', transition_out: 'dissolve', text_overlay: null,
      sound_cue: null, emphasis_card: null, editorial_overlay: null, asset_type: 'graphic', visual_role: 'graphic',
      editorial_purpose: 'Close the controlled-evidence chapter on its actual conclusion rather than using a channel end card inside the film.',
      graphic: { type: 'section_bridge', kicker: 'THE LIMIT', title: 'A TEST IS NOT AN INCIDENT', subtitle: 'But it can still expose the shape of a future failure.' },
      motif: 'section_bridge_controlled_test_limit',
    },
    footageShot({
      sceneId: 'scene_007', sectionId: 'SEC_03_INCENTIVE_RACE', start: 4800, end: 4980,
      claimId: 'CLM_007_MARKET_PRESSURE', asset: 'assets/footage/scene_007_6c8401e76cd6e2697fc70d7c.mp4',
      trimIn: 0, trimOut: 6, motion: 'push',
      purpose: 'Move from the test result to the human decision problem while the narration asks why anyone would continue building.',
    }),
    {
      shot_id: 'pending', scene_id: 'scene_007', section_id: 'SEC_03_INCENTIVE_RACE',
      start_frame: 4980, end_frame: 5130, claim_id: 'CLM_007_MARKET_PRESSURE',
      generic_stock: false, transition_in: 'cut', transition_out: 'cut', text_overlay: null,
      sound_cue: null, emphasis_card: null, editorial_overlay: null, asset_type: 'graphic', visual_role: 'graphic',
      editorial_purpose: 'State the assumption under examination before numerical market evidence appears, keeping the visual argument synchronized with the narration.',
      graphic: { type: 'section_bridge', kicker: 'THE ASSUMPTION', title: 'SLOWING DOWN LOOKS LIKE A CHOICE', subtitle: 'Until competitors, capital and governments are added to the frame.' },
      motif: 'section_bridge_unilateral_slowdown',
    },
    footageShot({
      sceneId: 'scene_008', sectionId: 'SEC_03_INCENTIVE_RACE', start: 5130, end: 5280,
      claimId: 'CLM_007_MARKET_PRESSURE', asset: 'assets/footage/scene_008_42946788405d61ee3a28fa31.mp4',
      trimIn: 5.04, trimOut: 10.04, motion: 'drift_right',
      purpose: 'Introduce restrained market movement only as the narration reaches the competitive incentive, before the sourced investment figures begin.',
    }),
  ];

  const oldDuration = Number(plan.duration_frames);
  const pauseExpandedDuration = oldDuration + pauseFrames;
  const newDuration = Number(timeline.full_duration_frames);
  const durationRoundingAdjustmentFrames = newDuration - pauseExpandedDuration;
  if (!Number.isInteger(newDuration) || newDuration <= oldDuration) {
    throw new Error(`Invalid canonical narration timeline duration: ${timeline.full_duration_frames}`);
  }
  if (Math.abs(durationRoundingAdjustmentFrames) > Math.ceil(fps * 0.2)) {
    throw new Error(`Narration timeline differs from pause-expanded visual duration by ${durationRoundingAdjustmentFrames} frames`);
  }

  const shots = [...preShots, ...filler, ...continuation];
  const terminalShot = shots.at(-1);
  if (!terminalShot || terminalShot.graphic?.type !== 'brand_close') {
    throw new Error('The shifted canonical film does not end on its single brand close');
  }
  terminalShot.end_frame = newDuration;
  if (terminalShot.end_frame <= terminalShot.start_frame) throw new Error('Canonical terminal shot collapsed after duration rounding');
  for (let index = 0; index < shots.length; index += 1) shots[index].shot_id = `shot_${String(index + 1).padStart(3, '0')}`;

  const timelineSha256 = createHash('sha256').update(timelineRaw).digest('hex');
  const sec4Start = Number(plan.sections.find((section) => section.section_id === 'SEC_04_REAL_WORLD_MISUSE')?.start_frame || 6302);
  const sections = plan.sections.map((section) => {
    if (section.section_id === 'SEC_02_CONTROLLED_EVIDENCE') return { ...section, end_frame: 4800 };
    if (section.section_id === 'SEC_03_INCENTIVE_RACE') return { ...section, start_frame: 4800, end_frame: Number(section.end_frame) + pauseFrames };
    if (Number(section.start_frame) >= sec4Start) return { ...section, start_frame: Number(section.start_frame) + pauseFrames, end_frame: Number(section.end_frame) + pauseFrames };
    return section;
  });
  sections.at(-1).end_frame = newDuration;

  const migrated = {
    ...plan,
    duration_frames: newDuration,
    generated_at: new Date().toISOString(),
    proof: { ...plan.proof, duration_frames: 4500, narration_limit_seconds: 150, minimum_output_seconds: 150, semantic_boundary_required: true },
    art_direction: {
      ...plan.art_direction,
      principle: 'one canonical audio-visual timeline; proof ends only at a complete paragraph and the ORVYQ brand close appears only at the true end of the full film',
    },
    quality_policy: {
      ...plan.quality_policy,
      timeline_migration_version: '2.0',
      narration_timeline_ref: 'direction/narration_timeline.json',
      narration_timeline_sha256: timelineSha256,
      audio_visual_timeline_identity_required: true,
      proof_requires_complete_paragraph: true,
      terminal_graphic_only_at_final_frame: true,
      proof_duration_is_minimum_not_cap: true,
    },
    sections,
    shots,
  };
  composition.duration_frames = newDuration;
  await Promise.all([
    writeJsonAtomic(planPath, migrated),
    writeJsonAtomic(compositionPath, composition),
    writeJsonAtomic(path.join(dir, 'qa', 'timeline_migration.json'), {
      schema_version: '1.1', project_id: projectId, migrated_at: new Date().toISOString(),
      old_duration_frames: oldDuration, pause_expanded_duration_frames: pauseExpandedDuration,
      new_duration_frames: newDuration, duration_rounding_adjustment_frames: durationRoundingAdjustmentFrames,
      inserted_pause_frames: pauseFrames, removed_internal_terminal_shot: terminal.shot_id,
      continuation_shift_frames: pauseFrames, filler_shot_count: filler.length,
      invariant: 'canonical plan, proof and full render now share the same pause-expanded narration timeline, including sub-frame source-duration rounding',
    }),
  ]);
  return {
    migrated: true, old_duration_frames: oldDuration, new_duration_frames: newDuration,
    duration_rounding_adjustment_frames: durationRoundingAdjustmentFrames, shot_count: shots.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCanonicalTimeline(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
}
