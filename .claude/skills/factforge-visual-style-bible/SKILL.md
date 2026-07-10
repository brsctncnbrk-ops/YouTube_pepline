---
name: factforge-visual-style-bible
description: Defines the reusable visual style and consistency token for a FactForge video's AI-fallback stills (scenes footage_retrieval couldn't match with real footage). Use when a FactForge project's manifest current_stage is "visual_style_bible".
---

# FactForge Visual Style Bible

You define the visual language for this video's **AI-fallback stills only**
— since the footage-primary migration, `factforge-footage-retrieval` runs
before you and already picked real stock footage for most scenes. You style
whatever's left: scenes flagged `fallback_to_ai_visual: true` in
`footage/footage_manifest.json`, because no adequate footage match existed.
A project can legitimately have zero such scenes — in that case, still write
a minimal style bible (a future scene might need it after a re-run), but
don't over-invest.

This stage has **no dedicated QA gate** in the pipeline — the next gate
(`visual_qa`) only checks the prompts built from your output, not this
output directly — so hold yourself to a high bar and double-check internal
consistency across all six files before advancing, since nothing downstream
will catch a self-contradictory style bible for you.

## Inputs

`storyboard/storyboard.json`, `scripts/script.md`,
`footage/footage_manifest.json` (identify which scenes actually need
styling), `footage/footage_manifest.md` (the surrounding footage's color/
tone, so fallback stills can best-effort match it — see below), and
`config/project_config.json`'s `reference_channel_style`.

## Task

Design one coherent visual identity for the fallback stills and write it
down precisely enough that a different prompt-writing session, days later,
would produce visually consistent images from your notes alone. Cover:

- **Footage color/tone matching** — read `footage_manifest.md`'s chosen
  clips for the scenes *surrounding* each fallback scene and note their
  general color grade/tone (warm vs. cool, high vs. low contrast, saturated
  vs. desaturated) so the fallback stills don't visually clash when cut
  against real footage. Treat this as **best-effort only** — call it out
  explicitly in `visual_style_bible.md` as something that still needs a
  human visual QC pass once the stills exist; a prompt-level color
  description can't guarantee a true grade match.

- **Overall visual language** — the core aesthetic (e.g. "clean cinematic
  2.5D illustration" or "flat vector infographic") consistent with
  `reference_channel_style`.
- **Color palette** — a specific, named set of colors (not "warm tones" —
  actual hex-adjacent descriptions or named palette) used across every
  scene.
- **Character/subject style** — how people or figures are depicted, if the
  storyboard calls for any (proportions, level of realism, recurring
  visual traits).
- **Graphic style** — how text overlays, icons, diagrams, or graphic
  elements should look when they appear.
- **Camera language** — the vocabulary of shots this video uses (e.g.
  "wide establishing shots for context, close details for emphasis") so
  `factforge-visual-prompt` has a consistent grammar to draw camera angles
  from.
- **Prompt rules** — the concrete rules the next skill must follow: what to
  always include, what to always avoid, and, most importantly, the
  **style consistency token** — a single reusable string every scene's main
  prompt will incorporate verbatim, e.g.:

  ```
  FactForge documentary infographic style, clean cinematic 2.5D illustration,
  bold readable shapes, dramatic but educational tone, high contrast lighting,
  modern infographic composition, consistent color palette, professional
  YouTube documentary look
  ```

  Tailor this token to the actual video rather than copying the example
  verbatim — it should reflect the palette, character style, and graphic
  style you just defined, not contradict them.

## Outputs

Write all six files under `projects/<project_id>/style/`:

- `visual_style_bible.md` — the overview tying everything together, plus the
  style consistency token stated prominently (this is the file a human
  skims to understand the look at a glance).
- `color_palette.md`
- `character_style.md`
- `graphic_style.md`
- `camera_language.md`
- `prompt_rules.md` — the concrete dos/don'ts plus the style consistency
  token again, verbatim and easy to copy — this is the file
  `factforge-visual-prompt` will read most closely.

## Before finishing

There's no JSON schema and no dedicated QA skill for this stage, so your own
review is the only check:

1. Re-read all six files together and confirm the style consistency token
   in `visual_style_bible.md` and `prompt_rules.md` match exactly (copy the
   exact string, don't paraphrase it twice).
2. Confirm nothing in `character_style.md`/`graphic_style.md` contradicts
   the palette or overall visual language.
3. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage visual_style_bible --result success`.

Never hand-edit `manifest.json` directly.
