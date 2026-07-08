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
  - `zoom_in`/`zoom_out`: `{ from, to }`. `pan_*`: `{ magnitude }` (default 4).
  - `dolly_left`/`dolly_right`: `{ magnitude }` (6), `{ zoom }` (0.08) — a translate ramp *plus* a scale ramp, reads as the camera physically moving rather than just reframing like `pan_*`.
  - `crane_up`/`crane_down`: `{ magnitude }` (5), `{ tilt }` (3) — vertical move with a perspective tilt.
  - `orbit`: `{ angle }` (8), `{ pulse }` (0.03) — bounded rotateY oscillation + scale pulse, the only non-monotonic rotation.
  - `handheld_simulation`: `{ amplitude }` (1.5), `{ frequency }` (0.05) — slow, organic layered-sine jitter, deterministic from `frame` (no randomness needed).
  - `camera_shake`: `{ amplitude }` (0.8), `{ frequency }` (0.4) — same jitter technique, sharper/faster than handheld by default.
  - `rack_focus`: `{ max_blur }` (6), `{ peak }` (0.5, 0.15-0.85) — a mid-scene blur pulse, distinct from the edge-only transition blur.
  - `tilt_up`/`tilt_down`: `{ angle }` (6), `{ magnitude }` (3) — like `pan_up`/`pan_down` but with an added rotateX for a true camera-pitch feel.
  - `rotation`: `{ angle }` (3) — a slow Z-axis roll.
  - `perspective_shift`: `{ angle }` (10), `{ magnitude }` (2) — a static (non-oscillating) rotateY+translateX combo.
  - `dynamic_zoom`: `{ from, to }` — like `zoom_in`/`zoom_out` but eased (accelerate/decelerate), not linear.
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
  `{ "type": "counter"|"progress_bar"|"timeline"|"map_highlight"|"arrow_callout", "params": {...} }`.
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
    `middle_east`, `asia`, `oceania` (a schematic region-level map, not
    accurate coastlines — good for "this happened around here", not precise
    geography).
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

## Before finishing

1. Validate the schema:
   `node scripts/validate.mjs schema --file projects/<project_id>/remotion/composition.json --schema composition`.
   Fix any errors (the schema forbids absolute paths, drive letters, `..`, and
   requires `output_filename` to be exactly `final_video.mp4`).
2. Derive the two consumed configs:
   `node scripts/remotion_build.mjs derive-configs --project-id <project_id>`.
   This writes `scene_config.json` and `asset_map.json` from your
   `composition.json`.
3. Sanity-check paths: `node scripts/validate.mjs paths --project-id <project_id>`.
4. Sanity-check camera/transition variety: `node scripts/validate.mjs scene-variety --project-id <project_id>`. Fix any consecutive `camera_motion.type`/`transition_in` repeats before proceeding (this also gates `render_qa`, so catching it now saves a round trip).
5. Advance:
   `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage remotion --result success`.

Never hand-edit `manifest.json`, and never hand-edit `scene_config.json` or
`asset_map.json` — always regenerate them via `derive-configs` so they stay
consistent with `composition.json`.
