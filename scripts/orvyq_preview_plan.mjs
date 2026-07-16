#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const FPS = 30;
const MAX_SOURCE_USES = 2;
const media = (name) => `assets/footage/${name}.mp4`;

const A = {
  server: media("scene_001_3bdb0f430d70b077a27a4b87"),
  campus: media("scene_001_52c2ebe35b131555e20a5ab5"),
  research: media("scene_003_d69cde76dfac1e29bd6f9946"),
  cityNight: media("scene_011_bff417a92fed9423fe0dd580"),
  lock: media("scene_013_d8d3231e6f0b69b7def0fd48"),
  network: media("scene_017_17388828bde9ac80bd22eb8e"),
  terminal: media("scene_022_740741da33e14d6a45468490"),
  codeBlur: media("scene_023_dbe758e1473aee29a155377a"),
  soc: media("scene_024_6e6f4af26cad60cc78930d6d"),
  chamber: media("scene_028_d4c7a6d60c700cc3f1dddeff"),
};

const blacklistedAssets = [
  media("scene_002_55b0a8af17f137fd76d52766"),
  media("scene_010_6f7bc11f2a696985af0db15f"),
  media("scene_012_d356fd9efe14c61c8594ff1f"),
  media("scene_014_416086d1c7285d9e6a01fc67"),
  media("scene_020_820a251a5b10ad8f5a63266f"),
  media("scene_021_d2e9e57773ef446f8e402456"),
  media("scene_032_29ff7ef6ff7df132006f8e97"),
];

const graphic = (type, kicker, title, subtitle, labels = [], source = null) => ({ type, kicker, title, subtitle, labels, source });

const previewTimeline = [
  {
    start: 0,
    end: 4,
    graphic: graphic("brand_open", "ORVYQ PRESENTS", "THE AI RACE", "What happens when capability moves faster than control?"),
  },
  { start: 4, end: 11, asset: A.server, trim: 1.0, motion: "push", reason: "Frontier AI infrastructure establishes the laboratories moving at competitive speed." },
  { start: 11, end: 18, asset: A.campus, trim: 4.5, motion: "drift_left", reason: "Institutional scale represents rival companies and governments rather than an unrelated abstract image." },
  { start: 18, end: 26, asset: A.chamber, trim: 1.0, motion: "hold", reason: "A governance setting supports the line about whoever arrives first setting rules for everyone else." },
  { start: 26, end: 33, asset: A.cityNight, trim: 1.5, motion: "pull", reason: "The accelerating city becomes a restrained metaphor for the race rather than a fake data chart." },
  { start: 33, end: 41, asset: A.research, trim: 1.0, motion: "drift_right", reason: "Technical research imagery supports the question of understanding increasingly powerful systems." },
  { start: 41, end: 49, asset: A.soc, trim: 0.8, motion: "hold", reason: "A real monitoring environment supports control and governance without claiming a fictional event occurred." },
  {
    start: 49,
    end: 57,
    graphic: graphic(
      "statement",
      "THE DANGEROUS ASSUMPTION",
      "DANGER WOULD NOT ANNOUNCE ITSELF",
      "The evidence can look ordinary: evaluation logs, safety reports, and controlled behavior.",
    ),
  },
  {
    start: 57,
    end: 65,
    graphic: graphic(
      "report_scan",
      "EVIDENCE, NOT DECORATION",
      "THE WARNINGS ARE ALREADY PUBLIC",
      "Safety reports matter only when the viewer can see what they establish — and what they do not.",
      ["Company-published safety reports", "Documented evaluation results", "Context and limitations"],
      "Publicly disclosed safety documentation",
    ),
  },
  { start: 65, end: 73, asset: A.terminal, trim: 2.0, motion: "push", reason: "A test environment directly supports controlled model evaluations." },
  {
    start: 73,
    end: 81,
    graphic: graphic(
      "evaluation",
      "CONTROLLED EVALUATION",
      "A TEST IS NOT AN INCIDENT",
      "A designed scenario can reveal incentives without pretending that a fictional event happened in the real world.",
      ["A designed test can reveal behavior", "It does not prove a real incident occurred"],
    ),
  },
  { start: 81, end: 89, asset: A.codeBlur, trim: 2.0, motion: "drift_left", reason: "Software and message-like data support the fictional-email scenario without using generic finance imagery." },
  { start: 89, end: 97, asset: A.lock, trim: 5.0, motion: "pull", reason: "Security imagery supports coercion and self-preservation while remaining clearly illustrative." },
  { start: 97, end: 105, asset: A.network, trim: 4.0, motion: "drift_right", reason: "A connected system supports the discussion of models taking harmful actions under test constraints." },
  { start: 105, end: 112, asset: A.research, trim: 9.5, motion: "hold", reason: "Returning once to the laboratory context clarifies that these were designed tests, not events in the wild." },
  {
    start: 112,
    end: 120,
    graphic: graphic(
      "fire_drill",
      "CONTEXT CHANGES MEANING",
      "A FIRE DRILL IS NOT A FIRE",
      "But it can still show how a system behaves under pressure.",
      ["Useful signal under controlled conditions", "Not evidence of a real-world emergency"],
    ),
  },
];

