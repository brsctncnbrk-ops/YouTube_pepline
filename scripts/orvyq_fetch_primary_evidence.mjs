#!/usr/bin/env node
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, readJson, writeJsonAtomic, pathExists } from "./lib/fs-utils.mjs";

const run = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function assertMagic(buffer, mime, assetId) {
  if (mime === "application/pdf" && buffer.subarray(0, 4).toString("ascii") !== "%PDF") throw new Error(`${assetId} did not download as a PDF`);
  if (mime === "image/png" && buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`${assetId} did not download as a PNG`);
  if (mime === "text/html") {
    const head = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("utf8").toLowerCase();
    if (!head.includes("<html") && !head.includes("<!doctype")) throw new Error(`${assetId} did not download as HTML`);
  }
}

function pngDimensions(buffer, assetId) {
  assertMagic(buffer, "image/png", assetId);
  if (buffer.length < 24) throw new Error(`${assetId} PNG header is incomplete`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function isRequired(asset) {
  return asset.required_for_full === true || asset.required_for_proof === true;
}

async function fetchBuffer(url, allowedHosts, assetId) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error(`Evidence URL must use HTTPS: ${url}`);
  if (!allowedHosts.includes(parsed.hostname)) throw new Error(`Evidence host is not allowlisted: ${parsed.hostname}`);
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(parsed, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/150 Safari/537.36 ORVYQ-primary-evidence-fetch/3.3",
          accept: "text/html,application/pdf,image/png,image/*;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (retryable && attempt < 4) {
          lastError = new Error(`HTTP ${response.status}`);
          await sleep(attempt * 1500);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const finalUrl = new URL(response.url);
      if (!allowedHosts.includes(finalUrl.hostname)) throw new Error(`redirect escaped allowlist to ${finalUrl.hostname}`);
      return { buffer: Buffer.from(await response.arrayBuffer()), final_url: finalUrl.toString(), content_type: response.headers.get("content-type") || null };
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        await sleep(attempt * 1500);
        continue;
      }
    }
  }
  throw new Error(`${assetId} evidence fetch failed after 4 attempts: ${url} (${lastError?.message || "unknown network error"})`);
}

async function resolveBrowser() {
  for (const candidate of ["google-chrome-stable", "google-chrome", "chromium-browser", "chromium"]) {
    try {
      const { stdout } = await run("bash", ["-lc", `command -v ${candidate}`]);
      const value = stdout.trim();
      if (value) return value;
    } catch {}
  }
  throw new Error("No Chromium-compatible browser is available for official webpage capture");
}

