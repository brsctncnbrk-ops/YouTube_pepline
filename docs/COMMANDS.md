# FactForge User Commands

These are the human-facing commands the `factforge-orchestrator` skill
interprets. Each maps onto one or more `node scripts/manifest_cli.mjs`
subcommands (run from the repo root).

| Command | manifest_cli.mjs subcommand | Notes |
|---|---|---|
| `start` | `init --name --idea --duration --audience --language --style-ref` | Orchestrator elicits the fields first; `--project-id` is optional (auto-generated as `NNN-slug`). |
| `status` | `status --project-id <id>` or `status --all` | Read-only. |
| `ready` | `gate --project-id <id> --gate audio\|images` | Which gate depends on the project's current `WAITING_FOR_*` status. |
| `retry` | `retry --project-id <id>` | Clears `ERROR`, resumes after `last_successful_stage`. Error history is preserved, not deleted. |
| `pause` | `pause --project-id <id>` | Sets `paused: true`. |
| `resume` | `resume --project-id <id>` | Sets `paused: false`. |
| `reset_stage <stage>` | `reset-stage --project-id <id> --stage <stage> [--force-clean]` | `--force-clean` also deletes that stage's (and later stages') output files — confirm with the user before passing it. |
| `run_qa <gate>` | `qa --project-id <id> --gate <gate>` | Runs the mechanical checks and writes `qa/<gate>.md`. |
| `prepare_render` | `prepare-render --project-id <id>` | Aggregate render-readiness check; sets `READY_FOR_RENDER` on pass. |

## Direct CLI usage (for debugging, outside the skill)

```bash
node scripts/manifest_cli.mjs init --name "My Video" --idea "..." --duration 600 --audience "..." --language en --style-ref "..."
node scripts/manifest_cli.mjs status --project-id 001-my-video
node scripts/manifest_cli.mjs status --all
node scripts/manifest_cli.mjs check-required --project-id 001-my-video --stage script
node scripts/manifest_cli.mjs advance --project-id 001-my-video --stage research --result success
node scripts/manifest_cli.mjs gate --project-id 001-my-video --gate audio
node scripts/manifest_cli.mjs qa --project-id 001-my-video --gate research_qa
node scripts/manifest_cli.mjs error --project-id 001-my-video --code MISSING_AUDIO --stage storyboard --message "..." --action "..."
node scripts/manifest_cli.mjs retry --project-id 001-my-video
node scripts/manifest_cli.mjs pause --project-id 001-my-video
node scripts/manifest_cli.mjs resume --project-id 001-my-video
node scripts/manifest_cli.mjs reset-stage --project-id 001-my-video --stage storyboard --force-clean
node scripts/manifest_cli.mjs prepare-render --project-id 001-my-video
node scripts/manifest_cli.mjs render-complete --project-id 001-my-video --output-file output/final_video.mp4   # called by render.yml
```

```bash
node scripts/validate.mjs schema --file <path> --schema research
node scripts/validate.mjs paths --project-id 001-my-video
node scripts/validate.mjs filenames --project-id 001-my-video
node scripts/validate.mjs assets --project-id 001-my-video --check audio|images|all
node scripts/validate.mjs render-ready --project-id 001-my-video
```

## Remotion build helpers (used by the motion + editor skills)

```bash
# Derive scene_config.json + asset_map.json from the authored composition.json
node scripts/remotion_build.mjs derive-configs --project-id 001-my-video

# Assemble remotion/render_ready_project/ from templates/remotion/
node scripts/remotion_build.mjs build-project --project-id 001-my-video
```

## Triggering a render

```bash
# Primary: render on the dedicated render VPS (see docs/VPS_RENDER.md)
bash scripts/render_vps.sh 001-my-video

# Fallback: render via GitHub Actions
gh workflow run render.yml -f project_id=001-my-video
```

The full-duration render never runs on an author's own machine. Locally you
may only do a live `remotion studio` preview or a single-frame `remotion
still` sanity check.
