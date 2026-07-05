---
name: factforge-voice-qa
description: Runs the Voice Script QA gate for a FactForge project - judgment-based review of ElevenLabs paste-readiness. Use when a FactForge project's manifest current_stage is "voice_qa".
---

# FactForge Voice Script QA Gate

You review `factforge-voice`'s output before the project waits for the human
to record audio. This gate has no JSON to schema-check — `voice_script.txt`
and `voice_notes.md` are plain text — so it's judgment-only.

## Step 1 — mechanical checks (formality, but still run it)

```
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate voice_qa
```

This confirms the gate ran and writes the (empty) "Automated Checks" section
of `qa/voice_qa.md`. It will not catch content issues — that's your job next.

## Step 2 — judgment-based checks

Read `voice/voice_script.txt` and `voice/voice_notes.md`, then assess:

- Is the text something you could paste into ElevenLabs right now with no
  further editing?
- Were genuinely hard-to-pronounce words (names, acronyms, numbers, foreign
  terms) actually simplified or flagged in the notes?
- Are pause points natural — where a human speaker would actually breathe or
  land a beat — not arbitrary?
- Are sentences short enough to read aloud fluently on a first pass, with no
  run-ons?
- Does the pacing implied by the notes match the tone of the script (e.g. a
  dramatic beat isn't rushed)?

## Step 3 — record the verdict

Edit `qa/voice_qa.md`'s "Judgment-Based Checks" section with your findings.

- **Pass**: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage voice_qa --result success`. Then tell the user the project is ready to move into `WAITING_FOR_AUDIO` — the orchestrator should run the audio gate once they've actually recorded and placed `final_voice.mp3`.
- **Fail**: do not advance, do not call `manifest_cli.mjs error`. Tell the user specifically what needs revising and that `factforge-voice` should redo it.

Never hand-edit `manifest.json` directly.
