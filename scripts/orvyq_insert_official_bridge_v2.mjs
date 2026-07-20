#!/usr/bin/env node
import path from "node:path";
import {
  projectDir,
  readJson,
  writeJsonAtomic,
} from "./lib/fs-utils.mjs";
import { insertOfficialBridge } from "./orvyq_insert_official_bridge.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const VALID_SHOT_ID = /^shot_[0-9]{3,4}$/;

function allocateIds(plan, count) {
  const used = new Set(
    (plan.shots || [])
      .map((shot) => String(shot.shot_id || ""))
      .filter((shotId) => VALID_SHOT_ID.test(shotId)),
  );
  const ids = [];
  for (let value = 9001; value <= 9999 && ids.length < count; value += 1) {
    const candidate = `shot_${value}`;
    if (used.has(candidate)) continue;
    used.add(candidate);
    ids.push(candidate);
  }
  if (ids.length !== count) {
    throw new Error(`Cannot allocate ${count} canonical bridge shot ids`);
  }
  return ids;
}

export async function insertOfficialBridgeV2(projectId = PROJECT_ID) {
  const initial = await insertOfficialBridge(projectId);
  if (initial.inserted !== true) return initial;

  const dir = projectDir(projectId);
  const planPath = path.join(dir, "direction", "production_plan.json");
  const reportPath = path.join(dir, "qa", "official_bridge_insertion.json");
  const plan = await readJson(planPath);
  const report = await readJson(reportPath);
  const oldIds = Array.isArray(report.generated_shot_ids)
    ? report.generated_shot_ids
    : [];
  if (oldIds.length !== 3) {
    throw new Error("Official bridge report must contain exactly three generated shot ids");
  }
  const newIds = allocateIds(plan, oldIds.length);
  const idMap = Object.fromEntries(oldIds.map((oldId, index) => [oldId, newIds[index]]));
  let renamed = 0;
  for (const shot of plan.shots || []) {
    const replacement = idMap[shot.shot_id];
    if (!replacement) continue;
    shot.shot_id = replacement;
    renamed += 1;
  }
  if (renamed !== oldIds.length) {
    throw new Error(`Expected to canonicalize ${oldIds.length} bridge shots, renamed ${renamed}`);
  }
  const invalid = (plan.shots || [])
    .map((shot) => shot.shot_id)
    .filter((shotId) => !VALID_SHOT_ID.test(String(shotId || "")));
  if (invalid.length) {
    throw new Error(`Invalid canonical shot ids remain: ${invalid.join(", ")}`);
  }
  await writeJsonAtomic(planPath, plan);
  const canonicalReport = {
    ...report,
    schema_version: "1.1-canonical-isolated-official-bridge",
    generated_shot_ids: newIds,
    canonical_shot_id_map: idMap,
    canonical_ids_valid: true,
    pass: true,
  };
  await writeJsonAtomic(reportPath, canonicalReport);
  return canonicalReport;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  insertOfficialBridgeV2(process.argv[2] || PROJECT_ID)
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
