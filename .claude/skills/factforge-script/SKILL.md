---
name: factforge-script
description: Writes the retention-optimized narration script for a FactForge video from the research output. Use when a FactForge project's manifest current_stage is "script".
---

# FactForge Script Writer

You turn approved research into a YouTube narration script. You do not
research further (use what `factforge-research` produced; if it's
insufficient, that should have been caught by `factforge-research-qa` — flag
gaps rather than inventing facts) and you do not write the ElevenLabs voice
text (that's `factforge-voice`'s job — write for reading fluency here, not
pronunciation).

## Inputs

`research/research.json`, `research/research.md`, `research/sources.md`, and
`config/video_config.json` (`target_duration_sec`). Write in the project's
configured `language` (from `config/project_config.json`).

## Task

Write a script that:

- Opens with a **strong hook** in the first few seconds — a question, a
  surprising fact, a stakes-setting statement. Avoid throat-clearing ("Hi,
  welcome back to my channel...").
- Builds a **retention-optimized structure**: balanced sections, each with a
  clear purpose, smooth transitions between them, and at least one
  **curiosity loop** (a question raised early and answered later) somewhere
  in the middle sections.
- Cuts anything not load-bearing for the story — no padding to hit a word
  count.
- Closes with a **strong ending**: a takeaway plus a call to action.
- Uses natural, professional prose written to be spoken aloud, not read as an
  article — short sentences, active voice, no dense subordinate clauses.
- Targets `target_duration_sec` using roughly 150 words/minute (~2.5
  words/second) as a sizing heuristic — this is a rule of thumb for section
  sizing, not a hard mechanical requirement.

## Outputs

Write both files under `projects/<project_id>/scripts/`:

**`script.md`** — the full narration script, in reading order, with clear
section headings (e.g. `## Hook`, `## Section: <heading>`, `## Closing`) so
it's easy to map back to `script_metadata.json`.

**`script_metadata.json`** — must validate against `schemas/script.schema.json`.
Exact shape:

```json
{
  "project_id": "...",
  "title_working": "...",
  "hook": { "text": "...", "technique": "e.g. surprising-stat | open-question | stakes-statement" },
  "sections": [
    { "id": "s1", "heading": "...", "purpose": "...", "est_duration_sec": 45, "word_count": 110, "contains_curiosity_loop": true }
  ],
  "closing": { "text": "...", "cta": "e.g. subscribe | watch-next | comment-prompt" },
  "total_word_count": 1500,
  "estimated_duration_sec": 600,
  "target_duration_sec": 600,
  "duration_delta_sec": 0,
  "tone": "e.g. dramatic-but-educational",
  "generated_at": "<ISO 8601 timestamp>"
}
```

`duration_delta_sec = estimated_duration_sec - target_duration_sec`. Keep it
reasonably close to 0 — large drift is exactly what `factforge-script-qa`
will flag.

## Before finishing

1. Validate: `node scripts/validate.mjs schema --file projects/<project_id>/scripts/script_metadata.json --schema script`. Fix any errors first.
2. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage script --result success`.
3. If research is too thin to write from, don't invent facts — run `node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage script --message "<why>" --action "<what's needed>"` and explain to the user that research needs another pass.

Never hand-edit `manifest.json` directly.
