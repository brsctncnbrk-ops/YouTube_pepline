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

### Topic-Discovery (when the source is a specific episode/podcast, e.g. DOAC)

When `video_idea` points at a specific piece of source content rather than a
general topic, do a second extraction pass focused on **topic-discovery**,
not narrative retelling:

- **`core_topic`** and **`thesis`** — what the source content is actually
  arguing, in your own words.
- **`notable_claims`** — 5 to 10 claims worth building the video around. Each
  needs **2-3 independent sources** before scripting — don't rely on the
  source episode itself as the only backing; find external corroboration
  (this is on top of, not instead of, the general sourcing requirement above).
- **`open_questions_angles`** and **`unique_angles`** — gaps or fresh takes
  the video could pursue that the source content didn't.
- **Strip** personal anecdotes, verbatim phrasing, and the source's own
  narrative sequence — you're extracting the substance, not summarizing the
  episode in order.

Separately, write a **`source_structure_summary`** (topic order + argument
sequence of the *source* content). This is bookkeeping, not writing material:
it does **not** feed `factforge-script` and must not influence how you write
`summary`/`key_facts`/`timeline` above — it exists solely so
`factforge-final-qa` can later check the finished script didn't end up
mirroring the source's structure too closely.

## Outputs

Write all three files under `projects/<project_id>/research/`:

**`research.json`** — must validate against `schemas/research.schema.json`
(the project's own pinned copy, or the repo root `schemas/research.schema.json`
— they're identical at scaffold time). Exact shape:

```json
{
  "schema_version": "2.0",
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
  "topic_discovery": {
    "core_topic": "...",
    "thesis": "...",
    "notable_claims": [{ "claim": "...", "source_refs": ["s1", "s2"] }],
    "open_questions_angles": ["..."],
    "unique_angles": ["..."]
  },
  "source_structure_summary": {
    "topic_order": ["...", "..."],
    "argument_sequence": ["...", "..."]
  },
  "generated_at": "<ISO 8601 timestamp>"
}
```

`date` in `key_facts` may be `null` when a fact isn't date-bound. Every
`source_ref` must match a `sources[].id`. `notable_claims` needs 5-10 entries,
each with at least 2 `source_refs`. If the video idea isn't sourced from a
specific episode/podcast, still fill `topic_discovery` and
`source_structure_summary` from whatever source material you did use — the
fields are required by the schema regardless.

**`research.md`** — human-readable version: summary, then key facts and
timeline as prose/bullets, then open questions.

**`sources.md`** — the source list as a readable bibliography (title,
publisher, url, accessed date, one-line credibility note each).

## Before finishing

1. Validate the JSON: `node scripts/validate.mjs schema --file projects/<project_id>/research/research.json --schema research`. Fix any reported errors before proceeding — don't advance with a schema that fails.
2. If validation passes, advance the pipeline: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage research --result success`.
3. If you truly cannot produce valid research (e.g. the idea is unresearchable, or required project config is missing), do **not** advance. Instead run `node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage research --message "<why>" --action "<what the human needs to decide/provide>"` and explain the blocker to the user.

Never hand-edit `manifest.json` directly — always go through `manifest_cli.mjs`.
