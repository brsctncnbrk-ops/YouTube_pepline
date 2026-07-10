#!/usr/bin/env node
/**
 * Deterministic mechanical checks backing the FactForge QA gates: JSON schema
 * validity, relative-path enforcement, filename conventions, and asset
 * existence. Judgment calls (hook strength, natural English, prompt
 * creativity, etc.) belong in the LLM-driven QA skills, not here.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
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
import { lookupClaim } from "./lib/fact-registry.mjs";

/**
 * Living list (per the migration plan, section 6) - extend as real false
 * positives/negatives surface during use. Scanned case-insensitively against
 * scripts/script.md: the script must read confident and fluent, with
 * verification happening in the separate factforge-fact-audit pass, never as
 * an inline hedge in the prose itself.
 */
export const BANNED_HEDGE_TOKENS = [
  "TBD",
  "it's unclear",
  "may or may not",
  "allegedly",
  "reportedly",
  "some say",
  "sources suggest",
  "it seems",
  "possibly",
  "perhaps",
];

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
 * Resolves, per storyboard scene, whether the render pipeline expects a
 * footage clip (assets/footage/<id>.mp4) or an AI-fallback still
 * (assets/images/<id>.png), and checks the corresponding file exists. A
 * scene with no footage_manifest.json entry at all is treated as
 * fallback (defensive default - matches pre-footage-retrieval behavior for
 * any project state where the manifest hasn't been written yet).
 */
export async function validateVisualAssets({ projectId }) {
  const dir = projectDir(projectId);
  const storyboardPath = path.join(dir, "storyboard", "storyboard.json");
  const footagePath = path.join(dir, "footage", "footage_manifest.json");

  const storyboard = await readJsonSafe(storyboardPath, null);
  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    return { valid: true, missing: [], note: "storyboard.json not present yet" };
  }
  const footageManifest = await readJsonSafe(footagePath, null);
  const footageByScene = new Map((footageManifest?.scenes || []).map((s) => [s.scene_id, s]));

  const missing = [];
  for (const scene of storyboard.scenes) {
    if (!/^scene_[0-9]{3}$/.test(scene.scene_id || "")) continue;
    const entry = footageByScene.get(scene.scene_id);
    const useFallback = !entry || entry.fallback_to_ai_visual;
    const rel = useFallback ? `assets/images/${scene.scene_id}.png` : `assets/footage/${scene.scene_id}.mp4`;
    if (!(await pathExists(path.join(dir, rel)))) missing.push(rel);
  }

  return { valid: missing.length === 0, missing };
}

export async function validateAssets({ projectId, check = "all" }) {
  const dir = projectDir(projectId);
  const missing = [];

  if (check === "audio" || check === "all") {
    const audioPath = path.join(dir, GATES.audio.requiredFile);
    if (!(await pathExists(audioPath))) missing.push(GATES.audio.requiredFile);
  }

  if (check === "visual_assets" || check === "all") {
    const visualCheck = await validateVisualAssets({ projectId });
    missing.push(...visualCheck.missing);
  }

  return {
    valid: missing.length === 0,
    error_code: missing.length === 0 ? null : check === "audio" ? "MISSING_AUDIO" : "MISSING_VISUAL_ASSET",
    missing,
  };
}

/**
 * Checks that footage/footage_manifest.json fully covers the storyboard's
 * scenes, and that every non-fallback entry carries complete provenance
 * (source/license/selected_url/reasoning) - the "evidence of deliberate
 * editorial choice" record the migration plan requires, not just a
 * keyword-match log. Also confirms every entry either passed the duration/
 * resolution hard filters (has native_duration_sec/native_resolution) or is
 * flagged fallback_to_ai_visual - there's no third option.
 */
