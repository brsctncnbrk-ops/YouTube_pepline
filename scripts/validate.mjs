#!/usr/bin/env node
/**
 * Deterministic mechanical checks backing the FactForge QA gates: JSON schema
 * validity, relative-path enforcement, filename conventions, and asset
 * existence. Judgment calls (hook strength, natural English, prompt
 * creativity, etc.) belong in the LLM-driven QA skills, not here.
 */
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  SCHEMAS_DIR,
  projectDir,
  pathExists,
  readJson,
  readJsonSafe,
  parseArgs,
  printJson,
  CliError,
} from "./lib/fs-utils.mjs";
import { GATES } from "./lib/pipeline.mjs";
import { SCENE_TYPE_TO_TREATMENT } from "./lib/style.mjs";

const ABSOLUTE_PATH_PATTERNS = [
  /^\//, // unix absolute
  /^[A-Za-z]:[\\/]/, // windows drive letter, C:/ or C:\
  /^~/, // home dir shorthand
  /\.\.(\/|\\)/, // parent traversal
];

function isSuspiciousPath(value) {
  if (typeof value !== "string") return false;
  return ABSOLUTE_PATH_PATTERNS.some((re) => re.test(value));
}

/** Recursively walk a JSON value, calling onString(path, value) for every string leaf. */
function walkStrings(value, jsonPath, onString) {
  if (typeof value === "string") {
    onString(jsonPath, value);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, `${jsonPath}[${i}]`, onString));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walkStrings(v, jsonPath ? `${jsonPath}.${k}` : k, onString);
    }
  }
}

async function loadAjvSchema(schemaName) {
  const schemaPath = path.join(SCHEMAS_DIR, `${schemaName}.schema.json`);
  if (!(await pathExists(schemaPath))) {
    throw new CliError(`Unknown schema "${schemaName}" (expected ${schemaPath})`, "SCHEMA_VALIDATION_FAILED");
  }
  const schema = await readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

export async function validateSchema({ file, schema }) {
  if (!(await pathExists(file))) {
    return { valid: false, error_code: "SCHEMA_VALIDATION_FAILED", errors: [`File not found: ${file}`] };
  }
  let data;
  try {
    data = await readJson(file);
  } catch (err) {
    return { valid: false, error_code: "INVALID_JSON", errors: [err.message] };
  }
  const validateFn = await loadAjvSchema(schema);
  const valid = validateFn(data);
  return {
    valid,
    error_code: valid ? null : "SCHEMA_VALIDATION_FAILED",
    errors: valid ? [] : (validateFn.errors || []).map((e) => `${e.instancePath || "/"} ${e.message}`),
  };
}

export async function validatePaths({ projectId }) {
  const dir = projectDir(projectId);
  const candidates = [
    "remotion/composition.json",
    "remotion/scene_config.json",
    "remotion/asset_map.json",
  ];
  const issues = [];
  for (const rel of candidates) {
    const full = path.join(dir, rel);
    if (!(await pathExists(full))) continue;
    const data = await readJsonSafe(full, null);
    if (data === null) continue;
    walkStrings(data, "", (jsonPath, value) => {
      if (isSuspiciousPath(value)) {
        issues.push({ file: rel, json_path: jsonPath || "$", value });
      }
    });
  }
  return { valid: issues.length === 0, error_code: issues.length ? "BROKEN_ASSET_PATH" : null, issues };
}

export async function validateFilenames({ projectId }) {
  const dir = projectDir(projectId);
  const storyboardPath = path.join(dir, "storyboard", "storyboard.json");
  const issues = [];
  if (!(await pathExists(storyboardPath))) {
    return { valid: true, issues: [], note: "storyboard.json not present yet" };
  }
  const storyboard = await readJsonSafe(storyboardPath, null);
  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["storyboard.json missing scenes[]"] };
  }
  const seen = new Set();
  for (const scene of storyboard.scenes) {
    const id = scene.scene_id;
    if (!/^scene_[0-9]{3}$/.test(id || "")) {
      issues.push({ scene_id: id, reason: "scene_id must match scene_NNN" });
      continue;
    }
    if (seen.has(id)) issues.push({ scene_id: id, reason: "duplicate scene_id" });
    seen.add(id);
  }
  const numbers = [...seen].map((id) => Number.parseInt(id.slice(6), 10)).sort((a, b) => a - b);
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) {
      issues.push({ reason: `scene numbering gap or misorder near position ${i + 1}`, expected: i + 1, found: numbers[i] });
      break;
    }
  }
  return { valid: issues.length === 0, error_code: issues.length ? "BROKEN_ASSET_PATH" : null, issues };
}

