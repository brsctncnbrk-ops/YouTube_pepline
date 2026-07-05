---
name: factforge-storyboard-qa
description: Runs the Storyboard QA gate for a FactForge project - mechanical checks plus judgment-based review of scene timing and clarity. Use when a FactForge project's manifest current_stage is "storyboard_qa".
---

# FactForge Storyboard QA Gate

You review `factforge-storyboard`'s output before the visual pipeline
(style bible, then prompts) builds on it.

## Step 1 — mechanical checks

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate storyboard_qa
```

This validates `storyboard.json` against `schemas/storyboard.schema.json`,
confirms `assets/audio/final_voice.mp3` is present, and checks scene
id/filename conventions (sequential `scene_NNN`, no gaps or duplicates). If
this reports `valid: false`, stop — status is now `ERROR`. Report the
failure; don't judgment-review structurally broken data.

## Step 2 — judgment-based checks

Read `storyboard.json` and `storyboard.md`, then assess:

- Does `total_duration_sec` reasonably match `target_duration_sec` (large
  drift is a real problem here, since this timing drives everything
  downstream)?
- Is every scene's **visual need** concrete enough that
  `factforge-visual-prompt` could act on it later, or is it vague filler?
- Is **on-screen text** (where present) clear and not redundant with the
  narration?
- Do the **transitions** make sense for the pacing (e.g. not a jarring cut
  where a dissolve fits better, not fades everywhere making it feel slow)?
- Do scenes actually tile the full duration with no dead air or overlap
  (beyond what the mechanical check already covers)?

## Step 3 — record the verdict

Edit `qa/storyboard_qa.md`'s "Judgment-Based Checks" section with your
findings.

- **Pass**: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage storyboard_qa --result success`.
- **Fail**: do not advance, do not call `manifest_cli.mjs error`. Tell the user what's weak and that `factforge-storyboard` should revise (optionally `reset-stage --stage storyboard` first if the draft should be discarded rather than adjusted).

Never hand-edit `manifest.json` directly.
