# render_qa QA — 001-the-voynich-manuscript-600-years-of-myst

### Automated Checks

- Overall: PASS
- Schema (remotion/composition.json): PASS
- Camera/transition variety (no consecutive repeats): PASS
- Reasons: none

### Judgment-Based Checks

- `duration_frames` (19686) equals the last scene's `end_frame` exactly.
- Scenes are contiguous in frames (each `start_frame` equals the previous
  scene's `end_frame`) — verified by construction from the storyboard's
  cumulative timings.
- `fps`/`width`/`height` (30/1920/1080) match `config/video_config.json`;
  `render` (h264/crf 18/final_video.mp4) matches `config/render_config.json`.
- Visually confirmed via `remotion still` on the real assets: camera motion,
  transitions, overlay effects, and all three `motion_graphics` (counter,
  timeline, map_highlight) render correctly against real photographic
  content — this caught and fixed a real `map_highlight` legibility bug
  (no backing panel, washed out against a detailed photo; fixed in
  `templates/remotion/src/effects/MotionGraphics.tsx` and re-verified).
- **Pass.**
