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
const footage = (duration, asset, trim, motion, reason, overlay = null) => ({ duration, asset, trim, motion, reason, overlay });
const card = (duration, type, kicker, title, subtitle, labels = [], source = null) => ({ duration, graphic: graphic(type, kicker, title, subtitle, labels, source) });

// Full-screen graphics are reserved for the brand open and one early thesis
// punctuation. Evidence is carried by longer claim-relevant footage with concise,
// source-aware overlays so the sequence reads as a premium film rather than slides.
const previewTimeline = [
  card(2, "brand_open", "ORVYQ PRESENTS", "THE AI RACE", "What happens when capability moves faster than control?"),
  footage(6, A.server, 1.0, "push", "Frontier infrastructure grounds the opening claim in real technical scale."),
  footage(4, A.campus, 4.5, "drift_left", "Institutional scale represents competing AI laboratories."),
  card(2, "statement", "THE PARADOX", "EVERY LAB SEES THE RISK", "And every lab keeps accelerating.", ["ACCELERATION"]),
  footage(5, A.chamber, 1.0, "hold", "Governmental decision-making supports the rival-government line."),
  footage(5, A.cityNight, 1.5, "pull", "A moving city visualizes competitive momentum without pretending to be data."),
  footage(2, A.chamber, 7.0, "push", "A second governmental decision-making beat keeps the incentive claim cinematic instead of turning it into a slide.", "SLOW DOWN — AND A RIVAL MAY NOT"),
  footage(4, A.research, 0.5, "drift_right", "Research imagery supports the pursuit of increasingly capable systems."),
  footage(6, A.soc, 0.8, "hold", "A monitoring environment supports understanding and control."),
  footage(2, A.codeBlur, 2.0, "push", "Software infrastructure carries the political-leverage claim as a concise editorial overlay without duplicating the following network shot.", "WHOEVER GETS THERE FIRST SETS THE RULES"),
  footage(5, A.network, 0.5, "push", "A connected system represents governance across institutions."),
  footage(5, A.server, 7.0, "pull", "A second, non-overlapping server segment returns to the physical scale of the race."),
  footage(2, A.cityNight, 8.0, "drift_left", "Immediate real-world momentum carries the time-horizon line without another full-screen card.", "NOT SOMEDAY. RIGHT NOW."),
  footage(6, A.reportDesk, 0.5, "push", "Documents and analysis replace generic stock during the safety-report passage.", "PUBLIC SAFETY REPORTS"),
  footage(6, A.documents, 0.5, "drift_right", "The first controlled-evaluation claim stays anchored to records while a short sourced overlay replaces a full-screen report slide.", "ANTHROPIC · 16 MODELS · CONTROLLED SIMULATIONS"),
  footage(5, A.terminal, 2.0, "push", "A test environment supports the deliberate evaluation setup."),
  footage(7, A.soc, 0.0, "drift_left", "The replacement-threat setup remains within an observed evaluation environment instead of pausing for a presentation card.", "FICTIONAL COMPANY · REPLACEMENT THREAT SIMULATED"),
  footage(4, A.lock, 5.0, "pull", "Security imagery supports coercion and self-preservation while remaining clearly illustrative."),
  footage(8, A.campus, 9.5, "push", "Institutional footage carries the fabricated-email detail with an explicit boundary overlay, preserving cinematic continuity.", "SYNTHETIC EMAILS · NO REAL PEOPLE"),
  footage(5, A.reportDesk, 4.0, "drift_left", "A later document-work segment reinforces the evidence trail without overrunning the source clip."),
  footage(7, A.terminal, 8.0, "pull", "The cross-model result is presented over the controlled test environment, not as a detached data slide.", "MULTIPLE MODEL FAMILIES · ENGINEERED CONDITIONS"),
  footage(6, A.lock, 10.0, "push", "A second security segment visualizes self-preservation without exceeding the source-use limit."),
  footage(6, A.documents, 7.5, "drift_left", "Records remain on screen for the crucial evidence boundary, replacing another statement card.", "BEHAVIOR IN TESTS ≠ REAL-WORLD INCIDENTS"),
  footage(10, A.research, 8.0, "pull", "A sustained final research image lets the bounded conclusion land with documentary restraint.", "CONTROLLED TEST · SERIOUS WARNING · CAREFULLY BOUNDED"),
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
  let cursorSeconds = 0;
  const shots = previewTimeline.map((spec, index) => {
    const startFrame = Math.round(cursorSeconds * FPS);
    cursorSeconds += spec.duration;
    const endFrame = Math.round(cursorSeconds * FPS);
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
      trim_out_sec: round(spec.trim + spec.duration),
      motion_variant: spec.motion,
    };
  });

  if (cursorSeconds !== 120) throw new Error(`Preview timeline must total 120 seconds, got ${cursorSeconds}`);
  const graphicFrames = shots.filter((shot) => shot.asset_type === "graphic").reduce((sum, shot) => sum + shot.end_frame - shot.start_frame, 0);
  const plan = {
    schema_version: "4.6-preview-footage-dominant-evidence-overlay",
    project_id: projectId,
    fps: FPS,
    duration_frames: 120 * FPS,
    preview: true,
    preview_strategy: "Only the brand open and early thesis use full-screen graphics. Six evidence slides were removed; their time and claims now live on longer source-relevant footage with explicit boundary overlays.",
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
      full_screen_graphic_fraction_max: 0.08,
      actual_full_screen_graphic_fraction: round(graphicFrames / (120 * FPS)),
      target_average_shot_seconds_max: 5.0,
      minimum_shot_duration_variants: 3,
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
    shot_duration_variants: new Set(plan.shots.map((shot) => shot.end_frame - shot.start_frame)).size,
    output: "direction/edit_plan.json",
  }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