/**
 * Storyboard-side half of the scene-variety mechanical gate: no two
 * consecutive scenes may share the same scene_type (checked at storyboard_qa,
 * ahead of any image generation). Keeps sahne çeşitliliği from collapsing to
 * one repeated shot type across a whole video.
 */
export async function validateSceneTypeVariety({ projectId }) {
  const dir = projectDir(projectId);
  const storyboardPath = path.join(dir, "storyboard", "storyboard.json");
  if (!(await pathExists(storyboardPath))) {
    return { valid: true, issues: [], note: "storyboard.json not present yet" };
  }
  const storyboard = await readJsonSafe(storyboardPath, null);
  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["storyboard.json missing scenes[]"] };
  }
  const issues = [];
  const scenes = storyboard.scenes;
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1];
    const curr = scenes[i];
    if (curr.scene_type && curr.scene_type === prev.scene_type) {
      issues.push({
        scene_id: curr.scene_id,
        field: "scene_type",
        value: curr.scene_type,
        reason: `same scene_type as previous scene ${prev.scene_id}`,
      });
    }
  }
  return { valid: issues.length === 0, error_code: issues.length ? "SCENE_VARIETY_VIOLATION" : null, issues };
}

export async function validateAssets({ projectId, check = "all" }) {
  const dir = projectDir(projectId);
  const missing = [];

  if (check === "audio" || check === "all") {
    const audioPath = path.join(dir, GATES.audio.requiredFile);
    if (!(await pathExists(audioPath))) missing.push(GATES.audio.requiredFile);
  }

  if (check === "images" || check === "all") {
    const storyboardPath = path.join(dir, "storyboard", "storyboard.json");
    const storyboard = await readJsonSafe(storyboardPath, null);
    if (storyboard && Array.isArray(storyboard.scenes)) {
      for (const scene of storyboard.scenes) {
        if (!/^scene_[0-9]{3}$/.test(scene.scene_id || "")) continue;
        const rel = `assets/images/${scene.scene_id}.png`;
        if (!(await pathExists(path.join(dir, rel)))) missing.push(rel);
      }
    }
  }

  return {
    valid: missing.length === 0,
    error_code: missing.length === 0 ? null : check === "audio" ? "MISSING_AUDIO" : "MISSING_IMAGE",
    missing,
  };
}

/**
 * Checks that prompts/visual_prompts.json fully covers the storyboard's
 * scenes with correctly-patterned filenames - "can these scenes be linked to
 * the asset folder" per the spec's visual QA gate. Deliberately does NOT
 * check whether assets/images/scene_NNN.png actually exist yet: at the point
 * visual_qa runs, the human hasn't generated them in Leonardo AI - that only
 * happens after this gate passes, checked separately by the images gate
 * (GATES.images) right before the "director" stage.
 */
export async function validatePromptCoverage({ projectId }) {
  const dir = projectDir(projectId);
  const storyboardPath = path.join(dir, "storyboard", "storyboard.json");
  const promptsPath = path.join(dir, "prompts", "visual_prompts.json");

  const storyboard = await readJsonSafe(storyboardPath, null);
  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["storyboard.json missing or has no scenes[]"] };
  }
  const prompts = await readJsonSafe(promptsPath, null);
  if (!prompts || !Array.isArray(prompts.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["visual_prompts.json missing or has no scenes[]"] };
  }

  const issues = [];
  const storyboardIds = new Set(storyboard.scenes.map((s) => s.scene_id));
  const promptById = new Map(prompts.scenes.map((s) => [s.scene_id, s]));

  for (const id of storyboardIds) {
    const entry = promptById.get(id);
    if (!entry) {
      issues.push({ scene_id: id, reason: "no matching entry in visual_prompts.json" });
      continue;
    }
    const expectedFilename = `${id}.png`;
    if (entry.image_filename !== expectedFilename) {
      issues.push({ scene_id: id, reason: `image_filename "${entry.image_filename}" does not match expected "${expectedFilename}"` });
    }
  }
  for (const id of promptById.keys()) {
    if (!storyboardIds.has(id)) {
      issues.push({ scene_id: id, reason: "visual_prompts.json has an entry with no matching storyboard scene" });
    }
  }

  return { valid: issues.length === 0, error_code: issues.length ? "BROKEN_ASSET_PATH" : null, issues };
}

