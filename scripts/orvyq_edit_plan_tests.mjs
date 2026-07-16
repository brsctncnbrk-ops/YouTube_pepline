#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { projectDir, readJson, pathExists } from "./lib/fs-utils.mjs";

const run = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const MAX_SOURCE_USES = 2;
const FORBIDDEN_FAKE_GRAPH_TYPES = new Set(["benchmark", "market_pressure", "forecast", "trend_chart", "bar_chart", "line_chart"]);

async function videoDuration(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file]);
  return Number.parseFloat(stdout.trim());
}

export async function validateOrvyqEditPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, composition, captions, audioMetadata, speechQa] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "remotion", "captions.json")),
    readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
    readJson(path.join(dir, "qa", "speech_transcript.json")),
  ]);
  const shots = plan.shots;

  assert.equal(plan.audio_mix_asset, "assets/audio/final_mix.mp3", "plan must use the verified final mix");
  assert.equal(plan.captions_asset, "remotion/captions.json", "plan must declare speech-derived captions");
  assert.ok(await pathExists(path.join(dir, plan.audio_mix_asset)), "ORVYQ final mix is missing");
  assert.equal(audioMetadata.procedural_noise_generation, false, "procedural noise music must remain disabled");
  assert.ok(["voice_only_safe_fallback", "approved_licensed_bed"].includes(audioMetadata.music_profile), "unapproved music profile");
  assert.deepEqual(audioMetadata.sfx_assets, [], "noise-based procedural sound cues must not be generated");
  assert.equal(speechQa.passed, true, `speech QA failed: ${(speechQa.failures || []).join(", ")}`);
  assert.ok(speechQa.word_count >= 30, "speech QA did not detect enough spoken words");
  assert.ok(speechQa.script_similarity >= 0.55, "detected speech does not match the approved narration");

  assert.ok(Array.isArray(shots) && shots.length > 0, "edit plan has no shots");
  assert.equal(shots[0].start_frame, 0, "first shot must start at frame 0");
  assert.equal(shots.at(-1).end_frame, plan.duration_frames, "last shot must end at the planned timeline boundary");
  assert.ok(plan.duration_frames <= composition.duration_frames, "edit plan exceeds composition duration");
  assert.equal(plan.quality_policy?.max_uses_per_source, MAX_SOURCE_USES, "source reuse policy must be explicit");
  assert.equal(plan.quality_policy?.fake_data_graphics_forbidden, true, "fake data graphic ban must be explicit");

  const usage = new Map();
  const motionVariants = new Set();
  let previousFootage = null;
  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const frames = shot.end_frame - shot.start_frame;
    assert.ok(frames > 0 && frames <= 240, `${shot.shot_id} must be 0–8 seconds`);
    if (index > 0) assert.equal(shot.start_frame, shots[index - 1].end_frame, `${shot.shot_id} must be contiguous`);
    assert.ok(["cut", "fade", "dissolve"].includes(shot.transition_in), `${shot.shot_id} has an invalid in transition`);
    assert.ok(["cut", "fade", "dissolve"].includes(shot.transition_out), `${shot.shot_id} has an invalid out transition`);
    assert.equal(shot.sound_cue ?? null, null, `${shot.shot_id} must not use unapproved procedural SFX`);

    if (shot.asset_type === "graphic") {
      assert.ok(shot.graphic?.title, `${shot.shot_id} graphic requires a title`);
      assert.ok(!FORBIDDEN_FAKE_GRAPH_TYPES.has(shot.graphic?.type), `${shot.shot_id} uses a decorative fake-data graphic`);
      assert.ok(shot.graphic?.subtitle || shot.graphic?.type?.startsWith("brand_"), `${shot.shot_id} graphic must explain its editorial meaning`);
      continue;
    }

    assert.notEqual(shot.video_asset, previousFootage, `${shot.shot_id} repeats the same footage consecutively`);
    previousFootage = shot.video_asset;
    usage.set(shot.video_asset, (usage.get(shot.video_asset) || 0) + 1);
    assert.ok((usage.get(shot.video_asset) || 0) <= MAX_SOURCE_USES, `${shot.video_asset} is used more than ${MAX_SOURCE_USES} times`);
    assert.ok(!plan.blacklisted_assets.includes(shot.video_asset), `${shot.shot_id} references a rejected stock clip`);
    motionVariants.add(shot.motion_variant);

    const file = path.join(dir, shot.video_asset);
    assert.ok(await pathExists(file), `${shot.shot_id} source asset is missing`);
    const sourceDuration = await videoDuration(file);
    const shotDuration = frames / composition.fps;
    assert.ok(shot.trim_out_sec > shot.trim_in_sec, `${shot.shot_id} has an empty trim`);
    assert.ok(Math.abs((shot.trim_out_sec - shot.trim_in_sec) - shotDuration) < 0.02, `${shot.shot_id} trim must match its timeline`);
    assert.ok(shot.trim_out_sec <= sourceDuration + 0.02, `${shot.shot_id} trim would create a black clip tail`);
  }

  assert.equal(captions.source, "qa/speech_transcript.json", "captions must come from verified final audio");
  assert.equal(captions.style?.line_count, 1, "captions must be single-line");
  assert.equal(captions.style?.active_word_effect, false, "active-word karaoke styling is forbidden");
  assert.equal(captions.style?.background, "none", "large caption boxes are forbidden");
  assert.ok(captions.captions.length > 0, "no captions were generated");

  let previousCaptionEnd = -1;
  for (const caption of captions.captions) {
    const words = caption.text.trim().split(/\s+/);
    assert.ok(caption.text.trim(), `${caption.caption_id} is empty`);
    assert.ok(words.length <= 7, `${caption.caption_id} exceeds the seven-word single-line limit`);
    assert.ok(caption.text.length <= 52, `${caption.caption_id} exceeds the single-line character limit`);
    assert.ok(caption.end_frame > caption.start_frame, `${caption.caption_id} has invalid timing`);
    assert.ok(caption.start_frame >= previousCaptionEnd, `${caption.caption_id} overlaps the previous caption`);
    previousCaptionEnd = caption.end_frame;
  }

  return {
    preview: Boolean(plan.preview),
    shot_count: shots.length,
    graphic_count: shots.filter((shot) => shot.asset_type === "graphic").length,
    unique_footage_count: usage.size,
    max_source_uses: Math.max(0, ...usage.values()),
    motion_variant_count: motionVariants.size,
    caption_count: captions.captions.length,
    duration_frames: plan.duration_frames,
    speech_similarity: speechQa.script_similarity,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateOrvyqEditPlan().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
