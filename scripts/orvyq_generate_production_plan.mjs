#!/usr/bin/env node
import path from "node:path";
import {
  projectDir,
  readJson,
  readJsonSafe,
  writeJsonAtomic,
  pathExists,
  parseArgs,
  printJson,
} from "./lib/fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";
import { buildOrvyqPreviewPlan } from "./orvyq_preview_plan.mjs";

const CURRENT_PROJECT = "001-the-ai-race-no-one-can-afford-to-win";
const ACTIVE_CLAIM_STATUSES = new Set(["verified", "attributed_commentary"]);
const MOTIONS = ["push", "drift_left", "pull", "drift_right", "hold"];
const MUSIC_STATES = {
  SEC_01_RACE_PARADOX: "controlled_tension",
  SEC_02_CONTROLLED_EVIDENCE: "analytical_unease",
  SEC_03_INCENTIVE_RACE: "accelerating_pressure",
  SEC_04_REAL_WORLD_MISUSE: "procedural_threat",
  SEC_05_WORK_AND_CONCENTRATION: "uncertain_transition",
  SEC_06_REGULATION_PARADOX: "institutional_gravity",
  SEC_07_OPEN_CLOSED: "balanced_tension",
  SEC_08_SAFETY_ARCHITECTURE: "constructive_momentum",
  SEC_09_FINAL_PARADOX: "reflective_resolution",
};

const LEGACY_SECTION_SCENES = {
  [CURRENT_PROJECT]: [
    ["SEC_01_RACE_PARADOX", "scene_001", "scene_003"],
    ["SEC_02_CONTROLLED_EVIDENCE", "scene_003", "scene_007"],
    ["SEC_03_INCENTIVE_RACE", "scene_007", "scene_011"],
    ["SEC_04_REAL_WORLD_MISUSE", "scene_011", "scene_016"],
    ["SEC_05_WORK_AND_CONCENTRATION", "scene_016", "scene_018"],
    ["SEC_06_REGULATION_PARADOX", "scene_018", "scene_022"],
    ["SEC_07_OPEN_CLOSED", "scene_022", "scene_026"],
    ["SEC_08_SAFETY_ARCHITECTURE", "scene_026", "scene_031"],
    ["SEC_09_FINAL_PARADOX", "scene_031", null],
  ],
};

function clampText(value, max = 96) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
}

function splitFrames(totalFrames) {
  const pattern = [174, 210, 186, 228, 198, 162, 216];
  const chunks = [];
  let remaining = totalFrames;
  let index = 0;
  while (remaining > 240) {
    let take = Math.min(pattern[index % pattern.length], 240);
    if (remaining - take < 72) take = remaining - 72;
    take = Math.max(72, Math.min(240, take));
    chunks.push(take);
    remaining -= take;
    index += 1;
  }
  if (remaining > 0) {
    if (remaining < 72 && chunks.length && chunks.at(-1) + remaining <= 240) chunks[chunks.length - 1] += remaining;
    else chunks.push(remaining);
  }
  return chunks;
}

function sceneNumber(sceneId) {
  return Number.parseInt(String(sceneId).replace(/\D/g, ""), 10);
}

function buildSectionRanges(projectId, composition, storyboard, evidenceMap) {
  const sceneById = new Map(composition.scenes.map((scene) => [scene.scene_id, scene]));
  const evidenceSections = new Map((evidenceMap.sections || []).map((section) => [section.section_id, section]));
  const declared = storyboard.scenes.every((scene) => typeof scene.section_id === "string" && scene.section_id);

  if (declared) {
    const orderedIds = [];
    for (const scene of storyboard.scenes) if (!orderedIds.includes(scene.section_id)) orderedIds.push(scene.section_id);
    return orderedIds.map((sectionId, index) => {
      const members = storyboard.scenes.filter((scene) => scene.section_id === sectionId);
      const first = sceneById.get(members[0].scene_id);
      const nextSectionFirst = storyboard.scenes.find((scene) => scene.section_id === orderedIds[index + 1]);
      const end = nextSectionFirst ? sceneById.get(nextSectionFirst.scene_id).start_frame : composition.duration_frames;
      const metadata = evidenceSections.get(sectionId) || {};
      return {
        section_id: sectionId,
        start_frame: first.start_frame,
        end_frame: end,
        dramatic_function: metadata.dramatic_function || members.map((scene) => scene.purpose).join(" "),
        music_state: MUSIC_STATES[sectionId] || "controlled_evolution",
        required_visual_mix: metadata.required_visual_mix || null,
      };
    });
  }

  const migration = LEGACY_SECTION_SCENES[projectId];
  if (!migration) throw new Error("Storyboard scenes require section_id before a canonical production plan can be generated");
  return migration.map(([sectionId, firstSceneId, nextSceneId]) => {
    const first = sceneById.get(firstSceneId);
    const end = nextSceneId ? sceneById.get(nextSceneId).start_frame : composition.duration_frames;
    const metadata = evidenceSections.get(sectionId) || {};
    if (!first || !Number.isFinite(end)) throw new Error(`Invalid legacy section mapping for ${sectionId}`);
    return {
      section_id: sectionId,
      start_frame: first.start_frame,
      end_frame: end,
      dramatic_function: metadata.dramatic_function || metadata.title || `Editorial section ${sectionId}`,
      music_state: MUSIC_STATES[sectionId] || "controlled_evolution",
      required_visual_mix: metadata.required_visual_mix || null,
    };
  });
}

