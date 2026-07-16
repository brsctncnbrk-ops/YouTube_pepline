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
  const plan = await readJson(path.join(dir, "direction", "edit_plan.json"));
  const composition = await readJson(path.join(dir, "remotion", "composition.json"));
  const shots = plan.shots;

  assert.equal(plan.audio_mix_asset, "assets/audio/final_mix.mp3", "plan must use the normalized ORVYQ final mix");
  assert.ok(await pathExists(path.join(dir, plan.audio_mix_asset)), "ORVYQ final mix is missing");
  assert.ok(await pathExists(path.join(dir, "assets/sfx/orvyq-pulse.wav")), "ORVYQ graphic cue is missing");

  assert.equal(shots.length, 109, "ORVYQ plan must contain 109 short shots");
  assert.equal(shots.filter((shot) => shot.asset_type === "graphic").length, 23, "ORVYQ plan must contain 23 native graphics");
  assert.equal(shots[0].start_frame, 0, "first shot must start at frame 0");
  assert.equal(shots.at(-1).end_frame, composition.duration_frames, "last shot must end with narration");

  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const frames = shot.end_frame - shot.start_frame;
    assert.ok(frames > 0 && frames <= 225, `${shot.shot_id} must be 0–7.5 seconds`);
    if (index > 0) assert.equal(shot.start_frame, shots[index - 1].end_frame, `${shot.shot_id} must be contiguous`);
    assert.ok(["cut", "fade"].includes(shot.transition_in), `${shot.shot_id} has an invalid in transition`);
    assert.ok(["cut", "fade"].includes(shot.transition_out), `${shot.shot_id} has an invalid out transition`);

    if (shot.asset_type === "graphic") {
      assert.ok(shot.graphic?.title, `${shot.shot_id} graphic requires a title`);
      continue;
    }

    assert.ok(!plan.blacklisted_assets.includes(shot.video_asset), `${shot.shot_id} references a rejected stock clip`);
    const file = path.join(dir, shot.video_asset);
    assert.ok(await pathExists(file), `${shot.shot_id} source asset is missing`);
    const sourceDuration = await videoDuration(file);
    const shotDuration = frames / composition.fps;
    assert.ok(shot.trim_out_sec > shot.trim_in_sec, `${shot.shot_id} has an empty trim`);
    assert.ok(Math.abs((shot.trim_out_sec - shot.trim_in_sec) - shotDuration) < 0.02, `${shot.shot_id} trim must match its timeline`);
    assert.ok(shot.trim_out_sec <= sourceDuration + 0.02, `${shot.shot_id} trim would create a black clip tail`);
  }

  return { shot_count: shots.length, graphic_count: 23, duration_frames: composition.duration_frames };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateOrvyqEditPlan().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
