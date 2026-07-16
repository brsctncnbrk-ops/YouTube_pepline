#!/usr/bin/env node
/**
 * Creates the project-specific ORVYQ editorial plan. The narration structure
 * remains the canonical composition timeline; this script only subdivides
 * each long scene into short, source-bounded shots and native graphics.
 */
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const MAX_SHOT_FRAMES = 225; // 7.5 seconds at 30fps

const media = (name) => `assets/footage/${name}.mp4`;
const A = {
  server: media("scene_001_3bdb0f430d70b077a27a4b87"),
  campus: media("scene_001_52c2ebe35b131555e20a5ab5"),
  research: media("scene_003_d69cde76dfac1e29bd6f9946"),
  evalChart: media("scene_004_52abd7f745cc24b4ecad0215"),
  reportDesk: media("scene_005_e98a421f0d9c432e4d2036fb"),
  clock: media("scene_006_7e0d77fb76615c10d441204a"),
  meeting: media("scene_007_6c8401e76cd6e2697fc70d7c"),
  ticker: media("scene_008_42946788405d61ee3a28fa31"),
  markets: media("scene_009_8366baffbbfa53ec1a18715e"),
  cityNight: media("scene_011_bff417a92fed9423fe0dd580"),
  lock: media("scene_013_d8d3231e6f0b69b7def0fd48"),
  workGraphs: media("scene_016_e324304f99b3502cad464d69"),
  network: media("scene_017_17388828bde9ac80bd22eb8e"),
  documents: media("scene_018_f681c3057e36f147005d2652"),
  terminal: media("scene_022_740741da33e14d6a45468490"),
  codeBlur: media("scene_023_dbe758e1473aee29a155377a"),
  soc: media("scene_024_6e6f4af26cad60cc78930d6d"),
  audit: media("scene_027_57a43a4f4b65321112dfb0bf"),
  chamber: media("scene_028_d4c7a6d60c700cc3f1dddeff"),
  contract: media("scene_029_94d5bdac38165c3c273344f7"),
  dusk: media("scene_030_3bee64eb585a0f8f6b6895c0"),
  silhouettes: media("scene_031_12e168b42df0ef02be3b9707"),
  ocean: media("scene_033_1b2f289c850d35e4a6e96dc4"),
};

const durationSec = {
  [A.server]: 31.595,
  [A.campus]: 23.786667,
  [A.research]: 17.84,
  [A.evalChart]: 10.09,
  [A.reportDesk]: 11.68,
  [A.clock]: 10.686667,
  [A.meeting]: 8.44,
  [A.ticker]: 10.04,
  [A.markets]: 37.96,
  [A.cityNight]: 14.228333,
  [A.lock]: 30.03,
  [A.workGraphs]: 8.633333,
  [A.network]: 19.8,
  [A.documents]: 17,
  [A.terminal]: 25.88,
  [A.codeBlur]: 14.96,
  [A.soc]: 9.5,
  [A.audit]: 29.16,
  [A.chamber]: 10.2,
  [A.contract]: 33.28,
  [A.dusk]: 9.876533,
  [A.silhouettes]: 12.36,
  [A.ocean]: 11.2112,
};

// These were visually rejected in the first render: cyclist, car, hotel
// elevator, rural facility, insurance page, restaurant, and humanoid robots.
const blacklistedAssets = [
  media("scene_002_55b0a8af17f137fd76d52766"),
  media("scene_010_6f7bc11f2a696985af0db15f"),
  media("scene_012_d356fd9efe14c61c8594ff1f"),
  media("scene_014_416086d1c7285d9e6a01fc67"),
  media("scene_020_820a251a5b10ad8f5a63266f"),
  media("scene_021_d2e9e57773ef446f8e402456"),
  media("scene_032_29ff7ef6ff7df132006f8e97"),
];

