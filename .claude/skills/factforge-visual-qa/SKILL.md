---
name: factforge-visual-qa
description: Runs the Visual Prompt QA gate for a FactForge project - mechanical checks plus judgment-based review of footage selection quality and AI-fallback prompt/style consistency. Use when a FactForge project's manifest current_stage is "visual_qa".
---

# FactForge Visual Prompt QA Gate

You review both `factforge-footage-retrieval`'s and `factforge-visual-prompt`'s
output before the project waits for the human to generate any needed
fallback images in Leonardo AI. **This gate does not check whether
`assets/footage/scene_NNN.mp4` or `assets/images/scene_NNN.png` files exist
yet — they don't, at this point in the pipeline.** That's a separate gate
(`WAITING_FOR_VISUAL_ASSETS`) the Orchestrator runs later, right before the
`director` stage. Don't flag missing asset files here; that's expected and
not your job to check.

## Step 1 — mechanical checks

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate visual_qa
```

This validates `prompts/visual_prompts.json` against
`schemas/visual_prompts.schema.json` **and** `footage/footage_manifest.json`
against `schemas/footage_manifest.schema.json`, then checks:

- **Prompt-to-scene coverage (fallback scenes only)**: every scene flagged
  `fallback_to_ai_visual: true` in `footage_manifest.json` has exactly one
  matching, correctly-patterned entry in `visual_prompts.json` — and no
  entries exist for scenes that *aren't* flagged fallback.
- **Footage provenance coverage**: every storyboard scene has a
  `footage_manifest.json` entry; every non-fallback entry has complete
  provenance (source/license/`selected_url`/reasoning) and actually carries
  `native_duration_sec`/`native_resolution` (proof it passed the hard
  filters, not just an unfiltered pick).

If this reports `valid: false`, stop — status is now `ERROR`. Report the
failure; don't judgment-review structurally broken/mismatched data.

## Step 2 — judgment-based checks

Read `footage/footage_manifest.md`, `prompts/visual_prompts.md`,
`negative_prompts.md`, and `leonardo_settings.md`, then assess:

- **Footage selection quality**: does each `reasoning` note actually explain
  a deliberate editorial choice, or does it read like a keyword-match log
  ("matches search term")? Do the choices plausibly fit each scene's mood
  and visual_need, not just generic b-roll?
- **Fallback justification**: for scenes flagged `fallback_to_ai_visual`, is
  it a genuine case of no adequate footage (abstract/metaphor content), or
  does it look like the search gave up too easily on something findable?
- For any AI-fallback prompts that exist: does every scene actually have a
  genuinely useful main prompt (not boilerplate that ignores the scene's
  specific visual need)? Do they share **one visual style universe** — do
  they all clearly incorporate the same style consistency token, or has
  drift crept in? Are negative prompts present and meaningful? Are Leonardo
  settings specified and reasonable?

## Step 3 — record the verdict

Edit `qa/visual_qa.md`'s "Judgment-Based Checks" section with your findings.

- **Pass**: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage visual_qa --result success`. Tell the user the project is ready to move into `WAITING_FOR_VISUAL_ASSETS` — the Orchestrator should run the `visual_assets` gate once the footage clips are downloaded (`node scripts/footage_fetch.mjs fetch`) and any needed fallback stills have been generated and placed.
- **Fail**: do not advance, do not call `manifest_cli.mjs error`. Tell the user specifically what needs revising and which skill should redo it (`factforge-footage-retrieval` for a weak footage pick, `factforge-visual-prompt` for a weak fallback prompt, or `factforge-visual-style-bible` first if the underlying style itself is the problem).

Never hand-edit `manifest.json` directly.
