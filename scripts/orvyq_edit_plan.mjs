#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const MAX_SHOT_FRAMES = 240;
const MAX_SOURCE_USES = 2;
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
  [A.server]: 31.595, [A.campus]: 23.786667, [A.research]: 17.84, [A.evalChart]: 10.09,
  [A.reportDesk]: 11.68, [A.clock]: 10.686667, [A.meeting]: 8.44, [A.ticker]: 10.04,
  [A.markets]: 37.96, [A.cityNight]: 14.228333, [A.lock]: 30.03, [A.workGraphs]: 8.633333,
  [A.network]: 19.8, [A.documents]: 17, [A.terminal]: 25.88, [A.codeBlur]: 14.96,
  [A.soc]: 9.5, [A.audit]: 29.16, [A.chamber]: 10.2, [A.contract]: 33.28,
  [A.dusk]: 9.876533, [A.silhouettes]: 12.36, [A.ocean]: 11.2112,
};

const allAssets = Object.values(A);
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
  scene_002: [A.research, A.campus, A.cityNight, A.server],
  scene_003: [A.research, A.reportDesk, A.documents],
  scene_004: [A.evalChart, A.reportDesk, A.audit],
  scene_005: [A.reportDesk, A.research, A.documents],
  scene_006: [A.clock, A.meeting, A.documents],
  scene_007: [A.meeting, A.documents, A.audit],
  scene_008: [A.ticker, A.markets, A.campus],
  scene_009: [A.markets, A.ticker, A.evalChart],
  scene_010: [A.network, A.terminal],
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
  scene_030: [A.dusk, A.ocean],
  scene_031: [A.silhouettes, A.dusk, A.campus],
  scene_032: [A.silhouettes, A.dusk, A.ocean],
  scene_033: [A.ocean, A.silhouettes],
};

const graphic = (type, kicker, title, subtitle, labels = [], source = null) => ({ type, kicker, title, subtitle, labels, source });
const graphics = {
  scene_001: {
    0: graphic("brand_open", "ORVYQ PRESENTS", "THE AI RACE", "What happens when capability moves faster than control?"),
  },
  scene_003: {
    1: graphic(
      "report_scan",
      "EVIDENCE, NOT DECORATION",
      "THE WARNINGS ARE ALREADY PUBLIC",
      "Safety reports matter only when the viewer can understand what they establish — and what they do not.",
      ["Company-published safety reports", "Documented evaluation results", "Context and limitations"],
      "Publicly disclosed safety documentation",
    ),
  },
  scene_004: {
    1: graphic(
      "evaluation",
      "CONTROLLED EVALUATION",
      "A TEST IS NOT AN INCIDENT",
      "A designed scenario can reveal incentives without pretending that a fictional event happened in the real world.",
      ["A designed test can reveal behavior", "It does not prove a real incident occurred"],
    ),
  },
  scene_006: {
    1: graphic(
      "fire_drill",
      "CONTEXT CHANGES MEANING",
      "A FIRE DRILL IS NOT A FIRE",
      "But it can still show how a system behaves under pressure.",
      ["Useful signal under controlled conditions", "Not evidence of a real-world emergency"],
    ),
  },
  scene_010: {
    0: graphic("statement", "THE INCENTIVE PROBLEM", "SLOWING DOWN ALONE DOES NOT STOP THE RACE", "It can simply move the frontier to whoever refuses to slow down."),
  },
  scene_016: {
    1: graphic("forecast_diverge", "UNCERTAINTY", "COMPETING FORECASTS ARE NOT FACTS", "Different projections can be useful without pretending that the future has already been measured.", ["Plausible projection", "Alternative projection"]),
  },
  scene_019: {
    1: graphic("compute_threshold", "REAL POLICY MECHANISM", "WHEN OVERSIGHT TRIGGERS", "Thresholds should be shown as policy rules, not as invented performance charts.", ["Compute threshold", "Capability assessment", "Risk review", "Oversight duties"], "EU AI Act framework"),
  },
  scene_022: {
    1: graphic("open_closed", "A REAL TRADE-OFF", "OPEN OR CLOSED IS NOT A SIMPLE CHOICE", "Each approach distributes scrutiny, control, access, and misuse risk differently.", ["OPEN: wider scrutiny and access", "CLOSED: tighter control and concentration"]),
  },
  scene_027: {
    1: graphic("safeguards", "PRACTICAL SAFETY", "LAYERED SAFEGUARDS", "No single intervention is enough.", ["CONSTRAIN", "AUDIT", "REPORT", "VERIFY"]),
  },
  scene_033: {
    0: graphic("brand_close", "STILL BEING DECIDED", "ORVYQ", "By people. Right now."),
  },
};

const motionVariants = ["push", "drift_left", "pull", "drift_right", "hold"];
const rounded = (value) => Math.round(value * 1000) / 1000;

function pickWindow(asset, duration, salt) {
  const available = durationSec[asset];
  if (!available) throw new Error(`No duration registered for ${asset}`);
  if (available + 0.01 < duration) throw new Error(`${asset} is too short for a ${duration.toFixed(2)}s shot`);
  const maxStart = Math.max(0, available - duration - 0.04);
  const fraction = (salt * 0.61803398875 + 0.137) % 1;
  const trimIn = rounded(maxStart * fraction);
  return { trim_in_sec: trimIn, trim_out_sec: rounded(trimIn + duration) };
}

