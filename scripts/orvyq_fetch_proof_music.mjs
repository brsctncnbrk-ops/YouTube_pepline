#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectDir, writeJsonAtomic } from "./lib/fs-utils.mjs";

const exec = promisify(execFile);
const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const SOURCE_PAGE = "https://www.scottbuckley.com.au/library/signal-to-noise/";
const DOWNLOAD_URL = "https://www.scottbuckley.com.au/library/wp-content/uploads/2020/04/sb_signaltonoise.mp3";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const ATTRIBUTION = "‘Signal to Noise’ by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au";

async function durationSeconds(file) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=nk=1:nw=1", file,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration < 150)
    throw new Error(`Approved music must cover the proof without looping; got ${duration}s`);
  return duration;
}

export async function fetchProofMusic(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const musicDir = path.join(dir, "assets", "music");
  const output = path.join(musicDir, "approved_bed.mp3");
  const temporary = `${output}.download`;
  await fs.mkdir(musicDir, { recursive: true });
  const response = await fetch(DOWNLOAD_URL, {
    redirect: "follow",
    headers: {
      "User-Agent": "ORVYQ documentary proof renderer/1.0",
      Referer: SOURCE_PAGE,
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.5",
    },
  });
  if (!response.ok)
    throw new Error(`Music download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100_000)
    throw new Error(`Music download is unexpectedly small: ${bytes.length} bytes`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const expectedSha = process.env.ORVYQ_APPROVED_MUSIC_SHA256?.trim().toLowerCase();
  if (expectedSha && sha256 !== expectedSha)
    throw new Error(`Approved music hash mismatch: ${sha256}`);
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, output);
  const duration = await durationSeconds(output);
  const provenance = {
    schema_version: "1.0",
    asset: "assets/music/approved_bed.mp3",
    title: "Signal to Noise",
    composer: "Scott Buckley",
    source_page_url: SOURCE_PAGE,
    download_url: DOWNLOAD_URL,
    license: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    license_url: LICENSE_URL,
    attribution: ATTRIBUTION,
    approved_for_final_edit: true,
    sha256,
    bytes: bytes.length,
    duration_seconds: Math.round(duration * 1000) / 1000,
    fetched_at: new Date().toISOString(),
    reproducibility: expectedSha ? "sha256_pinned" : "runtime_sha256_recorded",
  };
  await writeJsonAtomic(
    path.join(musicDir, "approved_bed.provenance.json"),
    provenance,
  );
  return provenance;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchProofMusic()
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
