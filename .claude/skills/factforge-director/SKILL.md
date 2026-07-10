---
name: factforge-director
description: Plans the direction (pacing, camera movement, emotional flow, text animation) for a FactForge video. Use when a FactForge project's manifest current_stage is "director".
---

# FactForge Director

You write the direction plan that tells the Motion/Remotion stage *how* each
scene should feel and move. You do not write Remotion config JSON yourself —
that's `factforge-motion`'s job, informed by your plan. This stage has **no
dedicated QA gate**, so review your own plan for internal consistency before
advancing.

By the time this stage runs, the human has already dropped in every scene's
visual asset — footage clips for scenes `factforge-footage-retrieval`
matched, generated stills for scenes flagged `fallback_to_ai_visual` — and
the `visual_assets` gate has passed. Read `footage/footage_manifest.json` to
know which is which per scene; your direction differs by `asset_type`.

## Inputs

`storyboard/storyboard.json` (scene timings, purposes, visual needs,
transitions, on-screen text), `footage/footage_manifest.json` (resolves each
scene's `asset_type` and, for footage scenes, `native_duration_sec`/
`trim_in_sec`/`trim_out_sec`), `prompts/visual_prompts.md` (what each
AI-fallback still actually depicts), and `style/visual_style_bible.md` +
`style/camera_language.md` (the shot vocabulary, for fallback scenes).

## Task

For every scene, decide and record pacing, emotional flow, close/wide
emphasis, text animation cues, and attention direction (as before) — but the
**visual treatment** branches by `asset_type`:

- **Footage scenes** (`asset_type: "footage"`) — no Ken Burns pan/zoom; the
  clip's own motion carries it. Instead decide the **clip trim/pace**: which
  portion of the native clip (within `native_duration_sec`) best serves this
  moment, and whether the footage_manifest's existing `trim_in_sec`/
  `trim_out_sec` should be adjusted (e.g. a calmer mid-clip segment instead
  of the very start). State this as a concrete trim window in seconds —
  `factforge-motion` will use it (or the footage manifest's own trim points
  if you don't override them) directly, not a motion keyword.
- **AI-fallback scenes** (`asset_type: "ai_fallback"`) — unchanged: a
  concrete motion per scene using the same vocabulary as before —
  `zoom_in`, `zoom_out`, `pan_left`, `pan_right`, `pan_up`, `pan_down`,
  `static` — with intensity noted (subtle vs. dramatic).

Also decide, for every scene:

- **Pacing** — is this scene a slow, let-it-breathe beat or a quick punch?
  How does the rhythm build across the video?
- **Emotional flow** — the intended feeling of each scene and how it
  transitions to the next (tension → relief, curiosity → payoff, etc.).
- **Close vs. wide emphasis** — which scenes push in for intimacy/detail and
  which pull back for context, consistent with the storyboard's shot intent.
- **Text animation cues** — for scenes with on-screen text, how it should
  appear (e.g. fade up, hold, fade out) and when, relative to the narration.
- **Attention direction** — where the viewer's eye should go and how the
  motion/pacing guides it.

## Output

**`direction/direction_plan.md`** — organized scene by scene (one section per
`scene_id`), each stating `asset_type`, pacing, emotional beat, the
visual-treatment decision (trim window for footage scenes; camera motion
keyword + intensity for ai_fallback scenes), close/wide intent, and
text-animation cue. Add a short overall "Rhythm & Arc" intro summarizing how
the video's energy rises and falls across its full duration.

Make each scene's visual-treatment decision unambiguous —
`factforge-motion` will read this file to populate `composition.json`. For
ai_fallback scenes, if you write "slow push in" also give the keyword
(`zoom_in`). For footage scenes, give explicit seconds ("use 4s-14s of the
clip") if you're overriding the manifest's default trim.

## Before finishing

1. Re-read the plan against `storyboard.json`: every scene_id must be
   covered, and your motion choices shouldn't fight the storyboard's
   transitions (e.g. don't call for a dramatic zoom that clashes with a hard
   cut into the next scene).
2. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage director --result success`.

Never hand-edit `manifest.json` directly.