function pickAsset(pool, duration, salt, lastAsset, usage) {
  const candidates = [...pool, ...allAssets.filter((asset) => !pool.includes(asset))]
    .filter((asset) => !blacklistedAssets.includes(asset))
    .filter((asset) => asset !== lastAsset)
    .filter((asset) => (usage.get(asset) || 0) < MAX_SOURCE_USES)
    .filter((asset) => (durationSec[asset] || 0) + 0.01 >= duration);
  if (!candidates.length) {
    throw new Error(
      `No eligible footage remains for a ${duration.toFixed(2)}s shot. ` +
      `Every source may be used at most ${MAX_SOURCE_USES} times; retrieve more idea-matched assets before a full render.`,
    );
  }
  const asset = candidates[Math.abs(salt) % candidates.length];
  usage.set(asset, (usage.get(asset) || 0) + 1);
  return asset;
}

export async function buildOrvyqEditPlan(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const composition = await readJson(path.join(dir, "remotion", "composition.json"));
  const previewFrames = Number.parseInt(process.env.ORVYQ_PREVIEW_FRAMES || "0", 10);
  const timelineEnd = previewFrames > 0 ? Math.min(previewFrames, composition.duration_frames) : composition.duration_frames;
  const shots = [];
  const usage = new Map();
  let shotNumber = 1;
  let lastAsset = null;

  for (let sceneIndex = 0; sceneIndex < composition.scenes.length; sceneIndex += 1) {
    const scene = composition.scenes[sceneIndex];
    if (scene.start_frame >= timelineEnd) break;
    const sceneEnd = Math.min(scene.end_frame, timelineEnd);
    const frames = sceneEnd - scene.start_frame;
    if (frames <= 0) continue;
    const count = Math.max(1, Math.ceil(frames / MAX_SHOT_FRAMES));
    const base = Math.floor(frames / count);
    const remainder = frames % count;
    let cursor = scene.start_frame;

    for (let index = 0; index < count; index += 1) {
      const durationInFrames = base + (index < remainder ? 1 : 0);
      const endFrame = cursor + durationInFrames;
      const graphicSpec = graphics[scene.scene_id]?.[index];
      const firstInScene = index === 0;
      const common = {
        shot_id: `shot_${String(shotNumber).padStart(3, "0")}`,
        scene_id: scene.scene_id,
        start_frame: cursor,
        end_frame: endFrame,
        transition_in: shotNumber === 1 ? "fade" : firstInScene && sceneIndex % 4 === 0 ? "dissolve" : "cut",
        transition_out: endFrame === timelineEnd ? "fade" : "cut",
        text_overlay: firstInScene && !graphicSpec ? (scene.text_overlay ?? null) : null,
      };

      if (graphicSpec) {
        shots.push({ ...common, asset_type: "graphic", graphic: graphicSpec, sound_cue: null });
      } else {
        const duration = durationInFrames / composition.fps;
        const pool = footagePools[scene.scene_id];
        if (!pool?.length) throw new Error(`No idea-matched footage pool configured for ${scene.scene_id}`);
        const asset = pickAsset(pool, duration, shotNumber * 7 + index * 11 + sceneIndex * 13, lastAsset, usage);
        shots.push({
          ...common,
          asset_type: "footage",
          video_asset: asset,
          motion_variant: motionVariants[(shotNumber + sceneIndex + index) % motionVariants.length],
          sound_cue: null,
          ...pickWindow(asset, duration, shotNumber * 7 + index * 11 + sceneIndex * 13),
        });
        lastAsset = asset;
      }
      shotNumber += 1;
      cursor = endFrame;
    }
  }

  const sourceUsage = Object.fromEntries([...usage.entries()].sort((a, b) => b[1] - a[1]));
  const plan = {
    schema_version: "3.0",
    project_id: projectId,
    fps: composition.fps,
    duration_frames: timelineEnd,
    preview: previewFrames > 0,
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: {
      principle: "topic-led, not permanently dark",
      topic: "AI competition, incentives, governance, and control",
      palette: { ink: "#F5F0E7", accent: "#D95B53", information: "#86A9CC", ground: "#0C1320" },
    },
    quality_policy: {
      max_uses_per_source: MAX_SOURCE_USES,
      keyword_only_visual_matching_forbidden: true,
      fake_data_graphics_forbidden: true,
      source_crop_does_not_create_new_asset: true,
    },
    blacklisted_assets: blacklistedAssets,
    source_usage: sourceUsage,
    shots,
  };

  await writeJsonAtomic(path.join(dir, "direction", "edit_plan.json"), plan);
  return plan;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqEditPlan().then((plan) => {
    console.log(JSON.stringify({
      ok: true,
      preview: plan.preview,
      shot_count: plan.shots.length,
      graphic_count: plan.shots.filter((shot) => shot.asset_type === "graphic").length,
      max_source_uses: Math.max(0, ...Object.values(plan.source_usage)),
      output: "direction/edit_plan.json",
    }));
  }).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
