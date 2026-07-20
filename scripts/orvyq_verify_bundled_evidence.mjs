#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { projectDir, readJson, pathExists, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const dimensions = (buffer, id) => {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || buffer.length < 24) {
    throw new Error(`${id} is not a valid PNG`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

export async function verifyBundledEvidence(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [manifest, runtime, plan, bundle] = await Promise.all([
    readJson(path.join(dir, "research", "primary_evidence_manifest.json")),
    readJson(path.join(dir, "assets", "evidence", "primary_evidence.runtime.json")),
    readJson(path.join(dir, "direction", "production_plan.json")),
    readJson(path.join(dir, "qa", "full_render_evidence_bundle.json")),
  ]);
  if (manifest.policy?.deterministic_full_render_bundle_required !== true || bundle.pass !== true) {
    throw new Error("Deterministic evidence bundle is not enabled");
  }

  const usedIds = new Set(
    (plan.shots || []).flatMap((shot) => shot.evidence?.evidence_asset_ids || []),
  );
  const bundleIds = (bundle.assets || []).map((asset) => asset.evidence_asset_id);
  if (!bundleIds.length) throw new Error("Deterministic evidence bundle is empty");
  for (const usedId of usedIds) {
    if (!bundleIds.includes(usedId)) throw new Error(`${usedId} is used by the plan but absent from the deterministic bundle`);
  }

  const declared = new Map(
    (manifest.assets || []).map((asset) => [asset.evidence_asset_id, asset]),
  );
  const produced = new Map(
    (runtime.assets || []).map((asset) => [asset.evidence_asset_id, asset]),
  );
  const bundled = new Map(
    (bundle.assets || []).map((asset) => [asset.evidence_asset_id, asset]),
  );
  const verified = [];

  for (const id of bundleIds) {
    const a = declared.get(id);
    const r = produced.get(id);
    const b = bundled.get(id);
    if (!a || !r || !b) throw new Error(`${id} is missing from the bundle contract`);
    if (a.required_for_full !== true || a.deterministic_full_render_bundle !== true) {
      throw new Error(`${id} is not required and bundled`);
    }
    const file = path.join(dir, a.local_asset);
    if (!(await pathExists(file))) throw new Error(`${id} file is missing: ${a.local_asset}`);
    const buffer = await fs.readFile(file);
    const size = dimensions(buffer, id);
    const digest = sha256(buffer);
    if (digest !== a.bundled_sha256 || digest !== r.sha256 || digest !== b.sha256) {
      throw new Error(`${id} SHA-256 mismatch`);
    }
    if (
      buffer.length !== Number(a.bundled_bytes) ||
      buffer.length !== Number(r.bytes) ||
      buffer.length !== Number(b.bytes)
    ) {
      throw new Error(`${id} byte-size mismatch`);
    }
    if (
      size.width !== Number(a.bundled_width) ||
      size.height !== Number(a.bundled_height) ||
      size.width < 1200 ||
      size.height < 675
    ) {
      throw new Error(`${id} dimension mismatch`);
    }
    verified.push({
      evidence_asset_id: id,
      local_asset: a.local_asset,
      sha256: digest,
      bytes: buffer.length,
      used_in_plan: usedIds.has(id),
      ...size,
    });
  }

  const report = {
    schema_version: "1.1-bundled-evidence-verification",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    used_asset_count: usedIds.size,
    bundled_asset_count: bundleIds.length,
    verified_asset_count: verified.length,
    live_network_used: false,
    assets: verified,
    pass: verified.length === bundleIds.length,
  };
  await writeJsonAtomic(
    path.join(dir, "qa", "bundled_evidence_verification.json"),
    report,
  );
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyBundledEvidence(process.argv[2] || PROJECT_ID)
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
