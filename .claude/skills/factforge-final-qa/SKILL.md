---
name: factforge-final-qa
description: Runs the Final QA gate for a FactForge project - the last check before the video and its package are declared publish-ready. Use when a FactForge project's manifest current_stage is "final_qa".
---

# FactForge Final QA Gate

You are the final checkpoint. You confirm the rendered video and its YouTube
package are complete, consistent, and publish-ready. Passing this gate marks
the whole project `DONE`.

## Step 1 — mechanical checks

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate final_qa
```

This validates `packaging/packaging.json` against
`schemas/packaging.schema.json` and confirms every publish deliverable
exists: `output/final_video.mp4` and all six packaging files
(`title.md`, `description.md`, `tags.txt`, `thumbnail.md`, `chapters.txt`,
`pinned_comment.md`). If it reports `valid: false`, stop — status is now
`ERROR`. Report exactly what's missing/invalid and which stage must fix it
(missing video → the render workflow hasn't run or didn't commit its output;
missing/invalid packaging → `factforge-packaging`).

## Step 2 — judgment-based checks

You can't watch the video frame-by-frame from here, but you can cross-check
the artifacts for consistency and publish-readiness. Read
`packaging/packaging.json` (+ the six files), `storyboard/storyboard.json`,
`scripts/script.md`, and `output/render_log.txt` if present, then assess:

- **Video present and plausible** — `output/final_video.mp4` exists and (from
  `render_log.txt` / the composition) matches the expected duration; the
  render didn't silently truncate.
- **Storyboard alignment** — the chapters and description reflect the actual
  scene/story structure in `storyboard.json` (no chapter for a scene that was
  cut, timings in range).
- **On-screen text / readability** — the storyboard's on-screen text and the
  thumbnail overlay text are short and legible (spot-check for typos, and for
  overlays too long to read at a glance).
- **Title strength** — at least one title is genuinely strong and honest to
  the content.
- **Thumbnail clickability** — at least one thumbnail concept is compelling
  and tied to the real footage.
- **Description / tags / chapters completeness** — description reads well,
  tags are relevant, chapters start at `0:00` and are in order.
- **Publish-ready** — anything a human must know before uploading (e.g. a
  claim in the script flagged as unverified in research) is surfaced.

## Step 3 — record the verdict

Write your findings into `qa/final_qa_report.md`'s "Judgment-Based Checks"
section (replace the placeholder). Give a clear overall PASS/FAIL.

- **Pass**: advance the final stage — this completes the pipeline and sets the
  project `DONE`:
  `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage final_qa --result success`.
  Tell the user the video is publish-ready, and point them at the deliverables
  they'll upload: `output/final_video.mp4` plus the `packaging/` files.
- **Fail**: do not advance. If the failure is a missing/broken deliverable,
  it's already logged as an error by the mechanical step; if it's a quality
  judgment (weak title, chapters that don't match the video), explain it and
  say which stage to re-run (`factforge-packaging`, or earlier if the video
  itself is wrong).

Never hand-edit `manifest.json` directly.
