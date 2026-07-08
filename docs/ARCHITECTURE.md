# FactForge Architecture

FactForge is a modular, human-in-the-loop AI YouTube production system. Instead
of one model doing every job, the pipeline is split into single-responsibility
Claude Code Skills coordinated by a central Orchestrator, with a validation
gate after (almost) every stage so broken output never reaches the next skill.

## System infrastructure vs. per-video data

The repo separates two concerns:

- **System infrastructure** (this stays constant across every video):
  `.claude/skills/`, `schemas/`, `scripts/`, `templates/`, `.github/workflows/`,
  `docs/`.
- **Per-video project data** (one folder per video, grows over time):
  `projects/<project_id>/`, reproducing the full per-project tree for that
  video (research, scripts, voice, storyboard, style, prompts, direction,
  assets, remotion, packaging, output, qa, logs).

Each video gets its own `projects/<project_id>/` folder rather than a single
shared `project/` folder. This was a deliberate deviation from the original
spec's single-`project/` sketch: the long-term goal is a sustainable system
producing many videos over time, and a shared folder would force destructive
archiving between videos and break "resumable state" for anything except the
video currently in flight. A lightweight `projects/_index.json` registry
tracks every project's id/name/status/created_at so tools like `status --all`
don't need to scan every project's manifest.json.

Each project also gets its own copy of `schemas/*.schema.json`, taken at
scaffold time. This pins a project to the schema version it was created
against — a later schema change never retroactively invalidates an
in-progress video.

## Deliberate spec gap: `direction/`

The Director skill's output (`direction_plan.md`) has no listed home in the
original spec's per-project folder tree. We added a `direction/` folder to the
canonical per-project layout to hold it, rather than silently dropping it
somewhere else. This is the one place the implemented tree differs from a
literal reading of the spec's folder list.

## The manifest as the single source of truth

`projects/<id>/manifest.json` is the only place pipeline state lives. Session
memory, chat history, and skill prompts are not trustworthy state — killing
and reopening a session must not lose track of where a project is. Every
mutation goes through `scripts/manifest_cli.mjs`, which writes atomically
(temp file + rename) so a crash mid-write can't corrupt the manifest.

See `docs/PIPELINE.md` for the full stage graph and statuses, and
`docs/COMMANDS.md` for how user commands map onto `manifest_cli.mjs`
subcommands.

## Mechanical checks vs. judgment checks

Every QA gate has two halves:

1. **Automated Checks** — file existence, JSON schema validity, relative-path
   enforcement, filename/numbering conventions. These are deterministic and
   live in `scripts/validate.mjs`, invoked via `manifest_cli.mjs qa`. They
   write directly into `qa/<gate>.md`.
2. **Judgment-Based Checks** — hook strength, natural English, prompt
   creativity, visual coherence, etc. These require an LLM and live in the
   (not-yet-built) QA skill prompts.

The mechanical half is built in Phase 1 so "never feed broken data to the next
skill" is enforced by code from day one, even before any content skill exists.

## Binary assets

`final_voice.mp3`, every `scene_NNN.png`, and `final_video.mp4` live directly
in the project tree per the original spec, tracked via **Git LFS**
(`.gitattributes`) to keep the repository's core history lightweight across
many videos over time. GitHub Actions runners must `git lfs pull` before
rendering or reading assets.

## Render discipline

Full production renders happen only on GitHub Actions
(`.github/workflows/render.yml`) — never locally. Locally, `remotion studio`
(live preview) and single-frame `remotion still` sanity checks are fine; the
full-duration `.mp4` render is not. This can't be mechanically enforced
(nothing stops a developer running the full render command locally), so it's a
documented convention: only the workflow's `manifest_cli.mjs render-complete`
call is treated as authoritative for `RENDER_DONE`.

## Remotion composition data model

`factforge-motion` authors a single schema-valid `remotion/composition.json`.
`scene_config.json` and `asset_map.json` are **derived** from it by
`scripts/remotion_build.mjs derive-configs`, so the three files can never
drift. `factforge-editor` then runs `remotion_build.mjs build-project` to copy
`templates/remotion/` into `remotion/render_ready_project/` and drop the tiny
derived configs into its `src/data/`. The generic Remotion app renders a scene
sequence from that data (per-scene image, camera motion, transitions, text
overlay, optional overlay effects) — the skills only ever produce data, never
React/TSX code. Large binaries (audio/images) are referenced in place via a
public dir pointed at the per-project root, so LFS assets are never
duplicated into the render project.

