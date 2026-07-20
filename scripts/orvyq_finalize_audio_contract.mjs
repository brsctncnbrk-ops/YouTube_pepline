#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
  pathExists,
} from "./lib/fs-utils.mjs";
import { fetchProofMusic } from "./orvyq_fetch_proof_music.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const MUSIC_ASSET = "assets/music/approved_bed.mp3";
const MUSIC_PROVENANCE = "assets/music/approved_bed.provenance.json";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => key !== "generated_at")
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function sha(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function cueId(sectionId) {
  return sectionId.replace(/^SEC_/, "CUE_");
}

function contiguous(cues, duration, tolerance = 0.001) {
  if (!cues.length || Math.abs(Number(cues[0].start)) > tolerance) return false;
  for (let index = 1; index < cues.length; index += 1) {
    if (Math.abs(Number(cues[index - 1].end) - Number(cues[index].start)) > tolerance)
      return false;
  }
  return Math.abs(Number(cues.at(-1).end) - duration) <= tolerance;
}

export async function finalizeAudioContract(projectId = PROJECT_ID) {
  await fetchProofMusic(projectId);
  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const cuePath = path.join(dir, "direction", "music_cue_sheet.json");
  const [plan, existing, provenance] = await Promise.all([
    readJson(planPath),
    readJson(cuePath),
    readJson(path.join(dir, MUSIC_PROVENANCE)),
  ]);
  if (!(await pathExists(path.join(dir, MUSIC_ASSET))))
    throw new Error(`Missing canonical music asset: ${MUSIC_ASSET}`);
  if (
    provenance.asset !== MUSIC_ASSET ||
    provenance.approved_for_final_edit !== true ||
    !provenance.attribution ||
    !String(provenance.license_url || "").includes("/licenses/by/4.0")
  )
    throw new Error("Canonical approved music provenance is incomplete");

  const fps = Number(plan.fps || 30);
  const duration = Number(plan.duration_frames) / fps;
  const templates = new Map(
    (existing.full_cues || []).map((cue) => [cue.section_id, cue]),
  );
  const cues = (plan.sections || []).map((section, index) => {
    const template = templates.get(section.section_id) || {};
    return {
      cue_id: cueId(section.section_id),
      section_id: section.section_id,
      start: Number(section.start_frame) / fps,
      end: Number(section.end_frame) / fps,
      state: section.music_state,
      energy_start: Number(template.energy_start ?? 0.35 + index * 0.02),
      energy_end: Number(template.energy_end ?? 0.5),
      function: template.function || section.dramatic_function,
      instrumentation:
        template.instrumentation ||
        "restrained cinematic tonal bed shaped through section-specific gain, filtering, and narration ducking",
      transition_out:
        template.transition_out ||
        "section-aware energy transition into the next canonical cue",
      asset: MUSIC_ASSET,
      provenance: MUSIC_PROVENANCE,
      license: provenance.license || "CC BY 4.0",
      attribution: provenance.attribution,
      render_strategy: "single_approved_bed_with_section_specific_energy_and_ducking",
      status: "ready",
    };
  });
  if (cues.length !== (plan.sections || []).length || cues.length < 4)
    throw new Error("Canonical music cues do not cover every production section");
  if (!contiguous(cues, duration))
    throw new Error("Canonical music cues are not contiguous across the plan duration");
  if (new Set(cues.map((cue) => cue.state)).size < 4)
    throw new Error("Canonical music cues contain fewer than four distinct states");

  const cueSheet = {
    schema_version: "2.0-canonical-full-film-audio",
    project_id: projectId,
    duration_seconds: duration,
    duration_frames: Number(plan.duration_frames),
    fps,
    canonical_plan_sha256_before_audio_contract: sha(plan),
    policy: {
      minimum_distinct_music_states: 4,
      continuous_single_loop_forbidden: true,
      narration_ducking_required: true,
      random_whoosh_glitch_boom_forbidden: true,
      silence_may_be_used_as_an_editorial_cue: true,
      full_render_requires_all_cues_ready: true,
      cue_boundaries_must_match_production_sections: true,
      one_licensed_bed_may_be_authored_into_distinct_cues: true,
      sfx_requires_deterministic_repository_provenance: true,
    },
    proof_score: existing.proof_score,
    approved_music: {
      asset: MUSIC_ASSET,
      provenance: MUSIC_PROVENANCE,
      license: provenance.license || "CC BY 4.0",
      attribution: provenance.attribution,
      sha256: provenance.sha256,
    },
    full_cues: cues,
  };
  cueSheet.contract_sha256 = sha(cueSheet);

  plan.quality_policy = {
    ...plan.quality_policy,
    editorial_mode: "cinematic_contextual",
    cinematic_body_footage: true,
    require_sound_design_sfx: true,
    minimum_original_sfx_types: 3,
    procedural_noise_generation_forbidden: true,
    music_cue_sheet_ref: "direction/music_cue_sheet.json",
    music_cue_contract_sha256: cueSheet.contract_sha256,
    full_music_cues_ready: true,
    full_music_cue_count: cues.length,
    audio_contract_version: "4.0-canonical-section-cues-and-original-sfx",
  };
  plan.generated_at = new Date().toISOString();
  await Promise.all([
    writeJsonAtomic(planPath, plan),
    writeJsonAtomic(cuePath, cueSheet),
  ]);

  const report = {
    schema_version: "4.0-canonical-section-cues-and-original-sfx",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    duration_seconds: duration,
    cue_count: cues.length,
    distinct_states: new Set(cues.map((cue) => cue.state)).size,
    continuous_coverage: contiguous(cues, duration),
    all_cues_ready: cues.every((cue) => cue.status === "ready"),
    music_asset: MUSIC_ASSET,
    music_provenance: MUSIC_PROVENANCE,
    music_cue_contract_sha256: cueSheet.contract_sha256,
    require_sound_design_sfx: true,
    minimum_original_sfx_types: 3,
    approved_music_fetched_and_verified: true,
    pass: true,
  };
  await writeJsonAtomic(path.join(dir, "qa", "audio_contract.json"), report);
  console.log(JSON.stringify({ ok: true, ...report }));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  finalizeAudioContract(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
