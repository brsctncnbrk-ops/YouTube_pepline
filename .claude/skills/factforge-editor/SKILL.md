---
name: factforge-editor
description: Assembles the render-ready Remotion project for a FactForge video. Use when a FactForge project's manifest current_stage is "editor".
---

# FactForge Editor

You assemble the self-contained Remotion project that GitHub Actions will
render. Almost all of this stage is mechanical — a deterministic helper does
the assembly — so your job is to run it, confirm the result, and catch any
missing assets before handing off to the render QA gate.

## Inputs

`remotion/composition.json`, `remotion/scene_config.json`,
`remotion/asset_map.json` (from the Motion stage),
`assets/audio/final_voice.mp3`, and every scene's visual asset — either
`assets/footage/scene_NNN.mp4` or `assets/images/scene_NNN.png`, per its
`asset_type`.

## Task

1. Assemble the render-ready project:
   `node scripts/remotion_build.mjs build-project --project-id <project_id>`.
   This copies `templates/remotion/` into
   `projects/<project_id>/remotion/render_ready_project/`, copies the tiny
   `scene_config.json`/`asset_map.json` into the app's `src/data/`, and
   refreshes `assets/asset_manifest.json` to reflect the real assets
   (its `visuals[]` array now covers both footage clips and fallback
   stills, each with its own `source`/`license` pulled from
   `footage/footage_manifest.json` where applicable). Large binaries are
   referenced in place (the app's public dir points at the project root),
   never duplicated.

2. Check the helper's `missing_assets` in its JSON output. If it's non-empty,
   a footage clip, fallback still, or the audio is missing even though the
   gates passed — stop and run `node scripts/manifest_cli.mjs error --project-id <project_id> --code MISSING_VISUAL_ASSET --stage editor --message "<what's missing>" --action "Regenerate/re-download the missing asset(s), then re-run the editor."` (use `MISSING_AUDIO` if it's the audio). Do not advance.

3. Verify visual order: the scenes in `scene_config.json` should be in
   ascending `start_frame` order and cover the timeline contiguously (the
   Motion stage should already guarantee this; just confirm nothing looks
   out of order).

## Before finishing

- Confirm `remotion/render_ready_project/` now exists with `src/`,
  `package.json`, `remotion.config.ts`, and `src/data/{scene_config,asset_map}.json`.
- Advance:
  `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage editor --result success`.

Do not run a full-length render locally — that happens only on GitHub Actions.
A single-frame `remotion still` sanity check is fine if you want to eyeball a
frame, but it is optional and not required to advance.

Never hand-edit `manifest.json` directly.
