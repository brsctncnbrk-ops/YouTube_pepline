#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const slug = (value) => String(value || "source").toLowerCase().replace(/^src_/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export async function expandPrimaryEvidenceManifest(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const manifestPath = path.join(dir, "research", "primary_evidence_manifest.json");
  const [manifest, evidenceMap] = await Promise.all([
    readJson(manifestPath),
    loadResolvedEvidenceMap(dir),
  ]);
  const representedSources = new Set((manifest.assets || []).flatMap((asset) => asset.source_ids || []));
  const assetIds = new Set((manifest.assets || []).map((asset) => asset.evidence_asset_id));
  const added = [];
  for (const source of evidenceMap.source_catalog || []) {
    if (source.official !== true || representedSources.has(source.source_id) || !source.url) continue;
    const parsed = new URL(source.url);
    if (parsed.protocol !== "https:") continue;
    const sourceSlug = slug(source.source_id);
    let evidenceAssetId = `EVID_WEB_${sourceSlug.toUpperCase()}`;
    let ordinal = 2;
    while (assetIds.has(evidenceAssetId)) evidenceAssetId = `EVID_WEB_${sourceSlug.toUpperCase()}_${ordinal++}`;
    const asset = {
      evidence_asset_id: evidenceAssetId,
      source_ids: [source.source_id],
      source_url: source.url,
      download_asset: `assets/evidence/raw/${sourceSlug}.html`,
      local_asset: `assets/evidence/${sourceSlug}.png`,
      mime: "text/html",
      min_bytes: 1200,
      capture_type: "webpage",
      provenance_mode: "official_primary_capture",
      required_for_full: true,
      caption: `${source.publisher} — ${source.title}${source.publication_date ? ` (${source.publication_date})` : ""}`,
    };
    manifest.assets.push(asset);
    representedSources.add(source.source_id);
    assetIds.add(evidenceAssetId);
    added.push(asset);
    manifest.policy.allowed_hosts = [...new Set([...(manifest.policy.allowed_hosts || []), parsed.hostname])].sort();
  }
  manifest.schema_version = "2.2-full-film-official-capture";
  manifest.policy.full_film_official_capture_required = true;
  manifest.policy.minimum_official_capture_fraction = 0.3;
  manifest.policy.maximum_uninterrupted_evidence_seconds = 16;
  await writeJsonAtomic(manifestPath, manifest);
  return { project_id: projectId, added_count: added.length, total_assets: manifest.assets.length, allowed_hosts: manifest.policy.allowed_hosts, added_assets: added.map((asset) => ({ evidence_asset_id: asset.evidence_asset_id, source_ids: asset.source_ids, local_asset: asset.local_asset })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  expandPrimaryEvidenceManifest(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
}
