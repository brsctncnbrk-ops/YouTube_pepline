#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

export async function buildLicenseAudit(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const plan = await readJson(path.join(dir, "direction", "edit_plan.json"));
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
    });
  }

  const result = {
    schema_version: "1.0",
    project_id: projectId,
    purpose: "Final ORVYQ edit license record",
    footage,
    native_graphics: {
      count: plan.shots.filter((shot) => shot.asset_type === "graphic").length,
      license: "Original ORVYQ motion graphics authored in this repository.",
    },
    original_audio: [
      { asset: "assets/music/orvyq_ambient_bed.mp3", license: "Original procedural ORVYQ audio generated locally." },
      { asset: "assets/sfx/orvyq-pulse.wav", license: "Original procedural ORVYQ audio generated locally." },
    ],
  };
  await writeJsonAtomic(path.join(dir, "qa", "license_audit.json"), result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildLicenseAudit().then((result) => console.log(JSON.stringify({ ok: true, unique_footage_assets: result.footage.length }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
