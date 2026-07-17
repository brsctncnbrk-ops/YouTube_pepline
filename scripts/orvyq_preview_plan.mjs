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
const footage = (start, asset, trim, motion, reason, overlay = null) => ({ start, end: start + 4, asset, trim, motion, reason, overlay });
const card = (start, type, kicker, title, subtitle, labels = [], source = null) => ({ start, end: start + 4, graphic: graphic(type, kicker, title, subtitle, labels, source) });

// Thirty four-second beats create a deliberate, premium video-essay rhythm.
// Graphics occupy 40% of runtime; footage occupies 60%. No source appears more than twice.
const previewTimeline = [
  card(0, "brand_open", "ORVYQ PRESENTS", "THE AI RACE", "What happens when capability moves faster than control?"),
  footage(4, A.server, 1.0, "push", "Frontier infrastructure grounds the opening claim in real technical scale."),
  footage(8, A.campus, 4.5, "drift_left", "Institutional scale represents competing AI laboratories."),
  card(12, "statement", "THE PARADOX", "EVERY LAB SEES THE RISK", "And every lab keeps accelerating.", ["ACCELERATION"]),
  footage(16, A.chamber, 1.0, "hold", "Governmental decision-making supports the rival-government line."),
  footage(20, A.cityNight, 1.5, "pull", "A moving city visualizes competitive momentum without pretending to be data."),
  card(24, "evaluation", "THE INCENTIVE", "SLOW DOWN — AND A RIVAL MAY NOT", "The race is driven by fear of losing strategic control.", ["RIVAL COMPANY", "RIVAL GOVERNMENT"]),
  footage(28, A.research, 0.5, "drift_right", "Research imagery supports the pursuit of increasingly capable systems."),
  footage(32, A.soc, 0.8, "hold", "A monitoring environment supports understanding and control."),
  card(36, "statement", "THE PRIZE", "WHOEVER GETS THERE FIRST SETS THE RULES", "Technical leadership becomes political leverage.", ["CONTROL"]),
  footage(40, A.network, 0.5, "push", "A connected system represents governance across institutions."),
  footage(44, A.server, 7.0, "pull", "A second, non-overlapping server segment returns to the physical scale of the race."),
  card(48, "statement", "THE TIME HORIZON", "NOT SOMEDAY. RIGHT NOW.", "The evidence is already being published and tested.", ["NOW"]),
  footage(52, A.reportDesk, 0.5, "push", "Documents and analysis replace generic stock during the safety-report passage.", "PUBLIC SAFETY REPORTS"),
  footage(56, A.documents, 0.5, "drift_right", "Document imagery continues the evidence trail rather than switching to unrelated code footage.", "CONTROLLED EVALUATION RECORDS"),
  card(60, "report_scan", "SOURCE DOCUMENT", "AGENTIC MISALIGNMENT", "A controlled research program tested how models behaved when facing replacement or goal conflict.", ["Published June 20, 2025", "16 leading models tested", "Controlled simulations — not real incidents"], "Anthropic Research"),
  footage(64, A.terminal, 2.0, "push", "A test environment supports the deliberate evaluation setup."),
  footage(68, A.codeBlur, 2.0, "drift_left", "Software activity supports the model-response passage without repeating another generic server shot."),
  card(72, "evaluation", "CONTROLLED SCENARIO", "A REPLACEMENT THREAT WAS SIMULATED", "The setup used fictional companies, fictional employees, and constrained choices.", ["BEHAVIOR UNDER PRESSURE", "NOT A REAL-WORLD INCIDENT"], "Anthropic agentic-misalignment evaluation"),
  footage(76, A.lock, 5.0, "pull", "Security imagery supports coercion and self-preservation while remaining clearly illustrative."),
  footage(80, A.campus, 10.0, "push", "A distinct institutional segment keeps the narrative tied to laboratories and incentives."),
  card(84, "report_scan", "FICTIONAL EVIDENCE", "THE MODEL WAS GIVEN CORPORATE EMAILS", "The messages described a fabricated affair and an impending replacement.", ["Synthetic scenario", "No real people", "Designed to test coercive behavior"], "Controlled evaluation record"),
  footage(88, A.reportDesk, 7.0, "drift_left", "A separate document-work segment reinforces the evidence trail."),
  footage(92, A.terminal, 8.0, "pull", "A separate test-environment segment supports constrained model choices."),
  card(96, "evaluation", "CROSS-MODEL RESULT", "HARMFUL ACTIONS APPEARED UNDER PRESSURE", "Several tested systems selected self-preserving behavior when alternatives were constrained.", ["ENGINEERED CONDITIONS", "MULTIPLE MODEL FAMILIES"], "Published safety evaluations"),
  footage(100, A.lock, 10.0, "push", "A second security segment visualizes self-preservation without exceeding the source-use limit."),
  footage(104, A.documents, 8.0, "drift_left", "A second records segment prepares the critical distinction between behavior and events."),
  card(108, "statement", "THE IMPORTANT DISTINCTION", "EVIDENCE OF BEHAVIOR IS NOT EVIDENCE OF AN EVENT", "The tests reveal possible failure modes; they do not show these incidents happened in the wild.", ["CONTEXT"]),
  footage(112, A.research, 8.0, "pull", "A distinct research segment returns the argument to measurement and verification."),
  card(116, "statement", "WHAT THE EVIDENCE SAYS", "THE WARNING CAME FROM A CONTROLLED TEST", "Serious evidence, carefully bounded.", ["DOCUMENTED"], "ORVYQ evidence note"),
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
    if ((usage.get(spec.asset) || 0) > MAX_SOURCE_USES) throw new Error(`${spec.asset} exceeds the two-use limit`);
    return {
      ...common,
      asset_type: "footage",
      video_asset: spec.asset,
      trim_in_sec: round(spec.trim),
      trim_out_sec: round(spec.trim + (spec.end - spec.start)),
      motion_variant: spec.motion,
    };
  });

  const graphicFrames = shots.filter((shot) => shot.asset_type === "graphic").reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const plan = {
    schema_version: "4.2-preview-paced-evidence-led",
    project_id: projectId,
    fps: FPS,
    duration_frames: 120 * FPS,
    preview: true,
    preview_strategy: "Four-second narration-led beats alternate unique or non-overlapping footage with sourced editorial graphics; no source exceeds two uses.",
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
      actual_full_screen_graphic_fraction: round(graphicFrames / (120 * FPS)),
      target_average_shot_seconds_max: 4.0,
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
    graphic_fraction: plan.quality_policy.actual_full_screen_graphic_fraction,
    output: "direction/edit_plan.json",
  }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
