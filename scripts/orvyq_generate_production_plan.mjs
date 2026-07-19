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
  nowIso,
} from "./lib/fs-utils.mjs";
import { loadResolvedEvidenceMap } from "./lib/orvyq-evidence.mjs";

const CURRENT_PROJECT = "001-the-ai-race-no-one-can-afford-to-win";
const ACTIVE_CLAIM_STATUSES = new Set(["verified", "attributed_commentary"]);
const UNRESOLVED_CLAIM_STATUSES = new Set([
  "rewrite_required",
  "source_required",
]);
const MOTIONS = ["push", "drift_left", "pull", "drift_right", "hold"];
const CAMERA_MOTIONS = [
  { type: "zoom_in", params: { from: 1, to: 1.08 } },
  { type: "pan_left", params: { magnitude: 3 } },
  { type: "zoom_out", params: { from: 1.08, to: 1 } },
  { type: "pan_right", params: { magnitude: 3 } },
  { type: "static", params: {} },
];
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
  return text.length <= max
    ? text
    : `${text.slice(0, max - 1).trim()}…`;
}

function splitFrames(totalFrames, maxFrames = 240) {
  const pattern = [174, 210, 186, 228, 198, 162, 216];
  const chunks = [];
  let remaining = totalFrames;
  let index = 0;
  while (remaining > maxFrames) {
    let take = Math.min(pattern[index % pattern.length], maxFrames);
    if (remaining - take < 72) take = remaining - 72;
    take = Math.max(72, Math.min(maxFrames, take));
    chunks.push(take);
    remaining -= take;
    index += 1;
  }
  if (remaining > 0) {
    if (
      remaining < 72 &&
      chunks.length &&
      chunks.at(-1) + remaining <= maxFrames
    ) {
      chunks[chunks.length - 1] += remaining;
    } else {
      chunks.push(remaining);
    }
  }
  return chunks;
}

function buildSectionRanges(projectId, composition, storyboard, evidenceMap) {
  const sceneById = new Map(
    composition.scenes.map((scene) => [scene.scene_id, scene]),
  );
  const evidenceSections = new Map(
    (evidenceMap.sections || []).map((section) => [
      section.section_id,
      section,
    ]),
  );
  const declared = storyboard.scenes.every(
    (scene) => typeof scene.section_id === "string" && scene.section_id,
  );

  if (declared) {
    const orderedIds = [];
    for (const scene of storyboard.scenes) {
      if (!orderedIds.includes(scene.section_id)) orderedIds.push(scene.section_id);
    }
    return orderedIds.map((sectionId, index) => {
      const members = storyboard.scenes.filter(
        (scene) => scene.section_id === sectionId,
      );
      const first = sceneById.get(members[0].scene_id);
      const nextSectionFirst = storyboard.scenes.find(
        (scene) => scene.section_id === orderedIds[index + 1],
      );
      const end = nextSectionFirst
        ? sceneById.get(nextSectionFirst.scene_id).start_frame
        : composition.duration_frames;
      const metadata = evidenceSections.get(sectionId) || {};
      return {
        section_id: sectionId,
        start_frame: first.start_frame,
        end_frame: end,
        dramatic_function:
          metadata.dramatic_function ||
          members.map((scene) => scene.purpose).join(" "),
        music_state: MUSIC_STATES[sectionId] || "controlled_evolution",
        required_visual_mix: metadata.required_visual_mix || null,
      };
    });
  }

  const migration = LEGACY_SECTION_SCENES[projectId];
  if (!migration) {
    throw new Error(
      "Storyboard scenes require section_id before a canonical production plan can be generated",
    );
  }
  return migration.map(([sectionId, firstSceneId, nextSceneId]) => {
    const first = sceneById.get(firstSceneId);
    const end = nextSceneId
      ? sceneById.get(nextSceneId).start_frame
      : composition.duration_frames;
    const metadata = evidenceSections.get(sectionId) || {};
    if (!first || !Number.isFinite(end)) {
      throw new Error(`Invalid legacy section mapping for ${sectionId}`);
    }
    return {
      section_id: sectionId,
      start_frame: first.start_frame,
      end_frame: end,
      dramatic_function:
        metadata.dramatic_function ||
        metadata.title ||
        `Editorial section ${sectionId}`,
      music_state: MUSIC_STATES[sectionId] || "controlled_evolution",
      required_visual_mix: metadata.required_visual_mix || null,
    };
  });
}