const footagePools = {
  scene_001: [A.server, A.campus, A.cityNight],
  scene_002: [A.server, A.campus, A.cityNight, A.research],
  scene_003: [A.research, A.reportDesk, A.documents],
  scene_004: [A.evalChart, A.reportDesk, A.audit],
  scene_005: [A.reportDesk, A.research, A.documents],
  scene_006: [A.clock, A.meeting, A.documents],
  scene_007: [A.meeting, A.documents, A.audit],
  scene_008: [A.ticker, A.markets, A.server, A.campus],
  scene_009: [A.markets, A.ticker, A.evalChart],
  scene_010: [A.network],
  scene_011: [A.cityNight, A.campus, A.server],
  scene_012: [A.soc, A.network, A.documents],
  scene_013: [A.soc, A.lock, A.network],
  scene_014: [A.server, A.campus, A.lock],
  scene_015: [A.research, A.reportDesk, A.workGraphs],
  scene_016: [A.workGraphs, A.audit, A.meeting],
  scene_017: [A.network, A.server, A.campus],
  scene_018: [A.documents, A.contract, A.audit],
  scene_019: [A.chamber, A.contract, A.documents],
  scene_020: [A.server, A.campus, A.contract, A.documents],
  scene_021: [A.chamber, A.documents, A.contract],
  scene_022: [A.terminal, A.lock, A.codeBlur],
  scene_023: [A.codeBlur, A.terminal, A.meeting],
  scene_024: [A.soc, A.lock, A.network],
  scene_025: [A.terminal, A.lock, A.network],
  scene_026: [A.meeting, A.documents],
  scene_027: [A.audit, A.documents, A.contract],
  scene_028: [A.chamber, A.server, A.network],
  scene_029: [A.contract, A.audit, A.network],
  scene_030: [A.dusk],
  scene_031: [A.silhouettes, A.dusk, A.campus],
  scene_032: [A.silhouettes, A.dusk, A.campus],
  scene_033: [A.ocean],
};

const graphics = {
  scene_001: { 0: { type: "brand_open", kicker: "ORVYQ PRESENTS", title: "THE AI RACE", subtitle: "What happens when capability moves faster than control?" } },
  scene_003: { 1: { type: "report_scan", kicker: "SAFETY REPORTS", title: "THE WARNINGS ARE PUBLIC", subtitle: "The evidence often sits in the reports companies publish themselves." } },
  scene_004: { 1: { type: "evaluation", kicker: "CONTROLLED EVALUATION", title: "DESIGNED TEST", subtitle: "A scenario built to probe limits — not a live event." } },
  scene_005: { 1: { type: "scenario", kicker: "SIMULATED SCENARIO", title: "A TEST OF INCENTIVES", subtitle: "Abstracted to avoid fabricating a real transcript." } },
  scene_006: { 2: { type: "fire_drill", kicker: "CONTEXT", title: "FIRE DRILL ≠ FIRE", subtitle: "A designed test can still reveal something important." } },
  scene_008: { 1: { type: "market_pressure", kicker: "RACE DYNAMIC", title: "CAPABILITY FIRST", subtitle: "Markets reward leadership faster than caution." } },
  scene_009: { 1: { type: "benchmark", kicker: "REPORTED", title: "THE BOARD RE-RANKS", subtitle: "A generic benchmark visual — no company branding." } },
  scene_010: { 0: { type: "overtake", kicker: "THE PARADOX", title: "SLOWING ALONE", subtitle: "…hands the frontier to whoever does not." } },
  scene_012: { 1: { type: "incident_map", kicker: "COMPANY-DISCLOSED", title: "REPORTED MISUSE", subtitle: "High-level incident framing only. No operational detail." } },
  scene_013: { 1: { type: "defense_balance", kicker: "THE SAME AUTOMATION", title: "ATTACK & DEFENSE", subtitle: "Capability can lower barriers on both sides." } },
  scene_014: { 1: { type: "bio_boundary", kicker: "BIOLOGICAL RISK", title: "DISTANT BOUNDARIES", subtitle: "Exterior-only, non-operational visual framing." } },
  scene_016: {
    0: { type: "forecast", kicker: "FORECAST", title: "WORK: TWO PROJECTIONS", subtitle: "Competing predictions are not confirmed outcomes." },
    4: { type: "forecast_diverge", kicker: "UNCERTAINTY", title: "THE LINES DIVERGE", subtitle: "Nobody knows yet which forecast will be right." },
  },
  scene_017: { 1: { type: "concentration", kicker: "CONCENTRATION", title: "WHO GETS TO DECIDE?", subtitle: "Power is also about control of compute, data, and infrastructure." } },
  scene_019: { 1: { type: "compute_threshold", kicker: "EU AI ACT", title: "COMPUTE THRESHOLD", subtitle: "A real safety mechanism with real trade-offs." } },
  scene_020: { 1: { type: "compliance_stack", kicker: "COMPLIANCE COST", title: "SCALE ABSORBS COMPLEXITY", subtitle: "Rules can protect people — and also entrench incumbents." } },
  scene_022: { 1: { type: "open_closed", kicker: "OPEN OR CLOSED", title: "NO SIMPLE SAFE OPTION", subtitle: "Both choices distribute risk and power differently." } },
  scene_023: { 1: { type: "audit_tradeoff", kicker: "OPEN WEIGHTS", title: "AUDIT & EXPOSURE", subtitle: "Independent scrutiny and lowered barriers arrive together." } },
  scene_024: { 1: { type: "monitoring", kicker: "CLOSED MODELS", title: "MONITOR & RESTRICT", subtitle: "Central control still does not make harm impossible." } },
  scene_027: { 1: { type: "safeguards", kicker: "SAFETY THAT HELPS", title: "CONSTRAIN. AUDIT. REPORT. VERIFY.", subtitle: "Technical, procedural, and human safeguards work together." } },
  scene_029: { 1: { type: "sunset", kicker: "POWER", title: "RULES THAT EXPIRE", subtitle: "Sunset clauses force safeguards to be re-examined as technology changes." } },
  scene_032: { 2: { type: "systemic_risk", kicker: "THE REAL RISK", title: "NOT A ROGUE MACHINE", subtitle: "A system of incentives, capability, and concentrated control." } },
  scene_033: { 0: { type: "brand_close", kicker: "STILL BEING DECIDED", title: "ORVYQ", subtitle: "By people. Right now." } },
};

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