/**
 * Style-treatment policy check: each visual_prompts.json scene's
 * render_treatment must match the value scripts/lib/style.mjs's fixed
 * SCENE_TYPE_TO_TREATMENT table predicts from that scene's storyboard.json
 * scene_type. Catches skill-authoring drift from the systematic
 * content-driven treatment policy - style_token drift stays a judgment call
 * (factforge-visual-qa Step 2), this is the mechanical half.
 */
export async function validateStyleTreatment({ projectId }) {
  const dir = projectDir(projectId);
  const storyboardPath = path.join(dir, "storyboard", "storyboard.json");
  const promptsPath = path.join(dir, "prompts", "visual_prompts.json");

  const storyboard = await readJsonSafe(storyboardPath, null);
  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["storyboard.json missing or has no scenes[]"] };
  }
  const prompts = await readJsonSafe(promptsPath, null);
  if (!prompts || !Array.isArray(prompts.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["visual_prompts.json missing or has no scenes[]"] };
  }

  const sceneTypeById = new Map(storyboard.scenes.map((s) => [s.scene_id, s.scene_type]));
  const issues = [];
  for (const scene of prompts.scenes) {
    const sceneType = sceneTypeById.get(scene.scene_id);
    const expected = SCENE_TYPE_TO_TREATMENT[sceneType];
    if (!expected) continue; // no matching storyboard scene / unknown scene_type - covered by validatePromptCoverage/schema instead
    if (scene.render_treatment !== expected) {
      issues.push({
        scene_id: scene.scene_id,
        field: "render_treatment",
        expected,
        actual: scene.render_treatment,
        reason: `scene_type "${sceneType}" requires render_treatment "${expected}"`,
      });
    }
  }
  return { valid: issues.length === 0, error_code: issues.length ? "STYLE_TREATMENT_MISMATCH" : null, issues };
}

/**
 * Final-QA mechanical check: the rendered video plus all six spec-listed
 * YouTube packaging deliverables must exist. The packaging.json schema is
 * checked separately via SCHEMA_BY_STAGE. This is the "is the package
 * complete / is the video rendered" half of the final QA gate; everything
 * qualitative (sync, readability, title strength) is the final-qa skill's job.
 */
export async function validatePackaging({ projectId }) {
  const dir = projectDir(projectId);
  const required = [
    "output/final_video.mp4",
    "packaging/title.md",
    "packaging/description.md",
    "packaging/tags.txt",
    "packaging/thumbnail.md",
    "packaging/chapters.txt",
    "packaging/pinned_comment.md",
  ];
  const missing = [];
  for (const rel of required) {
    if (!(await pathExists(path.join(dir, rel)))) missing.push(rel);
  }
  return { valid: missing.length === 0, error_code: missing.length ? "UNKNOWN_ERROR" : null, missing };
}

/**
 * Render-side half of the scene-variety mechanical gate: no two consecutive
 * scenes in remotion/composition.json may share the same camera_motion.type
 * or transition_in - the "aynı kamera hareketi/geçiş art arda olmasın" rule,
 * enforced deterministically at render_qa rather than left to judgment.
 */
