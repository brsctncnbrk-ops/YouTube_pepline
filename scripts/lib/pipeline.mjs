/**
 * Canonical ORVYQ / FactForge pipeline stage graph. Single source of truth
 * shared by manifest_cli.mjs, validate.mjs, and scaffold_project.mjs so the
 * stage list, gate placement, and required-file contracts never drift.
 *
 * The system now separates three production contracts that were previously
 * conflated:
 * 1. scene-level Remotion composition;
 * 2. a canonical full-duration ORVYQ production plan;
 * 3. a human-approved proof rendered from that same canonical plan.
 *
 * A full render is impossible until the production plan covers the complete
 * timeline and the approved proof hash still matches it.
 */

export const STAGE_ORDER = [
  "research",
  "research_qa",
  "script",
  "fact_audit",
  "script_qa",
  "voice_script",
  "voice_qa",
  "storyboard",
  "storyboard_qa",
  "footage_retrieval",
  "visual_style_bible",
  "visual_prompt",
  "visual_qa",
  "director",
  "remotion",
  "production_plan",
  "production_plan_qa",
  "editor",
  "proof_qa",
  "render_qa",
  "packaging",
  "final_qa",
];

export const STAGE_REQUIRED_FILES = {
  research: [],
  research_qa: ["research/research.json", "research/research.md", "research/sources.md"],
  script: ["research/research.json"],
  fact_audit: ["scripts/script.md", "scripts/script_metadata.json"],
  script_qa: ["scripts/script.md", "scripts/script_metadata.json", "fact_audit/claims.json", "fact_audit/fact_audit_report.md"],
  voice_script: ["scripts/script.md"],
  voice_qa: ["voice/voice_script.txt", "voice/voice_notes.md"],
  storyboard: ["scripts/script.md", "voice/voice_script.txt", "assets/audio/final_voice.mp3"],
  storyboard_qa: ["storyboard/storyboard.json", "storyboard/storyboard.md"],
  footage_retrieval: ["storyboard/storyboard.json"],
  visual_style_bible: ["storyboard/storyboard.json", "scripts/script.md", "footage/footage_manifest.json"],
  visual_prompt: ["storyboard/storyboard.json", "style/visual_style_bible.md", "style/prompt_rules.md", "footage/footage_manifest.json"],
  visual_qa: ["prompts/visual_prompts.json", "prompts/visual_prompts.md", "prompts/negative_prompts.md", "prompts/leonardo_settings.md", "footage/footage_manifest.json"],
  director: ["storyboard/storyboard.json", "prompts/visual_prompts.md", "style/visual_style_bible.md", "footage/footage_manifest.json"],
  remotion: ["storyboard/storyboard.json", "direction/direction_plan.md", "assets/asset_manifest.json"],
  production_plan: [
    "remotion/composition.json",
    "storyboard/storyboard.json",
    "direction/direction_plan.md",
    "footage/footage_manifest.json",
    "research/evidence_map.json",
  ],
  production_plan_qa: [
    "direction/production_plan.json",
    "remotion/composition.json",
    "research/evidence_map.json",
  ],
  editor: [
    "remotion/composition.json",
    "direction/production_plan.json",
    "assets/audio/final_voice.mp3",
  ],
  proof_qa: [
    "remotion/render_ready_project",
    "direction/production_plan.json",
  ],
  render_qa: [
    "remotion/render_ready_project",
    "direction/production_plan.json",
    "qa/proof_approval.json",
  ],
  packaging: ["scripts/script.md", "research/research.md", "output/final_video.mp4"],
  final_qa: ["output/final_video.mp4", "storyboard/storyboard.json", "packaging/packaging.json", "packaging/title.md", "packaging/description.md", "fact_audit/claims.json"],
};

export const STAGE_OUTPUT_FILES = {
  research: ["research/research.json", "research/research.md", "research/sources.md"],
  research_qa: ["qa/research_qa.md"],
  script: ["scripts/script.md", "scripts/script_metadata.json"],
  fact_audit: ["fact_audit/claims.json", "fact_audit/fact_audit_report.md"],
  script_qa: ["qa/script_qa.md"],
  voice_script: ["voice/voice_script.txt", "voice/voice_notes.md"],
  voice_qa: ["qa/voice_qa.md"],
  storyboard: ["storyboard/storyboard.json", "storyboard/storyboard.md"],
  storyboard_qa: ["qa/storyboard_qa.md"],
  footage_retrieval: ["footage/footage_manifest.json", "footage/footage_manifest.md"],
  visual_style_bible: [
    "style/visual_style_bible.md",
    "style/color_palette.md",
    "style/character_style.md",
    "style/graphic_style.md",
    "style/camera_language.md",
    "style/prompt_rules.md",
  ],
  visual_prompt: ["prompts/visual_prompts.json", "prompts/visual_prompts.md", "prompts/negative_prompts.md", "prompts/leonardo_settings.md"],
  visual_qa: ["qa/visual_qa.md"],
  director: ["direction/direction_plan.md"],
  remotion: ["remotion/composition.json", "remotion/scene_config.json", "remotion/asset_map.json"],
  production_plan: ["direction/production_plan.json"],
  production_plan_qa: ["qa/production_plan_qa.md"],
  editor: ["remotion/render_ready_project"],
  proof_qa: ["qa/proof_qa.md"],
  render_qa: ["qa/render_qa.md"],
  packaging: [
    "packaging/packaging.json",
    "packaging/title.md",
    "packaging/description.md",
    "packaging/tags.txt",
    "packaging/thumbnail.md",
    "packaging/chapters.txt",
    "packaging/pinned_comment.md",
  ],
  final_qa: ["qa/final_qa_report.md"],
};

export const GATES = {
  audio: {
    beforeStage: "storyboard",
    waitStatus: "WAITING_FOR_AUDIO",
    requiredFile: "assets/audio/final_voice.mp3",
    errorCode: "MISSING_AUDIO",
  },
  visual_assets: {
    beforeStage: "director",
    waitStatus: "WAITING_FOR_VISUAL_ASSETS",
    errorCode: "MISSING_VISUAL_ASSET",
    checker: "validateVisualAssets",
  },
};

export const ERROR_CODES = [
  "MISSING_AUDIO",
  "MISSING_VISUAL_ASSET",
  "INVALID_PROJECT_ID",
  "INVALID_JSON",
  "SCHEMA_VALIDATION_FAILED",
  "BROKEN_ASSET_PATH",
  "RENDER_CONFIG_MISSING",
  "USER_APPROVAL_REQUIRED",
  "UNRESOLVED_CLAIM",
  "PRODUCTION_PLAN_INCOMPLETE",
  "PROOF_APPROVAL_REQUIRED",
  "PROOF_PLAN_DRIFT",
  "UNKNOWN_ERROR",
];

export const STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_FOR_AUDIO",
  "WAITING_FOR_VISUAL_ASSETS",
  "READY_FOR_PROOF_RENDER",
  "PROOF_RENDERING",
  "WAITING_FOR_PROOF_APPROVAL",
  "PROOF_APPROVED",
  "WAITING_FOR_USER_APPROVAL",
  "READY_FOR_RENDER",
  "RENDERING",
  "RENDER_DONE",
  "READY_FOR_FINAL_QA",
  "READY_FOR_UPLOAD",
  "DONE",
  "ERROR",
];

export const SCHEMA_VERSION = "3.0";

export function nextStage(currentStage) {
  if (currentStage === null || currentStage === undefined) return STAGE_ORDER[0];
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
