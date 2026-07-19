#!/usr/bin/env node
import path from 'node:path';
import { projectDir, readJson, writeJsonAtomic } from './lib/fs-utils.mjs';

const PROJECT_ID = '001-the-ai-race-no-one-can-afford-to-win';
const terminal = (value) => /[.!?…]["')\]]*$/.test(String(value || '').trim());

export async function auditRenderedProofEnding(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [speech, timeline, effective] = await Promise.all([
    readJson(path.join(dir, 'qa', 'proof_video_speech_qa.json')),
    readJson(path.join(dir, 'direction', 'narration_timeline.json')),
    readJson(path.join(dir, 'qa', 'effective_proof_window.json')),
  ]);
  const words = speech.words || [];
  const last = words.at(-1) || {};
  const token = last.text || speech.transcript?.trim().split(/\s+/).at(-1) || '';
  const failures = [];
  if (!terminal(token)) failures.push(`rendered proof ends without terminal punctuation: ${token || '<empty>'}`);
  if (/-$/.test(token) || token === '-') failures.push(`rendered proof ends with a cut-off token: ${token}`);
  if (Number(last.probability || 1) < 0.45) failures.push(`final spoken token confidence is too low: ${last.probability}`);
  const semanticEnd = Number(timeline.proof?.speech_output_end_seconds);
  const spokenEnd = Number(last.end || 0);
  if (spokenEnd < semanticEnd - 1.5 || spokenEnd > semanticEnd + 1.5) {
    failures.push(`rendered speech end ${spokenEnd}s does not match semantic boundary ${semanticEnd}s`);
  }
  if (Number(effective.duration_seconds) < semanticEnd) failures.push('rendered proof duration ends before semantic narration boundary');
  const report = {
    schema_version: '1.0-rendered-proof-ending', project_id: projectId,
    generated_at: new Date().toISOString(), terminal_token: token,
    terminal_token_end_seconds: spokenEnd, semantic_speech_end_seconds: semanticEnd,
    rendered_duration_seconds: effective.duration_seconds,
    failures, pass: failures.length === 0,
  };
  await writeJsonAtomic(path.join(dir, 'qa', 'proof_ending_audit.json'), report);
  console.log(JSON.stringify({ ok: report.pass, ...report }));
  if (!report.pass) throw new Error(`Rendered proof ending audit failed: ${failures.join('; ')}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  auditRenderedProofEnding(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
