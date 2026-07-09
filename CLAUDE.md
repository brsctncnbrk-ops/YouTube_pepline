# FactForge — Claude Code context

FactForge is a modular AI YouTube production system. Full design:
`docs/ARCHITECTURE.md`. Stage graph: `docs/PIPELINE.md`. Command reference:
`docs/COMMANDS.md`. Error codes: `docs/ERROR_CODES.md`.

## Current build status

All five phases are complete — the pipeline runs end to end. Phase 1
(Foundation): scaffolding, the `manifest.json` state machine, the mechanical
validation CLI, the 7 JSON schemas, and `factforge-orchestrator`. Phase 2
(Content skills): `factforge-research`/`-research-qa`,
`factforge-script`/`-script-qa`, `factforge-voice`/`-voice-qa`
(`research`→`voice_qa`). Phase 3 (Visual pipeline):
`factforge-storyboard`/`-storyboard-qa`, `factforge-visual-style-bible` (no
QA gate, per spec), `factforge-visual-prompt`/`-visual-qa`
(`storyboard`→`visual_qa`). Phase 4 (Production + render):
`factforge-director` (no QA gate), `factforge-motion`, `factforge-editor`,
`factforge-render-qa` (`director`→`render_qa`), plus `templates/remotion/`,
`scripts/remotion_build.mjs`, the primary render path `scripts/render_vps.sh`
(see `docs/VPS_RENDER.md`), and `.github/workflows/render.yml` (fallback
render path). Phase 5
(Packaging + final QA): `factforge-packaging` (no QA gate, per spec; authors
`packaging/packaging.json` + the six deliverable files) and
`factforge-final-qa` (validates the package, confirms deliverables, marks the
project `DONE`).

## Remotion / render notes

- `factforge-motion` authors `remotion/composition.json` (validates against
  `schemas/composition.schema.json`). `scene_config.json` and `asset_map.json`
  are **derived** from it by `node scripts/remotion_build.mjs derive-configs`
  — never hand-edit those two.
- `factforge-editor` runs `node scripts/remotion_build.mjs build-project`,
  which copies `templates/remotion/` into `remotion/render_ready_project/`,
  copies the tiny config JSON into its `src/data/`, and refreshes
  `assets/asset_manifest.json`. Large binaries are referenced in place (the
  app's public dir points at the project root), never duplicated.
- Full renders happen only via `scripts/render_vps.sh` on the dedicated
  render VPS (primary — see `docs/VPS_RENDER.md`), or as a fallback via
  `.github/workflows/render.yml` (`gh workflow run render.yml -f
  project_id=<id>`). Locally, `remotion studio` and single-frame `remotion
  still` previews are fine; never a full local render. In this agent
  sandbox specifically, the environment's Chromium is at
  `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
  (pass `--browser-executable` to Remotion for a local `remotion still`
  check, since its own Chrome download host is not in the egress allowlist
  here — the VPS and GitHub Actions provision their own Chromium instead).

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
  the render runs on the render VPS or GitHub Actions, not the author's
  machine. This is enforced by `validate.mjs paths` and the
  `composition.schema.json` regexes.
- Full-duration Remotion renders happen only via `scripts/render_vps.sh`
  (primary) or GitHub Actions (fallback), never locally. `remotion studio`
  (live preview) and single-frame sanity renders are fine anywhere.

## Useful commands

```bash
node scripts/manifest_cli.mjs status --all
node scripts/manifest_cli.mjs init --name "..." --idea "..." --duration 600 --audience "..." --language en --style-ref "..."
node scripts/validate.mjs render-ready --project-id <id>
```

See `docs/COMMANDS.md` for the complete list.
