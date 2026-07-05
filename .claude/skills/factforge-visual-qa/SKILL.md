---
name: factforge-visual-qa
description: Runs the Visual Prompt QA gate for a FactForge project - mechanical checks plus judgment-based review of style consistency and prompt quality. Use when a FactForge project's manifest current_stage is "visual_qa".
---

# FactForge Visual Prompt QA Gate

You review `factforge-visual-prompt`'s output before the project waits for
the human to generate images in Leonardo AI. **This gate does not check
whether `assets/images/scene_NNN.png` files exist yet — they don't, at this
point in the pipeline.** That's a separate gate (`WAITING_FOR_IMAGES`) the
Orchestrator runs later, right before the `director` stage. Don't flag
missing image files here; that's expected and not your job to check.

## Step 1 — mechanical checks

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate visual_qa
```

This validates `prompts/visual_prompts.json` against
`schemas/visual_prompts.schema.json` and checks that every storyboard scene
has exactly one matching entry with a correctly-patterned
`image_filename` ("can these scenes be linked to the asset folder" — a
name-mapping check, not a file-existence check). If this reports
`valid: false`, stop — status is now `ERROR`. Report the failure; don't
judgment-review structurally broken/mismatched data.

## Step 2 — judgment-based checks

Read `prompts/visual_prompts.md`, `negative_prompts.md`, and
`leonardo_settings.md`, then assess:

- Does every scene actually have a genuinely useful main prompt (not
  boilerplate that ignores the scene's specific visual need)?
- Do all scenes' main prompts share **one visual style universe** — do they
  all clearly incorporate the same style consistency token, or has drift
  crept in (a scene that reads like a different aesthetic)?
- Are negative prompts present and meaningful (not just a copy-pasted
  generic list with nothing scene-specific where it would help)?
- Are Leonardo settings specified and reasonable (aspect ratio matches the
  video's dimensions, guidance scale in a sane range)?

## Step 3 — record the verdict

Edit `qa/visual_qa.md`'s "Judgment-Based Checks" section with your findings.

- **Pass**: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage visual_qa --result success`. Tell the user the project is ready to move into `WAITING_FOR_IMAGES` — the Orchestrator should run the images gate once the human has generated and placed every `scene_NNN.png`.
- **Fail**: do not advance, do not call `manifest_cli.mjs error`. Tell the user specifically what needs revising and that `factforge-visual-prompt` should redo it (or `factforge-visual-style-bible` first, if the underlying style itself is the problem).

Never hand-edit `manifest.json` directly.