export async function validateSceneVariety({ projectId }) {
  const dir = projectDir(projectId);
  const compositionPath = path.join(dir, "remotion", "composition.json");
  if (!(await pathExists(compositionPath))) {
    return { valid: true, issues: [], note: "composition.json not present yet" };
  }
  const composition = await readJsonSafe(compositionPath, null);
  if (!composition || !Array.isArray(composition.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["composition.json missing scenes[]"] };
  }
  const issues = [];
  const scenes = composition.scenes;
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1];
    const curr = scenes[i];
    if (curr.camera_motion?.type && curr.camera_motion.type === prev.camera_motion?.type) {
      issues.push({
        scene_id: curr.scene_id,
        field: "camera_motion.type",
        value: curr.camera_motion.type,
        reason: `same camera_motion.type as previous scene ${prev.scene_id}`,
      });
    }
    if (curr.transition_in && curr.transition_in === prev.transition_in) {
      issues.push({
        scene_id: curr.scene_id,
        field: "transition_in",
        value: curr.transition_in,
        reason: `same transition_in as previous scene ${prev.scene_id}`,
      });
    }
  }
  return { valid: issues.length === 0, error_code: issues.length ? "SCENE_VARIETY_VIOLATION" : null, issues };
}

/**
 * Caption timing gate: remotion/captions.json (if present) must be schema-
 * valid, chronological/non-overlapping, and each caption's on-screen window
 * must stay short enough to read quickly (not lingering) but long enough to
 * actually read - "altyazı ekranda çok uzun kalmamalı, sürükleyici olmalı"
 * enforced mechanically rather than left to chance. Captions are generated
 * by scripts/generate_captions.mjs, never hand-authored.
 */
export async function validateCaptions({ projectId }) {
  const dir = projectDir(projectId);
  const captionsPath = path.join(dir, "remotion", "captions.json");
  if (!(await pathExists(captionsPath))) {
    return { valid: true, issues: [], note: "captions.json not present yet" };
  }
  const schemaResult = await validateSchema({ file: captionsPath, schema: "captions" });
  if (!schemaResult.valid) {
    return { valid: false, error_code: "CAPTION_TIMING_INVALID", issues: schemaResult.errors };
  }
  const data = await readJsonSafe(captionsPath, null);
  const captions = data?.captions ?? [];
  const MIN_FRAMES = 10;
  const MAX_FRAMES = 150;
  const issues = [];
  let prevEnd = -1;
  for (const c of captions) {
    if (c.end_frame <= c.start_frame) {
      issues.push({ text: c.text, reason: "end_frame must be after start_frame" });
      continue;
    }
    if (c.start_frame < prevEnd) {
      issues.push({ text: c.text, reason: `overlaps previous caption (starts at ${c.start_frame}, previous ended at ${prevEnd})` });
    }
    const dur = c.end_frame - c.start_frame;
    if (dur < MIN_FRAMES) {
      issues.push({ text: c.text, reason: `on screen for only ${dur} frames, below minimum ${MIN_FRAMES}` });
    }
    if (dur > MAX_FRAMES) {
      issues.push({ text: c.text, reason: `on screen for ${dur} frames, above maximum ${MAX_FRAMES} - not "sürükleyici"` });
    }
    prevEnd = c.end_frame;
  }
  return { valid: issues.length === 0, error_code: issues.length ? "CAPTION_TIMING_INVALID" : null, issues };
}

