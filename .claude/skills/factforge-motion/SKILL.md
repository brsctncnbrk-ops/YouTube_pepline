---
name: factforge-motion
description: Builds the Remotion composition config for a FactForge video from the storyboard and direction plan. Use when a FactForge project's manifest current_stage is "remotion".
---

# FactForge Motion / Remotion

You translate the storyboard and direction plan into the Remotion composition
data. You author **one file** — `remotion/composition.json` — which is the
schema-validated source of truth. A deterministic helper then derives
`remotion/scene_config.json` and `remotion/asset_map.json` from it, so the
three files can never drift. You do not write Remotion component code (React/
TSX) — the generic template already handles rendering; you only produce data.

## Inputs

`storyboard/storyboard.json` (scene timings in seconds, transitions,
on-screen text, and each scene's optional `data_point`),
`direction/direction_plan.md` (per-scene camera motion keyword + intensity,
a tempo keyword, and — non-bindingly — motion-graphics suggestions),
`config/video_config.json` (`fps`, `width`, `height`), and
`config/render_config.json` (`codec`, `crf`, `output_filename`).

## Task

Author `remotion/composition.json` matching `schemas/composition.schema.json`.
Convert the storyboard's second-based timings to frames using `fps`:

- `start_frame = round(scene.start_sec * fps)`,
  `end_frame = round(scene.end_sec * fps)`.
- `duration_frames` (top level) = the last scene's `end_frame` (the total
  frame count of the video).
