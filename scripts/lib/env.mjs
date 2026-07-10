/**
 * Loads repo-root .env for the free-tier footage API keys
 * (PEXELS_API_KEY, PIXABAY_API_KEY, COVERR_API_KEY). Footage search/
 * selection happens locally in Claude Code, never in GitHub Actions, so
 * these keys are only ever needed on this machine.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./fs-utils.mjs";

let loaded = false;

export async function loadEnv() {
  if (loaded) return;
  loaded = true;
  const envPath = path.join(REPO_ROOT, ".env");
  let raw;
  try {
    raw = await fs.readFile(envPath, "utf8");
  } catch {
    return; // no .env yet - fine until a footage_retrieval run actually needs a key
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

export async function getApiKey(name) {
  await loadEnv();
  return process.env[name] || null;
}
