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
on-screen text), `footage/footage_manifest.json` (per-scene `asset_type`,
and for footage scenes `native_duration_sec`/`trim_in_sec`/`trim_out_sec`),
`direction/direction_plan.md` (per-scene camera motion keyword + intensity
for `ai_fallback` scenes, or an overridden trim window for `footage`
scenes), `config/video_config.json` (`fps`, `width`, `height`), and
`config/render_config.json` (`codec`, `crf`, `output_filename`).

## Task

Author `remotion/composition.json` matching `schemas/composition.schema.json`.
Convert the storyboard's second-based timings to frames using `fps`:

- `start_frame = round(scene.start_sec * fps)`,
  `end_frame = round(scene.end_sec * fps)`.
- `duration_frames` (top level) = the last scene's `end_frame` (the total
  frame count of the video).
- Set each scene's `asset_type` from `footage_manifest.json`
  (`fallback_to_ai_visual: true` → `"ai_fallback"`, else → `"footage"`).
  This decides which fields the rest of the scene needs — the schema
  enforces it via an `if/then`, so don't mix the two shapes:

  - **`asset_type: "footage"`**: `video_asset` = `assets/footage/<scene_id>.mp4`,
    plus `trim_in_sec`/`trim_out_sec` — use the direction plan's overridden
    trim window if it gave one, otherwise the footage manifest's own
    `trim_in_sec`/`trim_out_sec`. **No `camera_motion`** — footage scenes
    don't carry Ken Burns motion.
  - **`asset_type: "ai_fallback"`**: `image_asset` = `assets/images/<scene_id>.png`,
    plus `camera_motion.type` from the direction plan's keyword (`zoom_in`,
    `zoom_out`, `pan_left`, `pan_right`, `pan_up`, `pan_down`, or `static`)
    with any intensity in `camera_motion.params` (e.g.
    `{ "from": 1.0, "to": 1.12 }` for zoom, `{ "magnitude": 4 }` for pan;
    `{}` for `static`). **No `video_asset`/trim fields.**

- Carry `transition_in`/`transition_out` and `text_overlay` straight from the
  storyboard (the template renders `fade`/`dissolve` as opacity fades; other
  transition values render as hard cuts).
- `audio_asset` = `assets/audio/final_voice.mp3` — **always relative paths,
  never absolute** (the render happens on GitHub Actions, not a local
  machine; absolute paths are rejected by `validate.mjs paths` and the
  schema regexes) — this applies to `video_asset`/`image_asset` too.
- Build the top-level `asset_map` object keyed by `scene_id`, mirroring the
  same discriminated shape: footage scenes get
  `{ "video": "assets/footage/<scene_id>.mp4", "audio_offset_sec": <scene.start_sec>, "trim_in_sec": ..., "trim_out_sec": ... }`;
  ai_fallback scenes get
  `{ "image": "assets/images/<scene_id>.png", "audio_offset_sec": <scene.start_sec> }`.
- `render` = `{ "codec", "crf", "output_filename": "final_video.mp4" }` from
  `render_config.json`.

Exact shape (see `schemas/composition.schema.json` for the authority):

```json
{
  "schema_version": "2.0",
  "fps": 30, "width": 1920, "height": 1080, "duration_frames": 5040,
  "audio_asset": "assets/audio/final_voice.mp3",
  "scenes": [
    {
      "scene_id": "scene_001",
      "start_frame": 0, "end_frame": 660,
      "asset_type": "footage",
      "video_asset": "assets/footage/scene_001.mp4",
      "trim_in_sec": 2, "trim_out_sec": 24,
      "text_overlay": "May 1, 1840",
      "transition_in": "fade", "transition_out": "cut"
    },
    {
      "scene_id": "scene_002",
      "start_frame": 660, "end_frame": 1200,
      "asset_type": "ai_fallback",
      "image_asset": "assets/images/scene_002.png",
      "camera_motion": { "type": "zoom_in", "params": { "from": 1.0, "to": 1.12 } },
      "text_overlay": null,
      "transition_in": "cut", "transition_out": "fade"
    }
  ],
  "asset_map": {
    "scene_001": { "video": "assets/footage/scene_001.mp4", "audio_offset_sec": 0, "trim_in_sec": 2, "trim_out_sec": 24 },
    "scene_002": { "image": "assets/images/scene_002.png", "audio_offset_sec": 22 }
  },
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
4. Advance:
   `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage remotion --result success`.

Never hand-edit `manifest.json`, and never hand-edit `scene_config.json` or
`asset_map.json` — always regenerate them via `derive-configs` so they stay
consistent with `composition.json`.
