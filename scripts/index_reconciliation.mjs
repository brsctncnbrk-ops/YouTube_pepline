import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import {
  INDEX_PATH,
  PROJECTS_DIR,
  pathExists,
  readJson,
  writeJsonAtomic,
  CliError,
} from "./lib/fs-utils.mjs";
import { STAGE_ORDER } from "./lib/pipeline.mjs";

const DERIVED_FIELDS = ["name", "status", "current_stage"];
const VALID_STATUSES = new Set([
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_FOR_ASSETS",
  "WAITING_FOR_AUDIO",
  "ERROR",
  "DONE",
  "READY_FOR_RENDER",
  "RENDER_DONE",
]);

export function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function readJsonWithSha(filePath) {
  const raw = await readText(filePath);
  return { data: JSON.parse(raw), raw, sha256: sha256Text(raw) };
}

function manifestPath(projectsDir, projectId) {
  return path.join(projectsDir, projectId, "manifest.json");
}

function validateIndex(index) {
  if (!index || !Array.isArray(index.projects)) {
    throw new CliError("projects/_index.json must contain a projects array", "INVALID_JSON");
  }
  const seen = new Set();
  for (const record of index.projects) {
    if (!record || typeof record.id !== "string" || !record.id) {
      throw new CliError("Every index project record must have a non-empty string id", "INVALID_JSON");
    }
    if (seen.has(record.id)) {
      throw new CliError(`Duplicate project id in index: ${record.id}`, "INVALID_JSON");
    }
    seen.add(record.id);
  }
}

function validateManifest(manifest, projectId) {
  if (!manifest || manifest.project_id !== projectId) {
    throw new CliError(`Manifest project_id mismatch for ${projectId}`, "INVALID_JSON");
  }
  if (typeof manifest.project_name !== "string" || !manifest.project_name) {
    throw new CliError(`Manifest project_name missing for ${projectId}`, "INVALID_JSON");
  }
  if (!VALID_STATUSES.has(manifest.status)) {
    throw new CliError(`Manifest status is invalid for ${projectId}: ${manifest.status}`, "INVALID_JSON");
  }
  if (manifest.current_stage !== null && !STAGE_ORDER.includes(manifest.current_stage)) {
    throw new CliError(`Manifest current_stage is invalid for ${projectId}: ${manifest.current_stage}`, "INVALID_JSON");
  }
  if (!Array.isArray(manifest.completed_skills)) {
    throw new CliError(`Manifest completed_skills must be an array for ${projectId}`, "INVALID_JSON");
  }
  if (manifest.current_stage && manifest.completed_skills.includes(manifest.current_stage)) {
    throw new CliError(
      `Manifest current_stage ${manifest.current_stage} is also completed for ${projectId}`,
      "INVALID_JSON"
    );
  }
  if (!Array.isArray(manifest.errors)) {
    throw new CliError(`Manifest errors must be an array for ${projectId}`, "INVALID_JSON");
  }
}

function derivedRecordFields(manifest) {
  return {
    name: manifest.project_name,
    status: manifest.status,
    current_stage: manifest.current_stage,
  };
}

async function loadManifestForIndex(projectsDir, projectId) {
  const filePath = manifestPath(projectsDir, projectId);
  if (!(await pathExists(filePath))) {
    throw new CliError(`Manifest missing for index project ${projectId}: ${filePath}`, "UNKNOWN_ERROR");
  }
  const { data, sha256 } = await readJsonWithSha(filePath);
  validateManifest(data, projectId);
  return { manifest: data, sha256, path: filePath };
}

export async function reconcileProjectIndex({
  projectId = null,
  apply = false,
  indexPath = INDEX_PATH,
  projectsDir = PROJECTS_DIR,
  expectedIndexSha = null,
} = {}) {
  const before = await readJsonWithSha(indexPath);
  const index = before.data;
  validateIndex(index);

  const targets = projectId ? index.projects.filter((p) => p.id === projectId) : index.projects;
  if (projectId && targets.length !== 1) {
    throw new CliError(`Project ${projectId} must exist exactly once in index`, "UNKNOWN_ERROR");
  }

  const nextIndex = JSON.parse(JSON.stringify(index));
  const manifestShas = {};
  const drifts = [];

  for (const record of nextIndex.projects) {
    if (projectId && record.id !== projectId) continue;
    const { manifest, sha256 } = await loadManifestForIndex(projectsDir, record.id);
    manifestShas[record.id] = sha256;
    const derived = derivedRecordFields(manifest);
    for (const field of DERIVED_FIELDS) {
      const indexValue = record[field] ?? null;
      const manifestValue = derived[field] ?? null;
      if (indexValue !== manifestValue) {
        drifts.push({ project_id: record.id, field, index: indexValue, manifest: manifestValue });
        if (apply) record[field] = manifestValue;
      }
    }
  }

  const afterRaw = JSON.stringify(nextIndex, null, 2) + "\n";
  const afterSha = sha256Text(afterRaw);
  let wrote = false;

  if (apply && afterSha !== before.sha256) {
    const currentRaw = await readText(indexPath);
    const currentSha = sha256Text(currentRaw);
    if (expectedIndexSha && expectedIndexSha !== before.sha256) {
      throw new CliError("Provided expected index SHA does not match initial read", "UNKNOWN_ERROR");
    }
    if (currentSha !== before.sha256) {
      throw new CliError("Index changed during reconciliation; refusing stale overwrite", "UNKNOWN_ERROR");
    }
    const stat = await fs.stat(indexPath);
    await writeJsonAtomic(indexPath, nextIndex);
    await fs.chmod(indexPath, stat.mode & 0o777);
    try {
      await fs.chown(indexPath, stat.uid, stat.gid);
    } catch {
      // Non-root fixture runs may not be able to chown; ignore after chmod.
    }
    wrote = true;
  }

  return {
    mode: apply ? "apply" : "check",
    project_id: projectId,
    derived_fields: DERIVED_FIELDS,
    drift_count: drifts.length,
    drifts,
    wrote,
    index_sha_before: before.sha256,
    index_sha_after: apply ? afterSha : before.sha256,
    manifest_shas: manifestShas,
  };
}