function sectionForFrame(sections, frame) {
  return sections.find((section) => frame >= section.start_frame && frame < section.end_frame) || sections.at(-1);
}

function sourceLabel(sourceIds, sourceById) {
  const labels = sourceIds.map((id) => {
    const source = sourceById.get(id);
    if (!source) return id;
    const year = String(source.publication_date || "").slice(0, 4);
    return `${source.publisher}${year ? ` · ${year}` : ""}`;
  });
  return labels.join("  |  ");
}

function claimLimitation(claim, sourceById) {
  const sourceLimit = (claim.source_ids || []).map((id) => sourceById.get(id)?.limitation).find(Boolean);
  return clampText(sourceLimit || claim.evidence_requirements?.at(-1) || "Source evidence supports the stated claim; broader conclusions remain limited.", 150);
}

function evidenceSpec({ claim, sourceById, scene, ordinal }) {
  const sourceIds = claim.source_ids || [];
  const requirements = (claim.evidence_requirements || []).slice(0, 3);
  const kinds = ["concept_map", "boundary", "source_timeline", "evidence_chain", "comparison"];
  const kind = kinds[ordinal % kinds.length];
  const title = clampText(claim.narration_excerpt || scene.purpose || claim.claim_id, 78);
  const subtitle = clampText(scene.purpose, 128);
  const common = {
    kind,
    eyebrow: "SOURCE-BACKED EVIDENCE",
    title,
    subtitle,
    source_label: sourceLabel(sourceIds, sourceById),
    source_ids: sourceIds,
    limitation: claimLimitation(claim, sourceById),
    font_px: 32,
  };
  if (kind === "concept_map" || kind === "evidence_chain") {
    return {
      ...common,
      steps: requirements.length ? requirements.map((item) => clampText(item, 54)) : ["Claim", "Primary source", "Documented limitation"],
    };
  }
  if (kind === "boundary" || kind === "comparison") {
    return {
      ...common,
      left: "WHAT THE SOURCE SUPPORTS",
      left_detail: clampText(requirements[0] || title, 115),
      right: "WHAT IT DOES NOT PROVE",
      right_detail: common.limitation,
    };
  }
  return {
    ...common,
    items: (requirements.length ? requirements : ["Claim", "Evidence", "Limit"]).map((item, index) => ({
      label: String(index + 1).padStart(2, "0"),
      value: clampText(item, 62),
      detail: index === requirements.length - 1 ? common.limitation : undefined,
    })),
  };
}

