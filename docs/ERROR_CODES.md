# FactForge Error Codes

Every error is appended to both `projects/<id>/logs/errors.log` (one JSON
object per line) and `manifest.json`'s `errors[]` array, and flips `status`
to `ERROR`. Entry shape:

```json
{
  "error_code": "MISSING_AUDIO",
  "stage": "storyboard",
  "message": "final_voice.mp3 not found.",
  "required_action": "Drop assets/audio/final_voice.mp3 into place, then run `ready`.",
  "timestamp": "2026-07-05T00:00:00.000Z"
}
```

| Code | Fires when |
|---|---|
| `MISSING_AUDIO` | The audio gate check (`gate --gate audio`) or a QA gate needing audio finds `assets/audio/final_voice.mp3` missing. |
| `MISSING_IMAGE` | The images gate check finds one or more `assets/images/scene_NNN.png` missing for scenes referenced in `storyboard.json`. |
| `INVALID_JSON` | A file that should be JSON fails to parse. |
| `SCHEMA_VALIDATION_FAILED` | A JSON file parses but fails its `schemas/*.schema.json` validation. |
| `BROKEN_ASSET_PATH` | An absolute path, drive letter, `~`, or `..` traversal is found in a Remotion config file, or scene filenames/numbering don't match convention. |
| `RENDER_CONFIG_MISSING` | `prepare-render` finds `remotion/render_ready_project/`, a `remotion/*.json` config, or `.github/workflows/render.yml` missing. |
| `SCENE_VARIETY_VIOLATION` | Two consecutive scenes share the same `camera_motion.type` or `transition_in` (checked at `render_qa` against `remotion/composition.json`), or the same `scene_type` (checked at `storyboard_qa` against `storyboard/storyboard.json`). |
| `STYLE_TREATMENT_MISMATCH` | A scene's `render_treatment` in `prompts/visual_prompts.json` doesn't match the value the fixed `scene_type` → `render_treatment` table (`scripts/lib/style.mjs`) predicts from that scene's `storyboard.json` `scene_type` (checked at `visual_qa`). |
| `CAPTION_TIMING_INVALID` | `remotion/captions.json` fails schema validation, or its entries aren't chronological/non-overlapping, or a caption's on-screen duration falls outside the readable-but-not-lingering window (checked at `render_qa`). |
| `USER_APPROVAL_REQUIRED` | A command is missing required human input (e.g. `init` called without `--name`/`--idea`, or a project_id collision). |
| `UNKNOWN_ERROR` | Anything not covered above (also the default fallback code). |

Recovery: fix whatever `required_action` describes, then run `retry` (resumes
after `last_successful_stage`) or `reset_stage` (rewinds further, optionally
with `--force-clean`).