function sceneShotCount(scene) {
  const count = Math.ceil((scene.end_frame - scene.start_frame) / MAX_SHOT_FRAMES);
  // Give the longest work/forecast passage one additional cut so every plan
  // remains short while retaining its intentionally measured pacing.
  return scene.scene_id === "scene_016" ? count + 1 : count;
}

function pickWindow(asset, duration, salt) {
  const available = durationSec[asset];
  if (!available) throw new Error(`No duration registered for ${asset}`);
  if (available + 0.01 < duration) throw new Error(`${asset} is too short for a ${duration}s shot`);
  const maxStart = Math.max(0, available - duration - 0.04);
  const fraction = [0.04, 0.42, 0.82][salt % 3];
  const trimIn = rounded(maxStart * fraction);
  return { trim_in_sec: trimIn, trim_out_sec: rounded(trimIn + duration) };
}

export async function buildOrvyqEditPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const composition = await readJson(path.join(dir, "remotion", "composition.json"));
  let shotNumber = 1;
  const shots = [];

  for (const scene of composition.scenes) {
    const count = sceneShotCount(scene);
    const frames = scene.end_frame - scene.start_frame;
    const base = Math.floor(frames / count);
    const remainder = frames % count;
    let cursor = scene.start_frame;

    for (let index = 0; index < count; index += 1) {
      const durationInFrames = base + (index < remainder ? 1 : 0);
      const endFrame = cursor + durationInFrames;
      const graphic = graphics[scene.scene_id]?.[index];
      const common = {
        shot_id: `shot_${String(shotNumber).padStart(3, "0")}`,
        scene_id: scene.scene_id,
        start_frame: cursor,
        end_frame: endFrame,
        transition_in: shotNumber === 1 ? "fade" : "cut",
        transition_out: endFrame === composition.duration_frames ? "fade" : "cut",
        text_overlay: null,
      };

      if (graphic) {
        shots.push({ ...common, asset_type: "graphic", graphic, sound_cue: "pulse" });
      } else {
        const pool = footagePools[scene.scene_id];
        if (!pool?.length) throw new Error(`No footage pool configured for ${scene.scene_id}`);
        const asset = pool[(index + shotNumber) % pool.length];
        if (blacklistedAssets.includes(asset)) throw new Error(`Rejected asset selected: ${asset}`);
        const duration = durationInFrames / composition.fps;
        shots.push({
          ...common,
          asset_type: "footage",
          video_asset: asset,
          ...pickWindow(asset, duration, index + shotNumber),
        });
      }

      shotNumber += 1;
      cursor = endFrame;
    }
  }

  const plan = {
    schema_version: "1.0",
    project_id: projectId,
    fps: composition.fps,
    duration_frames: composition.duration_frames,
    audio_mix_asset: "assets/audio/final_mix.mp3",
    brand: {
      name: "ORVYQ",
      tagline: "Beyond the Known",
      palette: { ink: "#F3ECDD", signal: "#D84B4B", ground: "#05070C" },
    },
    blacklisted_assets: blacklistedAssets,
    shots,
  };
  await writeJsonAtomic(path.join(dir, "direction", "edit_plan.json"), plan);
  return plan;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqEditPlan().then((plan) => {
    const graphicCount = plan.shots.filter((shot) => shot.asset_type === "graphic").length;
    console.log(JSON.stringify({ ok: true, shot_count: plan.shots.length, graphic_count: graphicCount, output: "direction/edit_plan.json" }));
  }).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
