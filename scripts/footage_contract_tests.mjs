#!/usr/bin/env node
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { validateSchema, validateFootageCoverage, validateVisualAssets } from "./validate.mjs";
import { projectDir } from "./lib/fs-utils.mjs";

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
async function mkdirp(p) { await fs.mkdir(p, { recursive: true }); }
async function writeJson(p, v) { await mkdirp(path.dirname(p)); await fs.writeFile(p, JSON.stringify(v, null, 2) + "\n"); }
function baseScene(overrides = {}) { return {
  scene_id: "scene_001", asset_type: "video", source: "pexels",
  search_queries: ["q one", "q two"], selected_url: null, license: "https://www.pexels.com/license/", license_verified_date: "2026-07-13",
  attribution_required: false, attribution_text: null, reasoning: "evidence-grounded selection", native_duration_sec: 10,
  native_resolution: { width: 1920, height: 1080 }, trim_in_sec: 0, trim_out_sec: 5, fallback_to_ai_visual: false,
  asset_role: "canonical", asset_path: "assets/footage/scene_001_test.mp4", legacy_provenance_schema: true, explicit_binding_status: "NOT_RECORDED_PRE_SCHEMA", media_sha_ffprobe_valid: true,
  ...overrides
}; }
function manifest(scene) { return { schema_version: "1.0", project_id: "contract-test", generated_at: "2026-07-13T00:00:00Z", scenes: [scene] }; }
async function schemaValid(scene) {
  const file = path.join("/tmp", `ff-contract-${process.pid}-${Math.random()}.json`);
  await writeJson(file, manifest(scene));
  const r = await validateSchema({ file, schema: "footage_manifest" });
  await fs.rm(file, { force: true });
  return r;
}
async function withProject(id, scene, fn, makeAsset = true) {
  const dir = projectDir(id); await fs.rm(dir, { recursive: true, force: true });
  await writeJson(path.join(dir,"storyboard/storyboard.json"), { scenes: [{ scene_id: scene.scene_id }] });
  await writeJson(path.join(dir,"footage/footage_manifest.json"), manifest(scene));
  await writeJson(path.join(dir,"footage/scene_asset_map.json"), { scenes: [{ scene_id: scene.scene_id, asset_path: scene.asset_path || scene.canonical_asset_path }] });
  if (makeAsset && (scene.asset_path || scene.canonical_asset_path)) { const asset=path.join(dir, scene.asset_path || scene.canonical_asset_path); await mkdirp(path.dirname(asset)); await fs.writeFile(asset, "x"); }
  try { return await fn(id, dir); } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test("two unique executed queries pass", async()=> assert.equal((await schemaValid(baseScene())).valid, true));
test("three unique executed queries pass", async()=> assert.equal((await schemaValid(baseScene({search_queries:["a","b","c"]}))).valid, true));
test("one query fails", async()=> assert.equal((await schemaValid(baseScene({search_queries:["a"]}))).valid, false));
test("duplicate queries fail unique evidence", async()=> assert.equal((await schemaValid(baseScene({search_queries:["a","a"]}))).valid, false));
test("provider attempts do not replace textual query count", async()=> assert.equal((await schemaValid({...baseScene({search_queries:["a"]}), provider_attempts:["pexels","pixabay"]})).valid, false));
test("canonical runtime fields schema pass", async()=> assert.equal((await schemaValid(baseScene({actual_resolution:{width:1920,height:1080},expected_resolution:{width:1920,height:1080},selected_rendition_id:"r1"}))).valid, true));
test("unknown additional property fails", async()=> assert.equal((await schemaValid({...baseScene(), unsupported_report_note:"x"})).valid, false));
test("report-only unsupported field fails", async()=> assert.equal((await schemaValid({...baseScene(), quality_review_flags:[]})).valid, false));
test("valid canonical provenance without selected_url passes validator", async()=> await withProject("__contract_test_01", baseScene({selected_url:null}), async(id)=> assert.equal((await validateFootageCoverage({projectId:id})).valid, true)));
test("safe public source page/reference passes", async()=> await withProject("__contract_test_02", baseScene({selected_url:"https://www.pexels.com/video/example-123/"}), async(id)=> assert.equal((await validateFootageCoverage({projectId:id})).valid, true)));
test("raw signed/private media URL in project-visible field fails", async()=> await withProject("__contract_test_03", baseScene({selected_url:"https://cdn.example/video.mp4?token=SECRET"}), async(id)=> assert.equal((await validateFootageCoverage({projectId:id})).error_code, "INCOMPLETE_FOOTAGE_PROVENANCE")));
test("missing provenance evidence gives INCOMPLETE_FOOTAGE_PROVENANCE", async()=> await withProject("__contract_test_04", baseScene({license:null, license_approved:false, legacy_provenance_schema:false, explicit_binding_status:"UNKNOWN", media_sha_ffprobe_valid:false}), async(id)=> assert.equal((await validateFootageCoverage({projectId:id})).error_code, "INCOMPLETE_FOOTAGE_PROVENANCE")));
test("real missing effective asset path gives BROKEN_ASSET_PATH", async()=> await withProject("__contract_test_05", baseScene(), async(id)=> assert.equal((await validateFootageCoverage({projectId:id})).error_code, "BROKEN_ASSET_PATH"), false));
test("scene_025-type reuse record passes", async()=> await withProject("__contract_test_06", baseScene({scene_id:"scene_025", asset_role:"reuse", asset_path:"assets/footage/scene_022_canon.mp4", canonical_asset_path:"assets/footage/scene_022_canon.mp4", canonical_provenance_path:"assets/footage/scene_022_canon.mp4.provenance.json", reuse_of_scene:"scene_022", physical_download_performed:false, duplicate_download_prevented:true, reuse_policy_passed:true}), async(id)=> assert.equal((await validateFootageCoverage({projectId:id})).valid, true)));
test("reuse record missing canonical reference fails", async()=> assert.equal((await schemaValid(baseScene({asset_role:"reuse", reuse_of_scene:"scene_022", canonical_asset_path:null, asset_path:null}))).valid, false));
test("legacy pre-binding provenance markers pass", async()=> await withProject("__contract_test_07", baseScene({selected_rendition_id:null,resolved_rendition_id:null,legacy_provenance_schema:true,explicit_binding_status:"NOT_RECORDED_PRE_SCHEMA"}), async(id)=> assert.equal((await validateFootageCoverage({projectId:id})).valid, true)));
test("legacy provenance does not require invented binding ids", async()=> assert.equal((await schemaValid(baseScene({selected_rendition_id:null,resolved_rendition_id:null,explicit_binding_status:"NOT_RECORDED_PRE_SCHEMA"}))).valid, true));
test("credential/query-token leak fixture fails", async()=> assert.equal((await schemaValid(baseScene({selected_url:"https://cdn.example/video.mp4?api_key=SECRET"}))).valid, false));
test("global/project-local schema contract equivalent", async()=> { const g=await fs.readFile("schemas/footage_manifest.schema.json","utf8"); const p=await fs.readFile("projects/001-the-ai-race-no-one-can-afford-to-win/schemas/footage_manifest.schema.json","utf8"); assert.equal(g,p); });
test("visual asset resolution uses effective/reuse path", async()=> await withProject("__contract_test_08", baseScene({scene_id:"scene_025", asset_path:"assets/footage/scene_022_canon.mp4", canonical_asset_path:"assets/footage/scene_022_canon.mp4", asset_role:"reuse", reuse_of_scene:"scene_022", duplicate_download_prevented:true, reuse_policy_passed:true}), async(id)=> assert.equal((await validateVisualAssets({projectId:id})).valid, true)));

let passed=0; const failed=[];
for (const t of tests) { try { await t.fn(); passed++; console.log(`PASS ${t.name}`); } catch (e) { failed.push({name:t.name,error:e.stack||String(e)}); console.error(`FAIL ${t.name}\n${e.stack||e}`); } }
console.log(JSON.stringify({total:tests.length, passed, failed:failed.length, failed_tests:failed.map(f=>f.name)}, null, 2));
if (failed.length) process.exit(1);
