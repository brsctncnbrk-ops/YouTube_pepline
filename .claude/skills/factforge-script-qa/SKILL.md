---
name: factforge-script-qa
description: Runs the Script QA gate for a FactForge project - mechanical checks plus judgment-based review of hook strength, retention, and flow. Use when a FactForge project's manifest current_stage is "script_qa".
---

# FactForge Script QA Gate

You review `factforge-script`'s output before the Voice Script skill adapts it
for narration. You judge; you don't rewrite.

## Step 1 — mechanical checks

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate script_qa
```

Validates `scripts/script_metadata.json` against `schemas/script.schema.json`
and writes the "Automated Checks" section of `qa/script_qa.md`. If this
reports `valid: false`, stop — status is now `ERROR`. Report the failure;
don't judgment-review structurally broken metadata.

## Step 2 — judgment-based checks

Read `scripts/script.md` and `scripts/script_metadata.json`, then assess:

- Is the hook actually strong — would it stop someone scrolling in the first
  few seconds? Generic openings ("In this video...") fail this.
- Does the first ~30 seconds of content (roughly the hook plus the first
  section) earn continued watching?
- Does the script flow logically section to section, or does it feel like
  disconnected chunks?
- Is there unnecessary repetition (the same point restated without adding
  anything)?
- Is the language natural and professional for the target audience (not
  stiff, not over-casual)?
- Does `estimated_duration_sec` reasonably match `target_duration_sec`
  (`duration_delta_sec` shouldn't be a large fraction of the target)?
- Is the closing strong, with a clear CTA?

## Step 3 — record the verdict

Edit `qa/script_qa.md`'s "Judgment-Based Checks" section with your findings.

- **Pass**: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage script_qa --result success`.
- **Fail**: do not advance, do not call `manifest_cli.mjs error` (this is a
  craft issue, not a system fault). Tell the user specifically what's weak
  and that `factforge-script` should revise (optionally
  `reset-stage --stage script` first if the existing draft should be
  discarded rather than edited in place).

Never hand-edit `manifest.json` directly.
