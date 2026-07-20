#!/usr/bin/env node
import path from 'node:path';
import { projectDir, readJson, readJsonSafe, writeJsonAtomic } from './lib/fs-utils.mjs';

const PROJECT_ID = '001-the-ai-race-no-one-can-afford-to-win';
const near = (a, b, tolerance = 0.15) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Math.abs(Number(a) - Number(b)) <= tolerance;
const terminalToken = (value) => /[.!?…]["')\]]*$/.test(String(value || '').trim());
const isBrandClose = (shot) => shot?.graphic?.type === 'brand_close' || shot?.motif === 'brand_close' || shot?.motif === 'orvyq_close';

export async function runTimelineAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, editPlan, timeline, metadata, transcript, effective] = await Promise.all([
    readJson(path.join(dir, 'direction', 'production_plan.json')),
    readJson(path.join(dir, 'direction', 'edit_plan.json')),
    readJson(path.join(dir, 'direction', 'narration_timeline.json')),
    readJson(path.join(dir, 'assets', 'audio', 'final_mix.metadata.json')),
    readJson(path.join(dir, 'qa', 'speech_transcript.json')),
    readJsonSafe(path.join(dir, 'qa', 'effective_proof_window.json'), null),
  ]);
  const failures = [];
  const warnings = [];
  const fail = (message) => failures.push(message);
  const fps = Number(plan.fps);
  if (timeline.project_id !== projectId) fail('narration timeline project_id mismatch');
  if (Number(timeline.fps) !== fps) fail('narration timeline fps mismatch');
  if (Number(plan.duration_frames) !== Number(timeline.full_duration_frames)) {
    fail(`plan duration ${plan.duration_frames} != narration timeline ${timeline.full_duration_frames}`);
  }
  if (!terminalToken(timeline.proof?.terminal_text)) fail('proof semantic boundary is not terminal punctuation');
  const brandShots = plan.shots.filter(isBrandClose);
  if (brandShots.length !== 1) fail(`canonical plan requires exactly one terminal brand close; found ${brandShots.length}`);
  if (brandShots.length === 1) {
    const terminal = brandShots[0];
    if (terminal.shot_id !== plan.shots.at(-1)?.shot_id || Number(terminal.end_frame) !== Number(plan.duration_frames)) {
      fail(`brand close ${terminal.shot_id} is not the final canonical shot`);
    }
  }
  const internalFadeTerminal = plan.shots.slice(0, -1).filter((shot) => isBrandClose(shot));
  if (internalFadeTerminal.length) fail(`internal terminal graphics: ${internalFadeTerminal.map((shot) => shot.shot_id).join(', ')}`);

  const preview = editPlan.preview === true;
  const expectedDuration = preview ? Number(effective?.duration_frames) : Number(plan.duration_frames);
  if (Number(editPlan.duration_frames) !== expectedDuration) fail(`edit plan duration ${editPlan.duration_frames} != expected ${expectedDuration}`);
  if (editPlan.shots.at(-1)?.end_frame !== editPlan.duration_frames) fail('edit plan shots do not cover the complete rendered timeline');
  if (preview && editPlan.shots.some(isBrandClose)) fail('proof prefix contains a terminal brand close');
  if (preview && effective) {
    const speechEnd = Number(timeline.proof?.speech_output_end_seconds);
    if (Number(effective.duration_frames) < Math.ceil(speechEnd * fps)) fail('proof ends before the complete semantic narration boundary');
    const tail = Number(effective.duration_seconds) - speechEnd;
    if (tail < -0.01 || tail > 8.5) fail(`proof release tail ${tail.toFixed(2)}s is outside 0-8.5s`);
    if (!near(metadata.narration_source_duration_seconds, timeline.proof?.source_end_seconds)) fail('proof audio source cutoff does not match semantic source boundary');
    if (!near(metadata.speech_timeline_end_seconds, speechEnd)) fail('proof paused speech end does not match semantic output boundary');
    if (!near(metadata.duration_seconds, effective.duration_seconds)) fail('proof audio duration does not match proof visual duration');
  }
  if (!preview) {
    if (!near(metadata.narration_source_duration_seconds, timeline.source_duration_seconds)) fail('full audio source duration does not match canonical narration source');
    if (!near(metadata.speech_timeline_end_seconds, timeline.full_output_duration_seconds)) fail('full paused speech duration does not match canonical timeline');
    if (!near(metadata.duration_seconds, timeline.full_output_duration_seconds)) fail('full mix duration does not match canonical timeline');
  }
  const spokenWords = transcript.words || [];
  const lastSpoken = spokenWords.at(-1)?.text || transcript.transcript?.trim().split(/\s+/).at(-1) || '';
  if (!terminalToken(lastSpoken)) fail(`narration transcript ends without terminal punctuation: ${lastSpoken || '<empty>'}`);
  if (/-$/.test(String(lastSpoken))) fail(`narration transcript ends in a cut-off token: ${lastSpoken}`);
  if (Number(transcript.words?.at(-1)?.probability || 1) < 0.45) warnings.push('final recognized word has low confidence');

  const report = {
    schema_version: '1.0-canonical-timeline-audit', project_id: projectId,
    generated_at: new Date().toISOString(), preview,
    canonical_duration_frames: plan.duration_frames,
    render_duration_frames: editPlan.duration_frames,
    proof_semantic_source_end_seconds: timeline.proof?.source_end_seconds,
    proof_semantic_output_end_seconds: timeline.proof?.speech_output_end_seconds,
    terminal_brand_shot: brandShots[0]?.shot_id || null,
    final_transcript_token: lastSpoken,
    warnings, failures, pass: failures.length === 0,
  };
  await writeJsonAtomic(path.join(dir, 'qa', 'timeline_audit.json'), report);
  console.log(JSON.stringify({ ok: report.pass, ...report }));
  if (!report.pass) throw new Error(`Timeline audit failed: ${failures.join('; ')}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTimelineAudit(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
