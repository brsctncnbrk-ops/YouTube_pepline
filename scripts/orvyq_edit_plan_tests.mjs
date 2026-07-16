#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { projectDir, readJson, pathExists } from "./lib/fs-utils.mjs";

const run = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

async function videoDuration(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file]);
  return Number.parseFloat(stdout.trim());
}

export async function validateOrvyqEditPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, composition, captions, audioMetadata] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "remotion", "captions.json")),
    readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
  ]);
  const shots = plan.shots;

  assert.equal(plan.audio_mix_asset, "assets/audio/final_mix.mp3", "plan must use the normalized ORVYQ final mix");
  assert.equal(plan.captions_asset, "remotion/captions.json", "plan must declare the generated captions");
  assert.ok(await pathExists(path.join(dir, plan.audio_mix_asset)), "ORVYQ final mix is missing");
  assert.equal(audioMetadata.music_profile, "dynamic_cinematic_original", "the dynamic ORVYQ score was not generated");
  assert.ok(audioMetadata.music_sections >= 6, "music must contain multiple editorial sections");
  assert.ok(Array.isArray(audioMetadata.sfx_assets) && audioMetadata.sfx_assets.length >= 7, "sound design must contain at least seven cue types");
  for (const cue of audioMetadata.sfx_assets) assert.ok(await pathExists(path.join(dir, cue)), `missing sound cue: ${cue}`);

  assert.equal(shots.length, 109, "ORVYQ plan must contain 109 short shots");
  assert.equal(shots.filter((shot) => shot.asset_type === "graphic").length, 23, "ORVYQ plan must contain 23 native graphics");
  assert.equal(shots[0].start_frame, 0, "first shot must start at frame 0");
  assert.equal(shots.at(-1).end_frame, composition.duration_frames, "last shot must end with narration");

  const graphicFamilies = new Set(shots.filter((shot) => shot.asset_type === "graphic").map((shot) => shot.graphic?.family));
  assert.ok(graphicFamilies.size >= 8, `expected at least eight graphic families, found ${graphicFamilies.size}`);
  const soundCues = new Set(shots.map((shot) => shot.sound_cue).filter(Boolean));
  assert.ok(soundCues.size >= 7, `expected at least seven sound cue types, found ${soundCues.size}`);
  const motionVariants = new Set(shots.filter((shot) => shot.asset_type === "footage").map((shot) => shot.motion_variant));
  assert.ok(motionVariants.size >= 5, `expected five footage motion variants, found ${motionVariants.size}`);

  let repeatedFootageRun = 0;
  let previousFootage = null;
  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const frames = shot.end_frame - shot.start_frame;
    assert.ok(frames > 0 && frames <= 225, `${shot.shot_id} must be 0–7.5 seconds`);
    if (index > 0) assert.equal(shot.start_frame, shots[index - 1].end_frame, `${shot.shot_id} must be contiguous`);
    assert.ok(["cut", "fade", "dissolve"].includes(shot.transition_in), `${shot.shot_id} has an invalid in transition`);
    assert.ok(["cut", "fade", "dissolve"].includes(shot.transition_out), `${shot.shot_id} has an invalid out transition`);
    if (shot.asset_type === "graphic") {
      assert.ok(shot.graphic?.title, `${shot.shot_id} graphic requires a title`);
      assert.ok(shot.graphic?.family, `${shot.shot_id} graphic requires a layout family`);
      continue;
    }
    repeatedFootageRun = shot.video_asset === previousFootage ? repeatedFootageRun + 1 : 1;
    previousFootage = shot.video_asset;
    assert.ok(repeatedFootageRun <= 2, `${shot.shot_id} repeats the same footage more than twice in a row`);
    assert.ok(!plan.blacklisted_assets.includes(shot.video_asset), `${shot.shot_id} references a rejected stock clip`);
    const file = path.join(dir, shot.video_asset);
    assert.ok(await pathExists(file), `${shot.shot_id} source asset is missing`);
    const sourceDuration = await videoDuration(file);
    const shotDuration = frames / composition.fps;
    assert.ok(shot.trim_out_sec > shot.trim_in_sec, `${shot.shot_id} has an empty trim`);
    assert.ok(Math.abs((shot.trim_out_sec - shot.trim_in_sec) - shotDuration) < 0.02, `${shot.shot_id} trim must match its timeline`);
    assert.ok(shot.trim_out_sec <= sourceDuration + 0.02, `${shot.shot_id} trim would create a black clip tail`);
  }

  assert.ok(captions.captions.length >= 120, `expected at least 120 caption cards, found ${captions.captions.length}`);
  assert.equal(captions.captions[0].start_frame, 0, "captions must start at frame 0");
  assert.equal(captions.captions.at(-1).end_frame, composition.duration_frames, "captions must cover the full narration");
  for (let index = 0; index < captions.captions.length; index += 1) {
    const caption = captions.captions[index];
    assert.ok(caption.text.trim(), `${caption.caption_id} is empty`);
    assert.ok(caption.text.trim().split(/\s+/).length <= 8, `${caption.caption_id} is too long`);
    assert.ok(caption.end_frame > caption.start_frame, `${caption.caption_id} has invalid timing`);
    if (index > 0) assert.equal(caption.start_frame, captions.captions[index - 1].end_frame, `${caption.caption_id} leaves a caption gap`);
  }

  return { shot_count: shots.length, graphic_count: 23, graphic_family_count: graphicFamilies.size, sound_cue_count: soundCues.size, motion_variant_count: motionVariants.size, caption_count: captions.captions.length, duration_frames: composition.duration_frames };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateOrvyqEditPlan().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
