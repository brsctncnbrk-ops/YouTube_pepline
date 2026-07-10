---
name: factforge-final-qa
description: Runs the Final QA gate for a FactForge project - the last check before the video and its package are declared publish-ready, including fact-verification/hedge-token/footage-provenance completeness and reused-content risk. Use when a FactForge project's manifest current_stage is "final_qa".
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
`pinned_comment.md`). It also re-runs, as final gate checks:

- **Fact-verification completion** — `fact_audit/claims.json`'s
  `unresolved_count === 0`, and every `verified` claim still has a
  non-expired `fact_registry/` entry (a claim's registry entry can expire
  between `script_qa` and a later `final_qa` on a long-running project).
- **Zero hedge tokens** — a regex scan of `scripts/script.md` against the
  banned-token list (`TBD`, "it's unclear", "may or may not", "allegedly",
  "reportedly", "some say", "sources suggest", "it seems", "possibly",
  "perhaps" — extend the list in `scripts/validate.mjs` if a real
  false-negative surfaces).
- **Asset provenance completeness** — every scene in
  `footage/footage_manifest.json` has complete provenance (source, license,
  URL, one-line reasoning) unless it's flagged `fallback_to_ai_visual`.

If this reports `valid: false`, stop — status is now `ERROR`. Report exactly
what's missing/invalid and which stage must fix it (missing video → the
render workflow hasn't run or didn't commit its output; missing/invalid
packaging → `factforge-packaging`; unresolved claims → `factforge-fact-audit`
needs another pass; hedge tokens found → edit `scripts/script.md` directly,
these are mechanical prose fixes, not a full script rewrite; provenance gaps
→ `factforge-footage-retrieval`).

## Step 2 — judgment-based checks

You can't watch the video frame-by-frame from here, but you can cross-check
the artifacts for consistency and publish-readiness. Read
`packaging/packaging.json` (+ the six files), `storyboard/storyboard.json`,
`scripts/script.md`, `research/research.json`'s `source_structure_summary`,
`direction/direction_plan.md`, `footage/footage_manifest.md`, and
`output/render_log.txt` if present, then assess:

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
  tags are relevant, chapters start at `0:00` and are in order, and the
  footage-credits section (if any attribution was required) is present.
- **Visual pacing** — check the finished cadence against `factforge-script`'s
  advisory targets (shot change ~6-8s, strong visual metaphor ~20-30s,
  section-transition feel ~45-60s, major idea break ~90s), using
  `storyboard.json` scene durations and `direction_plan.md`. These are
  advisory, not a hard rule — flag it only if the actual pacing reads
  noticeably off (e.g. no shot change for 45s straight), not for being a few
  seconds outside the range.
- **Reused-content risk — two parts, both required:**
  1. **Script structure**: does the finished script's argument sequence
     mirror `research.json`'s `source_structure_summary` (topic order /
     argument sequence of the *source* material) too closely? A
     genuinely-reworked video should not track the source's beat-by-beat
     order.
  2. **Footage distinctiveness**: does the chosen footage (per
     `footage_manifest.md`'s `reasoning` notes and your own read of the
     selections) read as a deliberately-edited visual argument, or as
     generic, interchangeable stock loosely slapped under the narration?
     **Switching from AI stills to real footage does not, by itself, reduce
     reused-content risk** — YouTube evaluates the originality of the
     finished work regardless of which visual tool produced it, so weigh
     this as seriously as the script check.
- **Publish-ready** — anything else a human must know before uploading is
  surfaced.

## Step 3 — record the verdict

Write your findings into `qa/final_qa_report.md`'s "Judgment-Based Checks"
section (replace the placeholder), including an explicit line on the
reused-content check's outcome for both parts.

- **Pass (including reused-content check clear on both parts)**: advance the
  final stage — this completes the pipeline and sets the project `DONE`:
  `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage final_qa --result success`.
  Tell the user the video is publish-ready, and point them at the deliverables
  they'll upload: `output/final_video.mp4` plus the `packaging/` files.
- **Reused-content check fires positive (either part)**: this is not a
  silent report-only note — it blocks completion pending human review, the
  same posture `factforge-script` uses for thin research. Do **not** advance.
  Run:
  ```
  node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage final_qa --message "<which part fired and why>" --action "<what the human needs to review/decide>"
  ```
  and explain the concern directly to the user — this is a judgment call
  only a human should clear, not something to wave through because
  everything else passed.
- **Fail (any other reason)**: do not advance. If the failure is a
  missing/broken deliverable or one of the re-checked mechanical items
  (unresolved claim, hedge token, provenance gap), it's already logged as an
  error by the mechanical step; if it's a quality judgment (weak title,
  chapters that don't match the video, pacing noticeably off), explain it and
  say which stage to re-run (`factforge-packaging`, `factforge-footage-retrieval`,
  or earlier if the video itself is wrong).

Never hand-edit `manifest.json` directly.
