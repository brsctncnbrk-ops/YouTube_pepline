import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import {
  projectDir,
  readJson,
  readJsonSafe,
  writeJsonAtomic,
  pathExists,
  nowIso,
} from "./fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./orvyq-evidence.mjs";

const ALLOWED_ROLES = new Set(["evidence", "archive", "context", "metaphor", "graphic"]);
const ALLOWED_ASSET_TYPES = new Set(["footage", "evidence", "graphic"]);
const ALLOWED_TRANSITIONS = new Set(["cut", "fade", "dissolve"]);
const UNRESOLVED_STATUSES = new Set(["rewrite_required", "source_required"]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

export function productionPlanSha256(plan) {
  return createHash("sha256").update(stableStringify(plan)).digest("hex");
}

export function productionPlanPath(projectId) {
  return path.join(projectDir(projectId), "direction", "production_plan.json");
}

export function proofApprovalPath(projectId) {
  return path.join(projectDir(projectId), "qa", "proof_approval.json");
}

function fraction(frames, durationFrames) {
  return durationFrames > 0 ? Math.round((frames / durationFrames) * 10000) / 10000 : 0;
}

function issue(issues, code, message, details = null) {
  issues.push({ code, message, ...(details ? { details } : {}) });
}

function safeAssetPath(value) {
  return (
    typeof value === "string" &&
    /^assets\/(footage|images|evidence)\/[A-Za-z0-9._/-]+$/.test(value) &&
    !value.includes("..")
  );
}

export async function validateProductionPlan({ projectId, requireReady = true } = {}) {
  const dir = projectDir(projectId);
  const planPath = productionPlanPath(projectId);
  const issues = [];

  if (!(await pathExists(planPath))) {
    return {
      valid: false,
      error_code: "PRODUCTION_PLAN_INCOMPLETE",
      issues: [{ code: "MISSING_PLAN", message: "direction/production_plan.json is missing" }],
    };
  }

  const [plan, composition, evidenceMap] = await Promise.all([
    readJson(planPath),
    readJson(path.join(dir, "remotion", "composition.json")),
    loadResolvedEvidenceMap(dir),
  ]);

  if (plan.schema_version !== "1.0") issue(issues, "SCHEMA_VERSION", "production plan schema_version must be 1.0");
  if (plan.project_id !== projectId) issue(issues, "PROJECT_ID", "production plan project_id does not match the requested project");
  if (requireReady && plan.status !== "ready") issue(issues, "PLAN_NOT_READY", `production plan status is ${plan.status || "missing"}, expected ready`);
  if (plan.fps !== composition.fps) issue(issues, "FPS_MISMATCH", "production plan fps does not match composition fps");
  if (plan.duration_frames !== composition.duration_frames) {
    issue(issues, "DURATION_MISMATCH", "production plan duration_frames does not match composition duration_frames", {
      plan: plan.duration_frames,
      composition: composition.duration_frames,
    });
  }

  const quality = plan.quality_policy || {};
  const maxShotFrames = Math.round(Number(quality.max_shot_seconds || 8) * Number(plan.fps || 30));
  const activeClaims = new Map(
    (evidenceMap.claims || [])
      .filter((claim) => claim.status !== "removed")
      .map((claim) => [claim.claim_id, claim]),
  );
  const unresolved = (evidenceMap.claims || []).filter((claim) => UNRESOLVED_STATUSES.has(claim.status));
  if (unresolved.length) {
    issue(issues, "UNRESOLVED_CLAIMS", "research still contains unresolved full-film claims", unresolved.map((claim) => claim.claim_id));
  }

  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  if (!sections.length) issue(issues, "NO_SECTIONS", "production plan requires sections[]");
  let sectionCursor = 0;
  const sectionIds = new Set();
  for (const section of sections) {
    if (sectionIds.has(section.section_id)) issue(issues, "DUPLICATE_SECTION", `duplicate section_id ${section.section_id}`);
    sectionIds.add(section.section_id);
    if (section.start_frame !== sectionCursor) issue(issues, "SECTION_GAP", `${section.section_id} must start at frame ${sectionCursor}`);
    if (!(section.end_frame > section.start_frame)) issue(issues, "SECTION_DURATION", `${section.section_id} has an invalid frame range`);
    sectionCursor = section.end_frame;
  }
  if (sectionCursor !== plan.duration_frames) issue(issues, "SECTION_COVERAGE", "sections do not cover the complete production timeline");

  const shots = Array.isArray(plan.shots) ? plan.shots : [];
  if (!shots.length) issue(issues, "NO_SHOTS", "production plan requires explicit shots[]");
  let cursor = 0;
  const shotIds = new Set();
  const sourceUsage = new Map();
  let genericFrames = 0;
  let evidenceArchiveFrames = 0;
  let graphicFrames = 0;

  for (const shot of shots) {
    if (shotIds.has(shot.shot_id)) issue(issues, "DUPLICATE_SHOT", `duplicate shot_id ${shot.shot_id}`);
    shotIds.add(shot.shot_id);
    if (shot.start_frame !== cursor) issue(issues, "SHOT_GAP", `${shot.shot_id} must start at frame ${cursor}`);
    if (!(shot.end_frame > shot.start_frame)) issue(issues, "SHOT_DURATION", `${shot.shot_id} has an invalid frame range`);
    const shotFrames = shot.end_frame - shot.start_frame;
    if (shotFrames > maxShotFrames) issue(issues, "SHOT_TOO_LONG", `${shot.shot_id} exceeds max_shot_seconds`);
    cursor = shot.end_frame;

    if (!sectionIds.has(shot.section_id)) issue(issues, "UNKNOWN_SECTION", `${shot.shot_id} references unknown section ${shot.section_id}`);
    if (!activeClaims.has(shot.claim_id)) issue(issues, "UNKNOWN_CLAIM", `${shot.shot_id} references unknown or removed claim ${shot.claim_id}`);
    if (!ALLOWED_ROLES.has(shot.visual_role)) issue(issues, "VISUAL_ROLE", `${shot.shot_id} has invalid visual_role ${shot.visual_role}`);
    if (!ALLOWED_ASSET_TYPES.has(shot.asset_type)) issue(issues, "ASSET_TYPE", `${shot.shot_id} has invalid asset_type ${shot.asset_type}`);
    if (!ALLOWED_TRANSITIONS.has(shot.transition_in) || !ALLOWED_TRANSITIONS.has(shot.transition_out)) {
      issue(issues, "TRANSITION", `${shot.shot_id} has an invalid transition`);
    }
    if (!shot.editorial_purpose || shot.editorial_purpose.trim().length < 18) {
      issue(issues, "EDITORIAL_PURPOSE", `${shot.shot_id} needs a specific editorial_purpose`);
    }

    if (shot.generic_stock === true) genericFrames += shotFrames;
    if (shot.visual_role === "evidence" || shot.visual_role === "archive") evidenceArchiveFrames += shotFrames;
    if (shot.asset_type === "graphic") graphicFrames += shotFrames;

    if (shot.asset_type === "footage") {
      if (!safeAssetPath(shot.video_asset)) issue(issues, "UNSAFE_ASSET_PATH", `${shot.shot_id} has an unsafe video_asset path`);
      else if (!(await pathExists(path.join(dir, shot.video_asset)))) issue(issues, "MISSING_ASSET", `${shot.shot_id} footage is missing: ${shot.video_asset}`);
      const durationSeconds = shotFrames / plan.fps;
      if (!Number.isFinite(shot.trim_in_sec) || !Number.isFinite(shot.trim_out_sec) || shot.trim_in_sec < 0 || shot.trim_out_sec <= shot.trim_in_sec) {
        issue(issues, "TRIM", `${shot.shot_id} has an invalid footage trim`);
      } else if (Math.abs(shot.trim_out_sec - shot.trim_in_sec - durationSeconds) > 0.04) {
        issue(issues, "TRIM_DURATION", `${shot.shot_id} footage trim does not match its timeline duration`);
      }
      sourceUsage.set(shot.video_asset, (sourceUsage.get(shot.video_asset) || 0) + 1);
    }

    if (shot.asset_type === "evidence") {
      const evidence = shot.evidence || {};
      if (!Array.isArray(evidence.source_ids) || !evidence.source_ids.length || !evidence.source_label) {
        issue(issues, "EVIDENCE_ATTRIBUTION", `${shot.shot_id} lacks visible source attribution`);
      }
      const images = evidence.image_assets || [];
      const ids = evidence.evidence_asset_ids || [];
      if (images.length !== ids.length) issue(issues, "EVIDENCE_PAIRING", `${shot.shot_id} must pair image_assets and evidence_asset_ids`);
      for (const asset of images) {
        if (!safeAssetPath(asset)) issue(issues, "UNSAFE_ASSET_PATH", `${shot.shot_id} has an unsafe evidence asset path`);
        else if (!(await pathExists(path.join(dir, asset)))) issue(issues, "MISSING_ASSET", `${shot.shot_id} evidence is missing: ${asset}`);
        sourceUsage.set(asset, (sourceUsage.get(asset) || 0) + 1);
      }
      for (const sourceId of evidence.source_ids || []) {
        const sourceKey = `source:${sourceId}`;
        sourceUsage.set(sourceKey, (sourceUsage.get(sourceKey) || 0) + 1);
      }
    }

    if (shot.asset_type === "graphic") {
      if (!shot.graphic?.type || !shot.graphic?.title) issue(issues, "GRAPHIC", `${shot.shot_id} graphic requires type and title`);
    }
  }

  if (cursor !== plan.duration_frames) issue(issues, "TIMELINE_COVERAGE", "shots do not cover the complete production timeline");

  const proofFrames = Number(plan.proof?.duration_frames || 0);
  if (!(proofFrames > 0 && proofFrames < plan.duration_frames)) issue(issues, "PROOF_DURATION", "proof.duration_frames must be inside the full timeline");
  const proofBoundary = shots.some((shot) => shot.end_frame === proofFrames);
  const crossingProof = shots.find((shot) => shot.start_frame < proofFrames && shot.end_frame > proofFrames);
  if (!proofBoundary || crossingProof) issue(issues, "PROOF_BOUNDARY", "proof prefix must end on an exact canonical shot boundary");

  const maxUses = Number(quality.max_uses_per_source || 2);
  for (const [source, uses] of sourceUsage) {
    if (uses > maxUses) issue(issues, "SOURCE_REUSE", `${source} is used ${uses} times; maximum is ${maxUses}`);
  }

  const fractions = {
    generic_stock: fraction(genericFrames, plan.duration_frames),
    evidence_and_archive: fraction(evidenceArchiveFrames, plan.duration_frames),
    full_screen_graphic: fraction(graphicFrames, plan.duration_frames),
  };
  if (fractions.generic_stock > Number(quality.generic_stock_fraction_max)) {
    issue(issues, "GENERIC_STOCK_FRACTION", "generic stock fraction exceeds the production policy", fractions);
  }
  if (fractions.evidence_and_archive < Number(quality.evidence_and_archive_fraction_min)) {
    issue(issues, "EVIDENCE_FRACTION", "evidence/archive fraction is below the production policy", fractions);
  }
  if (fractions.full_screen_graphic > Number(quality.full_screen_graphic_fraction_max)) {
    issue(issues, "GRAPHIC_FRACTION", "full-screen graphic fraction exceeds the production policy", fractions);
  }

  return {
    valid: issues.length === 0,
    error_code: issues.length ? "PRODUCTION_PLAN_INCOMPLETE" : null,
    plan_sha256: productionPlanSha256(plan),
    shot_count: shots.length,
    section_count: sections.length,
    fractions,
    source_usage: Object.fromEntries(sourceUsage),
    issues,
    plan,
  };
}

export async function validateProofApproval({ projectId } = {}) {
  const planCheck = await validateProductionPlan({ projectId, requireReady: true });
  if (!planCheck.valid) return { valid: false, error_code: planCheck.error_code, plan_check: planCheck, issues: planCheck.issues };

  const approval = await readJsonSafe(proofApprovalPath(projectId), null);
  const issues = [];
  if (!approval) {
    issue(issues, "MISSING_APPROVAL", "qa/proof_approval.json is missing");
  } else {
    if (approval.schema_version !== "1.0") issue(issues, "APPROVAL_SCHEMA", "proof approval schema_version must be 1.0");
    if (approval.project_id !== projectId) issue(issues, "APPROVAL_PROJECT", "proof approval project_id does not match");
    if (approval.approved !== true || approval.review_type !== "human_rendered_video_review") {
      issue(issues, "HUMAN_REVIEW", "proof requires an explicit human rendered-video approval");
    }
    if (Number(approval.human_score) < Number(planCheck.plan.proof.minimum_human_score)) {
      issue(issues, "HUMAN_SCORE", `proof score ${approval.human_score} is below ${planCheck.plan.proof.minimum_human_score}`);
    }
    if (!/^[0-9a-f]{40}$/.test(String(approval.render_source_sha || ""))) issue(issues, "SOURCE_SHA", "proof approval lacks a valid render source SHA");
    if (approval.production_plan_sha256 !== planCheck.plan_sha256) {
      issue(issues, "PLAN_DRIFT", "production plan changed after the proof was approved", {
        approved: approval.production_plan_sha256,
        current: planCheck.plan_sha256,
      });
    }
  }

  return {
    valid: issues.length === 0,
    error_code: issues.some((entry) => entry.code === "PLAN_DRIFT") ? "PROOF_PLAN_DRIFT" : issues.length ? "PROOF_APPROVAL_REQUIRED" : null,
    plan_sha256: planCheck.plan_sha256,
    approval,
    issues,
  };
}

export async function writeProofApproval({ projectId, proofRunId, humanScore, renderSourceSha, reviewNotes = "" } = {}) {
  const planCheck = await validateProductionPlan({ projectId, requireReady: true });
  if (!planCheck.valid) {
    const error = new Error(`Production plan is not ready: ${planCheck.issues.map((entry) => entry.message).join("; ")}`);
    error.code = "PRODUCTION_PLAN_INCOMPLETE";
    throw error;
  }
  if (Number(humanScore) < Number(planCheck.plan.proof.minimum_human_score)) {
    const error = new Error(`Human proof score must be at least ${planCheck.plan.proof.minimum_human_score}`);
    error.code = "PROOF_APPROVAL_REQUIRED";
    throw error;
  }
  if (!/^[0-9a-f]{40}$/.test(String(renderSourceSha || ""))) {
    const error = new Error("--render-source-sha must be a 40-character commit SHA");
    error.code = "PROOF_APPROVAL_REQUIRED";
    throw error;
  }

  const approval = {
    schema_version: "1.0",
    project_id: projectId,
    approved: true,
    review_type: "human_rendered_video_review",
    human_score: Number(humanScore),
    proof_run_id: String(proofRunId),
    render_source_sha: String(renderSourceSha),
    production_plan_sha256: planCheck.plan_sha256,
    approved_at: nowIso(),
    review_notes: String(reviewNotes || ""),
  };
  await writeJsonAtomic(proofApprovalPath(projectId), approval);
  return approval;
}

export async function buildEditPlanFromProduction({ projectId, mode = "full" } = {}) {
  if (!new Set(["proof", "full"]).has(mode)) throw new Error(`Unknown ORVYQ production mode ${mode}`);
  const check = await validateProductionPlan({ projectId, requireReady: true });
  if (!check.valid) {
    const error = new Error(check.issues.map((entry) => entry.message).join("; "));
    error.code = check.error_code;
    throw error;
  }

  if (mode === "full") {
    const approvalCheck = await validateProofApproval({ projectId });
    if (!approvalCheck.valid) {
      const error = new Error(approvalCheck.issues.map((entry) => entry.message).join("; "));
      error.code = approvalCheck.error_code;
      throw error;
    }
  }

  const plan = check.plan;
  const durationFrames = mode === "proof" ? plan.proof.duration_frames : plan.duration_frames;
  const shots = plan.shots
    .filter((shot) => shot.end_frame <= durationFrames)
    .map((shot) => ({ ...shot }));

  const compiled = {
    schema_version: "8.0-canonical-production-plan",
    project_id: projectId,
    fps: plan.fps,
    duration_frames: durationFrames,
    preview: mode === "proof",
    render_mode: mode,
    production_plan_sha256: check.plan_sha256,
    audio_mix_asset: "assets/audio/final_mix.mp3",
    captions_asset: "remotion/captions.json",
    art_direction: plan.art_direction || null,
    quality_policy: {
      ...plan.quality_policy,
      canonical_full_plan_required: true,
      proof_is_exact_prefix_of_full_plan: true,
      approval_invalidated_on_plan_change: true,
    },
    sections: plan.sections.filter((section) => section.start_frame < durationFrames).map((section) => ({
      ...section,
      end_frame: Math.min(section.end_frame, durationFrames),
    })),
    source_usage: check.source_usage,
    shots,
  };

  await writeJsonAtomic(path.join(projectDir(projectId), "direction", "edit_plan.json"), compiled);
  return compiled;
}

export async function writeProductionAudit({ projectId, output = "qa/production_plan_audit.json" } = {}) {
  const result = await validateProductionPlan({ projectId, requireReady: true });
  const serializable = { ...result };
  delete serializable.plan;
  await writeJsonAtomic(path.join(projectDir(projectId), output), serializable);
  return result;
}

export async function readProductionPlanRaw(projectId) {
  return fs.readFile(productionPlanPath(projectId), "utf8");
}
