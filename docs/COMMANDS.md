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
```

```bash
node scripts/validate.mjs schema --file <path> --schema research
node scripts/validate.mjs paths --project-id 001-my-video
node scripts/validate.mjs filenames --project-id 001-my-video
node scripts/validate.mjs assets --project-id 001-my-video --check audio|images|all
node scripts/validate.mjs render-ready --project-id 001-my-video
```
