---
name: factforge-research
description: Researches a FactForge video idea into structured, sourced facts and a timeline. Use when a FactForge project's manifest current_stage is "research" (check with `node scripts/manifest_cli.mjs status --project-id <id>`).
---

# FactForge Research

You produce the factual foundation the Script Writer skill will build on. You
do not write the video script yourself — stay in scope.

## Inputs

Read from `projects/<project_id>/config/project_config.json` (`video_idea`,
`target_audience`, `language`, `reference_channel_style`) and
`config/video_config.json` (`target_duration_sec`). Do not ask the user for
these again — they were already collected when the project was started; if
any are placeholder/empty, that's a sign `start` wasn't run properly, so flag
it rather than guessing.

## Task

Research the video idea thoroughly enough to support a full script:

- Find **at least 3 credible sources** (more for complex topics). Prefer
  primary sources, reputable publications, or well-documented references over
  single blog posts.
- Extract **key facts** with dates where relevant, tied back to a source.
- Build a **timeline** of the main events in chronological order.
- Note **open questions** — things you couldn't verify or that need the
  scriptwriter's judgment call.
- Write a short **summary** of the overall story/argument the video will make.

If the topic is time-sensitive or you can't verify claims confidently, say so
in `open_questions` rather than presenting a guess as fact.

## Outputs

Write all three files under `projects/<project_id>/research/`:

**`research.json`** — must validate against `schemas/research.schema.json`
(the project's own pinned copy, or the repo root `schemas/research.schema.json`
— they're identical at scaffold time). Exact shape:

```json
{
  "project_id": "...",
  "video_idea": "...",
  "target_duration_sec": 600,
  "target_audience": "...",
  "language": "en",
  "reference_channel_style": "...",
  "summary": "...",
  "key_facts": [{ "fact": "...", "date": "2024-01-01", "source_ref": "s1" }],
  "timeline": [{ "date": "...", "event": "...", "source_ref": "s1" }],
  "sources": [
    { "id": "s1", "title": "...", "url": "...", "publisher": "...", "accessed_date": "...", "credibility_note": "..." }
  ],
  "open_questions": ["..."],
  "generated_at": "<ISO 8601 timestamp>"
}
```

`date` in `key_facts` may be `null` when a fact isn't date-bound. Every
`source_ref` must match a `sources[].id`.

**`research.md`** — human-readable version: summary, then key facts and
timeline as prose/bullets, then open questions.

**`sources.md`** — the source list as a readable bibliography (title,
publisher, url, accessed date, one-line credibility note each).

## Before finishing

1. Validate the JSON: `node scripts/validate.mjs schema --file projects/<project_id>/research/research.json --schema research`. Fix any reported errors before proceeding — don't advance with a schema that fails.
2. If validation passes, advance the pipeline: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage research --result success`.
3. If you truly cannot produce valid research (e.g. the idea is unresearchable, or required project config is missing), do **not** advance. Instead run `node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage research --message "<why>" --action "<what the human needs to decide/provide>"` and explain the blocker to the user.

Never hand-edit `manifest.json` directly — always go through `manifest_cli.mjs`.
