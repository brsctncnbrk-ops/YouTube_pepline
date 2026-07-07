---
name: factforge-storyboard
description: Breaks an approved FactForge script into timed, purpose-tagged scenes. Use when a FactForge project's manifest current_stage is "storyboard".
---

# FactForge Storyboard

You turn the approved script into a scene-by-scene shot list the visual
pipeline will build on. You do not design the visual style or write image
prompts — that's `factforge-visual-style-bible` and `factforge-visual-prompt`.

## Inputs

`scripts/script.md`, `voice/voice_script.txt`, `assets/audio/final_voice.mp3`
(now a real recorded file — this stage only runs after the audio gate has
passed), and `config/video_config.json` (`target_duration_sec`).

**Use the real audio duration as ground truth if you can get it.** If
`ffprobe` (part of ffmpeg) is available in the environment, run something
like:

```
ffprobe -v error -show_entries format=duration -of csv=p=0 projects/<project_id>/assets/audio/final_voice.mp3
```

and use that value for `total_duration_sec` instead of the original
`target_duration_sec` estimate — the recorded narration is more accurate than
the pre-recording word-count guess. If `ffprobe` isn't available, fall back to
`target_duration_sec`; don't block on this.

## Task

Break the script into scenes:

- Assign each scene a **purpose** (what story beat it serves).
- Define its **visual need** (what should be on screen — a description, not
  a Leonardo prompt).
- Note any **on-screen text** (or `null` if none).
- Assign a **`scene_type`** — the shot's visual treatment, one of:
  `cinematic`, `historical_painting`, `documentary`, `blueprint`,
  `technical_drawing`, `newspaper`, `magazine`, `timeline`, `infographic`,
  `split_screen`, `before_after`, `world_map`, `satellite_view`, `xray`,
  `macro_shot`, `isometric`, `whiteboard`, `character_scene`,
  `animated_illustration`, `data_visualization`, `archive_documents`,
  `hand_drawn_sketch`, `ui_hud_screen`, `diagram`. Pick the type that matches
  the scene's `purpose`/`visual_need` (a data-heavy beat → `infographic` or
  `data_visualization`; a historical event → `historical_painting` or
  `archive_documents`; a location beat → `world_map` or `satellite_view`,
  etc.). **No two consecutive scenes may share the same `scene_type`** —
  this is mechanically enforced at the `storyboard_qa` gate
  (`validate.mjs scene-type-variety`), so vary it deliberately rather than
  defaulting to `cinematic` throughout.
- Set **transitions** in and out, one of: `fade`, `dissolve`, `cut`, `wipe`,
  `slide`, `light_flash`, `blur`, `zoom_through`. Vary these too — the same
  render_qa-level check (Madde 1) also forbids two consecutive scenes from
  sharing the same `transition_in`.
- Set `start_sec`/`end_sec`/`duration_sec` so scenes are contiguous and sum
  to `total_duration_sec` with no gaps or overlaps.
- Give each scene a short `voice_line_ref` pointing back to the relevant
  part of `voice_script.txt` (e.g. a short quoted phrase or paragraph
  number) so later stages can trace a scene back to its narration.

Scene granularity is a judgment call — usually one scene per script section
or per major beat within a section, not one scene per sentence. Aim for
scenes long enough to be visually meaningful (a few seconds at minimum).

## Output

**`storyboard.json`** — must validate against `schemas/storyboard.schema.json`
and use sequential, zero-padded, gap-free scene ids starting at `scene_001`:

```json
{
  "project_id": "...",
  "target_duration_sec": 300,
  "total_duration_sec": 300,
  "scene_count": 6,
  "scenes": [
    {
      "scene_id": "scene_001",
      "start_sec": 0, "end_sec": 15, "duration_sec": 15,
      "purpose": "...", "visual_need": "...", "scene_type": "cinematic",
      "on_screen_text": null,
      "transition_in": "fade", "transition_out": "cut",
      "voice_line_ref": "..."
    }
  ],
  "generated_at": "<ISO 8601 timestamp>"
}
```

**`storyboard.md`** — human-readable scene list in order, one entry per
scene with its timing, purpose, visual need, on-screen text, and
transitions.

## Before finishing

1. Validate the schema: `node scripts/validate.mjs schema --file projects/<project_id>/storyboard/storyboard.json --schema storyboard`.
2. Validate scene numbering/filenames: `node scripts/validate.mjs filenames --project-id <project_id>`. Fix any gap/duplicate/pattern issues before proceeding.
3. Validate scene-type variety: `node scripts/validate.mjs scene-type-variety --project-id <project_id>`. Fix any consecutive `scene_type` repeats before proceeding.
4. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage storyboard --result success`.
5. If the script genuinely can't be broken into a coherent scene sequence (e.g. it's too short or too abstract), don't force it — run `node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage storyboard --message "<why>" --action "<what's needed>"`.

Never hand-edit `manifest.json` directly.