function sectionForFrame(sections, frame) {
  return (
    sections.find(
      (section) => frame >= section.start_frame && frame < section.end_frame,
    ) || sections.at(-1)
  );
}

function sourceLabel(sourceIds, sourceById) {
  return sourceIds
    .map((id) => {
      const source = sourceById.get(id);
      if (!source) return id;
      const year = String(source.publication_date || "").slice(0, 4);
      return `${source.publisher}${year ? ` · ${year}` : ""}`;
    })
    .join("  |  ");
}

function claimLimitation(claim, sourceById) {
  const sourceLimit = (claim.source_ids || [])
    .map((id) => sourceById.get(id)?.limitation)
    .find(Boolean);
  return clampText(
    sourceLimit ||
      claim.evidence_requirements?.at(-1) ||
      "The cited source supports this bounded claim, not a broader prediction.",
    150,
  );
}

function evidenceSpec({ claim, sourceById, scene, ordinal }) {
  const sourceIds = claim.source_ids || [];
  const requirements = (claim.evidence_requirements || []).slice(0, 3);
  const kinds = [
    "concept_map",
    "boundary",
    "source_timeline",
    "evidence_chain",
    "comparison",
  ];
  const kind = kinds[ordinal % kinds.length];
  const title = clampText(
    claim.narration_excerpt || scene.purpose || claim.claim_id,
    78,
  );
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
      steps: requirements.length
        ? requirements.map((item) => clampText(item, 54))
        : ["Claim", "Primary source", "Documented limitation"],
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
    items: (requirements.length
      ? requirements
      : ["Claim", "Evidence", "Limit"]
    ).map((item, index) => ({
      label: String(index + 1).padStart(2, "0"),
      value: clampText(item, 62),
      detail:
        index === (requirements.length || 3) - 1
          ? common.limitation
          : undefined,
    })),
  };
}

async function approvedFootageInfo(dir, asset) {
  if (!asset) return null;
  const provenancePath = path.join(dir, `${asset}.provenance.json`);
  if (
    !(await pathExists(path.join(dir, asset))) ||
    !(await pathExists(provenancePath))
  ) {
    return null;
  }
  const provenance = await readJson(provenancePath);
  if (
    provenance.approved_for_final_edit !== true ||
    !provenance.license_url
  ) {
    return null;
  }
  const duration = Number(
    provenance.actual_duration_seconds || provenance.duration,
  );
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return { duration, provenance };
}

function sceneForFrame(composition, frame) {
  return (
    composition.scenes.find(
      (scene) => frame >= scene.start_frame && frame < scene.end_frame,
    )?.scene_id ||
    composition.scenes.at(-1)?.scene_id ||
    "scene_001"
  );
}

function mergeProofEntry(entry, motionHook, proofCut) {
  let source = null;
  if (Number.isInteger(entry.source_motion_hook_index)) {
    source = motionHook.shots?.[entry.source_motion_hook_index];
  }
  if (Number.isInteger(entry.source_evidence_index)) {
    source = proofCut.shots?.[entry.source_evidence_index];
  }
  if (
    (entry.source_motion_hook_index !== undefined ||
      entry.source_evidence_index !== undefined) &&
    !source
  ) {
    throw new Error("Legacy cinematic proof references a missing source shot");
  }
  const resolved = source
    ? {
        ...source,
        ...entry,
        ...(source.evidence || entry.evidence
          ? {
              evidence: {
                ...(source.evidence || {}),
                ...(entry.evidence || {}),
              },
            }
          : {}),
        ...(source.graphic || entry.graphic
          ? {
              graphic: {
                ...(source.graphic || {}),
                ...(entry.graphic || {}),
              },
            }
          : {}),
      }
    : { ...entry };
  delete resolved.source_motion_hook_index;
  delete resolved.source_evidence_index;
  return resolved;
}