async function captureWebpage(url, output, assetId) {
  const browser = await resolveBrowser();
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "orvyq-capture-"));
  await fs.mkdir(path.dirname(output), { recursive: true });
  try {
    await run(browser, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--window-size=1920,1080",
      "--force-device-scale-factor=1",
      "--virtual-time-budget=7000",
      "--run-all-compositor-stages-before-draw",
      `--user-data-dir=${profile}`,
      `--screenshot=${output}`,
      url,
    ], { timeout: 90000, maxBuffer: 20 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${assetId} official webpage capture failed: ${url} (${error.message})`);
  } finally {
    await fs.rm(profile, { recursive: true, force: true });
  }
  if (!(await pathExists(output))) throw new Error(`Official webpage capture missing: ${assetId}`);
}

export async function fetchPrimaryEvidence(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const manifest = await readJson(path.join(dir, "research", "primary_evidence_manifest.json"));
  const allowedHosts = manifest.policy?.allowed_hosts || [];
  const downloadGroups = new Map();
  for (const asset of manifest.assets || []) {
    const existing = downloadGroups.get(asset.download_asset);
    if (existing && existing.source_url !== asset.source_url) throw new Error(`Conflicting URLs for ${asset.download_asset}`);
    downloadGroups.set(asset.download_asset, asset);
  }

  const downloadRecords = new Map();
  const failures = [];
  for (const [relativePath, asset] of downloadGroups.entries()) {
    const target = path.join(dir, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      const { buffer, final_url, content_type } = await fetchBuffer(asset.source_url, allowedHosts, asset.evidence_asset_id);
      if (buffer.length < Number(asset.min_bytes || 1)) throw new Error(`${asset.evidence_asset_id} downloaded only ${buffer.length} bytes from ${asset.source_url}`);
      assertMagic(buffer, asset.mime, asset.evidence_asset_id);
      await fs.writeFile(target, buffer);
      downloadRecords.set(relativePath, { source_url: asset.source_url, final_url, content_type, bytes: buffer.length, sha256: sha256(buffer) });
    } catch (error) {
      failures.push({
        evidence_asset_id: asset.evidence_asset_id,
        source_ids: asset.source_ids || [],
        source_url: asset.source_url,
        stage: "download",
        required: isRequired(asset),
        error: error.message,
      });
      await fs.rm(target, { force: true });
    }
  }

  const runtimeAssets = [];
  for (const asset of manifest.assets || []) {
    const download = downloadRecords.get(asset.download_asset);
    if (!download) continue;
    const rawPath = path.join(dir, asset.download_asset);
    const localPath = path.join(dir, asset.local_asset);
    try {
      if (asset.capture_type === "webpage") {
        await captureWebpage(download.final_url || asset.source_url, localPath, asset.evidence_asset_id);
      } else if (asset.mime === "application/pdf") {
        const prefix = localPath.replace(/\.png$/i, "");
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await run("pdftoppm", ["-f", String(asset.page_number), "-l", String(asset.page_number), "-singlefile", "-png", "-r", "150", rawPath, prefix], { maxBuffer: 20 * 1024 * 1024 });
      }
      if (!(await pathExists(localPath))) throw new Error(`Primary evidence output missing: ${asset.local_asset}`);
      const localBuffer = await fs.readFile(localPath);
      const dimensions = pngDimensions(localBuffer, asset.evidence_asset_id);
      if (asset.capture_type === "webpage") {
        if (localBuffer.length < 8000 || dimensions.width < 1600 || dimensions.height < 900) {
          throw new Error(`Web capture quality failed for ${asset.local_asset}: ${localBuffer.length} bytes, ${dimensions.width}x${dimensions.height}`);
        }
      } else if (localBuffer.length < 30000) {
        throw new Error(`Primary evidence output is unexpectedly small: ${asset.local_asset} (${localBuffer.length} bytes)`);
      }
      runtimeAssets.push({ evidence_asset_id: asset.evidence_asset_id, source_ids: asset.source_ids, source_url: asset.source_url, final_url: download.final_url || asset.source_url, local_asset: asset.local_asset, download_asset: asset.download_asset, page_number: asset.page_number || null, capture_type: asset.capture_type || null, provenance_mode: asset.provenance_mode, caption: asset.caption, bytes: localBuffer.length, width: dimensions.width, height: dimensions.height, sha256: sha256(localBuffer) });
    } catch (error) {
      failures.push({
        evidence_asset_id: asset.evidence_asset_id,
        source_ids: asset.source_ids || [],
        source_url: asset.source_url,
        stage: "capture",
        required: isRequired(asset),
        error: error.message,
      });
      await fs.rm(localPath, { force: true });
    }
  }

  const requiredFailures = failures.filter((failure) => failure.required);
  const runtime = {
    schema_version: "3.3-resilient-dimension-validated-web-capture",
    project_id: projectId,
    generated_at: new Date().toISOString(),
    policy: manifest.policy,
    downloads: Object.fromEntries(downloadRecords),
    assets: runtimeAssets,
    failures,
    required_failure_count: requiredFailures.length,
    optional_failure_count: failures.length - requiredFailures.length,
    pass: requiredFailures.length === 0,
  };
  await writeJsonAtomic(path.join(dir, manifest.policy.runtime_manifest), runtime);
  if (requiredFailures.length) {
    throw new Error(`Required primary evidence failed: ${requiredFailures.map((failure) => `${failure.evidence_asset_id} (${failure.error})`).join("; ")}`);
  }
  return runtime;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPrimaryEvidence().then((runtime) => console.log(JSON.stringify({ ok: true, asset_count: runtime.assets.length, optional_failure_count: runtime.optional_failure_count, required_failure_count: runtime.required_failure_count, total_bytes: runtime.assets.reduce((sum, asset) => sum + asset.bytes, 0), runtime_manifest: runtime.policy.runtime_manifest }))).catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
}