- For each scene, set `camera_motion.type` from the direction plan's keyword
  — the schema enum has 20 values; no other value validates. The original 7
  (`zoom_in`, `zoom_out`, `pan_left`, `pan_right`, `pan_up`, `pan_down`,
  `static`) plus 13 pseudo-3D types, all CSS tricks on the same single
  scene image (no depth/parallax layer exists — `foreground_parallax`/
  `background_parallax` are deliberately not supported):
  `dolly_left`, `dolly_right`, `crane_up`, `crane_down`, `orbit`,
  `handheld_simulation`, `camera_shake`, `rack_focus`, `tilt_up`,
  `tilt_down`, `rotation`, `perspective_shift`, `dynamic_zoom`. Put any
  intensity in `camera_motion.params` — `{}` accepts sensible defaults for
  every type. Params by type:
  - `zoom_in`/`zoom_out`: `{ from, to }` (defaults 1.0→1.22 / 1.22→1.0 — deliberately strong; a 10-22% zoom over a 30-100s scene is barely perceptible, so don't undershoot this). `pan_*`: `{ magnitude }` (default 7).
  - `dolly_left`/`dolly_right`: `{ magnitude }` (10), `{ zoom }` (0.13) — a translate ramp *plus* a scale ramp, reads as the camera physically moving rather than just reframing like `pan_*`.
  - `crane_up`/`crane_down`: `{ magnitude }` (9), `{ tilt }` (5) — vertical move with a perspective tilt.
  - `orbit`: `{ angle }` (13), `{ pulse }` (0.05) — bounded rotateY oscillation + scale pulse, the only non-monotonic rotation.
  - `handheld_simulation`: `{ amplitude }` (2.2), `{ frequency }` (0.06) — slow, organic layered-sine jitter, deterministic from `frame` (no randomness needed).
  - `camera_shake`: `{ amplitude }` (0.5), `{ frequency }` (0.25) — same jitter technique, sharper/faster than handheld by default, but deliberately mild: at these magnitudes it's a full-frequency oscillation, so amplitude/frequency above ~0.6/0.3 reads as violent shaking rather than a documentary energy cue, especially held over 20s+.
  - `rack_focus`: `{ max_blur }` (6), `{ peak }` (0.5, 0.15-0.85) — a mid-scene blur pulse, distinct from the edge-only transition blur.
  - `tilt_up`/`tilt_down`: `{ angle }` (10), `{ magnitude }` (5) — like `pan_up`/`pan_down` but with an added rotateX for a true camera-pitch feel.
  - `rotation`: `{ angle }` (5) — a slow Z-axis roll.
  - `perspective_shift`: `{ angle }` (16), `{ magnitude }` (4) — a static (non-oscillating) rotateY+translateX combo.
  - `dynamic_zoom`: `{ from, to }` (default 1.0→1.24) — like `zoom_in`/`zoom_out` but eased (accelerate/decelerate), not linear.
  On very long scenes (60s+), lean toward the higher end of these ranges (or
  set explicit `params` above the defaults) rather than leaving `{}` — motion
  that's barely visible over 10-20s reads as genuinely static over 60-100s.
  Leave `params` as `{}` for `static`. **No two consecutive scenes may share
  the same `camera_motion.type`** — mechanically enforced at `render_qa`
  (`validate.mjs scene-variety`), so rotate deliberately across all 20
  rather than defaulting to a handful.
- Carry `transition_in`/`transition_out` and `text_overlay` straight from the
  storyboard. All eight transition types are real and enum-constrained:
  `fade`, `dissolve`, `cut`, `wipe`, `slide`, `light_flash`, `blur`,
  `zoom_through`. The same `render_qa` check also forbids two consecutive
  scenes from sharing the same `transition_in`.
- Optionally set `overlay_effects` per scene — an array of
  `{ "type": "glow"|"noise"|"vignette"|"particles", "params": {...} }`. This
  is authored entirely by you from the storyboard/style bible (the direction
  plan doesn't cover it); it is **not** subject to the consecutive-repeat
  gate. Use it sparingly and purposefully, not on every scene:
  - `glow` — `params: { intensity, cx, cy }` (0-100 position, default center-ish).
  - `vignette` — `params: { strength }` (0-1, default 0.65).
  - `noise` — `params: { opacity }` (0-1, default 0.06), subtle film-grain texture.
  - `particles` — `params: { count }` (default 18), small drifting dots.
  Leave `params` as `{}` to accept the defaults.
- Optionally set `motion_graphics` per scene — an array of
  `{ "type": "counter"|"progress_bar"|"timeline"|"map_highlight"|"arrow_callout"|"like_prompt"|"subscribe_prompt", "params": {...} }`.
  This is authored entirely by you; it is **not** subject to the
  consecutive-repeat gate. Use it sparingly, only where it adds real
  information — not as decoration:
  - **Primary source — the storyboard's `data_point`.** If a scene has one,
    translate it via this table (skip the scene entirely if `value` can't be
    cleanly parsed — never guess):
    | `data_point.type` | `motion_graphics.type` | mapping |
    |---|---|---|
    | `number` | `counter` | `params.to` = numeric value parsed from `data_point.value`, `params.from = 0`, `params.label = data_point.label` |
    | `percentage` | `progress_bar` | `params.value` = 0-100 number parsed from `data_point.value`, `params.label = data_point.label` |
    | `date` | `timeline` | `params.date = data_point.value` verbatim, `params.label = data_point.label` |
    | `location` | `map_highlight` | `params.region = data_point.value` verbatim (already one of the 7 region names), `params.label = data_point.label` |
  - **Secondary, non-binding source — `direction_plan.md`'s motion-graphics
    suggestions.** The director may suggest a type for a scene as inspiration
    (e.g. "a counter animating up to 2.3M would land well here"). You may
    draw on it — deciding to add an `arrow_callout`, say, or picking phrasing
    — but you're never obligated to follow it, exactly like `overlay_effects`
    today: the direction plan has no binding authority over this field.
  - `arrow_callout` has no `data_point` counterpart — it's purely your own
    call for directing attention to a spot in the image. `params: { cx, cy,
    shape, direction, label }` — `cx`/`cy` are 0-100 position, `shape` is
    `"arrow"` or `"circle"` (default `"circle"`), `direction` (`"up"`/
    `"down"`/`"left"`/`"right"`, only used when `shape: "arrow"`).
  - Full `params` shapes: `counter: { from, to, decimals?, prefix?, suffix?, label?, cx?, cy? }`,
    `progress_bar: { value, label?, cx?, cy?, width_pct?, color? }`,
    `timeline: { date, label?, cx?, cy? }`,
    `map_highlight: { region, label?, cx?, cy?, scale? }` where `region` is
    one of `north_america`, `south_america`, `europe`, `africa`,
    `middle_east`, `asia`, `oceania` — rendered as a location pin with the
    region's name and your `label` beneath it, not an actual map (an
    earlier abstract-shapes-per-region rendering read as an unlabeled grid
    of boxes at video scale, not as geography, so it was replaced).
  - `like_prompt`/`subscribe_prompt` have no `data_point` counterpart either
    — pure engagement cues, entirely your call, used at most once each per
    video. `like_prompt: { label?, cx?, cy? }` (default label "Like this
    video", positioned top-right by default) — place it around the video's
    midpoint, ideally over a visually calm scene with no other overlay.
    `subscribe_prompt: { label?, cx?, cy? }` (default label "Subscribe",
    positioned top-center by default) — place it on the final scene only,
    toward the end. Both default to the top of frame specifically to stay
    clear of the caption bar, which runs along the bottom for nearly the
    entire video; don't move them low enough to collide with it.
- `image_asset` = `assets/images/<scene_id>.png`, `audio_asset` =
  `assets/audio/final_voice.mp3` — **always relative paths, never absolute**
  (the render happens on GitHub Actions, not a local machine; absolute paths
  are rejected by `validate.mjs paths` and the schema regexes).
- Build the top-level `asset_map` object keyed by `scene_id`, each
  `{ "image": "assets/images/<scene_id>.png", "audio_offset_sec": <scene.start_sec> }`.
- `render` = `{ "codec", "crf", "output_filename": "final_video.mp4" }` from
  `render_config.json`.

Exact shape (see `schemas/composition.schema.json` for the authority):

```json
{
  "fps": 30, "width": 1920, "height": 1080, "duration_frames": 5040,
  "audio_asset": "assets/audio/final_voice.mp3",
  "scenes": [
    {
      "scene_id": "scene_001",
      "start_frame": 0, "end_frame": 660,
      "image_asset": "assets/images/scene_001.png",
      "camera_motion": { "type": "zoom_in", "params": { "from": 1.0, "to": 1.12 } },
      "text_overlay": "May 1, 1840",
      "transition_in": "fade", "transition_out": "cut",
      "overlay_effects": [{ "type": "glow", "params": {} }],
      "motion_graphics": [{ "type": "counter", "params": { "from": 0, "to": 2300000, "suffix": "+", "label": "people affected" } }]
    }
  ],
  "asset_map": { "scene_001": { "image": "assets/images/scene_001.png", "audio_offset_sec": 0 } },
  "render": { "codec": "h264", "crf": 18, "output_filename": "final_video.mp4" }
}
```

## Captions

Generate `remotion/captions.json` — short, frequently-changing narration
subtitles, rendered as a global bottom-bar layer independent of scene
boundaries. You do not author this by hand: run
`node scripts/generate_captions.mjs generate --project-id <project_id>`
after `composition.json` is written and schema-valid. It reads
`scripts/script.md`'s `## ... (M:SS-M:SS)` section headers/prose and your
`composition.json`'s `fps`/`duration_frames`, and mechanically derives
timed ~4-8 word caption bursts (word-count-proportional, the same method
`script.md`'s own section timestamps already use — there's no forced-
alignment/ASR step in this pipeline). Defaults keep each caption on screen
0.9-3.2s. Only re-run this if you change `composition.json`'s
`duration_frames`/`fps` or the script text changes.

## Before finishing

1. Validate the schema:
   `node scripts/validate.mjs schema --file projects/<project_id>/remotion/composition.json --schema composition`.
   Fix any errors (the schema forbids absolute paths, drive letters, `..`, and
   requires `output_filename` to be exactly `final_video.mp4`).
2. Generate captions (see above):
   `node scripts/generate_captions.mjs generate --project-id <project_id>`.
3. Derive the consumed configs (now includes captions):
   `node scripts/remotion_build.mjs derive-configs --project-id <project_id>`.
   This writes `scene_config.json` and `asset_map.json` from your
   `composition.json`, merging in `captions.json`.
4. Sanity-check paths: `node scripts/validate.mjs paths --project-id <project_id>`.
5. Sanity-check camera/transition variety: `node scripts/validate.mjs scene-variety --project-id <project_id>`. Fix any consecutive `camera_motion.type`/`transition_in` repeats before proceeding (this also gates `render_qa`, so catching it now saves a round trip).
6. Sanity-check caption timing: `node scripts/validate.mjs captions --project-id <project_id>`. Fix any overlap/duration issues (also gates `render_qa`).
7. Advance:
   `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage remotion --result success`.

Never hand-edit `manifest.json`, and never hand-edit `scene_config.json`,
`asset_map.json`, or `captions.json` — always regenerate them via
`derive-configs`/`generate_captions.mjs` so they stay consistent with
`composition.json`/`script.md`.
