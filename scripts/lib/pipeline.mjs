/**
 * Canonical FactForge pipeline stage graph. Single source of truth shared by
 * manifest_cli.mjs, validate.mjs, and scaffold_project.mjs so the stage list,
 * gate placement, and required-file contracts never drift between tools.
 *
 * Stage ids follow the spec's own manifest.json example naming convention
 * (research_qa / script_qa / voice_qa suffix pattern). This is the
 * footage-primary (Aperture-style) migration's 19-stage graph. Two stages
 * were added relative to the original 17-stage list: `fact_audit` (between
 * script and script_qa) and `footage_retrieval` (between storyboard_qa and
 * visual_style_bible). The `images` gate was renamed `visual_assets` because
 * the requirement is now conditional per scene (footage clip vs. fallback
 * still) rather than always a PNG.
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
  "editor",
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
  editor: ["remotion/composition.json", "remotion/scene_config.json", "assets/audio/final_voice.mp3"],
  render_qa: ["remotion/render_ready_project"],
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
  editor: ["remotion/render_ready_project"],
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
  "UNKNOWN_ERROR",
];

export const STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_FOR_AUDIO",
  "WAITING_FOR_VISUAL_ASSETS",
  "WAITING_FOR_USER_APPROVAL",
  "READY_FOR_RENDER",
  "RENDERING",
  "RENDER_DONE",
  "READY_FOR_FINAL_QA",
  "READY_FOR_UPLOAD",
  "DONE",
  "ERROR",
];

export const SCHEMA_VERSION = "2.0";

export function nextStage(currentStage) {
  if (currentStage === null || currentStage === undefined) return STAGE_ORDER[0];
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