export async function validateRenderReady({ projectId }) {
  const dir = projectDir(projectId);
  const checks = {};

  checks.audio = await validateAssets({ projectId, check: "audio" });
  checks.images = await validateAssets({ projectId, check: "images" });
  checks.paths = await validatePaths({ projectId });
  checks.filenames = await validateFilenames({ projectId });

  const renderReadyDir = path.join(dir, "remotion", "render_ready_project");
  checks.render_ready_project_exists = await pathExists(renderReadyDir);

  const configFiles = ["remotion/composition.json", "remotion/scene_config.json", "remotion/asset_map.json"];
  const missingConfigs = [];
  for (const rel of configFiles) {
    if (!(await pathExists(path.join(dir, rel)))) missingConfigs.push(rel);
  }
  checks.remotion_configs_complete = missingConfigs.length === 0;
  checks.missing_remotion_configs = missingConfigs;

  const workflowPath = path.join(dir, "..", "..", ".github", "workflows", "render.yml");
  checks.github_workflow_present = await pathExists(workflowPath);

  const reasons = [];
  if (!checks.audio.valid) reasons.push("MISSING_AUDIO: " + checks.audio.missing.join(", "));
  if (!checks.images.valid) reasons.push("MISSING_IMAGE: " + checks.images.missing.join(", "));
  if (!checks.paths.valid) reasons.push("BROKEN_ASSET_PATH: absolute/invalid paths found");
  if (!checks.filenames.valid) reasons.push("BROKEN_ASSET_PATH: scene filename/numbering issues");
  if (!checks.render_ready_project_exists) reasons.push("RENDER_CONFIG_MISSING: remotion/render_ready_project/ not built yet");
  if (!checks.remotion_configs_complete) reasons.push("RENDER_CONFIG_MISSING: " + checks.missing_remotion_configs.join(", "));
  if (!checks.github_workflow_present) reasons.push("RENDER_CONFIG_MISSING: .github/workflows/render.yml not present yet");

  return { valid: reasons.length === 0, checks, reasons };
}

const SCHEMA_BY_STAGE = {
  research_qa: [{ file: "research/research.json", schema: "research" }],
  script_qa: [{ file: "scripts/script_metadata.json", schema: "script" }],
  voice_qa: [], // voice_script.txt/voice_notes.md are plain text, no JSON schema target - this gate is judgment-only
  storyboard_qa: [{ file: "storyboard/storyboard.json", schema: "storyboard" }],
  visual_qa: [{ file: "prompts/visual_prompts.json", schema: "visual_prompts" }],
  render_qa: [{ file: "remotion/composition.json", schema: "composition" }],
  final_qa: [{ file: "packaging/packaging.json", schema: "packaging" }],
};

export async function validateAll({ projectId, stage }) {
  const dir = projectDir(projectId);
  const schemaChecks = [];
  for (const { file, schema } of SCHEMA_BY_STAGE[stage] || []) {
    const full = path.join(dir, file);
    if (await pathExists(full)) {
      schemaChecks.push({ file, ...(await validateSchema({ file: full, schema })) });
    }
  }

  if (stage === "render_qa") {
    const renderReady = await validateRenderReady({ projectId });
    const sceneVarietyCheck = await validateSceneVariety({ projectId });
    const captionsCheck = await validateCaptions({ projectId });
    const reasons = [...renderReady.reasons];
    if (!sceneVarietyCheck.valid) reasons.push("SCENE_VARIETY_VIOLATION: " + JSON.stringify(sceneVarietyCheck.issues));
    if (!captionsCheck.valid) reasons.push("CAPTION_TIMING_INVALID: " + JSON.stringify(captionsCheck.issues));
    return {
      ...renderReady,
      valid: renderReady.valid && sceneVarietyCheck.valid && captionsCheck.valid,
      reasons,
      sceneVarietyCheck,
      captionsCheck,
      schemaChecks,
    };
  }

  let assetCheck = { valid: true, missing: [] };
  if (stage === "storyboard_qa") assetCheck = await validateAssets({ projectId, check: "audio" });

  let filenamesCheck = { valid: true, issues: [] };
  if (stage === "storyboard_qa") filenamesCheck = await validateFilenames({ projectId });

  let sceneTypeVarietyCheck = { valid: true, issues: [] };
  if (stage === "storyboard_qa") sceneTypeVarietyCheck = await validateSceneTypeVariety({ projectId });

  let coverageCheck = { valid: true, issues: [] };
  if (stage === "visual_qa") coverageCheck = await validatePromptCoverage({ projectId });

  let styleTreatmentCheck = { valid: true, issues: [] };
  if (stage === "visual_qa") styleTreatmentCheck = await validateStyleTreatment({ projectId });

  let packagingCheck = { valid: true, missing: [] };
  if (stage === "final_qa") packagingCheck = await validatePackaging({ projectId });

  const valid =
    schemaChecks.every((c) => c.valid) &&
    assetCheck.valid &&
    filenamesCheck.valid &&
    sceneTypeVarietyCheck.valid &&
    coverageCheck.valid &&
    styleTreatmentCheck.valid &&
    packagingCheck.valid;
  return {
    valid,
    schemaChecks,
    assetCheck,
    filenamesCheck,
    sceneTypeVarietyCheck,
    coverageCheck,
    styleTreatmentCheck,
    packagingCheck,
  };
}

