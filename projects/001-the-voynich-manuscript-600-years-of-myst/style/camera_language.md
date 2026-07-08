# Camera Language — The Voynich Manuscript

## Shot vocabulary observed in the 13 source images

- **Wide establishing:** scene_001 (display case in archive hall), scene_002
  (library hall), scene_013 (museum courtyard) — used for hook/context/
  closing beats.
- **Medium/detail:** scene_005, scene_006, scene_007, scene_011 (manuscript
  pages and objects laid on a surface, candle in frame) — used for the
  "walk through the book" beats.
- **Close/macro:** scene_003 (hand on page), scene_012 (scanning instrument
  tip) — used for the most intimate, tactile beats.
- **Character medium shots:** scene_008 (monk at desk), scene_009
  (codebreaker at desk) — figure and their work surface both in frame.
- **Screen/analysis insert:** scene_010 (word frequency graph laid over
  manuscript pages) — an analytical/diagrammatic insert rather than a
  physical-world shot.

## Camera-motion pacing guidance (for `factforge-director`)

Slow, deliberate movement throughout — matches the "someone carefully
examining a centuries-old object" mood. Favor `zoom_in`, `pan_left`/
`pan_right`, `tilt_up`/`tilt_down`, and `dynamic_zoom` for most scenes;
reserve higher-energy types (`camera_shake`, `orbit`, `dolly_left`/`right`)
for the WWII-codebreaker beat (scene_009) and the modern-scanning beat
(scene_012), where a slightly more active, "investigation in progress" feel
fits the narration. Avoid `handheld_simulation`/`camera_shake` on the more
solemn historical beats (scene_001, scene_008, scene_013) — those should
stay calm and reverent.
