#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
  pathExists,
} from "./lib/fs-utils.mjs";
import { resolveEditorialMode } from "./lib/orvyq-visual-policy.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

function contiguous(items, expectedEnd, tolerance = 0.03) {
  if (!items.length || Math.abs(Number(items[0].start || 0)) > tolerance)
    return false;
  for (let index = 1; index < items.length; index += 1) {
    if (
      Math.abs(Number(items[index - 1].end) - Number(items[index].start)) >
      tolerance
    )
      return false;
  }
  return Math.abs(Number(items.at(-1).end) - expectedEnd) <= tolerance;
}

async function sha256(file) {
  const bytes = await fs.readFile(file);
  return createHash("sha256").update(bytes).digest("hex");
}

export async function runMusicCueAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, cueSheet, audioMetadata] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "direction", "music_cue_sheet.json")),
    readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
  ]);
  const failures = [];
  const warnings = [];
  const editorial = resolveEditorialMode(plan);
  const cinematicProof =
    plan.preview && editorial.mode === "cinematic_contextual";
  const requireSfx =
    plan.quality_policy?.require_sound_design_sfx === true || cinematicProof;
  const minimumSfxTypes = Number(
    plan.quality_policy?.minimum_original_sfx_types || 3,
  );

  if (!editorial.declaration_matches_timeline)
    failures.push(
      `declared editorial mode ${editorial.declared_mode} conflicts with inferred mode ${editorial.inferred_mode}`,
    );
  if (audioMetadata.procedural_noise_generation !== false)
    failures.push("procedural noise generation must remain disabled");
  if (requireSfx) {
    if (audioMetadata.sfx_origin !== "original_synthesized_sfx")
      failures.push("required SFX must be original synthesized assets");
    if ((audioMetadata.sfx_assets || []).length < minimumSfxTypes)
      failures.push(
        `sound design requires at least ${minimumSfxTypes} restrained SFX types`,
      );
    if (
      (audioMetadata.sfx_provenance || []).length !==
      (audioMetadata.sfx_assets || []).length
    )
      failures.push("not every SFX asset has a bound provenance record");
    if ((audioMetadata.pause_windows || []).length < 4)
      failures.push("sound design requires four editorial audio pauses");
    if (!audioMetadata.narration_ducking?.enabled)
      failures.push("narration ducking is not enabled");
    if (!audioMetadata.narration_ducking?.music_rises_during_editorial_pauses)
      failures.push("music does not rise during editorial pauses");
    if (!audioMetadata.narration_ducking?.section_specific_energy_arc)
      failures.push("music does not use the canonical section-specific energy arc");
    if (
      Number(audioMetadata.music_mix_target_lufs) < -26 ||
      Number(audioMetadata.music_mix_target_lufs) > -20
    )
      failures.push(
        "music mix target must remain audible between -26 and -20 LUFS",
      );
  } else if ((audioMetadata.sfx_assets || []).length) {
    failures.push("SFX assets are present without an explicit sound-design contract");
  }

  if (
    !audioMetadata.music_asset ||
    !(await pathExists(path.join(dir, audioMetadata.music_asset)))
  )
    failures.push("declared music asset is missing");
  for (const asset of audioMetadata.sfx_assets || []) {
    if (!(await pathExists(path.join(dir, asset))))
      failures.push(`declared SFX asset is missing: ${asset}`);
    const provenanceRelative = `${asset}.provenance.json`;
    if (!(audioMetadata.sfx_provenance || []).includes(provenanceRelative)) {
      failures.push(`declared SFX provenance is not bound: ${asset}`);
      continue;
    }
    const provenancePath = path.join(dir, provenanceRelative);
    if (!(await pathExists(provenancePath))) {
      failures.push(`declared SFX provenance is missing: ${provenanceRelative}`);
      continue;
    }
    const provenance = await readJson(provenancePath);
    if (
      provenance.asset !== asset ||
      provenance.origin !== "original_synthesized_sfx" ||
      provenance.approved_for_final_edit !== true ||
      provenance.procedural_noise_generation !== false ||
      !provenance.deterministic_recipe ||
      provenance.sha256 !== (await sha256(path.join(dir, asset)))
    )
      failures.push(`declared SFX provenance is incomplete or stale: ${asset}`);
  }

  if (audioMetadata.music_profile === "approved_licensed_bed") {
    if (
      !audioMetadata.music_provenance ||
      !(await pathExists(path.join(dir, audioMetadata.music_provenance)))
    )
      failures.push("approved music provenance is missing");
    if (!audioMetadata.music_attribution)
      failures.push("approved music attribution is missing");
  }

  let activeCues;
  if (plan.preview) {
    activeCues = audioMetadata.music_sections || [];
    if (activeCues.length < cueSheet.policy.minimum_distinct_music_states)
      failures.push(
        `proof contains ${activeCues.length} music states; ${cueSheet.policy.minimum_distinct_music_states} required`,
      );
    if (!contiguous(activeCues, plan.duration_frames / plan.fps))
      failures.push(
        "proof music sections do not continuously cover the proof duration",
      );
  } else {
    const canonicalDuration = Number(plan.duration_frames) / Number(plan.fps);
    activeCues = cueSheet.full_cues || [];
    if (Math.abs(Number(cueSheet.duration_seconds) - canonicalDuration) > 0.001)
      failures.push("full cue-sheet duration does not match the canonical plan");
    if (!contiguous(activeCues, canonicalDuration))
      failures.push("full cue sheet does not continuously cover the film duration");
    if (activeCues.length !== (plan.sections || []).length)
      failures.push("full cue count does not match the canonical production sections");
    const incomplete = activeCues.filter((cue) => cue.status !== "ready");
    if (incomplete.length)
      failures.push(
        `full music cues are not ready: ${incomplete
          .map((cue) => cue.cue_id)
          .join(", ")}`,
      );
    for (const cue of activeCues) {
      if (
        cue.asset !== audioMetadata.music_asset ||
        cue.provenance !== audioMetadata.music_provenance ||
        !cue.attribution ||
        !cue.render_strategy
      )
        failures.push(`full music cue provenance is incomplete: ${cue.cue_id}`);
    }
    const renderedCues = audioMetadata.music_sections || [];
    if (!contiguous(renderedCues, Number(audioMetadata.duration_seconds)))
      failures.push("rendered music sections do not continuously cover the audio duration");
    if (renderedCues.length !== activeCues.length)
      failures.push("rendered music section count differs from the canonical cue sheet");
    if (!audioMetadata.narration_ducking?.section_specific_energy_arc)
      failures.push("rendered audio did not apply section-specific cue energy");
    const states = new Set(activeCues.map((cue) => cue.state));
    if (states.size < cueSheet.policy.minimum_distinct_music_states)
      failures.push(`full cue sheet has only ${states.size} distinct states`);
    if (
      audioMetadata.music_profile !== "approved_licensed_bed" &&
      !(audioMetadata.full_cue_assets || []).length
    )
      failures.push(
        "full render requires approved full-duration music assets or rendered full cue assets",
      );
  }

  const energyChanges = activeCues
    .map((cue) =>
      Math.abs(Number(cue.energy_end ?? 0) - Number(cue.energy_start ?? 0)),
    )
    .filter(Number.isFinite);
  if (
    !plan.preview &&
    energyChanges.length &&
    energyChanges.every((change) => change < 0.08)
  )
    warnings.push("full cue energy curve may be too flat");

  const continuousCoverage = contiguous(
    activeCues,
    plan.preview
      ? plan.duration_frames / plan.fps
      : Number(cueSheet.duration_seconds),
  );
  const report = {
    schema_version: "3.0-canonical-cues-and-sfx-provenance",
    project_id: projectId,
    preview: Boolean(plan.preview),
    editorial_mode: editorial.mode,
    editorial_mode_resolution: editorial,
    require_sound_design_sfx: requireSfx,
    minimum_original_sfx_types: minimumSfxTypes,
    music_profile: audioMetadata.music_profile,
    cue_count: activeCues.length,
    distinct_states: new Set(activeCues.map((cue) => cue.id || cue.state)).size,
    music_mix_target_lufs: audioMetadata.music_mix_target_lufs ?? null,
    sfx_count: (audioMetadata.sfx_assets || []).length,
    sfx_provenance_count: (audioMetadata.sfx_provenance || []).length,
    editorial_pause_count: (audioMetadata.pause_windows || []).length,
    section_specific_energy_arc: Boolean(
      audioMetadata.narration_ducking?.section_specific_energy_arc,
    ),
    continuous_coverage: continuousCoverage,
    warnings,
    failures,
    pass: failures.length === 0,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "music_cue_audit.json"),
    report,
  );
  if (!report.pass)
    throw new Error(`ORVYQ music cue audit failed: ${failures.join("; ")}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMusicCueAudit()
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
