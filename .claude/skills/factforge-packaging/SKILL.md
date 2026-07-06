---
name: factforge-packaging
description: Writes the YouTube upload package (titles, description, tags, thumbnail concepts, chapters, pinned comment) for a rendered FactForge video. Use when a FactForge project's manifest current_stage is "packaging".
---

# FactForge Packaging

You write the YouTube publishing package for a finished video. By the time
this stage runs, the render is done and `output/final_video.mp4` exists. This
stage has **no dedicated QA gate of its own** — the final QA gate
(`factforge-final-qa`) reviews your output — so make it genuinely
publish-ready, not a placeholder.

## Inputs

`scripts/script.md` and `scripts/script_metadata.json` (hook, title working,
tone), `research/research.md` (facts worth surfacing in the description),
`storyboard/storyboard.json` (scene start times, for deriving chapters), and
`output/final_video.mp4` (the actual video length/content). Write in the
project's configured `language` (from `config/project_config.json`).

## Task

Produce a strong, click-worthy-but-honest YouTube package:

- **Titles** — at least 3 genuinely different alternatives (not trivial
  rewordings). Front-load the hook/keyword; avoid clickbait that the video
  doesn't pay off.
- **Description** — an opening 1–2 lines that earn the click and restate the
  hook, then a fuller summary, then (optionally) sources/credits. Natural,
  not keyword-stuffed.
- **Tags** — relevant search terms and topic keywords.
- **Thumbnail concepts** — at least one, each with a concept description, the
  short **text overlay** that would go on the thumbnail (a few punchy words),
  and notes on composition/visual focus. Tie them to the actual footage.
- **Chapters** — timestamps + labels. **The first chapter must be `0:00`.**
  Derive the timestamps from `storyboard.json` scene start times (convert
  seconds to `m:ss` / `h:mm:ss`), grouping scenes into meaningful chapters
  rather than one-per-scene. Keep chapters in ascending time order.
- **Pinned comment** — a short comment to pin (a question to drive
  engagement, a correction channel, or a key link).

## Outputs

Author `packaging/packaging.json` first (the schema-backed source of truth),
matching `schemas/packaging.schema.json`:

```json
{
  "project_id": "...",
  "titles": ["...", "...", "..."],
  "description": "...",
  "tags": ["...", "..."],
  "thumbnail_concepts": [{ "concept": "...", "text_overlay": "...", "notes": "..." }],
  "chapters": [{ "timestamp": "0:00", "label": "Intro" }],
  "pinned_comment": "...",
  "generated_at": "<ISO 8601 timestamp>"
}
```

Then write the six human-readable files the uploader copies from, derived
from the same content (keep them consistent with the JSON):

- `packaging/title.md` — the title alternatives, best first.
- `packaging/description.md` — the full description, ready to paste.
- `packaging/tags.txt` — the tags (comma-separated, ready to paste).
- `packaging/thumbnail.md` — the thumbnail concepts and their overlay text.
- `packaging/chapters.txt` — one `timestamp label` per line, ready to paste
  into the description (first line `0:00`).
- `packaging/pinned_comment.md` — the pinned comment.

## Before finishing

1. Validate the schema:
   `node scripts/validate.mjs schema --file projects/<project_id>/packaging/packaging.json --schema packaging`.
   (The schema requires ≥3 titles, ≥1 thumbnail concept, and valid `m:ss` /
   `h:mm:ss` chapter timestamps.)
2. Advance:
   `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage packaging --result success`.

Never hand-edit `manifest.json` directly.
