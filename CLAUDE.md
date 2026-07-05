# FactForge — Claude Code context

FactForge is a modular AI YouTube production system. Full design:
`docs/ARCHITECTURE.md`. Stage graph: `docs/PIPELINE.md`. Command reference:
`docs/COMMANDS.md`. Error codes: `docs/ERROR_CODES.md`.

## Current build status

Phase 1 (Foundation) is complete: scaffolding, the `manifest.json` state
machine, the mechanical validation CLI, the 7 JSON schemas, and the
`factforge-orchestrator` skill. The 13 content-producing skills, their QA-gate
skills, the Remotion template, and the GitHub Actions render workflow are
**not built yet** — see the roadmap in `README.md`. Don't improvise those
skills' creative output in their place; say plainly that a stage isn't
implemented yet.

## Ground rules for working in this repo

- **Never hand-edit `projects/<id>/manifest.json`.** Always go through
  `node scripts/manifest_cli.mjs <subcommand> ...` (run from repo root). This
  is what keeps state changes atomic and auditable.
- The canonical stage list, required-file contracts, output-file contracts,
  and gate definitions live in `scripts/lib/pipeline.mjs`
  (`STAGE_ORDER`, `STAGE_REQUIRED_FILES`, `STAGE_OUTPUT_FILES`, `GATES`).
  Treat it as the single source of truth — update it, not just the docs, if
  the pipeline contract changes.
- Mechanical QA checks (schema validity, file existence, relative-path
  enforcement, filename conventions) belong in `scripts/validate.mjs`.
  Judgment-based QA (writing quality, prompt creativity, visual coherence)
  belongs in skill prompts, not in this deterministic layer.
- Every new video project gets its own `projects/<project_id>/` folder via
  `scripts/scaffold_project.mjs` (called by `manifest_cli.mjs init`) — never a
  shared top-level `project/` folder.
- Binary assets (`*.mp3`, `*.png`, `*.mp4`) are tracked via Git LFS
  (`.gitattributes`). Don't remove that tracking without discussing it first —
  repo size is a known concern across many videos over time.
- All asset paths inside `remotion/*.json` files must be relative
  (`assets/images/scene_001.png`, never an absolute path or drive letter) —
  the render runs on GitHub Actions, not the author's machine. This is
  enforced by `validate.mjs paths` and the `composition.schema.json` regexes.
- Full-duration Remotion renders happen only in GitHub Actions, never locally.
  `remotion studio` (live preview) and single-frame sanity renders are fine
  anywhere.

## Useful commands

```bash
node scripts/manifest_cli.mjs status --all
node scripts/manifest_cli.mjs init --name "..." --idea "..." --duration 600 --audience "..." --language en --style-ref "..."
node scripts/validate.mjs render-ready --project-id <id>
```

See `docs/COMMANDS.md` for the complete list.
