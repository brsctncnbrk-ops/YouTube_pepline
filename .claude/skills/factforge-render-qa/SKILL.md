---
name: factforge-render-qa
description: Runs the Render QA gate for a FactForge project - the final technical check before the GitHub Actions render. Use when a FactForge project's manifest current_stage is "render_qa".
---

# FactForge Render QA Gate

You are the last checkpoint before the (expensive) GitHub Actions render.
Your job is to confirm the project is genuinely render-ready and then hand the
user the exact command to trigger the render. This gate is mostly mechanical —
the deterministic checks catch the failure modes that would otherwise waste
render minutes.

## Step 1 — mechanical checks

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate render_qa
```

This runs the aggregate render-readiness check (`validateRenderReady`) and
writes `qa/render_qa.md`. It verifies:

- `assets/audio/final_voice.mp3` present.
- Every `assets/images/scene_NNN.png` referenced by the storyboard present.
- No absolute paths / drive letters / `..` in the Remotion config files.
- Scene filenames/numbering are consistent.
- `remotion/render_ready_project/` exists.
- `remotion/{composition,scene_config,asset_map}.json` all present.
- `.github/workflows/render.yml` present.
- `remotion/composition.json` validates against the composition schema.

If this reports `valid: false`, stop — status is now `ERROR` with a logged
reason. Report exactly what's missing and which earlier stage needs to fix it
(missing assets → the human re-drops them; missing configs →
`factforge-motion`; missing `render_ready_project/` → `factforge-editor`).

## Step 2 — judgment-based checks

Read `remotion/composition.json` and `qa/render_qa.md`, then confirm:

- `duration_frames` equals the last scene's `end_frame` (the whole timeline
  is covered, no truncated or overhanging audio/video).
- Scenes are contiguous in frames (each scene's `start_frame` equals the
  previous scene's `end_frame`) — no gaps or overlaps.
- `fps`/`width`/`height` match `config/video_config.json`, and `render`
  matches `config/render_config.json`.

## Step 3 — record verdict and prepare render

Edit `qa/render_qa.md`'s "Judgment-Based Checks" section with your findings.

- **Pass**: mark the gate complete, then prepare the render — **in this
  order**, because `advance` resets status to `IN_PROGRESS` and
  `prepare-render` must run after it to leave the project at
  `READY_FOR_RENDER`:

  ```
  node scripts/manifest_cli.mjs advance --project-id <project_id> --stage render_qa --result success
  node scripts/manifest_cli.mjs prepare-render --project-id <project_id>
  ```

  `prepare-render` re-runs the render-readiness check, sets status
  `READY_FOR_RENDER`, and prints the render command. Tell the user the project
  is render-ready and that they (or you, if asked) can trigger the render on
  GitHub Actions:

  ```
  gh workflow run render.yml -f project_id=<project_id>
  ```

  or via the GitHub UI (Actions → "FactForge Render" → Run workflow →
  enter the project_id). Remind them that the full render runs **only** on
  GitHub Actions, never locally, and that when it finishes the workflow
  commits `output/final_video.mp4` back to the branch, which unblocks the
  `packaging` stage.
- **Fail**: do not run `prepare-render`. Explain what's wrong and which stage
  must be re-run.

Never hand-edit `manifest.json` directly.