export async function validateFootageCoverage({ projectId }) {
  const dir = projectDir(projectId);
  const storyboardPath = path.join(dir, "storyboard", "storyboard.json");
  const footagePath = path.join(dir, "footage", "footage_manifest.json");

  const storyboard = await readJsonSafe(storyboardPath, null);
  if (!storyboard || !Array.isArray(storyboard.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["storyboard.json missing or has no scenes[]"] };
  }
  const footage = await readJsonSafe(footagePath, null);
  if (!footage || !Array.isArray(footage.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["footage_manifest.json missing or has no scenes[]"] };
  }

  const issues = [];
  const storyboardIds = new Set(storyboard.scenes.map((s) => s.scene_id));
  const footageById = new Map(footage.scenes.map((s) => [s.scene_id, s]));

  for (const id of storyboardIds) {
    const entry = footageById.get(id);
    if (!entry) {
      issues.push({ scene_id: id, reason: "no matching entry in footage_manifest.json" });
      continue;
    }
    if (!entry.fallback_to_ai_visual) {
      if (!entry.source || !entry.license || !entry.selected_url || !entry.reasoning) {
        issues.push({ scene_id: id, reason: "missing source/license/selected_url/reasoning provenance" });
      }
      if (entry.native_duration_sec == null || !entry.native_resolution) {
        issues.push({ scene_id: id, reason: "not fallback_to_ai_visual but missing native_duration_sec/native_resolution - did it actually pass the hard filters?" });
      }
    }
  }
  for (const id of footageById.keys()) {
    if (!storyboardIds.has(id)) {
      issues.push({ scene_id: id, reason: "footage_manifest.json has an entry with no matching storyboard scene" });
    }
  }

  return { valid: issues.length === 0, error_code: issues.length ? "BROKEN_ASSET_PATH" : null, issues };
}

/**
 * Checks that prompts/visual_prompts.json covers exactly the scenes flagged
 * fallback_to_ai_visual in footage_manifest.json - since footage_retrieval,
 * visual_prompt only writes fallback scenes (possibly zero), not every
 * storyboard scene. Deliberately does NOT check whether
 * assets/images/scene_NNN.png actually exist yet: at the point visual_qa
 * runs, the human hasn't generated them in Leonardo AI - that only happens
 * after this gate passes, checked separately by the visual_assets gate
 * (GATES.visual_assets) right before the "director" stage.
 */
export async function validatePromptCoverage({ projectId }) {
  const dir = projectDir(projectId);
  const promptsPath = path.join(dir, "prompts", "visual_prompts.json");
  const footagePath = path.join(dir, "footage", "footage_manifest.json");

  const prompts = await readJsonSafe(promptsPath, null);
  if (!prompts || !Array.isArray(prompts.scenes)) {
    return { valid: false, error_code: "INVALID_JSON", issues: ["visual_prompts.json missing or has no scenes[]"] };
  }
  const footage = await readJsonSafe(footagePath, null);
  const fallbackIds = new Set((footage?.scenes || []).filter((s) => s.fallback_to_ai_visual).map((s) => s.scene_id));

  const issues = [];
  const promptById = new Map(prompts.scenes.map((s) => [s.scene_id, s]));

  for (const id of fallbackIds) {
    const entry = promptById.get(id);
    if (!entry) {
      issues.push({ scene_id: id, reason: "flagged fallback_to_ai_visual in footage_manifest.json but no matching entry in visual_prompts.json" });
      continue;
    }
    const expectedFilename = `${id}.png`;
    if (entry.image_filename !== expectedFilename) {
      issues.push({ scene_id: id, reason: `image_filename "${entry.image_filename}" does not match expected "${expectedFilename}"` });
    }
  }
  for (const id of promptById.keys()) {
    if (!fallbackIds.has(id)) {
      issues.push({ scene_id: id, reason: "visual_prompts.json has an entry for a scene not flagged fallback_to_ai_visual in footage_manifest.json" });
    }
  }

  return { valid: issues.length === 0, error_code: issues.length ? "BROKEN_ASSET_PATH" : null, issues };
}

