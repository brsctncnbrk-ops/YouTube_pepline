# Camera Language — "The AI Race No One Can Afford to Win"

Companion to `visual_style_bible.md` Sections 5, 6, 10. The shot grammar this film draws from, consistent with `reference_channel_style`: "modern cinematic documentary; serious, evidence-led, balanced, tense but not sensationalist."

## Shot vocabulary

- **Wide establishing shots** — institutional exteriors (data centers, government buildings, office towers, legislative chambers) used to set context and scale. Dominant shot type in Groups A, D, and G.
- **Medium/observational shots** — people at desks, in meetings, at monitors; documentary-style, not staged-looking. Dominant in Groups B, C, F.
- **Close-up detail shots** — hands on documents, monitor close-ups, a single graphic element — used for emphasis and procedural texture, always brief, never lingering into intimacy or spectacle.
- **Symmetrical static composition** — reserved specifically for the open/closed split-frame (scene_022, scene_025); this is the one shot type in the film built to *encode meaning through composition itself* (balance = editorial neutrality).
- **No handheld chaos, no whip pans, no Dutch angles, no extreme close-ups** anywhere — those read as thriller/horror, contradicting the "not sensationalist" brief.

## Camera movement

- **Slow parallel push-ins** on establishing shots (scene_001's cross-cut locations, scene_002's server hallway) — restrained urgency, not action-movie energy.
- **Slow lateral tracking** for procedural corridor/hallway shots (scene_003).
- **Static or slow handheld** for observational/documentary coverage (scene_004, scene_013, scene_027) — "observational documentary feel," per the storyboard.
- **Slow tilt/pan** for institutional exteriors (scene_019's building facade tilt, scene_028's chamber pan).
- **Near-static holds, minimal drift only** — the closing sequence (Group G) explicitly drops camera movement to near-zero, per the storyboard's slower-pacing instruction for scenes_030–033.
- Movement speed scales down as the film moves from tension (Groups B/C) toward reflection (Group G) — treat camera stillness as a deliberate pacing signal, not a budget shortcut.

## Cutting rhythm

- **Cross-cutting on the narration beat** — used for the opening (scene_001) and competitive-pressure beats (scene_008–009) to build momentum without becoming frenetic.
- **Held, static holds** for interpretive/thesis lines (scene_002's "Not someday. Right now.", scene_010's connective beat, scene_021's caveat) — let a single line land without a cut.
- **Matched cuts** between graphic inserts and footage (scene_008's ticker/data-center match, scene_012/024 SOC callback) to reinforce continuity of evidence across the film.
- **Slowest rhythm in the film:** Group G (scene_030–033) — no rapid cuts, extended holds, per the storyboard's explicit instruction to give the reflective ending room to breathe.

## Footage treatment (grading + genericism)

- Cool, desaturated base grade (Section 3/`color_palette.md`) across the majority of the film; warm registers localized to Group F (safeguards) and Group G (closing dusk).
- Every institutional environment (company, government, lab) stays generic/unbranded — no real logos, no identifiable real named entity depicted as itself, per each scene's factual-sensitivity note in `storyboard/storyboard.md`.
- No operational cyber/biological/chemical procedural detail is ever shown — cyber and biosecurity scenes (scene_012–014) stay at the exterior/dashboard/abstract level, consistent with the storyboard's explicit CRITICAL notes.
- Reused assets (scene_022/scene_025 canonical reuse) keep identical camera treatment by definition — see `visual_style_bible.md` Section 12 for the allowed crop/timing/overlay variation that avoids an identical-repeat feel without altering the shot's meaning.

## Motion graphics camera equivalent

Static graphic inserts (data viz, node diagrams, split-frame) behave like a locked-off camera: no simulated camera movement within the 2D graphic itself beyond the specified reveal/draw-on animation (`ff-motion-slow`, `ff-ease-out`) and a minimum `ff-motion-hold-min` (1200ms) hold before any cut.
