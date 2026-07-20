#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";
import { buildCanonicalFullCues } from "./orvyq_prepare_full_music_cues.mjs";

const productionPlan = JSON.parse(
  fs.readFileSync(
    "projects/001-the-ai-race-no-one-can-afford-to-win/direction/production_plan.json",
    "utf8",
  ),
);
const cueSheet = JSON.parse(
  fs.readFileSync(
    "projects/001-the-ai-race-no-one-can-afford-to-win/direction/music_cue_sheet.json",
    "utf8",
  ),
);
const audioWrapper = fs.readFileSync("scripts/orvyq_audio_mix.mjs", "utf8");
const mixer = fs.readFileSync("scripts/orvyq_audio_mix_v2.mjs", "utf8");
const recovery = fs.readFileSync(
  ".github/workflows/orvyq-full-render-recovery-v4.yml",
  "utf8",
);
const renderWorkflow = fs.readFileSync(".github/workflows/render.yml", "utf8");

const provenance = {
  asset: "assets/music/approved_bed.mp3",
  approved_for_final_edit: true,
  attribution:
    "‘Signal to Noise’ by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
};
const result = buildCanonicalFullCues({
  plan: productionPlan,
  cueSheet,
  provenance,
});

assert.equal(result.fullCues.length, productionPlan.sections.length);
assert.equal(result.durationFrames, productionPlan.duration_frames);
assert.equal(result.durationSeconds, productionPlan.duration_frames / productionPlan.fps);
assert.equal(result.fullCues[0].start, 0);
assert.equal(result.fullCues.at(-1).end, result.durationSeconds);
assert.ok(result.distinctStates >= cueSheet.policy.minimum_distinct_music_states);

for (let index = 0; index < result.fullCues.length; index += 1) {
  const cue = result.fullCues[index];
  const section = productionPlan.sections[index];
  assert.equal(cue.section_id, section.section_id);
  assert.equal(cue.start, section.start_frame / productionPlan.fps);
  assert.equal(cue.end, section.end_frame / productionPlan.fps);
  assert.equal(cue.state, section.music_state);
  assert.equal(cue.status, "ready");
  assert.equal(cue.asset, "assets/music/approved_bed.mp3");
  assert.equal(cue.provenance, "assets/music/approved_bed.provenance.json");
  assert.equal(cue.attribution, provenance.attribution);
  assert.equal(
    cue.render_strategy,
    "section_specific_energy_and_narration_ducking",
  );
  if (index > 0) assert.equal(result.fullCues[index - 1].end, cue.start);
}

assert.match(audioWrapper, /await prepareFullMusicCues\(projectId\)/);
assert.match(audioWrapper, /canonical_full_cues_prepared = true/);
assert.match(mixer, /cueSheet\.full_cues\.some\(\(cue\) => cue\.status !== "ready"\)/);
assert.match(recovery, /buildOrvyqAudioMix\(process\.env\.PROJECT_ID\)/);
assert.match(renderWorkflow, /buildOrvyqAudioMix\(process\.env\.PROJECT_ID\)/);

console.log(
  JSON.stringify({
    ok: true,
    contract: "orvyq-canonical-full-music-cues",
    cue_count: result.fullCues.length,
    section_count: productionPlan.sections.length,
    duration_frames: result.durationFrames,
    duration_seconds: result.durationSeconds,
    distinct_states: result.distinctStates,
  }),
);