Camera motion (`camera_motion.type`), transitions (`transition_in`/
`transition_out`), and each storyboard scene's `scene_type` are all
schema-enum-constrained (`schemas/composition.schema.json`,
`schemas/storyboard.schema.json`). A dedicated mechanical gate —
`validate.mjs scene-variety` (checked at `render_qa`, on
`composition.json`) and `validate.mjs scene-type-variety` (checked at
`storyboard_qa`, on `storyboard.json`) — rejects two consecutive scenes
sharing the same `camera_motion.type`, `transition_in`, or `scene_type`
(`SCENE_VARIETY_VIOLATION`), so visual monotony is caught before render
rather than left to judgment. `overlay_effects` (glow/noise/vignette/
particles, authored by `factforge-motion` alone) is optional per scene and
is not subject to this repeat check — see `templates/remotion/src/effects/`
for the transition and overlay implementations, both pure CSS/SVG with no
new binary assets.

`motion_graphics` (counter/progress_bar/timeline/map_highlight/
arrow_callout) follows the identical pattern: an optional per-scene array in
`composition.json`, authored unilaterally by `factforge-motion`
(`templates/remotion/src/effects/MotionGraphics.tsx`, also pure CSS/SVG, no
new binary assets, not subject to the variety gate). Its primary data
source is a new optional `data_point` field on each storyboard scene
(`schemas/storyboard.schema.json`) — a number, percentage, date, or region
pulled from `research/research.json`'s facts — which `factforge-motion`
translates into the matching graphic type; `map_highlight` renders a
schematic 7-region world outline embedded in the component, not real
coastlines. `direction/direction_plan.md` may also carry non-binding
tempo/motion-graphics cues, but stays free-text markdown with no schema or
QA gate of its own — `factforge-motion` remains the sole binding authority
over `composition.json`.

`camera_motion.type` has 20 values total: the original 7 plus 13 pseudo-3D
types (`dolly_left`/`dolly_right`, `crane_up`/`crane_down`, `orbit`,
`handheld_simulation`, `camera_shake`, `rack_focus`, `tilt_up`/`tilt_down`,
`rotation`, `perspective_shift`, `dynamic_zoom`) — all CSS transform tricks
(`perspective`/`rotateX`/`rotateY`/`filter: blur`/deterministic sine-wave
jitter) on the same single scene image in `Scene.tsx`'s `computeTransform`/
`computeFilter`. There is no depth/parallax layer anywhere in the
pipeline — `foreground_parallax`/`background_parallax` are deliberately
unsupported, since real parallax would require a second, depth-separated
image per scene (a structurally bigger change touching the Leonardo AI
human workflow, the `images` gate, and multiple schemas) rather than a CSS
trick on the existing single image.

Each storyboard scene's `scene_type` also deterministically maps to one of
6 `render_treatment` values (`scripts/lib/style.mjs`'s
`SCENE_TYPE_TO_TREATMENT`, mirrored as an enum in
`schemas/visual_prompts.schema.json` and as prose in `style/prompt_rules.md`),
mechanically enforced by `validate.mjs style-treatment` at `visual_qa`
(`STYLE_TREATMENT_MISMATCH`). This is orthogonal to the video's single
global `style_token`, which stays mandatory/unchanged in every scene's
`main_prompt` — `render_treatment` varies the rendering approach
systematically by content type, `style_token` keeps the whole video in one
coherent brand.

## Build phases (all complete)

1. **Foundation** — scaffolding, manifest state machine, validation CLI,
   schemas, orchestrator skill, docs.
2. **Content skills** — research, script writer, voice script + their QA
   gates.
3. **Visual pipeline** — storyboard, visual style bible, visual prompt + QA
   gates.
4. **Production + render** — director, motion/remotion, editor, render QA,
   Remotion template, GitHub Actions workflow.
5. **Packaging + final QA** — packaging skill, final QA skill.

All five phases are built; the pipeline runs end to end. See `README.md` for
the per-phase summary.
