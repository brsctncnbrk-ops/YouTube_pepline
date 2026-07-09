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
| `RENDER_CONFIG_MISSING` | `prepare-render` finds `remotion/render_ready_project/`, a `remotion/*.json` config, or `scripts/render_vps.sh` missing (`.github/workflows/render.yml` is checked too, but only as an informational fallback-path indicator — its absence alone doesn't trigger this code). |
| `USER_APPROVAL_REQUIRED` | A command is missing required human input (e.g. `init` called without `--name`/`--idea`, or a project_id collision). |
| `UNKNOWN_ERROR` | Anything not covered above (also the default fallback code). |

Recovery: fix whatever `required_action` describes, then run `retry` (resumes
after `last_successful_stage`) or `reset_stage` (rewinds further, optionally
with `--force-clean`).
