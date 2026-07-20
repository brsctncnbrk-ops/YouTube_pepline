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
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";
import { auditMotionHook } from "./lib/orvyq-motion-hook.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const unique = (values) => [...new Set(values.filter(Boolean))];

async function sha256(file) {
  const bytes = await fs.readFile(file);
  return createHash("sha256").update(bytes).digest("hex");
}

export async function buildLicenseAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, audioMetadata, evidenceMap, primaryManifest, runtime] =
    await Promise.all([
      readJson(path.join(dir, "direction", "edit_plan.json")),
      readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
      loadResolvedEvidenceMap(dir),
      readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
      readJson(
        path.join(dir, "assets", "evidence", "primary_evidence.runtime.json"),
      ),
    ]);
  const sourceById = new Map(
    evidenceMap.source_catalog.map((source) => [source.source_id, source]),
  );
  const declaredById = new Map(
    primaryManifest.assets.map((asset) => [asset.evidence_asset_id, asset]),
  );
  const runtimeById = new Map(
    runtime.assets.map((asset) => [asset.evidence_asset_id, asset]),
  );
  const evidenceSourceIds = unique(
    plan.shots.flatMap((shot) => [
      ...(shot.evidence?.source_ids || []),
      ...(shot.graphic?.source_ids || []),
      ...(shot.editorial_overlay?.source_ids || []),
    ]),
  );
  const evidenceSources = evidenceSourceIds.map((sourceId) => {
    const source = sourceById.get(sourceId);
    if (
      !source ||
      !source.official ||
      !source.url ||
      !source.publisher ||
      !source.title
    )
      throw new Error(`Evidence source ${sourceId} is incomplete`);
    const related = plan.shots.filter((shot) =>
      [
        ...(shot.evidence?.source_ids || []),
        ...(shot.graphic?.source_ids || []),
        ...(shot.editorial_overlay?.source_ids || []),
      ].includes(sourceId),
    );
    return {
      source_id: sourceId,
      publisher: source.publisher,
      title: source.title,
      publication_date: source.publication_date || null,
      source_url: source.url,
      official: true,
      claim_ids: unique(related.map((shot) => shot.claim_id)),
      shot_ids: related.map((shot) => shot.shot_id),
      limitation: source.limitation || null,
    };
  });

  const captures = [];
  const usage = new Map();
  for (const shot of plan.shots.filter(
    (item) => item.asset_type === "evidence",
  )) {
    for (const assetId of shot.evidence?.evidence_asset_ids || []) {
      const declared = declaredById.get(assetId);
      const produced = runtimeById.get(assetId);
      if (!declared || !produced)
        throw new Error(`Missing primary evidence provenance for ${assetId}`);
      usage.set(assetId, (usage.get(assetId) || 0) + 1);
      if (!captures.some((item) => item.evidence_asset_id === assetId)) {
        captures.push({
          evidence_asset_id: assetId,
          local_asset: produced.local_asset,
          sha256: produced.sha256,
          bytes: produced.bytes,
          source_url: produced.source_url,
          source_ids: declared.source_ids,
          provenance_mode: "official_primary_capture",
          editorial_basis:
            "Official source capture with visible attribution for documentary analysis; provenance record, not a legal opinion.",
        });
      }
    }
  }
  const derivedEvidence = plan.shots
    .filter(
      (shot) =>
        shot.asset_type === "evidence" &&
        !(shot.evidence?.evidence_asset_ids || []).length,
    )
    .map((shot) => ({
      shot_id: shot.shot_id,
      kind: shot.evidence.kind,
      title: shot.evidence.title,
      source_ids: shot.evidence.source_ids,
      source_label: shot.evidence.source_label,
      provenance_mode: "source_derived_graphic",
      limitation: shot.evidence.limitation || null,
    }));
  const derivedGraphics = plan.shots
    .filter(
      (shot) =>
        shot.asset_type === "graphic" &&
        shot.graphic?.source_backed === true &&
        shot.graphic?.provenance_mode === "source_derived_graphic",
    )
    .map((shot) => ({
      shot_id: shot.shot_id,
      kind: shot.graphic.type,
      title: shot.graphic.title,
      source_ids: shot.graphic.source_ids,
      source_label: shot.graphic.source,
      provenance_mode: "source_derived_graphic",
      limitation: null,
    }));
  const derived = [...derivedEvidence, ...derivedGraphics];

  const footageAssets = unique(
    plan.shots
      .filter((shot) => shot.asset_type === "footage")
      .map((shot) => shot.video_asset),
  );
  const footage = [];
  for (const asset of footageAssets) {
    const provenancePath = path.join(dir, `${asset}.provenance.json`);
    if (!(await pathExists(provenancePath)))
      throw new Error(`Missing provenance for ${asset}`);
    const provenance = await readJson(provenancePath);
    if (!provenance.license_url || !provenance.approved_for_final_edit)
      throw new Error(`Footage is not approved: ${asset}`);
    footage.push({
      asset,
      provider: provenance.provider,
      provider_asset_id: provenance.provider_asset_id,
      source_page_url: provenance.source_page_url,
      license_url: provenance.license_url,
      timeline_uses: plan.shots.filter((shot) => shot.video_asset === asset)
        .length,
    });
  }
  const motionHook = auditMotionHook(plan);
  if (plan.preview && !motionHook.pass)
    throw new Error(
      `Motion-hook provenance failed: ${motionHook.failures.join("; ")}`,
    );

  const audio = [
    {
      asset: audioMetadata.voice_source,
      role: "narration source",
      license: "User-supplied/commissioned narrator audio.",
    },
    {
      asset: audioMetadata.mix_asset,
      role: "final audio mix",
      license:
        "Derived locally from approved narration, licensed music, and repository-authored SFX.",
    },
  ];
  if (audioMetadata.music_asset) {
    audio.push({
      asset: audioMetadata.music_asset,
      role: "music bed",
      profile: audioMetadata.music_profile,
      sections: audioMetadata.music_sections || [],
      license:
        audioMetadata.music_profile === "original_tonal_score"
          ? "Original ORVYQ tonal score generated locally; no third-party recording."
          : audioMetadata.music_attribution ||
            "Approved licensed bed; evidence required.",
    });
  }
  let musicProvenance = null;
  if (audioMetadata.music_profile === "approved_licensed_bed") {
    if (!audioMetadata.music_provenance)
      throw new Error("Approved music does not declare a provenance record");
    const provenancePath = path.join(dir, audioMetadata.music_provenance);
    if (!(await pathExists(provenancePath)))
      throw new Error("Approved music provenance file is missing");
    musicProvenance = await readJson(provenancePath);
    if (
      musicProvenance.asset !== audioMetadata.music_asset ||
      musicProvenance.approved_for_final_edit !== true ||
      !String(musicProvenance.license_url || "").includes("/licenses/by/4.0") ||
      !musicProvenance.attribution
    )
      throw new Error("Approved music provenance is incomplete");
    const actualMusicHash = await sha256(
      path.join(dir, audioMetadata.music_asset),
    );
    if (actualMusicHash !== musicProvenance.sha256)
      throw new Error(
        "Approved music SHA-256 does not match its provenance record",
      );
  }

  const hasApprovedContextualFootage = plan.shots.some(
    (shot) =>
      shot.asset_type === "footage" &&
      shot.contextual_footage === true &&
      shot.provenance_mode === "approved_contextual_footage",
  );
  const cinematicProof =
    plan.preview &&
    (plan.quality_policy?.cinematic_body_footage === true ||
      hasApprovedContextualFootage);
  const soundDesignRequired =
    plan.quality_policy?.require_sound_design_sfx === true || cinematicProof;
  const minimumSfxTypes = Number(
    plan.quality_policy?.minimum_original_sfx_types || 3,
  );
  const declaredProvenance = new Set(audioMetadata.sfx_provenance || []);
  const soundEffects = [];
  for (const asset of audioMetadata.sfx_assets || []) {
    const absolute = path.join(dir, asset);
    if (!(await pathExists(absolute)))
      throw new Error(`Declared SFX is missing: ${asset}`);
    const provenanceRelative = `${asset}.provenance.json`;
    if (!declaredProvenance.has(provenanceRelative))
      throw new Error(`Declared SFX provenance is not bound in metadata: ${asset}`);
    const provenancePath = path.join(dir, provenanceRelative);
    if (!(await pathExists(provenancePath)))
      throw new Error(`Declared SFX provenance is missing: ${provenanceRelative}`);
    const provenance = await readJson(provenancePath);
    const actualHash = await sha256(absolute);
    if (
      provenance.asset !== asset ||
      provenance.origin !== "original_synthesized_sfx" ||
      provenance.approved_for_final_edit !== true ||
      provenance.procedural_noise_generation !== false ||
      provenance.generated_by !== "scripts/orvyq_audio_mix.mjs" ||
      !provenance.deterministic_recipe ||
      provenance.sha256 !== actualHash
    )
      throw new Error(`Original SFX provenance is incomplete or stale: ${asset}`);
    soundEffects.push({
      asset,
      provenance: provenanceRelative,
      sha256: actualHash,
      origin: provenance.origin,
      synthesis_version: provenance.synthesis_version,
      deterministic_recipe: provenance.deterministic_recipe,
      license: provenance.license,
      approved_for_final_edit: true,
      placements: (audioMetadata.sfx_placements || []).filter(
        (placement) => placement.asset === asset,
      ),
    });
  }

  const maximum = Math.max(0, ...usage.values());
  const result = {
    schema_version: "7.0-canonical-full-film-audio-provenance",
    project_id: projectId,
    preview: Boolean(plan.preview),
    purpose:
      "Editorial provenance and attribution record; not a legal clearance opinion.",
    official_primary_captures: captures,
    source_derived_graphics: derived,
    evidence_sources: evidenceSources,
    footage,
    motion_hook: motionHook,
    maximum_primary_capture_uses: maximum,
    source_use_limit: plan.quality_policy?.max_uses_per_source ?? 2,
    audio,
    music_provenance: musicProvenance,
    sound_design_required: soundDesignRequired,
    minimum_original_sfx_types: minimumSfxTypes,
    sound_effects: soundEffects,
    procedural_noise_generation: audioMetadata.procedural_noise_generation,
    procedural_sfx_count: (audioMetadata.sfx_assets || []).length,
    sfx_origin: audioMetadata.sfx_origin || null,
    pass: true,
  };
  if (maximum > result.source_use_limit)
    throw new Error(`Primary capture use limit exceeded: ${maximum}`);
  if (result.procedural_noise_generation !== false)
    throw new Error("Unapproved procedural noise remains");
  if (soundDesignRequired) {
    if (result.sfx_origin !== "original_synthesized_sfx")
      throw new Error("Required sound design is not original synthesized SFX");
    if (result.procedural_sfx_count < minimumSfxTypes)
      throw new Error(
        `Required sound design has ${result.procedural_sfx_count} SFX types; ${minimumSfxTypes} required`,
      );
    if (soundEffects.length !== result.procedural_sfx_count)
      throw new Error("Not every required SFX asset has approved provenance");
  } else if (result.procedural_sfx_count > 0) {
    throw new Error("SFX assets are present without an explicit sound-design contract");
  }
  await writeJsonAtomic(path.join(dir, "qa", "license_audit.json"), result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildLicenseAudit()
    .then((result) =>
      console.log(
        JSON.stringify({
          ok: true,
          official_captures: result.official_primary_captures.length,
          source_derived_graphics: result.source_derived_graphics.length,
          footage: result.footage.length,
          sound_effects: result.sound_effects.length,
          maximum_primary_capture_uses: result.maximum_primary_capture_uses,
        }),
      ),
    )
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