/**
 * Checks that factforge-fact-audit's report is complete before script_qa may
 * approve the script's structure: fact_audit/claims.json must schema-validate,
 * unresolved_count must be 0, and every claim marked "verified" must still
 * have a non-expired entry in the shared fact_registry/ (a claim verified
 * long ago whose re_verify_after has since passed is treated as needing
 * fresh verification, not as still-settled).
 */
export async function validateFactAudit({ projectId }) {
  const dir = projectDir(projectId);
  const claimsPath = path.join(dir, "fact_audit", "claims.json");
  if (!(await pathExists(claimsPath))) {
    return { valid: false, error_code: "UNRESOLVED_CLAIM", issues: ["fact_audit/claims.json not found - factforge-fact-audit has not run yet"] };
  }

  const schemaResult = await validateSchema({ file: claimsPath, schema: "fact_audit" });
  if (!schemaResult.valid) {
    return { valid: false, error_code: schemaResult.error_code, issues: schemaResult.errors };
  }

  const claims = await readJsonSafe(claimsPath, null);
  const issues = [];
  if (claims.unresolved_count !== 0) {
    issues.push(`unresolved_count is ${claims.unresolved_count}, must be 0 before script_qa may approve`);
  }
  for (const claim of claims.claims || []) {
    if (claim.verification_status !== "verified") continue;
    const registryEntry = await lookupClaim(claim.claim_text);
    if (!registryEntry || registryEntry.expired) {
      issues.push(`claim "${claim.claim_text}" has no non-expired fact_registry entry - must be re-verified`);
    }
  }

  return {
    valid: issues.length === 0,
    error_code: issues.length ? "UNRESOLVED_CLAIM" : null,
    unresolved_count: claims.unresolved_count,
    issues,
  };
}

/**
 * Zero TBD/hedge tokens anywhere in the final script text - one of
 * factforge-final-qa's mechanical checks. Scans scripts/script.md against
 * BANNED_HEDGE_TOKENS case-insensitively.
 */
export async function validateNoHedgeTokens({ projectId }) {
  const dir = projectDir(projectId);
  const scriptPath = path.join(dir, "scripts", "script.md");
  if (!(await pathExists(scriptPath))) {
    return { valid: false, error_code: "UNKNOWN_ERROR", matches: [], note: "scripts/script.md not found" };
  }
  const text = await fs.readFile(scriptPath, "utf8");
  const matches = [];
  for (const token of BANNED_HEDGE_TOKENS) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = Math.max(0, m.index - 30);
      const end = Math.min(text.length, m.index + token.length + 30);
      matches.push({ token, context: text.slice(start, end).replace(/\s+/g, " ").trim() });
    }
  }
  return { valid: matches.length === 0, error_code: matches.length ? "UNKNOWN_ERROR" : null, matches };
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

export async function validateRenderReady({ projectId }) {
  const dir = projectDir(projectId);
  const checks = {};

  checks.audio = await validateAssets({ projectId, check: "audio" });
  checks.visual_assets = await validateAssets({ projectId, check: "visual_assets" });
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
  if (!checks.visual_assets.valid) reasons.push("MISSING_VISUAL_ASSET: " + checks.visual_assets.missing.join(", "));
  if (!checks.paths.valid) reasons.push("BROKEN_ASSET_PATH: absolute/invalid paths found");
  if (!checks.filenames.valid) reasons.push("BROKEN_ASSET_PATH: scene filename/numbering issues");
  if (!checks.render_ready_project_exists) reasons.push("RENDER_CONFIG_MISSING: remotion/render_ready_project/ not built yet");
  if (!checks.remotion_configs_complete) reasons.push("RENDER_CONFIG_MISSING: " + checks.missing_remotion_configs.join(", "));
  if (!checks.github_workflow_present) reasons.push("RENDER_CONFIG_MISSING: .github/workflows/render.yml not present yet");

  return { valid: reasons.length === 0, checks, reasons };
}

