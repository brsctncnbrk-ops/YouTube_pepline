#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function buildLicenseAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [plan, audioMetadata] = await Promise.all([
    readJson(path.join(dir, "direction", "edit_plan.json")),
    readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
  ]);
  const assets = [...new Set(plan.shots.filter((shot) => shot.asset_type === "footage").map((shot) => shot.video_asset))].sort();
  const footage = [];

  for (const asset of assets) {
    const provenance = await readJson(path.join(dir, `${asset}.provenance.json`));
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
      timeline_uses: plan.shots.filter((shot) => shot.asset_type === "footage" && shot.video_asset === asset).length,
    });
  }

  const audio = [
    {
      asset: audioMetadata.voice_source,
      role: "narration source",
      license: "User-supplied/commissioned narrator audio for this ORVYQ production.",
      repair: audioMetadata.voice_repair || null,
    },
    {
      asset: audioMetadata.mix_asset,
      role: "final audio mix",
      license: "Derived locally from the approved narration and, only when present, an approved licensed music bed.",
    },
  ];
  if (audioMetadata.music_asset) {
    audio.push({
      asset: audioMetadata.music_asset,
      role: "music bed",
      license: "User-approved licensed music bed; licensing evidence must accompany the asset before final publication.",
    });
  }

  const result = {
    schema_version: "2.0",
    project_id: projectId,
    purpose: plan.preview ? "Two-minute ORVYQ quality-control license record" : "Final ORVYQ edit license record",
    footage,
    maximum_source_uses: Math.max(0, ...footage.map((item) => item.timeline_uses)),
    source_use_limit: plan.quality_policy?.max_uses_per_source ?? 2,
    native_graphics: {
      count: plan.shots.filter((shot) => shot.asset_type === "graphic").length,
      license: "Original ORVYQ editorial graphics authored in this repository; no fabricated datasets are represented as factual charts.",
    },
    audio,
    procedural_noise_generation: audioMetadata.procedural_noise_generation,
    procedural_sfx_count: (audioMetadata.sfx_assets || []).length,
  };

  if (result.maximum_source_uses > result.source_use_limit) {
    throw new Error(`Footage source-use limit exceeded: ${result.maximum_source_uses} > ${result.source_use_limit}`);
  }
  if (result.procedural_noise_generation !== false || result.procedural_sfx_count !== 0) {
    throw new Error("Unapproved procedural noise or SFX remains in the audio manifest");
  }

  await writeJsonAtomic(path.join(dir, "qa", "license_audit.json"), result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildLicenseAudit().then((result) => console.log(JSON.stringify({
    ok: true,
    unique_footage_assets: result.footage.length,
    maximum_source_uses: result.maximum_source_uses,
    procedural_noise_generation: result.procedural_noise_generation,
  }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
