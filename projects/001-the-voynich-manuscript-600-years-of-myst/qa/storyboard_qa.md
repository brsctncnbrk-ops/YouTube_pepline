# storyboard_qa QA — 001-the-voynich-manuscript-600-years-of-myst

### Automated Checks

- Overall: PASS
- Schema (storyboard/storyboard.json): PASS
- Assets: PASS
- Scene filenames/numbering: PASS
- Scene type variety (no consecutive repeats): PASS
- Prompt-to-scene coverage: PASS
- Render-treatment policy (scene_type → render_treatment): PASS
- Packaging deliverables: PASS

### Judgment-Based Checks

- `total_duration_sec` (656.2) matches `target_duration_sec` (656) exactly —
  timings were derived directly from the real recorded narration's duration
  and the script's word-count-weighted section breakdown, not estimated.
- Every `visual_need` is concrete and directly describes the actual provided
  image for that scene (not generic filler) — `factforge-visual-prompt`
  would have real subject matter to work from if these were fresh prompts.
- `on_screen_text` is used sparingly (3 of 13 scenes) and only reuses text
  already legible in the source image itself ("Pharmaceutical Section")
  or a safe scholarly section label ("Botanical Section", "Astronomical
  Section") — no invented on-screen claims.
- Scenes tile the full duration with no gaps/overlaps beyond what the
  mechanical check already covers.
- One real limitation worth flagging: scene_008 (100.5s) is a single held
  image for a comparatively long stretch, since the project has exactly 13
  source images and that scene's narration covers two topics (provenance +
  radiocarbon dating). Camera motion and motion graphics (Phase 2/3 work)
  should carry the visual variety there instead of a scene split.
- **Pass.**
