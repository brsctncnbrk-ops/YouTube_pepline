#!/usr/bin/env node
/**
 * Stamps out a new projects/<project_id>/ directory from templates/project/,
 * pins it to the current schema versions, fills config files, writes the
 * initial manifest.json, and registers the project in projects/_index.json.
 *
 * Usable as a library (import { scaffoldProject }) or standalone CLI.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  PROJECTS_DIR,
  TEMPLATES_DIR,
  SCHEMAS_DIR,
  INDEX_PATH,
  projectDir,
  pathExists,
  readJsonSafe,
  writeJsonAtomic,
  copyDir,
  nowIso,
  parseArgs,
  printJson,
  CliError,
} from "./lib/fs-utils.mjs";
import { STAGE_ORDER } from "./lib/pipeline.mjs";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "video";
}

async function loadIndex() {
  return readJsonSafe(INDEX_PATH, { next_id: 1, projects: [] });
}

async function saveIndex(index) {
  await writeJsonAtomic(INDEX_PATH, index);
}

function fillTemplate(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new CliError(`Missing template var ${key}`, "UNKNOWN_ERROR");
    return vars[key];
  });
}

async function fillConfigFiles(destDir, vars) {
  const configDir = path.join(destDir, "config");
  const files = await fs.readdir(configDir);
  for (const file of files) {
    const filePath = path.join(configDir, file);
    const raw = await fs.readFile(filePath, "utf8");
    await fs.writeFile(filePath, fillTemplate(raw, vars), "utf8");
  }
}

export async function scaffoldProject({
  projectId,
  name,
  idea,
  duration,
  audience,
  language,
  styleRef,
}) {
  if (!name) throw new CliError("--name is required", "USER_APPROVAL_REQUIRED");
  if (!idea) throw new CliError("--idea is required", "USER_APPROVAL_REQUIRED");
  const durationSec = Number.parseInt(duration, 10);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new CliError("--duration must be a positive integer (seconds)", "USER_APPROVAL_REQUIRED");
  }

  const index = await loadIndex();

  let id = projectId;
  if (!id) {
    const n = String(index.next_id).padStart(3, "0");
    id = `${n}-${slugify(name)}`;
  }
  if (!/^[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    throw new CliError(`project_id "${id}" must match NNN-slug (e.g. 001-my-video)`, "USER_APPROVAL_REQUIRED");
  }
  if (index.projects.some((p) => p.id === id)) {
    throw new CliError(`project_id "${id}" already exists`, "USER_APPROVAL_REQUIRED");
  }

  const dest = projectDir(id);
  if (await pathExists(dest)) {
    throw new CliError(`${dest} already exists on disk`, "USER_APPROVAL_REQUIRED");
  }

  await copyDir(path.join(TEMPLATES_DIR, "project"), dest);

  const schemasDest = path.join(dest, "schemas");
  await copyDir(SCHEMAS_DIR, schemasDest);

  const createdAt = nowIso();
  await fillConfigFiles(dest, {
    PROJECT_ID: id,
    PROJECT_NAME: name,
    VIDEO_IDEA: idea.replace(/"/g, '\\"'),
    TARGET_AUDIENCE: (audience || "general").replace(/"/g, '\\"'),
    LANGUAGE: language || "en",
    STYLE_REF: (styleRef || "none").replace(/"/g, '\\"'),
    CREATED_AT: createdAt,
    TARGET_DURATION_SEC: String(durationSec),
  });

  const manifest = {
    project_id: id,
    project_name: name,
    status: "NOT_STARTED",
    current_stage: null,
    completed_skills: [],
    pending_skills: [...STAGE_ORDER],
    waiting_for: [],
    required_files: [],
    errors: [],
    last_successful_stage: null,
    last_updated: createdAt,
    paused: false,
  };
  await writeJsonAtomic(path.join(dest, "manifest.json"), manifest);

  index.projects.push({ id, name, status: "NOT_STARTED", created_at: createdAt });
  index.next_id = Math.max(index.next_id, Number.parseInt(id.slice(0, 3), 10) + 1);
  await saveIndex(index);

  return { project_id: id, path: path.relative(process.cwd(), dest), manifest };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  try {
    const result = await scaffoldProject({
      projectId: args["project-id"],
      name: args.name,
      idea: args.idea,
      duration: args.duration,
      audience: args.audience,
      language: args.language,
      styleRef: args["style-ref"],
    });
    printJson({ ok: true, ...result });
  } catch (err) {
    printJson({ ok: false, error_code: err.code || "UNKNOWN_ERROR", message: err.message });
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
