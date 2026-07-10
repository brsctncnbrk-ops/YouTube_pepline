---
name: factforge-script-qa
description: Runs the Script QA gate for a FactForge project - mechanical checks plus judgment-based review of hook strength, retention, and flow. Use when a FactForge project's manifest current_stage is "script_qa".
---

# FactForge Script QA Gate

You review `factforge-script`'s output — **after** `factforge-fact-audit` has
already run and edited it — before the Voice Script skill adapts it for
narration. You judge structure, retention, and beat coverage; you don't
fact-check (that already happened) and you don't rewrite.

## Step 1 — mechanical checks

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate script_qa
```

Validates `scripts/script_metadata.json` against `schemas/script.schema.json`
**and** `fact_audit/claims.json` against `schemas/fact_audit.schema.json`,
and re-checks that `unresolved_count === 0` with every `verified` claim still
backed by a non-expired `fact_registry/` entry (this is a belt-and-suspenders
re-check — `factforge-fact-audit` already hard-blocks on this before you ever
run, so it should never actually fail here). Writes the "Automated Checks"
section of `qa/script_qa.md`. If this reports `valid: false`, stop — status
is now `ERROR`. Report the failure; don't judgment-review structurally broken
or unaudited text.

## Step 2 — judgment-based checks

Read `scripts/script.md` and `scripts/script_metadata.json`, then assess:

- Is the hook (beat 1, the big question) actually strong — would it stop
  someone scrolling in the first few seconds? Generic openings ("In this
  video...") fail this.
- **9-beat coverage**: do all 7 middle `sections[]` have a `beat_name`, in
  the correct order (`internal_conflict` → `false_assumption` →
  `deeper_problem` → `scientific_explanation` → `real_life_manifestation` →
  `dark_turning_point` → `grounded_resolution`)? Does each beat actually read
  like that beat, not just carry the label?
- **`visual_guidance` populated**: does every beat (`hook`, each section,
  `closing`) have a concrete `mood` and a `visual_need_hint` specific enough
  for `factforge-storyboard`/footage-retrieval to search on — not vague
  abstractions?
- Does the first ~30 seconds of content (roughly the hook plus the first
  beat) earn continued watching?
- Does the script flow logically beat to beat, or does it feel like
  disconnected chunks? Does the tone actually read calm/curious/essayistic,
  not fast-fact-tempo?
- Is there unnecessary repetition (the same point restated without adding
  anything)?
- Is the language natural and professional for the target audience (not
  stiff, not over-casual)?
- Does `estimated_duration_sec` reasonably match `target_duration_sec`
  (`duration_delta_sec` shouldn't be a large fraction of the target)?
- Is the closing (beat 9) genuinely thought-provoking, with a clear CTA —
  not just a neatly bowed summary?

## Step 3 — record the verdict

Edit `qa/script_qa.md`'s "Judgment-Based Checks" section with your findings.

- **Pass**: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage script_qa --result success`.
- **Fail**: do not advance, do not call `manifest_cli.mjs error` (this is a
  craft issue, not a system fault). Tell the user specifically what's weak
  and that `factforge-script` should revise (optionally
  `reset-stage --stage script` first if the existing draft should be
  discarded rather than edited in place).

Never hand-edit `manifest.json` directly.
