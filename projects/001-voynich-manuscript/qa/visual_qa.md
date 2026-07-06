# visual_qa QA — 001-voynich-manuscript

### Automated Checks

- Overall: PASS
- Schema (prompts/visual_prompts.json): PASS
- Assets: PASS
- Scene filenames/numbering: PASS
- Prompt-to-scene coverage: PASS
- Packaging deliverables: PASS

### Judgment-Based Checks

**Verdict: PASS**

- **Scene-specific prompts**: Every one of the 13 main prompts describes
  that scene's actual `visual_need` in concrete detail (e.g. scene_004's
  zodiac star-chart diagram, scene_011's hand-built rotating cipher device,
  scene_012's vellum-sample-to-manuscript pull-back) — none are generic
  boilerplate that could be swapped between scenes without losing meaning.
- **One visual style universe**: All 13 main prompts open with the exact
  style consistency token from `prompt_rules.md`
  ("FactForge archival mystery-documentary style, painterly semi-realistic
  illustration, aged vellum and parchment texture, muted sepia and deep
  teal duotone palette..."), verified verbatim-identical across every
  scene. Palette language (Candlelight Amber, Deep Archive Teal, Umber,
  Shadow Charcoal) and camera vocabulary (macro close-up, slow push-in,
  portrait medium shot, wide establishing) recur consistently scene to
  scene with no aesthetic drift — the WWII codebreaker scene and the lab
  radiocarbon scene are still visibly "archival-modern," not a jump to
  slick tech-product rendering.
- **Negative prompts**: Present for all 13 scenes and not a single
  copy-pasted block — each includes the shared style guardrails (no
  photorealistic faces, no neon/pure white/black, no flat vector icons)
  plus scene-specific additions where they matter (e.g. scene_005 explicitly
  excludes "sexualized content" and "realistic nudity" for the biological
  "nymphs" illustration; scene_002 and scene_006 exclude "legible
  real-world language text" so Leonardo doesn't accidentally render actual
  English/Latin instead of the invented script).
- **Leonardo settings**: All scenes use `Leonardo Phoenix 1.0` (a sound
  choice for painterly/illustration output), `16:9` aspect ratio matching
  `video_config.json`'s 1920x1080, and a guidance scale of 7 throughout
  (a sane, moderate value — high enough for prompt adherence, low enough to
  avoid over-baked results). `style_reference` correctly points every scene
  after the first to `scene_001.png`, with a note in
  `leonardo_settings.md` instructing the human to generate scene_001 first
  and reuse it as a style anchor for the rest — a reasonable practical
  approach to cross-scene consistency given Leonardo doesn't guarantee
  identical results from text prompts alone.

No fixes required. Cleared to proceed — project moves into
`WAITING_FOR_IMAGES` until all 13 `assets/images/scene_NNN.png` files are
generated and placed.
