#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic, pathExists } from "./lib/fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export async function buildLicenseAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, audioMetadata, evidenceMap] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
    loadResolvedEvidenceMap(dir),
  ]);

  const sourceById = new Map(evidenceMap.source_catalog.map((source) => [source.source_id, source]));
  const assets = unique(plan.shots.filter((shot) => shot.asset_type === "footage").map((shot) => shot.video_asset)).sort();
  const footage = [];

  for (const asset of assets) {
    const provenancePath = path.join(dir, `${asset}.provenance.json`);
    if (!(await pathExists(provenancePath))) throw new Error(`Missing provenance file for ${asset}`);
    const provenance = await readJson(provenancePath);
    if (!provenance.license_url) throw new Error(`Missing official license URL for ${asset}`);
    if (!provenance.approved_for_final_edit) throw new Error(`Asset not approved for final edit: ${asset}`);
    footage.push({
      asset,
      provider: provenance.provider,
      provider_asset_id: provenance.provider_asset_id,
      source_page_url: provenance.source_page_url,
      license_url: provenance.license_url,
      creator: provenance.creator || null,
      approved_for_final_edit: true,
      visual_roles: unique(plan.shots.filter((shot) => shot.video_asset === asset).map((shot) => shot.visual_role)),
      claim_ids: unique(plan.shots.filter((shot) => shot.video_asset === asset).map((shot) => shot.claim_id)),
      timeline_uses: plan.shots.filter((shot) => shot.asset_type === "footage" && shot.video_asset === asset).length,
    });
  }

  const usedEvidenceSourceIds = unique(plan.shots.flatMap((shot) => shot.editorial_overlay?.source_ids || []));
  const evidenceSources = usedEvidenceSourceIds.map((sourceId) => {
    const source = sourceById.get(sourceId);
    if (!source) throw new Error(`Unknown evidence source in edit plan: ${sourceId}`);
    if (!source.official || !source.url || !source.publisher || !source.title) throw new Error(`Evidence source ${sourceId} is incomplete or not authoritative`);
    const relatedShots = plan.shots.filter((shot) => (shot.editorial_overlay?.source_ids || []).includes(sourceId));
    return {
      source_id: sourceId,
      publisher: source.publisher,
      title: source.title,
      publication_date: source.publication_date || null,
      source_url: source.url,
      source_type: source.source_type,
      official: true,
      usage_mode: relatedShots.some((shot) => shot.editorial_overlay?.recreation_label) ? "labelled ORVYQ recreation/summary" : "source-attributed editorial context",
      claim_ids: unique(relatedShots.map((shot) => shot.claim_id)),
      shot_ids: relatedShots.map((shot) => shot.shot_id),
      limitation: source.limitation || null,
    };
  });

  const audio = [
    { asset: audioMetadata.voice_source, role: "narration source", license: "User-supplied/commissioned narrator audio for this ORVYQ production.", repair: audioMetadata.voice_repair || null },
    { asset: audioMetadata.mix_asset, role: "final audio mix", license: "Derived locally from the approved narration and declared music structure." },
  ];
  if (audioMetadata.music_asset) {
    const originalScore = audioMetadata.music_profile === "original_tonal_score";
    audio.push({
      asset: audioMetadata.music_asset,
      role: "music bed",
      profile: audioMetadata.music_profile,
      origin: audioMetadata.music_origin || null,
      sections: audioMetadata.music_sections || [],
      license: originalScore
        ? "Original ORVYQ score generated locally from harmonic oscillators; no third-party recording or noise source is used."
        : "User-approved licensed music bed; licensing evidence must accompany the asset before final publication.",
    });
  }

  const result = {
    schema_version: "4.1",
    project_id: projectId,
    resolved_evidence_schema: evidenceMap.schema_version,
    purpose: plan.preview ? "Two-minute ORVYQ evidence-led proof license record" : "Final ORVYQ evidence-led edit license record",
    footage,
    evidence_sources: evidenceSources,
    maximum_source_uses: Math.max(0, ...footage.map((item) => item.timeline_uses)),
    source_use_limit: plan.quality_policy?.max_uses_per_source ?? 2,
    native_graphics: {
      full_screen_count: plan.shots.filter((shot) => shot.asset_type === "graphic").length,
      overlay_count: plan.shots.filter((shot) => shot.editorial_overlay).length,
      license: "Original ORVYQ editorial graphics and clearly labelled source reconstructions authored in this repository; no fabricated dataset is represented as a factual chart.",
    },
    audio,
    procedural_noise_generation: audioMetadata.procedural_noise_generation,
    procedural_sfx_count: (audioMetadata.sfx_assets || []).length,
  };

  if (result.maximum_source_uses > result.source_use_limit) throw new Error(`Footage source-use limit exceeded: ${result.maximum_source_uses} > ${result.source_use_limit}`);
  if (result.procedural_noise_generation !== false || result.procedural_sfx_count !== 0) throw new Error("Unapproved procedural noise or SFX remains in the audio manifest");
  if (!["original_tonal_score", "approved_licensed_bed"].includes(audioMetadata.music_profile)) throw new Error(`Unapproved music profile: ${audioMetadata.music_profile}`);
  if (plan.shots.some((shot) => shot.editorial_overlay?.source_ids?.length) && !evidenceSources.length) throw new Error("Sourced overlays exist but no evidence sources were recorded");

  await writeJsonAtomic(path.join(dir, "qa", "license_audit.json"), result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildLicenseAudit().then((result) => console.log(JSON.stringify({
    ok: true,
    unique_footage_assets: result.footage.length,
    evidence_sources: result.evidence_sources.length,
    maximum_source_uses: result.maximum_source_uses,
    music_profile: result.audio.find((item) => item.role === "music bed")?.profile || null,
  }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