async function legacyProofPlan(projectId, dir, composition) {
  if (projectId !== CURRENT_PROJECT) return null;
  const required = [
    "direction/cinematic_proof_cut.json",
    "direction/motion_hook.json",
    "direction/proof_preview_cut.json",
    "direction/editorial_blueprint.json",
  ];
  for (const rel of required) {
    if (!(await pathExists(path.join(dir, rel)))) return null;
  }

  const [cinematicCut, motionHook, proofCut, blueprint] = await Promise.all([
    readJson(path.join(dir, "direction", "cinematic_proof_cut.json")),
    readJson(path.join(dir, "direction", "motion_hook.json")),
    readJson(path.join(dir, "direction", "proof_preview_cut.json")),
    readJson(path.join(dir, "direction", "editorial_blueprint.json")),
  ]);
  const specs = (cinematicCut.shots || []).map((entry) =>
    mergeProofEntry(entry, motionHook, proofCut),
  );
  let cursorSeconds = 0;
  const shots = [];
  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const duration = Number(spec.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Legacy proof shot ${index + 1} has invalid duration`);
    }
    const startFrame = Math.round(cursorSeconds * composition.fps);
    cursorSeconds += duration;
    const endFrame = Math.round(cursorSeconds * composition.fps);
    const common = {
      shot_id: `shot_${String(index + 1).padStart(3, "0")}`,
      scene_id: sceneForFrame(composition, startFrame),
      start_frame: startFrame,
      end_frame: endFrame,
      claim_id: spec.claim_id,
      visual_role: spec.visual_role,
      generic_stock: Boolean(spec.generic_stock),
      editorial_purpose: spec.editorial_purpose,
      editorial_overlay: spec.editorial_overlay || null,
      transition_in: spec.transition_in || (index === 0 ? "fade" : "cut"),
      transition_out:
        spec.transition_out ||
        (index === specs.length - 1 ? "fade" : "cut"),
      text_overlay: spec.text_overlay || null,
      sound_cue: spec.sound_cue || null,
      emphasis_card: spec.emphasis_card || null,
    };
    if (spec.asset_type === "footage") {
      shots.push({
        ...common,
        asset_type: "footage",
        video_asset: spec.video_asset,
        trim_in_sec: Number(spec.trim_in_sec),
        trim_out_sec: Number(spec.trim_out_sec),
        motion_variant: spec.motion_variant || "hold",
        hook_footage: spec.hook_footage === true,
        contextual_footage: spec.contextual_footage === true,
        provenance_mode: spec.hook_footage
          ? "approved_motion_hook"
          : "approved_contextual_footage",
        motif: spec.video_asset,
      });
      continue;
    }
    if (spec.asset_type === "graphic") {
      shots.push({
        ...common,
        asset_type: "graphic",
        graphic: spec.graphic,
        motif: spec.graphic?.type || `proof_graphic_${index + 1}`,
      });
      continue;
    }
    if (spec.asset_type === "evidence") {
      shots.push({
        ...common,
        asset_type: "evidence",
        evidence: {
          ...spec.evidence,
          provenance_mode:
            (spec.evidence?.image_assets || []).length > 0
              ? "official_primary_capture"
              : "source_derived_graphic",
        },
        motif: `${spec.claim_id}:${spec.evidence?.kind || "evidence"}:proof`,
      });
      continue;
    }
    throw new Error(`Legacy proof shot ${index + 1} has unsupported asset_type`);
  }
  const expectedFrames = Math.round(
    Number(cinematicCut.duration_seconds) * composition.fps,
  );
  const durationFrames = shots.at(-1)?.end_frame || 0;
  if (durationFrames !== expectedFrames) {
    throw new Error(
      `Legacy proof totals ${durationFrames} frames, expected ${expectedFrames}`,
    );
  }
  return {
    duration_frames: durationFrames,
    shots,
    art_direction: {
      principle:
        "short licensed motion hook first; then alternate source-backed evidence with semantically relevant licensed context footage and deliberate emphasis beats",
      topic:
        "AI competition, safety frameworks, governance, and controlled agentic-misalignment evaluations",
      palette: {
        ink: "#F5F0E7",
        accent: "#D95B53",
        information: "#86A9CC",
        ground: "#07101A",
      },
      source_treatment:
        "full-screen official captures and explicit source-derived graphics",
      production_mode: blueprint.production_mode || null,
    },
  };
}

function chooseProofFrames(shots, durationFrames, fps, requestedSeconds) {
  const requested = Math.round(requestedSeconds * fps);
  const maximum = Math.max(1, durationFrames - 1);
  const target = Math.min(requested, maximum);
  const boundary = shots.find(
    (shot) => shot.end_frame >= target && shot.end_frame < durationFrames,
  );
  if (boundary) return boundary.end_frame;
  const fallback = [...shots]
    .reverse()
    .find((shot) => shot.end_frame < durationFrames);
  if (!fallback) {
    throw new Error("Full plan is too short to define a separate proof prefix");
  }
  return fallback.end_frame;
}

export async function generateProductionPlan(
  projectId = CURRENT_PROJECT,
  { proofSeconds = 150 } = {},
) {
  const dir = projectDir(projectId);
  const legacyPlan = await readJsonSafe(
    path.join(dir, "direction", "edit_plan.json"),
    { blacklisted_assets: [] },
  );
  const [composition, storyboard, evidenceMap] = await Promise.all([
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "storyboard", "storyboard.json")),
    loadResolvedEvidenceMap(dir),
  ]);

  const unresolved = (evidenceMap.claims || []).filter((claim) =>
    UNRESOLVED_CLAIM_STATUSES.has(claim.status),
  );
  if (unresolved.length) {
    throw new Error(
      `Resolve full-film claims before production planning: ${unresolved
        .map((claim) => claim.claim_id)
        .join(", ")}`,
    );
  }

  const sections = buildSectionRanges(
    projectId,
    composition,
    storyboard,
    evidenceMap,
  );
  const sourceById = new Map(
    (evidenceMap.source_catalog || []).map((source) => [
      source.source_id,
      source,
    ]),
  );
  const claimsBySection = new Map();
  for (const claim of evidenceMap.claims || []) {
    if (!ACTIVE_CLAIM_STATUSES.has(claim.status)) continue;
    if (!(claim.source_ids || []).length) continue;
    const values = claimsBySection.get(claim.section_id) || [];
    values.push(claim);
    claimsBySection.set(claim.section_id, values);
  }
  for (const section of sections) {
    if (!(claimsBySection.get(section.section_id) || []).length) {
      throw new Error(
        `No active sourced claim for ${section.section_id}; production plan cannot fabricate evidence`,
      );
    }
  }

  const preservedProof = await legacyProofPlan(projectId, dir, composition);
  const blacklisted = new Set(legacyPlan.blacklisted_assets || []);
  const maxUses = preservedProof ? 5 : 2;
  const shots = [];
  const assetUsage = new Map();
  const trimCursor = new Map();

  if (preservedProof) {
    for (const sourceShot of preservedProof.shots) {
      const section = sectionForFrame(sections, sourceShot.start_frame);
      const sectionClaims = claimsBySection.get(section.section_id);
      const registeredClaim = (evidenceMap.claims || []).find(
        (claim) => claim.claim_id === sourceShot.claim_id,
      );
      const claim =
        registeredClaim && ACTIVE_CLAIM_STATUSES.has(registeredClaim.status)
          ? registeredClaim
          : sectionClaims[shots.length % sectionClaims.length];
      const visualSection = sectionForFrame(sections, sourceShot.start_frame);
      const assignedSection =
        sections.find((entry) => entry.section_id === claim.section_id) ||
        visualSection;
      const evidenceSourceIds = sourceShot.evidence?.source_ids || [];
      const registeredSourceIds = new Set(claim.source_ids || []);
      const synthesisEvidence =
        sourceShot.asset_type === "evidence" &&
        evidenceSourceIds.some((sourceId) => !registeredSourceIds.has(sourceId));
      const shot = {
        ...sourceShot,
        shot_id: `shot_${String(shots.length + 1).padStart(3, "0")}`,
        section_id: claim.section_id,
        claim_id: claim.claim_id,
        visual_role:
          sourceShot.visual_role ||
          (sourceShot.asset_type === "graphic" ? "graphic" : "context"),
        generic_stock: sourceShot.generic_stock === true,
        editorial_purpose:
          sourceShot.editorial_purpose ||
          "Retain the approved canonical proof image and timing exactly as reviewed.",
        ...(sourceShot.start_frame < assignedSection.start_frame ||
        sourceShot.end_frame > assignedSection.end_frame
          ? { section_bridge: true }
          : {}),
        ...(synthesisEvidence ? { synthesis_evidence: true } : {}),
      };
      if (shot.asset_type === "footage") {
        assetUsage.set(
          shot.video_asset,
          (assetUsage.get(shot.video_asset) || 0) + 1,
        );
        trimCursor.set(
          shot.video_asset,
          Math.max(
            trimCursor.get(shot.video_asset) || 0,
            Number(shot.trim_out_sec || 0),
          ),
        );
      }
      shots.push(shot);
    }
  }

  let cursor = preservedProof ? preservedProof.duration_frames : 0;
  let generatedOrdinal = 0;
  const storyboardById = new Map(
    storyboard.scenes.map((scene) => [scene.scene_id, scene]),
  );
  const footageInfoCache = new Map();

  for (const scene of composition.scenes) {
    if (scene.end_frame <= cursor) continue;
    const segmentStart = Math.max(scene.start_frame, cursor);
    const segmentEnd = scene.end_frame;
    if (segmentEnd <= segmentStart) continue;
    const section = sectionForFrame(sections, segmentStart);
    const claims = claimsBySection.get(section.section_id);
    const storyboardScene = storyboardById.get(scene.scene_id) || {
      purpose: `Explain ${section.dramatic_function}`,
    };
    const chunks = splitFrames(
      segmentEnd - segmentStart,
      Math.round(composition.fps * 8),
    );
    const footageAsset = scene.video_asset || null;
    if (footageAsset && !footageInfoCache.has(footageAsset)) {
      footageInfoCache.set(
        footageAsset,
        blacklisted.has(footageAsset)
          ? null
          : await approvedFootageInfo(dir, footageAsset),
      );
    }
    const footageInfo = footageAsset
      ? footageInfoCache.get(footageAsset)
      : null;
    const imageAsset = scene.image_asset || null;
    const imageAvailable = Boolean(
      imageAsset && (await pathExists(path.join(dir, imageAsset))),
    );

    for (const frames of chunks) {
      const startFrame = cursor;
      const endFrame = cursor + frames;
      const duration = frames / composition.fps;
      const claim = claims[generatedOrdinal % claims.length];
      const patternIndex = generatedOrdinal % 5;
      const wantsEvidence = patternIndex === 0 || patternIndex === 3;
      const currentFootageUses = footageAsset
        ? assetUsage.get(footageAsset) || 0
        : 0;
      const availableStart = footageAsset
        ? Math.max(
            Number(scene.trim_in_sec || 0),
            trimCursor.get(footageAsset) || Number(scene.trim_in_sec || 0),
          )
        : 0;
      const canUseFootage = Boolean(
        !wantsEvidence &&
          footageInfo &&
          currentFootageUses < maxUses &&
          availableStart + duration <= footageInfo.duration + 0.001,
      );
      const currentImageUses = imageAsset
        ? assetUsage.get(imageAsset) || 0
        : 0;
      const canUseImage = Boolean(
        !wantsEvidence &&
          !canUseFootage &&
          imageAvailable &&
          currentImageUses < maxUses,
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
        transition_in:
          startFrame === section.start_frame ? "dissolve" : "cut",
        transition_out: isFinalShot
          ? "fade"
          : endFrame === section.end_frame
            ? "dissolve"
            : "cut",
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
          editorial_purpose:
            "Resolve the documentary on human agency and return the visual system to the ORVYQ brand.",
          graphic: {
            type: "brand_close",
            kicker: "ORVYQ",
            title: "THE RACE IS A CHOICE",
            subtitle:
              "Capability moves quickly. Governance is still a human decision.",
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
          editorial_purpose: `${clampText(
            storyboardScene.purpose,
            120,
          )} Use licensed moving context without presenting it as literal evidence of a named event.`,
          video_asset: footageAsset,
          trim_in_sec: trimIn,
          trim_out_sec: trimOut,
          motion_variant: MOTIONS[generatedOrdinal % MOTIONS.length],
          contextual_footage: true,
          provenance_mode: "approved_contextual_footage",
          motif: footageAsset,
        });
        assetUsage.set(footageAsset, currentFootageUses + 1);
        trimCursor.set(footageAsset, trimOut);
      } else if (canUseImage) {
        shots.push({
          ...common,
          asset_type: "ai_fallback",
          visual_role: patternIndex === 2 ? "metaphor" : "context",
          editorial_purpose: `${clampText(
            storyboardScene.purpose,
            120,
          )} Use the approved scene-specific fallback image only as context, never as factual evidence.`,
          image_asset: imageAsset,
          camera_motion:
            CAMERA_MOTIONS[generatedOrdinal % CAMERA_MOTIONS.length],
          motif: imageAsset,
        });
        assetUsage.set(imageAsset, currentImageUses + 1);
      } else {
        const evidence = evidenceSpec({
          claim,
          sourceById,
          scene: storyboardScene,
          ordinal: generatedOrdinal,
        });
        shots.push({
          ...common,
          asset_type: "evidence",
          visual_role: "evidence",
          editorial_purpose: `${clampText(
            storyboardScene.purpose,
            112,
          )} Anchor the narration to an attributed source-derived visual before any metaphorical treatment.`,
          evidence: {
            ...evidence,
            provenance_mode: "source_derived_graphic",
          },
          motif: `${claim.claim_id}:${evidence.kind}:${Math.floor(
            generatedOrdinal / Math.max(1, maxUses * 5),
          )}`,
        });
      }

      cursor = endFrame;
      generatedOrdinal += 1;
    }
  }

  if (cursor !== composition.duration_frames) {
    throw new Error(
      `Generated timeline ends at ${cursor}, expected ${composition.duration_frames}`,
    );
  }
  for (let index = 0; index < shots.length; index += 1) {
    shots[index].shot_id = `shot_${String(index + 1).padStart(3, "0")}`;
  }

  const proofFrames = preservedProof
    ? preservedProof.duration_frames
    : chooseProofFrames(
        shots,
        composition.duration_frames,
        composition.fps,
        proofSeconds,
      );
  const plan = {
    schema_version: "1.0",
    project_id: projectId,
    status: "draft",
    fps: composition.fps,
    duration_frames: composition.duration_frames,
    generated_at: nowIso(),
    proof: {
      type: "prefix",
      duration_frames: proofFrames,
      narration_limit_seconds: Math.min(
        proofFrames / composition.fps,
        proofSeconds,
      ),
      minimum_human_score: 95,
    },
    art_direction: preservedProof?.art_direction || {
      principle:
        "alternate claim-specific evidence with licensed context and restrained metaphor; never auto-fill a timeline from an asset pool",
      palette: {
        ink: "#F5F0E7",
        accent: "#D95B53",
        information: "#86A9CC",
        ground: "#07101A",
      },
    },
    quality_policy: {
      max_shot_seconds: 8,
      generic_stock_fraction_max: 0.25,
      evidence_and_archive_fraction_min: 0.3,
      full_screen_graphic_fraction_max: 0.1,
      max_uses_per_source: maxUses,
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

  await writeJsonAtomic(
    path.join(dir, "direction", "production_plan.json"),
    plan,
  );
  return {
    project_id: projectId,
    status: plan.status,
    duration_frames: plan.duration_frames,
    proof_frames: proofFrames,
    section_count: sections.length,
    shot_count: shots.length,
    preserved_proof: Boolean(preservedProof),
    generated_at: plan.generated_at,
    output: "direction/production_plan.json",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectId = args["project-id"] || CURRENT_PROJECT;
  const proofSeconds = Number(args["proof-seconds"] || 150);
  try {
    const result = await generateProductionPlan(projectId, { proofSeconds });
    printJson({ ok: true, ...result });
  } catch (error) {
    printJson({
      ok: false,
      error_code: error.code || "PRODUCTION_PLAN_INCOMPLETE",
      message: error.message,
    });
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
