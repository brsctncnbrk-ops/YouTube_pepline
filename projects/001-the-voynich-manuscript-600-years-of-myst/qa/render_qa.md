# render_qa QA — 001-the-voynich-manuscript-600-years-of-myst

### Automated Checks

- Overall: PASS
- Schema (remotion/composition.json): PASS
- Camera/transition variety (no consecutive repeats): PASS
- Caption timing (chronological, readable, not lingering): PASS
- Reasons: none

### Judgment-Based Checks

- **Revision context (user feedback on the previous render):**
  1. `camera_shake` on scene_013 (6:25-6:55) read as violent/earthquake-like
     over a sustained 30s take. Fixed by reducing both the template default
     (`templates/remotion/src/Scene.tsx`) and this scene's explicit params
     from `{amplitude:1.2, frequency:0.5}` to `{amplitude:0.5,
     frequency:0.25}` — same jitter technique, much milder.
  2. `map_highlight` on scene_019 (9:39-10:17) read as an unlabeled grid of
     boxes, not a map. Replaced the abstract 7-region-rectangle rendering
     with a location pin + region name + label
     (`templates/remotion/src/effects/MotionGraphics.tsx`), unambiguous at
     video scale.
  3. Added `like_prompt` (scene_011, near the video's midpoint) and
     `subscribe_prompt` (scene_020, the closing scene) as two new
     motion_graphics types — both default to the top of frame specifically
     to stay clear of the caption bar running along the bottom.
- Visually confirmed via `remotion still` at all four affected timestamps
  that the fixes render correctly and don't collide with captions or each
  other.
- **Pass.**
