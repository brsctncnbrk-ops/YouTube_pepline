---
name: factforge-visual-prompt
description: Writes Leonardo AI image prompts for a FactForge video's AI-fallback scenes only (real footage covers everything else). Use when a FactForge project's manifest current_stage is "visual_prompt".
---

# FactForge Visual Prompt

You turn the visual style bible into concrete, Leonardo-AI-ready prompts —
but **only for scenes flagged `fallback_to_ai_visual: true`** in
`footage/footage_manifest.json`. Since the footage-primary migration, real
stock footage is the primary visual source; this stage now covers just the
scenes `factforge-footage-retrieval` couldn't match. **A project may
legitimately produce zero prompts here** if every scene got real footage —
don't invent fallback scenes that don't exist just to have something to do.

You do not generate images yourself; FactForge does not call the Leonardo
API. A human pastes your prompts into Leonardo AI manually and drops the
resulting `assets/images/scene_NNN.png` files into place later, after this
stage and `visual_qa` both pass.

## Inputs

`footage/footage_manifest.json` (to identify which scenes need a prompt —
filter to `fallback_to_ai_visual: true`), `storyboard/storyboard.json`,
`style/visual_style_bible.md`, `style/prompt_rules.md` (and
`color_palette.md`/`camera_language.md`/`character_style.md` as needed for
texture). Extract the **style consistency token** verbatim from
`prompt_rules.md` — every scene's `main_prompt` must incorporate it.

## Task

For every scene flagged `fallback_to_ai_visual: true` (no skipping within
that set, no extras outside it), write:

- A **main prompt** that opens with or clearly incorporates the style
  consistency token, then describes the scene's specific subject, drawing
  the visual need from `storyboard.json` and the framing/mood language from
  `camera_language.md`. If `visual_style_bible.md` notes a color/tone to
  match against the surrounding footage, work that into the prompt too — but
  remember this is best-effort only; flag in `visual_prompts.md` that final
  color consistency against the real footage still needs a human visual QC
  pass once the still is generated, not just this prompt-level attempt.
- A **negative prompt** listing what to avoid (following `prompt_rules.md`'s
  negative conventions, plus anything scene-specific).
- **Camera angle**, **lighting**, and **composition** notes consistent with
  `camera_language.md`.
- One or two **alt prompts** for scenes where a single interpretation is
  risky (ambiguous visual need, or a subject prone to AI artifacts).
- Suggested **Leonardo settings**: model, aspect ratio (match the project's
  video dimensions — typically 16:9), guidance scale, and a `seed`/
  `style_reference` if you want a specific prior generation reused for
  consistency (`null` if not applicable yet).
- The exact output filename this scene's image must be saved as:
  `scene_NNN.png` matching the storyboard's `scene_id`.

## Outputs

Write all four files under `projects/<project_id>/prompts/`:

**`visual_prompts.json`** — the source of truth; must validate against
`schemas/visual_prompts.schema.json`:

```json
{
  "schema_version": "2.0",
  "project_id": "...",
  "style_token": "<the exact style consistency token>",
  "scenes": [
    {
      "scene_id": "scene_001",
      "image_filename": "scene_001.png",
      "main_prompt": "...",
      "negative_prompt": "...",
      "camera_angle": "...",
      "lighting": "...",
      "composition": "...",
      "alt_prompts": ["..."],
      "leonardo_settings": { "model": "...", "aspect_ratio": "16:9", "guidance_scale": 7, "seed": null, "style_reference": null },
      "status": "pending"
    }
  ],
  "generated_at": "<ISO 8601 timestamp>"
}
```

`scenes[]` may be **empty** — that's valid and expected if
`footage_retrieval` matched every scene to real footage. `image_filename`
must always equal `"<scene_id>.png"` and every scene flagged
`fallback_to_ai_visual: true` in `footage_manifest.json` must have exactly
one matching entry here (no entries for scenes that aren't flagged) — this
mapping is checked mechanically by `visual_qa`.

**`visual_prompts.md`**, **`negative_prompts.md`**, **`leonardo_settings.md`**
— human-readable views of the same data, one scene per entry, so the human
can work through Leonardo AI scene by scene without parsing JSON.

## Before finishing

1. Validate the schema: `node scripts/validate.mjs schema --file projects/<project_id>/prompts/visual_prompts.json --schema visual_prompts`.
2. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage visual_prompt --result success`.
3. If the style bible is missing something you need (e.g. no camera language for a shot type the storyboard requires), don't invent a contradicting style — run `node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage visual_prompt --message "<why>" --action "<what's needed>"` and note that `factforge-visual-style-bible` needs another pass.

Never hand-edit `manifest.json` directly.
