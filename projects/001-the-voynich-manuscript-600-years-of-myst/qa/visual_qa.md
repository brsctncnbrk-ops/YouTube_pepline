# visual_qa QA — 001-the-voynich-manuscript-600-years-of-myst

### Automated Checks

- Overall: PASS
- Schema (prompts/visual_prompts.json): PASS
- Assets: PASS
- Scene filenames/numbering: PASS
- Scene type variety (no consecutive repeats): PASS
- Prompt-to-scene coverage: PASS
- Render-treatment policy (scene_type → render_treatment): PASS
- Packaging deliverables: PASS

### Judgment-Based Checks

- All 20 `main_prompt` entries incorporate the style consistency token
  verbatim; the 7 reframe-sibling entries (scene_002, 009, 011, 012, 014,
  016, 020) are honestly described as "the same [subject], reframed" rather
  than presented as independently-generated new images, since they reuse
  the sibling scene's actual PNG file.
- No drift into a different visual aesthetic across the 20 entries — the
  teal/candle duality and photoreal archival-documentary look holds across
  botanical, technical-diagram, character, and reframed scenes alike.
- `negative_prompt` on each reframe sibling explicitly calls out "a visibly
  different [subject]" as something to avoid — appropriate given these
  prompts describe an as-built crop of an existing photo, not a fresh
  generation, so there's no risk of an actual mismatch, but the note keeps
  the prompt file internally honest about what these entries represent.
- `render_treatment` was re-derived per scene from the new `scene_type`
  assignments (e.g. scene_009's tighter astronomical-diagram reframe was
  deliberately given `scene_type: macro_shot` → `photoreal_cinematic`,
  distinct from scene_008's `diagram` → `technical_diagram`, both
  legitimate readings of the same underlying image at different crops) and
  mechanically confirmed via `validate.mjs style-treatment`.
- Leonardo settings remain honestly documented as placeholders
  (`leonardo_settings.md`) since these images weren't generated through
  this pipeline — no fabricated generation-parameter claims, including for
  the reframe siblings (which are crops of already-real photos, not new
  generations).
- **Pass.**
