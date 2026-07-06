# FactForge Pipeline

## Stage graph (17 stages)

```
research -> research_qa -> script -> script_qa -> voice_script -> voice_qa
  --[GATE: audio]--
  -> storyboard -> storyboard_qa -> visual_style_bible -> visual_prompt -> visual_qa
  --[GATE: images]--
  -> director -> remotion -> editor -> render_qa
  --[external: GitHub Actions render]--
  -> packaging -> final_qa -> DONE
```

The canonical, machine-readable version of this graph lives in
`scripts/lib/pipeline.mjs` (`STAGE_ORDER`, `STAGE_REQUIRED_FILES`,
`STAGE_OUTPUT_FILES`, `GATES`) — treat that file as the source of truth if
this doc and the code ever disagree.

Mapping back to the original spec's numbered skills: 01→research,
01.5→research_qa, 02→script, 02.5→script_qa, 03→voice_script, 03.5→voice_qa,
04→storyboard, 04.5→storyboard_qa, 05→visual_style_bible, 06→visual_prompt,
06.5→visual_qa, 07→director, 08→remotion, 09→editor, 10→render_qa,
11→packaging, 12→final_qa. Skill 00 (Orchestrator) is not itself a pipeline
stage — it sequences the rest.

## manifest.json statuses

| Status | Meaning |
|---|---|
| `NOT_STARTED` | Project scaffolded, no stage has completed yet. |
| `IN_PROGRESS` | Actively moving through stages. |
| `WAITING_FOR_AUDIO` | Blocked until the human drops `assets/audio/final_voice.mp3` in place (ElevenLabs is manual). |
| `WAITING_FOR_IMAGES` | Blocked until every `assets/images/scene_NNN.png` referenced by `storyboard.json` exists (Leonardo AI is manual). |
| `WAITING_FOR_USER_APPROVAL` | Reserved for a future explicit human sign-off step. |
| `READY_FOR_RENDER` | `prepare-render` passed every render-readiness check; ready to dispatch `render.yml`. |
| `RENDERING` | Reserved for in-flight render state (the workflow currently goes straight from `READY_FOR_RENDER` to `RENDER_DONE`). |
| `RENDER_DONE` | The render workflow produced `output/final_video.mp4` and called `manifest_cli.mjs render-complete`. |
| `READY_FOR_FINAL_QA` | Reserved for post-render, pre-final-QA state (Phase 5). |
| `READY_FOR_UPLOAD` | Final QA passed, packaging complete (future phase). |
| `DONE` | All 17 stages completed. |
| `ERROR` | A stage or gate failed a mechanical check; see `errors[]` and `logs/errors.log`. |

## Gates

Gates are not pipeline stages — they're manifest-level checks the Orchestrator
runs via `manifest_cli.mjs gate` before letting a blocked stage proceed.

- **audio gate** (before `storyboard`): requires
  `assets/audio/final_voice.mp3` to exist.
- **images gate** (before `director`): requires every `scene_NNN.png`
  referenced in `storyboard.json` to exist under `assets/images/`.

## QA gates (7 of the 17 stages)

`research_qa`, `script_qa`, `voice_qa`, `storyboard_qa`, `visual_qa`,
`render_qa`, `final_qa`. Each writes `qa/<gate>.md` with two sections: an
"Automated Checks" section (written by `manifest_cli.mjs qa`, backed by
`scripts/validate.mjs`) and a "Judgment-Based Checks" section. As of Phase 4,
six of these gates have a matching QA skill (`factforge-research-qa`,
`factforge-script-qa`, `factforge-voice-qa`, `factforge-storyboard-qa`,
`factforge-visual-qa`, `factforge-render-qa`) that fills in the judgment
section for real; only `final_qa` doesn't have a QA skill yet (Phase 5) and
still shows the placeholder text until then.

`visual_qa` deliberately does not check whether `assets/images/scene_NNN.png`
files exist — at that point in the pipeline the human hasn't generated them
yet. It only checks that `prompts/visual_prompts.json` fully covers the
storyboard's scenes with correctly-patterned filenames (a name-mapping check
via `validatePromptCoverage` in `scripts/validate.mjs`). Actual file
existence is checked separately by the images gate, right before `director`.

`visual_style_bible`, `director`, `remotion`, `editor` have no dedicated QA
gate per the original spec — any schema-backed JSON output among them is
still schema-validated automatically as a cheap machine check (logged to
`logs/errors.log` on failure) without introducing a new named gate.
`visual_style_bible`'s outputs are all markdown with no JSON schema, so there
is nothing to auto-check there beyond the producer skill's own review.
