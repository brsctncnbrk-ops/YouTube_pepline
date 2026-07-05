---
name: factforge-research-qa
description: Runs the Research QA gate for a FactForge project - mechanical checks plus judgment-based quality review of the research output. Use when a FactForge project's manifest current_stage is "research_qa".
---

# FactForge Research QA Gate

You review the output of the `factforge-research` skill before the Script
Writer is allowed to build on it. You do not fix the research yourself — you
judge it and report back.

## Step 1 — mechanical checks

Run:

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate research_qa
```

This validates `research/research.json` against `schemas/research.schema.json`
and writes an "Automated Checks" section into `qa/research_qa.md`. If this
step reports `valid: false`, stop here — the manifest is now in `ERROR` status
with a logged reason. Report the failure to the user; don't proceed to
judgment checks on structurally broken data.

## Step 2 — judgment-based checks

Read `research/research.json`, `research.md`, and `sources.md`, then assess:

- Are the sources actually credible (not just present in sufficient count —
  the mechanical check only counts them)?
- Are dates internally consistent (no contradictions between `key_facts` and
  `timeline`)?
- Is the main event order clear and correctly sequenced?
- Is there enough material here for a scriptwriter to work from, or are there
  gaps that would force the Script Writer to invent facts?

## Step 3 — record the verdict

Edit `qa/research_qa.md` and replace the placeholder "Judgment-Based Checks"
section with your actual findings: a clear PASS/FAIL and, if FAIL, the
specific things that need fixing.

- **If judgment checks pass**: run
  `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage research_qa --result success`.
- **If judgment checks fail**: do **not** advance and do **not** call
  `manifest_cli.mjs error` — a content-quality gap isn't a system error, it's
  feedback for a redo. Tell the user what's missing/wrong and that
  `factforge-research` should be re-run (optionally after
  `node scripts/manifest_cli.mjs reset-stage --project-id <project_id> --stage research` if the existing files should be discarded first).

Never hand-edit `manifest.json` directly.
