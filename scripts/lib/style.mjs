/**
 * Canonical scene_type -> render_treatment mapping. Single source of truth
 * shared by validate.mjs's mechanical check; the schema enum
 * (schemas/visual_prompts.schema.json) and skill-prompt docs
 * (factforge-visual-style-bible, factforge-visual-prompt) are kept manually
 * in sync with this file, the same convention this repo already uses for
 * every other enum (e.g. transition types between composition.schema.json
 * and factforge-motion/SKILL.md).
 */

export const RENDER_TREATMENTS = [
  "photoreal_cinematic",
  "archival_period",
  "technical_diagram",
  "cartographic_aerial",
  "scan_xray",
  "vector_infographic",
];

export const SCENE_TYPE_TO_TREATMENT = {
  cinematic: "photoreal_cinematic",
  documentary: "photoreal_cinematic",
  character_scene: "photoreal_cinematic",
  macro_shot: "photoreal_cinematic",
  before_after: "photoreal_cinematic",

  historical_painting: "archival_period",
  archive_documents: "archival_period",
  newspaper: "archival_period",
  magazine: "archival_period",
  hand_drawn_sketch: "archival_period",

  blueprint: "technical_diagram",
  technical_drawing: "technical_diagram",
  diagram: "technical_diagram",
  ui_hud_screen: "technical_diagram",
  isometric: "technical_diagram",
  whiteboard: "technical_diagram",

  world_map: "cartographic_aerial",
  satellite_view: "cartographic_aerial",

  xray: "scan_xray",

  infographic: "vector_infographic",
  data_visualization: "vector_infographic",
  timeline: "vector_infographic",
  split_screen: "vector_infographic",
  animated_illustration: "vector_infographic",
};