const SCHEMA_BY_STAGE = {
  research_qa: [{ file: "research/research.json", schema: "research" }],
  script_qa: [
    { file: "scripts/script_metadata.json", schema: "script" },
    { file: "fact_audit/claims.json", schema: "fact_audit" },
  ],
  voice_qa: [], // voice_script.txt/voice_notes.md are plain text, no JSON schema target - this gate is judgment-only
  storyboard_qa: [{ file: "storyboard/storyboard.json", schema: "storyboard" }],
  visual_qa: [
    { file: "prompts/visual_prompts.json", schema: "visual_prompts" },
    { file: "footage/footage_manifest.json", schema: "footage_manifest" },
  ],
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

  let assetCheck = { valid: true, missing: [] };
  if (stage === "storyboard_qa") assetCheck = await validateAssets({ projectId, check: "audio" });
  if (stage === "render_qa") return { ...(await validateRenderReady({ projectId })), schemaChecks };

  let filenamesCheck = { valid: true, issues: [] };
  if (stage === "storyboard_qa") filenamesCheck = await validateFilenames({ projectId });

  let coverageCheck = { valid: true, issues: [] };
  if (stage === "visual_qa") coverageCheck = await validatePromptCoverage({ projectId });

  let footageCheck = { valid: true, issues: [] };
  if (stage === "visual_qa") footageCheck = await validateFootageCoverage({ projectId });

  let packagingCheck = { valid: true, missing: [] };
  if (stage === "final_qa") packagingCheck = await validatePackaging({ projectId });

  // Re-checked here as a script_qa precondition (belt-and-suspenders): the
  // script structure must not be approved on a pre-audit draft. factforge-
  // fact-audit itself already hard-blocks via UNRESOLVED_CLAIM before
  // advancing to script_qa, so this should never actually fail in practice.
  let factAuditCheck = { valid: true, issues: [] };
  if (stage === "script_qa") factAuditCheck = await validateFactAudit({ projectId });

  const valid =
    schemaChecks.every((c) => c.valid) &&
    assetCheck.valid &&
    filenamesCheck.valid &&
    coverageCheck.valid &&
    footageCheck.valid &&
    packagingCheck.valid &&
    factAuditCheck.valid;
  return { valid, schemaChecks, assetCheck, filenamesCheck, coverageCheck, footageCheck, packagingCheck, factAuditCheck };
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
  if (result.coverageCheck) {
    lines.push(`- Prompt-to-scene coverage (fallback scenes only): ${result.coverageCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.coverageCheck.issues)}`);
  }
  if (result.footageCheck) {
    lines.push(`- Footage provenance coverage: ${result.footageCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.footageCheck.issues)}`);
  }
  if (result.packagingCheck) {
    lines.push(`- Packaging deliverables: ${result.packagingCheck.valid ? "PASS" : "FAIL - missing " + result.packagingCheck.missing.join(", ")}`);
  }
  if (result.factAuditCheck) {
    lines.push(`- Fact audit complete: ${result.factAuditCheck.valid ? "PASS" : "FAIL - " + JSON.stringify(result.factAuditCheck.issues)}`);
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
      case "assets":
        result = await validateAssets({ projectId: args["project-id"], check: args.check || "all" });
        break;
      case "render-ready":
        result = await validateRenderReady({ projectId: args["project-id"] });
        break;
      case "fact-audit":
        result = await validateFactAudit({ projectId: args["project-id"] });
        break;
      case "hedge-scan":
        result = await validateNoHedgeTokens({ projectId: args["project-id"] });
        break;
      case "all":
        result = await validateAll({ projectId: args["project-id"], stage: args.stage });
        break;
      default:
        throw new CliError(
          `Unknown validate subcommand "${group}". Use: schema|paths|filenames|assets|render-ready|fact-audit|hedge-scan|all`,
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
