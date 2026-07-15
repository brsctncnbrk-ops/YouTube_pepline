# Graphic Style — "The AI Race No One Can Afford to Win"

Companion to `visual_style_bible.md` Sections 7–9. Governs the overlay/graphic layer composited on top of real footage: labels, data visualization, and UI/screen reconstructions.

## General graphic principles

- Flat, minimal, high-contrast infographic layer against the film's cool base palette (`color_palette.md`) — never glossy, never 3D-rendered, never using drop shadows/bevels/gradients beyond a simple scrim.
- One data concept per graphic insert. No dashboards-within-dashboards, no cluttered multi-chart composites.
- All graphic elements share the same token set (Section 16 of `visual_style_bible.md`) — radius, stroke width, spacing, and motion timing must never be improvised per-scene.

## Lower thirds / labels

- Structure: flat rectangular chip (`ff-radius-sm`), `ff-color-ink-950`/scrim background, `ff-color-paper-100` uppercase text, thin `ff-color-amber-500` border or underline accent.
- Typography: `ff-font-primary`, `ff-type-label` scale, letter-spaced uppercase.
- Position: lower-third, within `ff-safe-lower-third-bottom` and `ff-safe-side-margin`.
- Motion: enters on `ff-motion-base` (500ms) slide/fade with `ff-ease-out`, holds a minimum of 1.5s, exits on `ff-motion-fast` (200ms) fade.
- Exact label text is fixed per scene — see `ff-label-*` tokens in `visual_style_bible.md` Section 16 and the scene list in `prompt_rules.md`. Do not paraphrase these; they are evidentiary hedge language pulled directly from the storyboard/script.
- Reserve `ff-color-rust-600` exclusively for the scene_005 "flagged output" marker underline — every other label uses the amber accent. This asymmetry is intentional: it signals scene_005 as the single most sensitive reconstruction in the film without escalating the whole label system into an alarm palette.

## Data visualization

- Chart type: simple line/bar only, two-series maximum, `ff-color-viz-line-a` / `ff-color-viz-line-b`, gridlines at `ff-stroke-hairline` in `ff-color-viz-grid`.
- **Forecast/projection charts (scene_016):** MUST use `ff-stroke-dashed-forecast` (dashed, not solid), MUST carry the `ff-label-forecast` text ("FORECAST — NOT A CONFIRMED OUTCOME"), and both competing forecasts get identical stroke weight/treatment — no visual favoring of either projection. Never render a forecast as a solid confirmed-data line; never let the animation "count up" to a number, which would imply false precision.
- **Reported-event graphics (scene_008 ticker, scene_009 leaderboard):** generic/unbranded numbers, bars, and rankings only — no real company names, logos, or real ticker symbols. Carry the `ff-label-reported` tag.
- **Consolidation/competition node diagrams (scene_017, scene_029):** abstract circles/lines only. Scene_017: many small nodes animate into a handful of large central nodes (concentration). Scene_029: several equally-sized nodes, static, deliberately contrasting scene_017's convergence. Never label a node with a real company name.
- **Decelerate/overtake graphic (scene_010):** two abstract shapes only, no literal vehicle/runner rendering, minimal detail, brief connective-beat duration.

## UI / screen reconstructions

Every reconstructed interface in this film is an **illustrative reconstruction** — abstracted, generic, and explicitly not a captured real screenshot. This applies to: the evaluation-room "scenario running" indicator (scene_004), the message/test-transcript UI (scene_005), the SOC alert dashboard (scene_012–013, echoed in scene_024), the compliance-report/checklist inserts (scene_018, scene_020, scene_027), the social-feed scroll (scene_015), and the open-repository / locked-vault split-frame (scene_022, scene_025).

Rules for all of the above:

- `ff-font-mono` for any readout/label text within the UI itself, to visually mark it as a system interface distinct from narration captions.
- No legible real text blocks, no real usernames/handles, no real platform logos/branding, and no real-looking **credential** values (API keys, passwords, account IDs) anywhere on screen — use blurred/abstracted placeholder text or pure iconography instead.
- Status/accent color limited to `ff-color-amber-500` (neutral/pending/flagged) with the single scene_005 exception noted above.
- **scene_005 is the highest-sensitivity reconstruction in the project.** It must render as a blurred, abstracted email/message-list UI with a highlighted "flagged output" marker and the on-screen label SIMULATED TEST SCENARIO. No legible fabricated email content, no dramatized "shocking reveal" framing, no thriller pacing (no whip-zoom, no alarm-red flash, no sting). It must read as a calm annotation of a test artifact, not a real event.
- **scene_024 explicitly echoes scene_012's SOC dashboard visual style** — reuse the same UI treatment (not just the same palette) so the callback reads as "the same real case," per the storyboard's SAME REPORTED INCIDENTS AS EARLIER label.
- **scene_022 / scene_025 split-frame:** open-repository interface (left) and locked-vault/restricted-terminal interface (right) must be equal in size, brightness, and detail level — no asymmetry that could read as favoring "open" or "closed."

## What never appears in the graphic layer

Per `visual_style_bible.md` Section 15: no humanoid-robot iconography, no evil-AI-face iconography, no code-rain/scrolling-hacker-text backgrounds, no neon/cyberpunk color treatment, no apocalyptic/disaster iconography (warning triangles, skulls, explosion graphics), and no chart or label asserting a claim not present in `scripts/script.md` or `storyboard/storyboard.json`.
