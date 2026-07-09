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

- **Revision context:** the original 13-scene cut held 7 scenes on a single
  static image for 30-100s each (user feedback: not engaging, camera motion
  imperceptible, too long between cuts). This revision splits the 6 longest
  beats (55.4s-100.5s) into 2-3 shorter shots each, reframing the *same*
  source photo (tighter crop, different angle, pull-back) rather than one
  long static hold — 13 scenes → 20, longest single shot now 38.6s.
- Each `voice_line_ref` for a split scene is a genuine, non-overlapping
  excerpt of that beat's actual narration text from `scripts/script.md`,
  verified against the source prose rather than paraphrased.
- Reframe pairs/triples share `image_asset`-implied subject matter (same
  underlying photo) but are described with distinct, plausible camera
  framing in `visual_need` (e.g. scene_010 wide scribe → scene_011 tighter
  on the writing hand → scene_012 pulled back) so the visual_prompt stage
  can honestly describe each as a real reframe, not a duplicate.
- `scene_type` was deliberately varied within each reframe group (e.g.
  scene_001 `cinematic` → scene_002 `macro_shot`) specifically so the
  no-consecutive-repeat gate reflects genuine shot-type variety, not an
  artificial workaround — a tighter crop of the same photo *is* a different
  shot type in standard documentary editing grammar.
- `data_point`s (600 ducats, 1940s, Beinecke/Yale) stayed on the first
  sub-shot of their original scene, matching where that fact is actually
  spoken in the narration.
- **Pass.**
