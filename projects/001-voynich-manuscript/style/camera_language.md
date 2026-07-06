# Camera Language — The Voynich Manuscript

The shot vocabulary `factforge-visual-prompt` should draw from when
translating each scene's `visual_need` into a specific camera angle/framing.
Pacing is calm and deliberate throughout — this is a slow-burn mystery
documentary, not an action-cut montage.

## Core shot types

- **Wide establishing shot** — used to open a new location or era (the
  Yale vault, Rudolf II's study, the Jesuit library, the 1940s codebreaking
  room). Sets context before moving closer.
- **Macro/extreme close-up** — reserved for the manuscript itself: ink
  strokes, page texture, illustrated details. This is the video's signature
  shot type and should recur often, especially in scenes 2-6.
- **Slow push-in** — a deliberate, gradual dolly-in on a static subject
  (the locked case in scene_001, the manuscript in scene_012's pull-back
  reversed) to build tension without cutting.
- **Slow pan / reveal** — horizontal or vertical camera movement across a
  page, shelf, or diagram to reveal detail progressively (used for the
  herbal-section page spread, the empty-shelf disappearance beat).
- **Portrait-style medium shot** — for historical figures (Kircher, Marci,
  Voynich, the WWII cryptologist), typically three-quarter angle, one figure
  per frame, engaged with the manuscript or a document rather than looking
  at camera.

## Pacing rules

- No handheld shake, no whip pans, no fast cuts within a single storyboard
  scene — each scene is one continuous camera idea, not a rapid-cut montage.
- Favor **push-ins over cuts** for emphasis; use hard cuts only at scene
  boundaries per the storyboard's `transition_in`/`transition_out` values.
- Depth of field: shallow focus on the macro manuscript shots (background
  softly blurred into the palette), slightly deeper focus on wide
  establishing shots so the environment reads clearly.
- Every camera move should have a clear reason tied to the scene's
  `purpose` (e.g. push-in = building dread/mystery, pan/reveal = showing
  scope of detail, wide = establishing a new era or place) — never movement
  for its own sake.
