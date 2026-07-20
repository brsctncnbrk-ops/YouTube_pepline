#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
  pathExists,
} from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const MUSIC_ASSET = "assets/music/approved_bed.mp3";
const MUSIC_PROVENANCE = "assets/music/approved_bed.provenance.json";
const RENDER_STRATEGY = "section_specific_energy_and_narration_ducking";

const sha256 = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite`);
  return number;
}

function cueIdFor(section, index, prior) {
  if (prior?.cue_id) return String(prior.cue_id);
  const suffix = String(section.section_id || `SECTION_${index + 1}`)
    .replace(/^SEC_[0-9]+_?/, "")
    .replace(/[^A-Z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return `CUE_${String(index + 1).padStart(2, "0")}_${suffix || "SECTION"}`;
}

function resolvePriorCue(cueSheet, section, index) {
  const cues = Array.isArray(cueSheet.full_cues) ? cueSheet.full_cues : [];
  return (
    cues.find((cue) => cue.section_id === section.section_id) ||
    cues[index] ||
    null
  );
}

export function buildCanonicalFullCues({ plan, cueSheet, provenance }) {
  const fps = finite(plan.fps, "plan.fps");
  const durationFrames = finite(plan.duration_frames, "plan.duration_frames");
  if (!(fps > 0 && durationFrames > 0)) {
    throw new Error("Canonical plan duration must be positive");
  }
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  if (!sections.length) throw new Error("Canonical plan has no sections");
  if (
    provenance.asset !== MUSIC_ASSET ||
    provenance.approved_for_final_edit !== true ||
    !String(provenance.attribution || "").trim() ||
    !String(provenance.license_url || "").trim()
  ) {
    throw new Error("Approved music provenance is incomplete");
  }

  let cursor = 0;
  const fullCues = sections.map((section, index) => {
    const startFrame = finite(section.start_frame, `${section.section_id}.start_frame`);
    const endFrame = finite(section.end_frame, `${section.section_id}.end_frame`);
    if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame)) {
      throw new Error(`${section.section_id} frame bounds must be integers`);
    }
    if (startFrame !== cursor || endFrame <= startFrame) {
      throw new Error(
        `${section.section_id} is not contiguous at frame ${cursor}: ${startFrame}-${endFrame}`,
      );
    }
    cursor = endFrame;
    const prior = resolvePriorCue(cueSheet, section, index);
    const state = String(
      section.music_state || prior?.state || `section_${index + 1}`,
    ).trim();
    if (!state) throw new Error(`${section.section_id} has no music state`);
    return {
      cue_id: cueIdFor(section, index, prior),
      section_id: section.section_id,
      start: startFrame / fps,
      end: endFrame / fps,
      state,
      energy_start: finite(prior?.energy_start ?? 0.4, `${section.section_id}.energy_start`),
      energy_end: finite(prior?.energy_end ?? 0.5, `${section.section_id}.energy_end`),
      function:
        prior?.function ||
        prior?.purpose ||
        section.dramatic_function ||
        `Support ${section.section_id}`,
      instrumentation:
        prior?.instrumentation ||
        "approved licensed bed shaped through section-specific energy and narration ducking",
      transition_out:
        prior?.transition_out ||
        (index === sections.length - 1
          ? "clean natural decay into black"
          : "continuous energy transition into the next canonical section"),
      asset: MUSIC_ASSET,
      provenance: MUSIC_PROVENANCE,
      attribution: provenance.attribution,
      status: "ready",
      render_strategy: RENDER_STRATEGY,
    };
  });
  if (cursor !== durationFrames) {
    throw new Error(
      `Canonical sections end at ${cursor}; plan duration is ${durationFrames}`,
    );
  }
  const distinctStates = new Set(fullCues.map((cue) => cue.state)).size;
  const minimumStates = Number(
    cueSheet.policy?.minimum_distinct_music_states || 4,
  );
  if (distinctStates < minimumStates) {
    throw new Error(
      `Canonical cue sheet has ${distinctStates} music states; ${minimumStates} required`,
    );
  }
  return {
    durationSeconds: durationFrames / fps,
    fullCues,
    distinctStates,
    fps,
    durationFrames,
  };
}

export async function prepareFullMusicCues(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const cuePath = path.join(dir, "direction", "music_cue_sheet.json");
  const planPath = path.join(dir, "direction", "production_plan.json");
  const provenancePath = path.join(dir, MUSIC_PROVENANCE);
  const assetPath = path.join(dir, MUSIC_ASSET);
  if (!(await pathExists(assetPath))) {
    throw new Error(`Approved music asset is missing: ${MUSIC_ASSET}`);
  }
  if (!(await pathExists(provenancePath))) {
    throw new Error(`Approved music provenance is missing: ${MUSIC_PROVENANCE}`);
  }
  const [plan, cueSheet, provenance] = await Promise.all([
    readJson(planPath),
    readJson(cuePath),
    readJson(provenancePath),
  ]);
  const result = buildCanonicalFullCues({ plan, cueSheet, provenance });
  const prepared = {
    ...cueSheet,
    schema_version: "2.0-canonical-full-duration-cues",
    project_id: projectId,
    duration_seconds: result.durationSeconds,
    policy: {
      ...cueSheet.policy,
      full_render_requires_all_cues_ready: true,
      canonical_section_alignment_required: true,
      approved_asset_provenance_required: true,
      section_specific_energy_arc_required: true,
    },
    full_cues: result.fullCues,
  };
  await writeJsonAtomic(cuePath, prepared);
  const report = {
    schema_version: "1.0-canonical-full-music-cue-preparation",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    production_plan_sha256: sha256(plan),
    cue_sheet_sha256: sha256(prepared),
    music_provenance_sha256: sha256(provenance),
    music_asset: MUSIC_ASSET,
    music_provenance: MUSIC_PROVENANCE,
    attribution: provenance.attribution,
    duration_frames: result.durationFrames,
    fps: result.fps,
    duration_seconds: result.durationSeconds,
    cue_count: result.fullCues.length,
    section_count: plan.sections.length,
    distinct_states: result.distinctStates,
    all_cues_ready: result.fullCues.every((cue) => cue.status === "ready"),
    continuous_coverage:
      result.fullCues[0]?.start === 0 &&
      result.fullCues.at(-1)?.end === result.durationSeconds &&
      result.fullCues.every(
        (cue, index) =>
          index === 0 ||
          Math.abs(result.fullCues[index - 1].end - cue.start) < 1e-9,
      ),
    provenance_bound: result.fullCues.every(
      (cue) =>
        cue.asset === MUSIC_ASSET &&
        cue.provenance === MUSIC_PROVENANCE &&
        cue.attribution === provenance.attribution &&
        cue.render_strategy === RENDER_STRATEGY,
    ),
    pass: true,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "full_music_cue_preparation.json"),
    report,
  );
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  prepareFullMusicCues(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
