#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { projectDir, readJson, pathExists } from "./lib/fs-utils.mjs";

const run = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const VALID_ROLES = new Set(["evidence", "archive", "context", "metaphor", "graphic"]);
const FORBIDDEN_FAKE_GRAPH_TYPES = new Set(["benchmark", "market_pressure", "forecast", "trend_chart", "bar_chart", "line_chart"]);

async function videoDuration(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file]);
  return Number.parseFloat(stdout.trim());
}

export async function validateOrvyqEditPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, composition, captions, audioMetadata, speechQa, blueprint, evidenceMap, evidenceAudit, semanticAudit, pacingAudit, mobileAudit] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "remotion", "captions.json")),
    readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
    readJson(path.join(dir, "qa", "speech_transcript.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
    readJson(path.join(dir, "research", "evidence_map.json")),
    readJson(path.join(dir, "qa", "evidence_coverage.json")),
    readJson(path.join(dir, "qa", "semantic_visual_audit.json")),
    readJson(path.join(dir, "qa", "pacing_audit.json")),
    readJson(path.join(dir, "qa", "mobile_legibility_audit.json")),
  ]);
  const shots = plan.shots;
  const claimIds = new Set(evidenceMap.claims.map((claim) => claim.claim_id));
  const sourceIds = new Set(evidenceMap.source_catalog.map((source) => source.source_id));
  const maxSourceUses = blueprint.global_rules.max_uses_per_source;

  assert.equal(plan.production_mode, "evidence_led_video_essay", "the evidence-led production mode is mandatory");
  assert.equal(plan.audio_mix_asset, "assets/audio/final_mix.mp3", "plan must use the verified final mix");
  assert.equal(plan.captions_asset, "remotion/captions.json", "plan must declare speech-timed captions");
  assert.ok(await pathExists(path.join(dir, plan.audio_mix_asset)), "ORVYQ final mix is missing");
  assert.equal(audioMetadata.procedural_noise_generation, false, "procedural noise music must remain disabled");
  assert.ok(["original_tonal_score", "approved_licensed_bed"].includes(audioMetadata.music_profile), "an approved clean music profile is required");
  assert.ok(audioMetadata.music_asset, "a clean music asset is required");
  assert.ok(await pathExists(path.join(dir, audioMetadata.music_asset)), "declared music asset is missing");
  assert.deepEqual(audioMetadata.sfx_assets, [], "unapproved procedural SFX are forbidden");
  assert.equal(speechQa.passed, true, `speech QA failed: ${(speechQa.failures || []).join(", ")}`);
  assert.ok(speechQa.word_count >= 30, "speech QA did not detect enough spoken words");
  assert.ok(speechQa.script_similarity >= 0.85, "detected speech does not sufficiently match the approved narration");

  assert.equal(evidenceAudit.pass, true, `evidence audit failed: ${(evidenceAudit.failures || []).join(", ")}`);
  assert.equal(semanticAudit.pass, true, `semantic visual audit failed: ${(semanticAudit.failures || []).join(", ")}`);
  assert.equal(pacingAudit.pass, true, `pacing audit failed: ${(pacingAudit.failures || []).join(", ")}`);
  assert.equal(mobileAudit.pass, true, `mobile audit failed: ${(mobileAudit.failures || []).join(", ")}`);

  assert.ok(Array.isArray(shots) && shots.length > 0, "edit plan has no shots");
  assert.equal(shots[0].start_frame, 0, "first shot must start at frame 0");
  assert.equal(shots.at(-1).end_frame, plan.duration_frames, "last shot must end at the planned timeline boundary");
  assert.ok(plan.duration_frames <= composition.duration_frames, "edit plan exceeds composition duration");
  assert.equal(plan.quality_policy?.max_uses_per_source, maxSourceUses, "source reuse policy must be explicit");
  assert.equal(plan.quality_policy?.automatic_asset_fallback_forbidden, true, "automatic asset fallback must be forbidden");
  assert.equal(plan.quality_policy?.fake_data_graphics_forbidden, true, "fake data graphic ban must be explicit");

  const usage = new Map();
  const motionVariants = new Set();
  const shotDurations = new Set();
  let previousFootage = null;
  let previousWasGraphic = false;
  let graphicFrames = 0;

  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const frames = shot.end_frame - shot.start_frame;
    shotDurations.add(frames);
    assert.ok(frames > 0 && frames <= blueprint.global_rules.max_shot_seconds * plan.fps, `${shot.shot_id} must be 0–${blueprint.global_rules.max_shot_seconds} seconds`);
    if (index > 0) assert.equal(shot.start_frame, shots[index - 1].end_frame, `${shot.shot_id} must be contiguous`);
    assert.ok(["cut", "fade", "dissolve"].includes(shot.transition_in), `${shot.shot_id} has an invalid in transition`);
    assert.ok(["cut", "fade", "dissolve"].includes(shot.transition_out), `${shot.shot_id} has an invalid out transition`);
    assert.equal(shot.sound_cue ?? null, null, `${shot.shot_id} must not use unapproved procedural SFX`);
    assert.ok(claimIds.has(shot.claim_id), `${shot.shot_id} must map to a valid claim`);
    assert.ok(VALID_ROLES.has(shot.visual_role), `${shot.shot_id} must declare a valid visual role`);
    assert.ok(shot.editorial_purpose?.length >= 18, `${shot.shot_id} needs a specific editorial purpose`);

    if (shot.editorial_overlay) {
      assert.ok(shot.editorial_overlay.eyebrow, `${shot.shot_id} overlay requires a visible eyebrow`);
      assert.ok(shot.editorial_overlay.title, `${shot.shot_id} overlay requires a title`);
      assert.ok((shot.editorial_overlay.font_px || 0) >= blueprint.global_rules.minimum_overlay_font_px, `${shot.shot_id} overlay is too small for mobile`);
      for (const sourceId of shot.editorial_overlay.source_ids || []) assert.ok(sourceIds.has(sourceId), `${shot.shot_id} references unknown source ${sourceId}`);
      if (["document", "email_recreation"].includes(shot.editorial_overlay.type)) assert.ok(shot.editorial_overlay.recreation_label, `${shot.shot_id} recreation requires an on-screen recreation label`);
    }

    if (shot.asset_type === "graphic") {
      graphicFrames += frames;
      assert.equal(previousWasGraphic, false, `${shot.shot_id} creates consecutive full-screen graphics`);
      previousWasGraphic = true;
      assert.ok(shot.graphic?.title, `${shot.shot_id} graphic requires a title`);
      assert.ok(!FORBIDDEN_FAKE_GRAPH_TYPES.has(shot.graphic?.type), `${shot.shot_id} uses a decorative fake-data graphic`);
      assert.ok(shot.graphic?.subtitle || shot.graphic?.type?.startsWith("brand_"), `${shot.shot_id} graphic must explain its editorial meaning`);
      continue;
    }

    previousWasGraphic = false;
    assert.notEqual(shot.video_asset, previousFootage, `${shot.shot_id} repeats the same footage consecutively`);
    previousFootage = shot.video_asset;
    usage.set(shot.video_asset, (usage.get(shot.video_asset) || 0) + 1);
    assert.ok((usage.get(shot.video_asset) || 0) <= maxSourceUses, `${shot.video_asset} is used more than ${maxSourceUses} times`);
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

  const graphicFraction = graphicFrames / plan.duration_frames;
  assert.ok(graphicFraction <= blueprint.global_rules.full_screen_graphic_fraction_max, `full-screen graphics occupy ${(graphicFraction * 100).toFixed(1)}%`);
  assert.ok(shotDurations.size >= 5, "pacing is too mechanically uniform");

  assert.equal(captions.source, "qa/speech_transcript.json", "caption timing must come from verified final audio");
  assert.equal(captions.text_source, "voice/voice_script.txt", "caption wording must come from the approved narration script");
  assert.equal(captions.style?.line_count, 1, "captions must be single-line");
  assert.equal(captions.style?.active_word_effect, false, "active-word karaoke styling is forbidden");
  assert.equal(captions.style?.background, "none", "large caption boxes are forbidden");
  assert.ok(captions.captions.length > 0, "no captions were generated");
  assert.ok(captions.captions[0].start_frame <= 3, "opening caption must begin with narration");
  assert.match(captions.captions[0].text, /^Every major AI lab\b/i, "opening caption must preserve the approved first sentence");

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

  if (!plan.preview) {
    const approvalPath = path.join(dir, "qa", "proof_approval.json");
    assert.ok(await pathExists(approvalPath), "full render requires proof_approval.json");
    const approval = await readJson(approvalPath);
    assert.equal(approval.approved, true, "the two-minute proof has not been approved");
    assert.ok(approval.aperture_alignment_score >= 95, "the approved proof is below 95% Aperture alignment");
    assert.equal(approval.review_type, "human_rendered_video_review", "automatic scoring cannot approve the full render");
  }

  return {
    preview: Boolean(plan.preview),
    production_mode: plan.production_mode,
    shot_count: shots.length,
    graphic_count: shots.filter((shot) => shot.asset_type === "graphic").length,
    overlay_count: shots.filter((shot) => shot.editorial_overlay).length,
    graphic_fraction: graphicFraction,
    unique_footage_count: usage.size,
    max_source_uses: Math.max(0, ...usage.values()),
    motion_variant_count: motionVariants.size,
    shot_duration_variants: shotDurations.size,
    caption_count: captions.captions.length,
    duration_frames: plan.duration_frames,
    speech_similarity: speechQa.script_similarity,
    music_profile: audioMetadata.music_profile,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateOrvyqEditPlan().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
