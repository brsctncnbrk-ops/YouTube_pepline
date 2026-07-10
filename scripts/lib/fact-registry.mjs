/**
 * Shared, repo-root fact registry used by factforge-fact-audit. Append-only:
 * each verification is a new JSONL line, never an in-place edit, so
 * concurrent Claude Code sessions verifying different claims never overwrite
 * each other's writes (one file per claim, keyed by a hash of the normalized
 * claim text). re_verify_after is category-based and expired entries must
 * trigger fresh verification - "expired" is the default, not "always valid."
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REPO_ROOT, pathExists, appendLine } from "./fs-utils.mjs";
import { SCHEMA_VERSION } from "./pipeline.mjs";

export const FACT_REGISTRY_DIR = path.join(REPO_ROOT, "fact_registry");

/** Months added to verified_date to compute re_verify_after, by claim category. */
export const RE_VERIFY_MONTHS = {
  health: 6,
  psychological: 6,
  scientific: 6,
  statistical: 12,
  named: 12,
  other: 18,
};

export function normalizeClaim(claimText) {
  return claimText.toLowerCase().trim().replace(/\s+/g, " ");
}

export function hashClaim(claimText) {
  return crypto.createHash("sha256").update(normalizeClaim(claimText)).digest("hex").slice(0, 16);
}

function registryFile(claimText) {
  return path.join(FACT_REGISTRY_DIR, `${hashClaim(claimText)}.jsonl`);
}

export function addMonths(isoDate, months) {
  const d = new Date(isoDate);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

/**
 * Reads the last line of a claim's registry file (current state) and applies
 * the expiry check. Returns null if the claim has never been verified.
 */
export async function lookupClaim(claimText) {
  const file = registryFile(claimText);
  if (!(await pathExists(file))) return null;

  const raw = await fs.readFile(file, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  const last = JSON.parse(lines[lines.length - 1]);
  const now = new Date();
  const expired = new Date(last.re_verify_after) < now;
  const fresh = last.verdict === "verified" && !expired;

  return { ...last, expired, registryHit: fresh };
}

/**
 * Appends a new verification line. Never mutates prior lines - the claim's
 * full verification history is preserved for audit purposes.
 */
export async function appendVerification(claimText, { category, verdict, sources, verifiedByProject, notes }) {
  const verifiedDate = new Date().toISOString();
  const months = RE_VERIFY_MONTHS[category] ?? RE_VERIFY_MONTHS.other;
  const entry = {
    schema_version: SCHEMA_VERSION,
    claim_text: claimText,
    category,
    verdict,
    sources: sources || [],
    verified_date: verifiedDate,
    re_verify_after: addMonths(verifiedDate, months),
    verified_by_project: verifiedByProject,
    notes: notes || "",
  };
  await appendLine(registryFile(claimText), JSON.stringify(entry));
  return entry;
}
