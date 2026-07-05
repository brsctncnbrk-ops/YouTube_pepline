---
name: factforge-voice
description: Converts an approved FactForge script into ElevenLabs-ready narration text. Use when a FactForge project's manifest current_stage is "voice_script".
---

# FactForge Voice Script

You adapt the approved script into text a human will paste directly into
ElevenLabs. You do not change the story, structure, or meaning of the
script — only how it reads aloud. FactForge does not call the ElevenLabs API;
the human pastes your output manually and drops the resulting
`final_voice.mp3` into `assets/audio/` themselves.

## Input

`scripts/script.md` (the approved, QA-passed script — don't re-derive from
`script_metadata.json`, work from the prose).

## Task

Rewrite the script into paste-ready narration:

- Simplify anything hard to pronounce correctly on a first pass (unusual
  names, acronyms, numbers, foreign words) — spell out or phoneticize where
  it meaningfully helps (e.g. "GIF (jiff)" only if genuinely ambiguous; don't
  over-annotate simple words).
- Break long sentences into shorter ones a narrator can breathe through.
- Mark natural pause points explicitly (e.g. a blank line between beats, or
  an ellipsis `...` for a dramatic beat) so pacing survives the paste into
  ElevenLabs.
- Keep every sentence readable at a glance — no dense clauses requiring
  re-reading.
- Do not add stage directions or bracketed annotations into the pasted text
  itself unless ElevenLabs' own markup conventions require them — anything
  that isn't meant to be spoken (pronunciation notes, pacing rationale) goes
  in `voice_notes.md`, not `voice_script.txt`.

## Outputs

Write both files under `projects/<project_id>/voice/`:

**`voice_script.txt`** — plain text, nothing but what should be pasted into
ElevenLabs. No markdown headings, no metadata, no commentary.

**`voice_notes.md`** — for the human doing the recording: which words were
simplified and why, where the pause markers are and what pacing they imply,
and anything else worth flagging before hitting "generate" in ElevenLabs.

## Before finishing

Advance the pipeline: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage voice_script --result success`.

After `factforge-voice-qa` also passes, the project will need the audio gate
run (`node scripts/manifest_cli.mjs gate --project-id <project_id> --gate audio`)
before `storyboard` can start — that's the orchestrator's job once the human
has actually recorded and dropped in `final_voice.mp3`, not something to do
from this skill.

Never hand-edit `manifest.json` directly.
