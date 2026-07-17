#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const FPS = 30;
const media = (name) => `assets/footage/${name}.mp4`;

const ASSETS = {
  server: media("scene_001_3bdb0f430d70b077a27a4b87"),
  campus: media("scene_001_52c2ebe35b131555e20a5ab5"),
  research: media("scene_003_d69cde76dfac1e29bd6f9946"),
  reportDesk: media("scene_005_e98a421f0d9c432e4d2036fb"),
  cityNight: media("scene_011_bff417a92fed9423fe0dd580"),
  lock: media("scene_013_d8d3231e6f0b69b7def0fd48"),
  network: media("scene_017_17388828bde9ac80bd22eb8e"),
  documents: media("scene_018_f681c3057e36f147005d2652"),
  terminal: media("scene_022_740741da33e14d6a45468490"),
  codeBlur: media("scene_023_dbe758e1473aee29a155377a"),
  soc: media("scene_024_6e6f4af26cad60cc78930d6d"),
  chamber: media("scene_028_d4c7a6d60c700cc3f1dddeff"),
  dusk: media("scene_030_3bee64eb585a0f8f6b6895c0"),
};

const BLACKLISTED = [
  media("scene_002_55b0a8af17f137fd76d52766"),
  media("scene_010_6f7bc11f2a696985af0db15f"),
  media("scene_012_d356fd9efe14c61c8594ff1f"),
  media("scene_014_416086d1c7285d9e6a01fc67"),
  media("scene_020_820a251a5b10ad8f5a63266f"),
  media("scene_021_d2e9e57773ef446f8e402456"),
  media("scene_032_29ff7ef6ff7df132006f8e97"),
];

const round = (value) => Math.round(value * 1000) / 1000;

function sceneForFrame(composition, frame) {
  return composition.scenes.find((scene) => frame >= scene.start_frame && frame < scene.end_frame)?.scene_id
    || composition.scenes.at(-1)?.scene_id
    || "scene_001";
}

export async function buildOrvyqPreviewPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [composition, blueprint] = await Promise.all([
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
  ]);
  if (composition.fps !== FPS) throw new Error(`Preview plan expects ${FPS} fps, got ${composition.fps}`);

  const sourceLimit = blueprint.global_rules.max_uses_per_source;
  const usage = new Map();
  let cursorSeconds = 0;

  const shots = blueprint.proof_preview.shots.map((spec, index) => {
    const startFrame = Math.round(cursorSeconds * FPS);
    cursorSeconds += Number(spec.duration);
    const endFrame = Math.round(cursorSeconds * FPS);
    const common = {
      shot_id: `shot_${String(index + 1).padStart(3, "0")}`,
      scene_id: sceneForFrame(composition, startFrame),
      start_frame: startFrame,
      end_frame: endFrame,
      claim_id: spec.claim_id,
      visual_role: spec.visual_role,
      generic_stock: spec.generic_stock === true,
      editorial_purpose: spec.editorial_purpose,
      editorial_overlay: spec.overlay || null,
      transition_in: index === 0 ? "fade" : spec.asset_type === "graphic" ? "dissolve" : "cut",
      transition_out: index === blueprint.proof_preview.shots.length - 1 ? "fade" : "cut",
      text_overlay: null,
      sound_cue: null,
    };

    if (spec.asset_type === "graphic") {
      return {
        ...common,
        asset_type: "graphic",
        graphic: spec.graphic,
        motif: spec.graphic.type,
      };
    }

    const asset = ASSETS[spec.asset_key];
    if (!asset) throw new Error(`Unknown editorial blueprint asset_key: ${spec.asset_key}`);
    if (BLACKLISTED.includes(asset)) throw new Error(`Blueprint references blacklisted asset: ${asset}`);
    usage.set(asset, (usage.get(asset) || 0) + 1);
    if ((usage.get(asset) || 0) > sourceLimit) throw new Error(`${asset} exceeds the ${sourceLimit}-use limit`);

    return {
      ...common,
      asset_type: "footage",
      video_asset: asset,
      trim_in_sec: round(spec.trim),
      trim_out_sec: round(spec.trim + spec.duration),
      motion_variant: spec.motion || "hold",
      motif: spec.asset_key,
    };
  });

  if (Math.abs(cursorSeconds - blueprint.proof_preview.duration_seconds) > 0.001) {
    throw new Error(`Preview blueprint must total ${blueprint.proof_preview.duration_seconds}s, got ${cursorSeconds}s`);
  }

  const fullScreenGraphicFrames = shots
    .filter((shot) => shot.asset_type === "graphic")
    .reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const roleFrames = {};
  for (const shot of shots) {
    roleFrames[shot.visual_role] = (roleFrames[shot.visual_role] || 0) + shot.end_frame - shot.start_frame;
  }

  const plan = {
    schema_version: "5.0-evidence-led-proof",
    project_id: projectId,
    fps: FPS,
    duration_frames: blueprint.proof_preview.duration_seconds * FPS,
    preview: true,
    production_mode: blueprint.production_mode,
    preview_strategy: blueprint.proof_preview.purpose,
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: {
      principle: "evidence first, context second, metaphor only after the claim is established",
      topic: "AI competition, incentives, governance, and controlled safety evaluations",
      palette: { ink: "#F5F0E7", accent: "#D95B53", information: "#86A9CC", ground: "#0C1320" },
      source_card_treatment: "clearly labelled ORVYQ recreations from primary sources",
    },
    quality_policy: {
      ...blueprint.global_rules,
      keyword_only_visual_matching_forbidden: true,
      fake_data_graphics_forbidden: true,
      source_crop_does_not_create_new_asset: true,
      unrelated_stock_fallback_forbidden: true,
      actual_full_screen_graphic_fraction: round(fullScreenGraphicFrames / (blueprint.proof_preview.duration_seconds * FPS)),
    },
    role_fractions: Object.fromEntries(
      Object.entries(roleFrames).map(([role, frames]) => [role, round(frames / (blueprint.proof_preview.duration_seconds * FPS))]),
    ),
    blacklisted_assets: BLACKLISTED,
    source_usage: Object.fromEntries([...usage.entries()].sort((a, b) => b[1] - a[1])),
    shots,
  };

  await writeJsonAtomic(path.join(dir, "direction", "edit_plan.json"), plan);
  return plan;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqPreviewPlan().then((plan) => console.log(JSON.stringify({
    ok: true,
    shot_count: plan.shots.length,
    source_usage: plan.source_usage,
    role_fractions: plan.role_fractions,
    full_screen_graphic_fraction: plan.quality_policy.actual_full_screen_graphic_fraction,
    output: "direction/edit_plan.json",
  }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
