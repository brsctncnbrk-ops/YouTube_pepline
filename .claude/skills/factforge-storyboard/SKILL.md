---
name: factforge-storyboard
description: Breaks an approved ORVYQ / FactForge script into timed, section-bound scenes that can be expanded deterministically into a canonical full-duration production plan. Use when current_stage is storyboard.
---

# ORVYQ / FactForge Storyboard

You turn the approved script into a scene-by-scene narrative structure. The storyboard must preserve section identity because the later `production_plan` stage expands every scene into explicit evidence, footage, context, metaphor, and graphic shots across the complete film.

You do not design final shot-level visuals here. That belongs to footage retrieval, direction, and canonical production planning.

## Inputs

- `scripts/script.md`
- `scripts/script_metadata.json`, including beat/section ids and `visual_guidance`
- `voice/voice_script.txt`
- `assets/audio/final_voice.mp3`
- `config/video_config.json`

Use the real narration duration as ground truth when `ffprobe` is available:

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 projects/<project_id>/assets/audio/final_voice.mp3
```

## Task

Break the script into contiguous scenes. Every scene must declare:

- `scene_id`, sequential from `scene_001`;
- `section_id`, copied from the corresponding script/evidence section and stable across downstream stages;
- exact start, end, and duration;
- narrative purpose;
- visual need;
- controlled mood;
- on-screen text or `null`;
- transitions;
- a traceable narration reference.

The `section_id` is mandatory. It is the bridge between:

- script and evidence claims;
- storyboard scenes;
- section-level music and dramatic function;
- the full-duration canonical production plan;
- final shot-level QA.

Do not invent generic section identifiers after the fact. Reuse the ids already established by research/script metadata. Each scene belongs to exactly one section. Section changes must occur on scene boundaries.

Scene granularity is a narrative decision, not the final shot duration. A storyboard scene may last 20–35 seconds; `factforge-production-plan` later divides it into varied shots of no more than the configured maximum, normally eight seconds.

## Output

`storyboard/storyboard.json` must validate against `schemas/storyboard.schema.json`:

```json
{
  "schema_version": "3.0",
  "project_id": "001-example",
  "target_duration_sec": 600,
  "total_duration_sec": 612.4,
  "scene_count": 2,
  "scenes": [
    {
      "scene_id": "scene_001",
      "section_id": "SEC_01_OPENING_PARADOX",
      "start_sec": 0,
      "end_sec": 24.2,
      "duration_sec": 24.2,
      "purpose": "Establish the governing contradiction.",
      "visual_need": "Physical infrastructure, primary source context, and human-scale decisions.",
      "mood": "tense",
      "on_screen_text": null,
      "transition_in": "fade",
      "transition_out": "cut",
      "voice_line_ref": "voice_script paragraph 1"
    }
  ],
  "generated_at": "<ISO 8601>"
}
```

Also write `storyboard/storyboard.md`, including section id, timing, purpose, visual need, text, and transitions for every scene.

## Before finishing

1. Confirm section ids are known to the project's evidence/script structure.
2. Confirm scenes are contiguous with no gaps or overlaps.
3. Validate:

```bash
node scripts/validate.mjs schema --file projects/<project_id>/storyboard/storyboard.json --schema storyboard
node scripts/validate.mjs filenames --project-id <project_id>
```

4. Advance:

```bash
node scripts/manifest_cli.mjs advance --project-id <project_id> --stage storyboard --result success
```

If coherent section binding is impossible, stop with `USER_APPROVAL_REQUIRED`. Never leave `section_id` blank and never hand-edit `manifest.json`.
