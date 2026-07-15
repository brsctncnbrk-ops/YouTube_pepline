# Color Palette — "The AI Race No One Can Afford to Win"

Companion to `visual_style_bible.md` Section 3/16. This is the authoritative token table — copy values from here, don't re-derive them.

## Base register (majority of the film)

| Token | Hex | Use |
|---|---|---|
| `ff-color-ink-950` | `#0B1220` | primary dark background |
| `ff-color-ink-800` | `#16202C` | secondary dark surface / panel background |
| `ff-color-steel-600` | `#2E3A46` | neutral mid-tone, panel fill, chart gridlines |
| `ff-color-fog-400` | `#8B97A3` | desaturated cool neutral, secondary/micro text |
| `ff-color-paper-100` | `#F2F4F6` | primary text and UI foreground |

## Semantic accents (labels/status only — never a background wash)

| Token | Hex | Use |
|---|---|---|
| `ff-color-amber-500` | `#D98E3B` | hedge/evidentiary label chips (CONTROLLED EVALUATION, REPORTED, FORECAST, DISCLOSED, etc.) |
| `ff-color-rust-600` | `#B5502F` | rare highest-sensitivity marker only — scene_005's "flagged output" underline. Not used elsewhere; never used as a fill or wash. |

## Section-local warm registers

| Token | Hex | Use |
|---|---|---|
| `ff-color-gold-400` | `#D4AF6A` | Group F warmth (scene_026–scene_029, safeguards/governance proposals) |
| `ff-color-coral-500` | `#E2795B` | Group G warm dusk (scene_030–scene_033, closing sequence) |

## Data visualization

| Token | Hex | Use |
|---|---|---|
| `ff-color-viz-line-a` | `#5B8FB9` | primary data line (cool blue) |
| `ff-color-viz-line-b` | `#D98E3B` | secondary/comparison data line (amber — same as label accent for visual consistency) |
| `ff-color-viz-grid` | `#2E3A46` | chart gridlines, hairline stroke only |

## Palette-by-scene-group quick reference

| Group | Scenes | Register |
|---|---|---|
| A — Opening race pressure | scene_001, scene_002 | Coolest ink/steel, no accent |
| B — Evidence and controlled evaluations | scene_003–scene_006 | Clinical ink/steel/fog, amber labels from scene_004 |
| C — Competitive incentives / risk spectrum | scene_007–scene_016 | Ink/steel base, amber "REPORTED"/"DISCLOSED"/"FORECAST" labels, darker SOC treatment scene_012–013 |
| D — Regulation and concentration of power | scene_017–scene_021 | Bureaucratic ink/steel, warming slightly by scene_021 |
| E — Open versus closed systems | scene_022–scene_025 | Perfectly symmetrical neutral ink/steel, no side favors either accent |
| F — Governance/oversight proposals | scene_026–scene_029 | Ink/steel lifted toward `ff-color-gold-400` warmth |
| G — Unresolved closing thesis | scene_030–scene_033 | Ink/steel shifting toward `ff-color-coral-500`, darkening to `ff-color-ink-950` by scene_033 |

## Footage color/tone matching — status

Read from `footage/footage_manifest.json` reasoning fields and `storyboard/storyboard.md`'s per-scene "Visual treatment" notes (a standalone `footage_manifest.md` file was not present in the project at authoring time). The palette above reflects that best-effort read. **This is not a colorimetric measurement.** Before any AI-fallback still is generated against this palette, and before final color grading of the real-footage cut, a human visual QC pass should confirm actual delivered clip tones (warm vs. cool, contrast, saturation) match the intended register per group — flag and re-grade mismatches at that stage rather than assuming this document is ground truth.

## Style consistency token (verbatim, also in `prompt_rules.md`)

```
FactForge institutional documentary style, cool desaturated cinematic grade,
restrained clinical realism, generic unbranded institutional environments
(data centers, offices, government buildings, laboratories), no humanoid
robots, no evil AI face, no glowing brains, no neon cyberpunk, no heavy
code-rain, no apocalyptic imagery, abstract UI and dashboard graphics only
with no legible real text or real credentials, calm evidence-led
documentary tone, high-contrast single-source lighting, thin amber
(#D98E3B) accent used only for hedge/status labels, modern sans-serif
infographic overlays, professional YouTube documentary look
```