function toHuman(result) {
  const lines = ["### Automated Checks", ""];
  lines.push(`- Overall: ${result.valid ? "PASS" : "FAIL"}`);
  if (result.schemaChecks) {
    for (const c of result.schemaChecks) {
      lines.push(`- Schema (${c.file}): ${c.valid ? "PASS" : "FAIL - " + c.errors.join("; ")}`);
    }
  }
  if (result.assetCheck) {
    lines.push(`- Assets: ${result.assetCheck.valid ? "PASS" : "FAIL - missing " + result.assetCheck.missing.join(", ")}`);
  }
  if (result.filenamesCheck) {
    lines.push(`- Scene filenames/numbering: ${result.filenamesCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.filenamesCheck.issues)}`);
  }
  if (result.sceneTypeVarietyCheck) {
    lines.push(`- Scene type variety (no consecutive repeats): ${result.sceneTypeVarietyCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.sceneTypeVarietyCheck.issues)}`);
  }
  if (result.sceneVarietyCheck) {
    lines.push(`- Camera/transition variety (no consecutive repeats): ${result.sceneVarietyCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.sceneVarietyCheck.issues)}`);
  }
  if (result.captionsCheck) {
    lines.push(`- Caption timing (chronological, readable, not lingering): ${result.captionsCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.captionsCheck.issues)}`);
  }
  if (result.coverageCheck) {
    lines.push(`- Prompt-to-scene coverage: ${result.coverageCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.coverageCheck.issues)}`);
  }
  if (result.styleTreatmentCheck) {
    lines.push(`- Render-treatment policy (scene_type → render_treatment): ${result.styleTreatmentCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.styleTreatmentCheck.issues)}`);
  }
  if (result.packagingCheck) {
    lines.push(`- Packaging deliverables: ${result.packagingCheck.valid ? "PASS" : "FAIL - missing " + result.packagingCheck.missing.join(", ")}`);
  }
  if (result.reasons) {
    lines.push(`- Reasons: ${result.reasons.length ? result.reasons.join("; ") : "none"}`);
  }
  if (result.issues) {
    lines.push(`- Issues: ${result.issues.length ? JSON.stringify(result.issues) : "none"}`);
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const [group, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  try {
    let result;
    switch (group) {
      case "schema":
        result = await validateSchema({ file: args.file, schema: args.schema });
        break;
      case "paths":
        result = await validatePaths({ projectId: args["project-id"] });
        break;
      case "filenames":
        result = await validateFilenames({ projectId: args["project-id"] });
        break;
      case "scene-type-variety":
        result = await validateSceneTypeVariety({ projectId: args["project-id"] });
        break;
      case "scene-variety":
        result = await validateSceneVariety({ projectId: args["project-id"] });
        break;
      case "captions":
        result = await validateCaptions({ projectId: args["project-id"] });
        break;
      case "style-treatment":
        result = await validateStyleTreatment({ projectId: args["project-id"] });
        break;
      case "assets":
        result = await validateAssets({ projectId: args["project-id"], check: args.check || "all" });
        break;
      case "render-ready":
        result = await validateRenderReady({ projectId: args["project-id"] });
        break;
      case "all":
        result = await validateAll({ projectId: args["project-id"], stage: args.stage });
        break;
      default:
        throw new CliError(
          `Unknown validate subcommand "${group}". Use: schema|paths|filenames|scene-type-variety|scene-variety|style-treatment|captions|assets|render-ready|all`,
          "UNKNOWN_ERROR"
        );
    }
    if (args.human) {
      process.stdout.write(toHuman(result));
    } else {
      printJson(result);
    }
    if (result.valid === false) process.exitCode = 1;
  } catch (err) {
    printJson({ valid: false, error_code: err.code || "UNKNOWN_ERROR", message: err.message });
    process.exitCode = 1;
  }
}

export { toHuman };

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