const motionVariants = new Set(["push", "drift_left", "pull", "drift_right", "hold"]);
const round = (value) => Math.round(value * 1000) / 1000;

function sceneForFrame(composition, frame) {
  return composition.scenes.find((scene) => frame >= scene.start_frame && frame < scene.end_frame)?.scene_id
    || composition.scenes.at(-1)?.scene_id
    || "scene_001";
}

export async function buildOrvyqPreviewPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const composition = await readJson(path.join(dir, "remotion", "composition.json"));
  if (composition.fps !== FPS) throw new Error(`Preview plan expects ${FPS} fps, got ${composition.fps}`);

  const usage = new Map();
  const shots = previewTimeline.map((spec, index) => {
    const startFrame = Math.round(spec.start * FPS);
    const endFrame = Math.round(spec.end * FPS);
    const common = {
      shot_id: `shot_${String(index + 1).padStart(3, "0")}`,
      scene_id: sceneForFrame(composition, startFrame),
      start_frame: startFrame,
      end_frame: endFrame,
      transition_in: index === 0 ? "fade" : spec.graphic ? "dissolve" : "cut",
      transition_out: index === previewTimeline.length - 1 ? "fade" : "cut",
      text_overlay: null,
      sound_cue: null,
      editorial_reason: spec.reason || "Purpose-built editorial graphic tied directly to the narration.",
    };

    if (spec.graphic) return { ...common, asset_type: "graphic", graphic: spec.graphic };

    if (!motionVariants.has(spec.motion)) throw new Error(`Invalid motion variant: ${spec.motion}`);
    usage.set(spec.asset, (usage.get(spec.asset) || 0) + 1);
    if ((usage.get(spec.asset) || 0) > MAX_SOURCE_USES) throw new Error(`${spec.asset} exceeds the two-use limit`);
    const duration = spec.end - spec.start;
    return {
      ...common,
      asset_type: "footage",
      video_asset: spec.asset,
      trim_in_sec: round(spec.trim),
      trim_out_sec: round(spec.trim + duration),
      motion_variant: spec.motion,
    };
  });

  const plan = {
    schema_version: "3.1-preview-curated",
    project_id: projectId,
    fps: FPS,
    duration_frames: 120 * FPS,
    preview: true,
    preview_strategy: "Manually aligned to narration ideas after visual review; no keyword-only fallback selection.",
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: {
      principle: "topic-led, not permanently dark",
      topic: "AI competition, incentives, governance, and controlled safety evaluations",
      palette: { ink: "#F5F0E7", accent: "#D95B53", information: "#86A9CC", ground: "#0C1320" },
    },
    quality_policy: {
      max_uses_per_source: MAX_SOURCE_USES,
      keyword_only_visual_matching_forbidden: true,
      fake_data_graphics_forbidden: true,
      source_crop_does_not_create_new_asset: true,
      unrelated_stock_fallback_forbidden: true,
    },
    blacklisted_assets: blacklistedAssets,
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
    graphic_count: plan.shots.filter((shot) => shot.asset_type === "graphic").length,
    unique_footage_count: Object.keys(plan.source_usage).length,
    max_source_uses: Math.max(0, ...Object.values(plan.source_usage)),
    output: "direction/edit_plan.json",
  }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