async function approvedFootageInfo(dir, asset) {
  if (!asset) return null;
  const provenancePath = path.join(dir, `${asset}.provenance.json`);
  if (!(await pathExists(path.join(dir, asset))) || !(await pathExists(provenancePath))) return null;
  const provenance = await readJson(provenancePath);
  if (provenance.approved_for_final_edit !== true || !provenance.license_url) return null;
  const duration = Number(provenance.actual_duration_seconds || provenance.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return { duration, provenance };
}

export async function generateProductionPlan(projectId = CURRENT_PROJECT) {
  const dir = projectDir(projectId);
  const legacyPlan = await readJsonSafe(path.join(dir, "direction", "edit_plan.json"), { blacklisted_assets: [] });
  const [composition, storyboard, evidenceMap] = await Promise.all([
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "storyboard", "storyboard.json")),
    loadResolvedEvidenceMap(dir),
  ]);
  const sections = buildSectionRanges(projectId, composition, storyboard, evidenceMap);
  const sourceById = new Map((evidenceMap.source_catalog || []).map((source) => [source.source_id, source]));
  const claimsBySection = new Map();
  for (const claim of evidenceMap.claims || []) {
    if (!ACTIVE_CLAIM_STATUSES.has(claim.status)) continue;
    if (!(claim.source_ids || []).length) continue;
    const values = claimsBySection.get(claim.section_id) || [];
    values.push(claim);
    claimsBySection.set(claim.section_id, values);
  }
  for (const section of sections) {
    if (!(claimsBySection.get(section.section_id) || []).length) throw new Error(`No active sourced claim for ${section.section_id}`);
  }

  const previousCinematicProof = process.env.ORVYQ_CINEMATIC_PROOF;
  process.env.ORVYQ_CINEMATIC_PROOF = "1";
  const proofPlan = await buildOrvyqPreviewPlan(projectId);
  if (previousCinematicProof === undefined) delete process.env.ORVYQ_CINEMATIC_PROOF;
  else process.env.ORVYQ_CINEMATIC_PROOF = previousCinematicProof;

  const proofFrames = proofPlan.duration_frames;
  const blacklisted = new Set(legacyPlan.blacklisted_assets || []);
  const proofUsage = new Map();
  const proofTrimCursor = new Map();
  const shots = proofPlan.shots.map((shot, index) => {
    const section = sectionForFrame(sections, shot.start_frame);
    const claims = claimsBySection.get(section.section_id);
    const fallbackClaim = claims[index % claims.length];
    if (shot.asset_type === "footage") {
      proofUsage.set(shot.video_asset, (proofUsage.get(shot.video_asset) || 0) + 1);
      proofTrimCursor.set(shot.video_asset, Math.max(proofTrimCursor.get(shot.video_asset) || 0, Number(shot.trim_out_sec || 0)));
    }
    return {
      ...shot,
      shot_id: `shot_${String(index + 1).padStart(3, "0")}`,
      section_id: section.section_id,
      claim_id: shot.claim_id || fallbackClaim.claim_id,
      visual_role: shot.visual_role || (shot.asset_type === "graphic" ? "graphic" : "context"),
      generic_stock: shot.generic_stock === true,
      editorial_purpose: shot.editorial_purpose || "Retain the approved canonical proof image and timing exactly as reviewed.",
    };
  });

  let cursor = proofFrames;
  let generatedOrdinal = 0;
  const sceneById = new Map(composition.scenes.map((scene) => [scene.scene_id, scene]));
  const storyboardById = new Map(storyboard.scenes.map((scene) => [scene.scene_id, scene]));
  const sourceUsage = new Map(proofUsage);
  const trimCursor = new Map(proofTrimCursor);
  const footageInfoCache = new Map();

  for (const scene of composition.scenes) {
    if (scene.end_frame <= proofFrames) continue;
    const segmentStart = Math.max(scene.start_frame, proofFrames);
    const segmentEnd = scene.end_frame;
    if (segmentEnd <= segmentStart) continue;
    const section = sectionForFrame(sections, segmentStart);
    const claims = claimsBySection.get(section.section_id);
    const storyboardScene = storyboardById.get(scene.scene_id) || { purpose: `Explain ${section.dramatic_function}` };
    const chunks = splitFrames(segmentEnd - segmentStart);
    const asset = scene.video_asset || null;
    if (asset && !footageInfoCache.has(asset)) footageInfoCache.set(asset, blacklisted.has(asset) ? null : await approvedFootageInfo(dir, asset));
    const footageInfo = asset ? footageInfoCache.get(asset) : null;

    for (let localIndex = 0; localIndex < chunks.length; localIndex += 1) {
      const frames = chunks[localIndex];
      const startFrame = cursor;
      const endFrame = cursor + frames;
      const duration = frames / composition.fps;
      const claim = claims[generatedOrdinal % claims.length];
      const patternIndex = generatedOrdinal % 5;
      const wantsEvidence = patternIndex === 0 || patternIndex === 3;
      const currentUses = asset ? sourceUsage.get(asset) || 0 : 0;
      const availableStart = asset ? Math.max(Number(scene.trim_in_sec || 0), trimCursor.get(asset) || Number(scene.trim_in_sec || 0)) : 0;
      const canUseFootage = Boolean(
        !wantsEvidence &&
        footageInfo &&
        currentUses < 5 &&
        availableStart + duration <= footageInfo.duration + 0.001,
      );
      const isFinalShot = endFrame === composition.duration_frames;
      const common = {
        shot_id: `shot_${String(shots.length + 1).padStart(3, "0")}`,
        scene_id: scene.scene_id,
        section_id: section.section_id,
        start_frame: startFrame,
        end_frame: endFrame,
        claim_id: claim.claim_id,
        generic_stock: false,
        transition_in: startFrame === section.start_frame ? "dissolve" : "cut",
        transition_out: isFinalShot ? "fade" : endFrame === section.end_frame ? "dissolve" : "cut",
        text_overlay: null,
        sound_cue: null,
        emphasis_card: null,
        editorial_overlay: null,
      };

      if (isFinalShot) {
        shots.push({
          ...common,
          asset_type: "graphic",
          visual_role: "graphic",
          editorial_purpose: "Resolve the documentary on human agency and return the visual system to the ORVYQ brand.",
          graphic: {
            type: "brand_close",
            kicker: "ORVYQ",
            title: "THE RACE IS A CHOICE",
            subtitle: "Capability moves quickly. Governance is still a human decision.",
          },
          motif: "orvyq_close",
        });
      } else if (canUseFootage) {
        const trimIn = Math.round(availableStart * 1000) / 1000;
        const trimOut = Math.round((availableStart + duration) * 1000) / 1000;
        shots.push({
          ...common,
          asset_type: "footage",
          visual_role: patternIndex === 2 ? "metaphor" : "context",
          editorial_purpose: `${clampText(storyboardScene.purpose, 120)} Use licensed moving context without presenting it as literal evidence of a named event.`,
          video_asset: asset,
          trim_in_sec: trimIn,
          trim_out_sec: trimOut,
          motion_variant: MOTIONS[generatedOrdinal % MOTIONS.length],
          contextual_footage: true,
          provenance_mode: "approved_contextual_footage",
          motif: asset,
        });
        sourceUsage.set(asset, currentUses + 1);
        trimCursor.set(asset, trimOut);
      } else {
        const evidence = evidenceSpec({ claim, sourceById, scene: storyboardScene, ordinal: generatedOrdinal });
        shots.push({
          ...common,
          asset_type: "evidence",
          visual_role: "evidence",
          editorial_purpose: `${clampText(storyboardScene.purpose, 112)} Anchor the narration to an attributed source-derived visual before any metaphorical treatment.`,
          evidence: { ...evidence, provenance_mode: "source_derived_graphic" },
          motif: evidence.kind,
        });
      }

      cursor = endFrame;
      generatedOrdinal += 1;
    }
  }

  if (cursor !== composition.duration_frames) throw new Error(`Generated timeline ends at ${cursor}, expected ${composition.duration_frames}`);
  for (let index = 0; index < shots.length; index += 1) shots[index].shot_id = `shot_${String(index + 1).padStart(3, "0")}`;

  const plan = {
    schema_version: "1.0",
    project_id: projectId,
    status: "ready",
    fps: composition.fps,
    duration_frames: composition.duration_frames,
    proof: {
      type: "prefix",
      duration_frames: proofFrames,
      narration_limit_seconds: 114.2,
      minimum_human_score: 95,
    },
    art_direction: proofPlan.art_direction,
    quality_policy: {
      max_shot_seconds: 8,
      generic_stock_fraction_max: 0.25,
      evidence_and_archive_fraction_min: 0.3,
      full_screen_graphic_fraction_max: 0.1,
      max_uses_per_source: 5,
      minimum_overlay_font_px: 28,
      automatic_asset_fallback_forbidden: true,
      unrelated_stock_fallback_forbidden: true,
      keyword_only_visual_matching_forbidden: true,
      fake_data_graphics_forbidden: true,
      maximum_uninterrupted_evidence_seconds: 16,
      maximum_uninterrupted_document_seconds: 15,
      proof_is_exact_prefix: true,
      contextual_footage_must_not_claim_literal_evidence: true,
    },
    sections,
    shots,
  };

  await writeJsonAtomic(path.join(dir, "direction", "production_plan.json"), plan);
  return {
    project_id: projectId,
    duration_frames: plan.duration_frames,
    proof_frames: proofFrames,
    section_count: sections.length,
    shot_count: shots.length,
    proof_shot_count: proofPlan.shots.length,
    generated_shot_count: shots.length - proofPlan.shots.length,
    output: "direction/production_plan.json",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectId = args["project-id"] || CURRENT_PROJECT;
  try {
    const result = await generateProductionPlan(projectId);
    printJson({ ok: true, ...result });
  } catch (error) {
    printJson({ ok: false, error_code: error.code || "PRODUCTION_PLAN_INCOMPLETE", message: error.message });
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
