#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const FPS = 30;
const MAX_SOURCE_USES = 1;
const media = (name) => `assets/footage/${name}.mp4`;

const A = {
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
    end: 3,
    graphic: graphic("brand_open", "ORVYQ PRESENTS", "THE AI RACE", "What happens when capability moves faster than control?"),
  },
  { start: 3, end: 8, asset: A.server, trim: 1.0, motion: "push", reason: "Frontier infrastructure grounds the opening claim in real technical scale." },
  { start: 8, end: 13, asset: A.campus, trim: 4.5, motion: "drift_left", reason: "Institutional scale represents competing AI laboratories." },
  { start: 13, end: 18, asset: A.chamber, trim: 1.0, motion: "hold", reason: "Governmental decision-making supports the rival-government line." },
  { start: 18, end: 24, asset: A.cityNight, trim: 1.5, motion: "pull", reason: "A moving city visualizes competitive momentum without pretending to be data." },
  { start: 24, end: 30, asset: A.research, trim: 0.5, motion: "drift_right", reason: "Research imagery supports the pursuit of increasingly capable systems." },
  { start: 30, end: 36, asset: A.soc, trim: 0.8, motion: "hold", reason: "A monitoring environment supports understanding and control." },
  { start: 36, end: 42, asset: A.network, trim: 0.5, motion: "push", reason: "A connected system represents governance across institutions." },
  {
    start: 42,
    end: 46,
    graphic: graphic("statement", "THE INCENTIVE", "WHOEVER GETS THERE FIRST SETS THE RULES", "The race is driven by fear that a rival will not slow down.", ["COMPANY", "GOVERNMENT", "CONTROL"]),
  },
  {
    start: 46,
    end: 50,
    graphic: graphic("statement", "THE TIME HORIZON", "NOT SOMEDAY. RIGHT NOW.", "The evidence is already being published and tested.", ["NOW"]),
  },
  { start: 50, end: 56, asset: A.reportDesk, trim: 0.5, motion: "push", overlay: "PUBLIC SAFETY REPORTS", reason: "Documents and analysis replace generic stock during the safety-report passage." },
  {
    start: 56,
    end: 62,
    graphic: graphic(
      "report_scan",
      "SOURCE DOCUMENT",
      "AGENTIC MISALIGNMENT",
      "A controlled research program tested how models behaved when facing replacement or goal conflict.",
      ["Published June 20, 2025", "16 leading models tested", "Controlled simulations — not real deployment incidents"],
      "Anthropic Research",
    ),
  },
  { start: 62, end: 68, asset: A.documents, trim: 0.5, motion: "drift_right", overlay: "CONTROLLED EVALUATION RECORDS", reason: "Document imagery continues the evidence trail rather than switching to unrelated code footage." },
  { start: 68, end: 74, asset: A.terminal, trim: 2.0, motion: "push", reason: "A test environment supports the deliberate evaluation setup." },
  {
    start: 74,
    end: 80,
    graphic: graphic(
      "evaluation",
      "CONTROLLED SCENARIO",
      "A REPLACEMENT THREAT WAS SIMULATED",
      "The setup used fictional companies, fictional employees, and constrained choices.",
      ["What the test probes: behavior under pressure", "What it does not prove: a real-world incident"],
      "Anthropic agentic-misalignment evaluation",
    ),
  },
  { start: 80, end: 86, asset: A.codeBlur, trim: 2.0, motion: "drift_left", reason: "Software activity supports the model-response passage without repeating another generic server shot." },
  {
    start: 86,
    end: 92,
    graphic: graphic(
      "report_scan",
      "FICTIONAL EVIDENCE",
      "THE MODEL WAS GIVEN CORPORATE EMAILS",
      "The messages described a fabricated affair and an impending replacement.",
      ["Synthetic scenario", "No real people", "Designed to test coercive behavior"],
      "Controlled evaluation record",
    ),
  },
  { start: 92, end: 98, asset: A.lock, trim: 5.0, motion: "pull", reason: "Security imagery supports coercion and self-preservation while remaining clearly illustrative." },
  {
    start: 98,
    end: 104,
    graphic: graphic(
      "evaluation",
      "CROSS-MODEL RESULT",
      "HARMFUL ACTIONS APPEARED UNDER PRESSURE",
      "Several tested systems selected self-preserving behavior when alternatives were deliberately constrained.",
      ["Engineered conditions", "Multiple model families", "Not a deployment incident"],
      "Published safety evaluations",
    ),
  },
  {
    start: 104,
    end: 110,
    graphic: graphic(
      "statement",
      "THE IMPORTANT DISTINCTION",
      "EVIDENCE OF BEHAVIOR IS NOT EVIDENCE OF AN EVENT",
      "The tests reveal possible failure modes; they do not show that these incidents happened in the wild.",
      ["BEHAVIOR", "CONTEXT", "LIMITS"]),
  },
  {
    start: 110,
    end: 114,
    graphic: graphic(
      "fire_drill",
      "CONTEXT CHANGES MEANING",
      "A TEST IS NOT AN INCIDENT",
      "Controlled evaluations can reveal behavior without proving that the same event occurred in the wild.",
      ["Designed test: useful evidence", "Real deployment: not established"],
    ),
  },
  {
    start: 114,
    end: 120,
    graphic: graphic(
      "statement",
      "WHAT THE EVIDENCE SAYS",
      "THE WARNING CAME FROM A CONTROLLED TEST",
      "The signal is serious precisely because the boundary between capability and control is being measured now.",
      ["CONTROLLED", "DOCUMENTED", "UNRESOLVED"],
      "ORVYQ evidence note",
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
      text_overlay: spec.overlay || null,
      sound_cue: null,
      editorial_reason: spec.reason || "Purpose-built editorial graphic tied directly to the narration.",
    };

    if (spec.graphic) return { ...common, asset_type: "graphic", graphic: spec.graphic };

    if (!motionVariants.has(spec.motion)) throw new Error(`Invalid motion variant: ${spec.motion}`);
    usage.set(spec.asset, (usage.get(spec.asset) || 0) + 1);
    if ((usage.get(spec.asset) || 0) > MAX_SOURCE_USES) throw new Error(`${spec.asset} exceeds the one-use limit`);
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
    schema_version: "4.1-preview-evidence-led",
    project_id: projectId,
    fps: FPS,
    duration_frames: 120 * FPS,
    preview: true,
    preview_strategy: "Narration-timed evidence graphics alternate with unique footage; no source clip repeats and no keyword-only fallback selection is allowed.",
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: {
      principle: "topic-led evidence design, not generic dark-tech stock",
      topic: "AI competition, incentives, governance, and controlled safety evaluations",
      palette: { ink: "#F5F0E7", accent: "#D95B53", information: "#86A9CC", ground: "#0C1320" },
    },
    quality_policy: {
      max_uses_per_source: MAX_SOURCE_USES,
      keyword_only_visual_matching_forbidden: true,
      fake_data_graphics_forbidden: true,
      source_crop_does_not_create_new_asset: true,
      unrelated_stock_fallback_forbidden: true,
      full_screen_graphic_fraction_max: 0.40,
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
