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

By the time this stage runs, the human has already generated the scene images
in Leonardo AI and the images gate has passed — so every
`assets/images/scene_NNN.png` exists and you can reason about real shots, not
just prompts.

## Inputs

`storyboard/storyboard.json` (scene timings, purposes, visual needs,
transitions, on-screen text), `prompts/visual_prompts.md` (what each image
actually depicts), and `style/visual_style_bible.md` +
`style/camera_language.md` (the shot vocabulary).

## Task

For every scene, decide and record:

- **Pacing** — is this scene a slow, let-it-breathe beat or a quick punch?
  How does the rhythm build across the video? Give each scene one explicit
  tempo keyword alongside the qualitative description — `slow`, `medium`,
  `fast`, or `punchy` (e.g. "Pacing: fast (punchy) — quick 2s punch before
  the reveal") — so `factforge-motion` has a consistent word to scan for
  even though this stays free text, not a schema field.
- **Emotional flow** — the intended feeling of each scene and how it
  transitions to the next (tension → relief, curiosity → payoff, etc.).
- **Camera movement** — a concrete motion per scene drawn from the camera
  language, expressed in vocabulary the Motion stage can act on. Use these
  motion keywords so `factforge-motion` can map them directly:
  `zoom_in`, `zoom_out`, `pan_left`, `pan_right`, `pan_up`, `pan_down`,
  `static`. Note intensity where it matters (subtle vs. dramatic). **Don't
  call for the same motion keyword on two consecutive scenes** —
  `factforge-motion` carries your choices straight into `camera_motion.type`,
  and `render_qa` mechanically rejects consecutive repeats.
- **Close vs. wide emphasis** — which scenes push in for intimacy/detail and
  which pull back for context, consistent with the storyboard's shot intent.
- **Text animation cues** — for scenes with on-screen text, how it should
  appear (e.g. fade up, hold, fade out) and when, relative to the narration.
- **Attention direction** — where the viewer's eye should go and how the
  motion/pacing guides it.
- **Motion-graphics suggestion (optional, non-binding)** — for a scene that
  carries a storyboard `data_point`, or whose `purpose`/`visual_need` is
  naturally a stat-reveal/progress/timeline/location beat, you may suggest
  which motion-graphics type (`counter`, `progress_bar`, `timeline`,
  `map_highlight`, `arrow_callout`) would suit it and why — phrased as a
  suggestion, e.g. "a counter animating up to 2.3M would land well here",
  never as an instruction. `factforge-motion` decides independently and is
  never obligated to follow this — unlike the camera-motion keyword above,
  which it does treat as binding.

## Output

**`direction/direction_plan.md`** — organized scene by scene (one section per
`scene_id`), each stating pacing (+ tempo keyword), emotional beat, the
chosen camera motion keyword (+ intensity), close/wide intent, text-animation
cue, and — where relevant — a motion-graphics suggestion. Add a short overall
"Rhythm & Arc" intro summarizing how the video's energy rises and falls
across its full duration.

Make the per-scene camera motion keyword unambiguous — `factforge-motion`
will read this file to choose each scene's `camera_motion.type`, so if you
write "slow push in" also give the keyword (`zoom_in`).

## Before finishing

1. Re-read the plan against `storyboard.json`: every scene_id must be
   covered, and your motion choices shouldn't fight the storyboard's
   transitions (e.g. don't call for a dramatic zoom that clashes with a hard
   cut into the next scene). The tempo keyword and motion-graphics
   suggestions are free text like everything else here — nothing here is
   schema-checked, and this stage still has no dedicated QA gate.
2. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage director --result success`.

Never hand-edit `manifest.json` directly.
