# FactForge

FactForge is a modular, human-in-the-loop AI YouTube production system.
Instead of one model doing every job, the pipeline is split into
single-responsibility skills (research, scriptwriting, voice-script
preparation, storyboarding, visual style, visual prompts, direction, Remotion
motion config, editing, packaging, final QA) coordinated by a central
Orchestrator, with a QA gate after nearly every stage so broken output never
reaches the next step.

Voice (ElevenLabs) and images (Leonardo AI) are deliberately manual steps —
FactForge produces the scripts/prompts for them, then halts and waits for you
to drop the resulting files into place. Rendering happens only on GitHub
Actions via Remotion, never locally.

See `docs/ARCHITECTURE.md` for the full design and `docs/PIPELINE.md` for the
stage graph.

## Status

**Phase 1 (Foundation) — done.** This phase built:

- The `projects/<project_id>/` scaffolding and template tree
- The `manifest.json` state machine (`scripts/manifest_cli.mjs`)
- The mechanical validation layer (`scripts/validate.mjs`, backed by the 7
  JSON schemas in `schemas/`)
- The `factforge-orchestrator` Claude Code skill (`.claude/skills/`)
- This documentation set

**Phase 2 (Content skills) — done.** This phase built the six skills covering
`research` through `voice_qa`:

- `factforge-research` / `factforge-research-qa`
- `factforge-script` / `factforge-script-qa`
- `factforge-voice` / `factforge-voice-qa`

A project can now go from a video idea all the way to `WAITING_FOR_AUDIO`
end-to-end: research → research QA → script → script QA → voice script →
voice QA → wait for the human to record in ElevenLabs and drop in
`final_voice.mp3`.

**Phase 3 (Visual pipeline) — done.** This phase built the five skills
covering `storyboard` through `visual_qa`:

- `factforge-storyboard` / `factforge-storyboard-qa`
- `factforge-visual-style-bible` (no dedicated QA gate, per spec)
- `factforge-visual-prompt` / `factforge-visual-qa`

A project can now continue past the audio gate all the way to
`WAITING_FOR_IMAGES`: storyboard → storyboard QA → visual style bible →
visual prompts → visual QA → wait for the human to generate every
`scene_NNN.png` in Leonardo AI and drop them into `assets/images/`. Along the
way, `factforge-visual-prompt` now also emits a schema-backed
`prompts/visual_prompts.json` (in addition to the spec's `.md` files) so
`visual_qa` can mechanically confirm every storyboard scene has a
correctly-named prompt entry — without requiring the actual PNGs to exist
yet, since that only happens after this gate.

**Not yet built** (future phases — see `docs/ARCHITECTURE.md#build-phases`):

- Phase 4: `director`, `remotion`, `editor`, `render_qa`, the Remotion
  template, and the GitHub Actions render workflow
- Phase 5: `packaging`, `final_qa`

Until later phases land, a project can be scaffolded and driven through the
voice stage, but nothing yet produces storyboards, visuals, or video —
`manifest_cli.mjs`'s `check-required`, `qa`, and `prepare-render` will
correctly report what's missing rather than silently succeeding.

## Quickstart

```bash
npm install

# Start a new video project (or just tell the factforge-orchestrator skill "start")
node scripts/manifest_cli.mjs init \
  --name "My Video" \
  --idea "A documentary about..." \
  --duration 600 \
  --audience "general YouTube audience" \
  --language en \
  --style-ref "clean cinematic documentary"

# Check on it
node scripts/manifest_cli.mjs status --project-id 001-my-video
node scripts/manifest_cli.mjs status --all
```

Every project gets its own folder under `projects/<project_id>/`, reproducing
the full FactForge project structure (research/, scripts/, voice/,
storyboard/, style/, prompts/, direction/, assets/, remotion/, packaging/,
output/, qa/, logs/) plus its own pinned copy of the JSON schemas.

See `docs/COMMANDS.md` for the full command reference and
`docs/ERROR_CODES.md` for what can go wrong and how to recover.

## Repo layout

```
.claude/skills/factforge-orchestrator/   the Orchestrator skill
schemas/                                  JSON schemas (source of truth; copied into each project at scaffold time)
scripts/                                  manifest_cli.mjs, validate.mjs, scaffold_project.mjs, shared lib
templates/project/                        empty skeleton stamped into projects/<id>/
projects/                                 one folder per video + _index.json registry
docs/                                     architecture, pipeline, commands, error codes
```
