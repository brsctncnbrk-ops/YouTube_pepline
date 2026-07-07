/**
 * Canonical FactForge pipeline stage graph. Single source of truth shared by
 * manifest_cli.mjs, validate.mjs, and scaffold_project.mjs so the stage list,
 * gate placement, and required-file contracts never drift between tools.
 *
 * Stage ids follow the spec's own manifest.json example naming convention
 * (research_qa / script_qa / voice_qa suffix pattern). The spec's numbered
 * skill list (00 Orchestrator .. 12 Final QA) maps onto these 17 stage ids
 * as follows: 01->research, 01.5->research_qa, 02->script, 02.5->script_qa,
 * 03->voice_script, 03.5->voice_qa, 04->storyboard, 04.5->storyboard_qa,
 * 05->visual_style_bible, 06->visual_prompt, 06.5->visual_qa, 07->director,
 * 08->remotion, 09->editor, 10->render_qa, 11->packaging, 12->final_qa.
 * 00 (Orchestrator) is not itself a pipeline stage - it sequences the rest.
 */

export const STAGE_ORDER = [
  "research",
  "research_qa",
  "script",
  "script_qa",
  "voice_script",
  "voice_qa",
  "storyboard",
  "storyboard_qa",
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

/** Files (relative to the project root) required before a stage may run. */
export const STAGE_REQUIRED_FILES = {
  research: [],
  research_qa: ["research/research.json", "research/research.md", "research/sources.md"],
  script: ["research/research.json"],
  script_qa: ["scripts/script.md", "scripts/script_metadata.json"],
  voice_script: ["scripts/script.md"],
  voice_qa: ["voice/voice_script.txt", "voice/voice_notes.md"],
  storyboard: ["scripts/script.md", "voice/voice_script.txt", "assets/audio/final_voice.mp3"],
  storyboard_qa: ["storyboard/storyboard.json", "storyboard/storyboard.md"],
  visual_style_bible: ["storyboard/storyboard.json", "scripts/script.md"],
  visual_prompt: ["storyboard/storyboard.json", "style/visual_style_bible.md", "style/prompt_rules.md"],
  visual_qa: ["prompts/visual_prompts.json", "prompts/visual_prompts.md", "prompts/negative_prompts.md", "prompts/leonardo_settings.md"],
  director: ["storyboard/storyboard.json", "prompts/visual_prompts.md", "style/visual_style_bible.md"],
  remotion: ["storyboard/storyboard.json", "direction/direction_plan.md", "assets/asset_manifest.json"],
  editor: ["remotion/composition.json", "remotion/scene_config.json", "assets/audio/final_voice.mp3"],
  render_qa: ["remotion/render_ready_project"],
  packaging: ["scripts/script.md", "research/research.md", "output/final_video.mp4"],
  final_qa: ["output/final_video.mp4", "storyboard/storyboard.json", "packaging/packaging.json", "packaging/title.md", "packaging/description.md"],
};

/** Output files/dirs (relative to the project root) a stage produces. Used by reset-stage --force-clean. */
export const STAGE_OUTPUT_FILES = {
  research: ["research/research.json", "research/research.md", "research/sources.md"],
  research_qa: ["qa/research_qa.md"],
  script: ["scripts/script.md", "scripts/script_metadata.json"],
  script_qa: ["qa/script_qa.md"],
  voice_script: ["voice/voice_script.txt", "voice/voice_notes.md"],
  voice_qa: ["qa/voice_qa.md"],
  storyboard: ["storyboard/storyboard.json", "storyboard/storyboard.md"],
  storyboard_qa: ["qa/storyboard_qa.md"],
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

/**
 * Manual human gates. `beforeStage` is the first pipeline stage that must not
 * run until the gate is satisfied. `waitStatus` is the manifest status while
 * blocked.
 */
export const GATES = {
  audio: {
    beforeStage: "storyboard",
    waitStatus: "WAITING_FOR_AUDIO",
    requiredFile: "assets/audio/final_voice.mp3",
    errorCode: "MISSING_AUDIO",
  },
  images: {
    // Note: this gate sits before "director", *after* visual_qa. The
    // visual_qa gate only checks that prompts/filenames are well-formed and
    // fully cover the storyboard's scenes - it must not require the actual
    // scene_NNN.png bytes to exist yet, since the human hasn't generated them
    // in Leonardo AI at that point in the pipeline.
    beforeStage: "director",
    waitStatus: "WAITING_FOR_IMAGES",
    errorCode: "MISSING_IMAGE",
  },
};

export const ERROR_CODES = [
  "MISSING_AUDIO",
  "MISSING_IMAGE",
  "INVALID_JSON",
  "SCHEMA_VALIDATION_FAILED",
  "BROKEN_ASSET_PATH",
  "RENDER_CONFIG_MISSING",
  "USER_APPROVAL_REQUIRED",
  "SCENE_VARIETY_VIOLATION",
  "UNKNOWN_ERROR",
];

export const STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_FOR_AUDIO",
  "WAITING_FOR_IMAGES",
  "WAITING_FOR_USER_APPROVAL",
  "READY_FOR_RENDER",
  "RENDERING",
  "RENDER_DONE",
  "READY_FOR_FINAL_QA",
  "READY_FOR_UPLOAD",
  "DONE",
  "ERROR",
];

export function nextStage(currentStage) {
  if (currentStage === null || currentStage === undefined) return STAGE_ORDER[0];
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}
