#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
  pathExists,
} from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const SFX_RECIPES = {
  "assets/sfx/orvyq_low_impact.wav": {
    role: "restrained low-frequency editorial impact",
    recipe:
      "62Hz and 124Hz deterministic sine layers; exponential decay; low-pass 720Hz; 48kHz stereo PCM",
    synthesis_version: "orvyq-sfx-low-impact-v1",
  },
  "assets/sfx/orvyq_tonal_bloom.wav": {
    role: "restrained tonal transition bloom",
    recipe:
      "164.81Hz and 246.94Hz deterministic sine layers; fixed echo taps; fade envelope; 48kHz stereo PCM",
    synthesis_version: "orvyq-sfx-tonal-bloom-v1",
  },
  "assets/sfx/orvyq_ui_tick.wav": {
    role: "subtle source-reveal interface tick",
    recipe:
      "880Hz and 1320Hz deterministic sine layers; fixed 90ms envelope; 48kHz stereo PCM",
    synthesis_version: "orvyq-sfx-ui-tick-v1",
  },
};

async function fileSha256(file) {
  const bytes = await fs.readFile(file);
  return {
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  };
}

function contiguous(cues, expectedEnd, tolerance = 0.03) {
  if (!cues.length || Math.abs(Number(cues[0].start || 0)) > tolerance)
    return false;
  for (let index = 1; index < cues.length; index += 1) {
    if (
      Math.abs(Number(cues[index - 1].end) - Number(cues[index].start)) >
      tolerance
    )
      return false;
  }
  return Math.abs(Number(cues.at(-1).end) - expectedEnd) <= tolerance;
}

export async function finalizeRenderedAudioMetadata(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const metadataPath = path.join(dir, "assets", "audio", "final_mix.metadata.json");
  const [metadata, cueSheet, plan] = await Promise.all([
    readJson(metadataPath),
    readJson(path.join(dir, "direction", "music_cue_sheet.json")),
    readJson(path.join(dir, "direction", "production_plan.json")),
  ]);
  const isFull = Number(metadata.duration_seconds) > 150.1;
  const canonicalDuration = Number(plan.duration_frames) / Number(plan.fps || 30);
  const cues = isFull
    ? (cueSheet.full_cues || []).map((cue) => ({
        id: cue.cue_id,
        cue_id: cue.cue_id,
        section_id: cue.section_id,
        state: cue.state,
        start: Number(cue.start),
        end: Number(cue.end),
        purpose: cue.function,
        energy_start: Number(cue.energy_start),
        energy_end: Number(cue.energy_end),
        asset: cue.asset,
        provenance: cue.provenance,
        status: cue.status,
        render_strategy: cue.render_strategy,
      }))
    : metadata.music_sections || [];
  if (isFull) {
    if (Math.abs(Number(cueSheet.duration_seconds) - canonicalDuration) > 0.001)
      throw new Error("Canonical cue-sheet duration does not match production plan");
    if (!contiguous(cues, canonicalDuration))
      throw new Error("Canonical full-film music cues are not contiguous");
    if (cues.some((cue) => cue.status !== "ready"))
      throw new Error("Canonical full-film music cues are not all ready");
    if (cues.length !== (plan.sections || []).length)
      throw new Error("Canonical full-film music cue count does not match production sections");
  }

  const sfxProvenance = [];
  for (const asset of metadata.sfx_assets || []) {
    const recipe = SFX_RECIPES[asset];
    if (!recipe)
      throw new Error(`No deterministic synthesis recipe is registered for ${asset}`);
    const absolute = path.join(dir, asset);
    if (!(await pathExists(absolute))) throw new Error(`Missing synthesized SFX: ${asset}`);
    const digest = await fileSha256(absolute);
    const provenancePath = `${absolute}.provenance.json`;
    const provenance = {
      schema_version: "1.0-original-synthesized-sfx",
      asset,
      origin: "original_synthesized_sfx",
      role: recipe.role,
      generated_by: "scripts/orvyq_audio_mix.mjs",
      finalized_by: "scripts/orvyq_finalize_rendered_audio_metadata.mjs",
      synthesis_version: recipe.synthesis_version,
      deterministic_recipe: recipe.recipe,
      sample_rate_hz: 48000,
      channels: 2,
      encoding: "pcm_s16le",
      sha256: digest.sha256,
      bytes: digest.bytes,
      license: "Original ORVYQ repository-authored audio; no third-party recording.",
      approved_for_final_edit: true,
      procedural_noise_generation: false,
    };
    await writeJsonAtomic(provenancePath, provenance);
    sfxProvenance.push(
      path.relative(dir, provenancePath).split(path.sep).join("/"),
    );
  }
  if (
    plan.quality_policy?.require_sound_design_sfx === true &&
    sfxProvenance.length < Number(plan.quality_policy?.minimum_original_sfx_types || 3)
  )
    throw new Error("Canonical sound-design contract requires at least three original SFX provenance records");

  metadata.schema_version = "4.0-canonical-full-film-audio";
  metadata.audio_contract_ref = "qa/audio_contract.json";
  metadata.music_cue_sheet = "direction/music_cue_sheet.json";
  metadata.music_cue_contract_sha256 = cueSheet.contract_sha256;
  metadata.music_sections = cues;
  metadata.full_cue_assets = isFull
    ? [
        {
          asset: metadata.music_asset,
          provenance: metadata.music_provenance,
          cue_ids: cues.map((cue) => cue.cue_id),
          render_strategy:
            "single_approved_bed_with_section_specific_energy_and_ducking",
        },
      ]
    : [];
  metadata.sfx_provenance = sfxProvenance;
  metadata.sfx_approval = {
    required: plan.quality_policy?.require_sound_design_sfx === true,
    origin: "original_synthesized_sfx",
    provenance_count: sfxProvenance.length,
    approved_for_final_edit: true,
  };
  metadata.canonical_plan_duration_seconds = canonicalDuration;
  metadata.canonical_full_cue_count = isFull ? cues.length : null;
  metadata.canonical_full_cues_ready = isFull
    ? cues.every((cue) => cue.status === "ready")
    : null;
  await writeJsonAtomic(metadataPath, metadata);

  const report = {
    schema_version: "4.0-canonical-full-film-audio",
    project_id: projectId,
    full_duration: isFull,
    audio_duration_seconds: Number(metadata.duration_seconds),
    canonical_plan_duration_seconds: canonicalDuration,
    cue_count: cues.length,
    cue_coverage_contiguous: isFull ? contiguous(cues, canonicalDuration) : true,
    all_full_cues_ready: isFull ? cues.every((cue) => cue.status === "ready") : true,
    sfx_count: (metadata.sfx_assets || []).length,
    sfx_provenance_count: sfxProvenance.length,
    sfx_origin: metadata.sfx_origin,
    procedural_noise_generation: metadata.procedural_noise_generation,
    pass:
      metadata.procedural_noise_generation === false &&
      (!isFull || cues.every((cue) => cue.status === "ready")) &&
      sfxProvenance.length === (metadata.sfx_assets || []).length,
  };
  await writeJsonAtomic(path.join(dir, "qa", "rendered_audio_contract.json"), report);
  if (!report.pass) throw new Error("Rendered audio contract did not pass");
  console.log(JSON.stringify({ ok: true, ...report }));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  finalizeRenderedAudioMetadata(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
