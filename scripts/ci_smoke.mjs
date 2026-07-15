#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  SCHEMAS_DIR,
  assertValidProjectId,
  listFiles,
} from "./lib/fs-utils.mjs";
import { GATES, STAGE_ORDER } from "./lib/pipeline.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const validIds = ["001-my-video", "999-github-actions-dryrun", "123-a1-b2"];
for (const id of validIds) assert(assertValidProjectId(id) === id, `Valid project id rejected: ${id}`);

const invalidIds = [
  "../etc/passwd",
  "001-ok/../../escape",
  "/tmp/escape",
  "001-UPPERCASE",
  "001_bad",
  "001-a;echo-pwned",
  "",
];
for (const id of invalidIds) {
  let rejected = false;
  try {
    assertValidProjectId(id);
  } catch (error) {
    rejected = error?.code === "INVALID_PROJECT_ID";
  }
  assert(rejected, `Unsafe project id was accepted: ${JSON.stringify(id)}`);
}

assert(new Set(STAGE_ORDER).size === STAGE_ORDER.length, "STAGE_ORDER contains duplicates");
for (const [name, gate] of Object.entries(GATES)) {
  assert(STAGE_ORDER.includes(gate.beforeStage), `Gate ${name} targets unknown stage ${gate.beforeStage}`);
}

const schemaFiles = await listFiles(SCHEMAS_DIR, { extensions: [".json"] });
assert(schemaFiles.length > 0, "No JSON schemas found");
for (const file of schemaFiles) JSON.parse(await fs.readFile(file, "utf8"));

const remotionPackage = JSON.parse(
  await fs.readFile(path.join(REPO_ROOT, "templates", "remotion", "package.json"), "utf8")
);
const remotionLock = JSON.parse(
  await fs.readFile(path.join(REPO_ROOT, "templates", "remotion", "package-lock.json"), "utf8")
);
assert(remotionLock.lockfileVersion === 3, "Remotion lockfile must use lockfileVersion 3");
assert(
  JSON.stringify(remotionLock.packages?.[""]?.dependencies) === JSON.stringify(remotionPackage.dependencies),
  "Remotion package.json dependencies do not match package-lock.json"
);
assert(
  JSON.stringify(remotionLock.packages?.[""]?.devDependencies) === JSON.stringify(remotionPackage.devDependencies),
  "Remotion package.json devDependencies do not match package-lock.json"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      valid_project_ids_tested: validIds.length,
      invalid_project_ids_rejected: invalidIds.length,
      schemas_parsed: schemaFiles.length,
      stages_checked: STAGE_ORDER.length,
      gates_checked: Object.keys(GATES).length,
      remotion_lockfile_checked: true,
    },
    null,
    2
  )
);
