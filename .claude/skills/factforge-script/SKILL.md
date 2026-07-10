---
name: factforge-script
description: Writes the retention-optimized narration script for a FactForge video from the research output. Use when a FactForge project's manifest current_stage is "script".
---

# FactForge Script Writer

You turn approved research into an Aperture-style narration script — calm,
atmospheric, video-essay pacing, not fast-fact infographic tempo. You do not
research further (use what `factforge-research` produced; if it's
insufficient, that should have been caught by `factforge-research-qa` — flag
gaps rather than inventing facts) and you do not write the ElevenLabs voice
text (that's `factforge-voice`'s job — write for reading fluency here, not
pronunciation). You also do not fact-check here: write with confident,
fluent prose and let `factforge-fact-audit` — which runs immediately after
you, before `script_qa` — verify claims in a separate post-draft pass. Don't
hedge inline ("some studies suggest...", "it's possibly true that...") to
cover for something you're not sure of; state it plainly and let the audit
catch it if it's wrong.

## Inputs

`research/research.json`, `research/research.md`, `research/sources.md`, and
`config/video_config.json` (`target_duration_sec`). Write in the project's
configured `language` (from `config/project_config.json`). Use
`research.json`'s `summary`/`key_facts`/`timeline`/`topic_discovery` as your
material — do **not** consult `source_structure_summary` for structural
guidance; it's reserved for `factforge-final-qa`'s reused-content check, and
consulting it here would defeat its purpose. Your argument's order and shape
must be your own, not a reflection of how the source content laid it out.

## Task — the 9-beat Aperture structure

Write in this order. Duration is governed by the voice-over's eventual
audio-first timing, not fixed timestamps — think in terms of proportion of
`target_duration_sec`, not exact seconds per beat:

1. **Big question** (`hook`) — open on the question the whole video answers.
   No throat-clearing ("Hi, welcome back to my channel...").
2. **The viewer's internal conflict** (`beat_name: internal_conflict`)
3. **A false assumption** (`beat_name: false_assumption`)
4. **The deeper real problem** (`beat_name: deeper_problem`)
5. **A scientific/psychological explanation** (`beat_name: scientific_explanation`)
6. **Real-life manifestation** (`beat_name: real_life_manifestation`)
7. **A calm, dark turning point** (`beat_name: dark_turning_point`)
8. **Grounded resolution** (`beat_name: grounded_resolution`)
9. **Thought-provoking close** (`closing`) — a takeaway plus a call to action,
   left open rather than neatly bowed.

Tone throughout: calm, curious, essayistic. Short sentences. Natural,
professional prose written to be spoken aloud, not read as an article —
active voice, no dense subordinate clauses. Cut anything not load-bearing;
no padding to hit a word count. Somewhere in beats 2-8, include at least one
**curiosity loop** (a question raised early, answered later).

Target `target_duration_sec` using roughly 150 words/minute (~2.5
words/second) as a sizing heuristic — a rule of thumb for section sizing,
not a hard mechanical requirement.

**Advisory visual pacing** (not a hard rule — this informs
`factforge-storyboard`/`factforge-director` later, you don't need to hit
these exactly): shot changes roughly every 6-8s, a strong visual metaphor
every 20-30s, a section-transition feel every 45-60s, a major idea break
around every 90s. Keep this in mind when pacing beats, but don't distort the
writing to hit a cadence number.

For every beat (`hook`, each of the 7 middle sections, `closing`), also
decide a **`visual_guidance`**: a `mood` (one word — this becomes the
storyboard scene's mood tag) and a `visual_need_hint` (a short phrase
describing what the footage/imagery for this beat should show or evoke).
This is what `factforge-storyboard` and, downstream, the footage-retrieval
skill build their search queries from — be concrete enough to search on
("a hand hovering over a phone, hesitating"), not abstract ("the concept of
hesitation").

## Outputs

Write both files under `projects/<project_id>/scripts/`:

**`script.md`** — the full narration script, in reading order, with clear
section headings (e.g. `## Hook`, `## Section: <heading>`, `## Closing`) so
it's easy to map back to `script_metadata.json`.

**`script_metadata.json`** — must validate against `schemas/script.schema.json`.
Exact shape:

```json
{
  "schema_version": "2.0",
  "project_id": "...",
  "title_working": "...",
  "hook": {
    "text": "...",
    "technique": "e.g. surprising-stat | open-question | stakes-statement",
    "visual_guidance": { "mood": "curious", "visual_need_hint": "..." }
  },
  "sections": [
    {
      "id": "s1",
      "heading": "...",
      "purpose": "...",
      "est_duration_sec": 45,
      "word_count": 110,
      "contains_curiosity_loop": true,
      "beat_name": "internal_conflict",
      "visual_guidance": { "mood": "tense", "visual_need_hint": "..." }
    }
  ],
  "closing": {
    "text": "...",
    "cta": "e.g. subscribe | watch-next | comment-prompt",
    "visual_guidance": { "mood": "reflective", "visual_need_hint": "..." }
  },
  "total_word_count": 1500,
  "estimated_duration_sec": 600,
  "target_duration_sec": 600,
  "duration_delta_sec": 0,
  "tone": "calm, curious, essayistic",
  "generated_at": "<ISO 8601 timestamp>"
}
```

`beat_name` must be one of `internal_conflict | false_assumption |
deeper_problem | scientific_explanation | real_life_manifestation |
dark_turning_point | grounded_resolution`, in that order across `sections[]`
(`hook` is implicitly beat 1, `closing` is implicitly beat 9 — they don't
carry a `beat_name`). `duration_delta_sec = estimated_duration_sec -
target_duration_sec`. Keep it reasonably close to 0 — large drift is exactly
what `factforge-script-qa` will flag.

## Before finishing

1. Validate: `node scripts/validate.mjs schema --file projects/<project_id>/scripts/script_metadata.json --schema script`. Fix any errors first.
2. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage script --result success`. This moves the project into `fact_audit` — a post-draft factual verification pass — **not** directly into `script_qa`. Unresolved claims are `factforge-fact-audit`'s job to catch; don't soften anything in the prose yourself to pre-empt it.
3. If research is too thin to write from, don't invent facts — run `node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage script --message "<why>" --action "<what's needed>"` and explain to the user that research needs another pass.

Never hand-edit `manifest.json` directly.
