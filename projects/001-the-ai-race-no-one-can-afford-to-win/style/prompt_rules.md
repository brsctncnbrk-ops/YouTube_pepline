# Prompt Rules — "The AI Race No One Can Afford to Win"

For `factforge-visual-prompt` (and `factforge-director`). All 33 scenes currently resolve to real footage (`footage/footage_manifest.json`: every scene `fallback_to_ai_visual: false`) — there is nothing to prompt today. This file is the standing rule set for the day any scene is re-flagged to AI fallback, and doubles as the graphic-overlay/negative-content rule set that applies to the real-footage cut regardless.

## Style consistency token (verbatim — copy exactly, do not paraphrase)

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

Every AI-fallback still's main prompt must incorporate this string verbatim. Do not shorten it, do not reorder its clauses in a way that drops a prohibition.

## Always include

- Cool, desaturated institutional color grade matching the scene's group register (`color_palette.md` group table) — warm dusk (Group G) or warm daylight (Group F) only where scene grouping calls for it.
- Generic/unbranded institutional environment descriptors (data center, office tower, government facade, laboratory, legislative chamber) — never a named real entity.
- For any UI/document/screen content: "abstract," "illustrative reconstruction," "no legible text," "generic interface" — never "screenshot" or "real."
- For any evaluation/test scene (scene_004–006): "controlled evaluation," "designed test," "lab setting" — reinforcing that this is not a live deployment.
- For any projection/prediction content (scene_016): "forecast," "dashed projection line," "labeled uncertain estimate."
- For human figures: generic, anonymous, professional, calm — per `character_style.md`.

## Always avoid (negative prompt baseline — apply to every scene)

```
humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized
AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie
cliché, apocalyptic imagery, disaster/explosion iconography, dystopian ruins,
horror lighting, Dutch angle, extreme close-up on a face, real company logo,
real government seal, named real individual, legible real text, legible real
credential values, real platform branding, gore, violence, weapons,
photorealistic fabricated news headline, sensationalist stock-photo cliché
```

## Scene-category-specific rules

- **Controlled evaluation scenes (scene_004–006):** must read as a designed test environment, never a real deployed incident. scene_005 specifically: blurred/abstract UI only, no legible fabricated message content, must not resemble a real blackmail or breach event — this is the single most sensitive prompt in the project if it is ever AI-generated.
- **Disclosed real-incident scenes (scene_012–013, scene_024):** must carry hedge language ("company's own disclosure," "not independently verified") in the prompt notes even though it renders as an on-screen label, not prompt text — keep the *visual* abstract/dashboard-only, no operational exploit detail.
- **Biological-risk scene (scene_014):** exterior-only framing, no interior lab, no depiction of any biological procedure or equipment.
- **Open/closed bookend (scene_022, scene_025):** perfectly symmetrical split-frame prompt, identical lighting/detail on both halves; scene_025 may vary crop/timing/overlay per `visual_style_bible.md` Section 12 but must not alter the balance.
- **Closing sequence (scene_030–033):** human silhouettes and environment only, warm dusk register, static/minimal-motion framing, no on-screen text.
- **Forecast graphics (scene_016):** dashed-line styling explicit in the prompt; equal visual weight for both competing projections.

## Machine-readable label/token cross-reference

Use the exact `ff-label-*` strings from `visual_style_bible.md` Section 16 when a prompt or direction note needs to reference an on-screen label — do not invent new wording:

| Scene | Label token | Text |
|---|---|---|
| scene_004 | `ff-label-controlled-evaluation` | CONTROLLED EVALUATION |
| scene_005 | `ff-label-simulated-test` | SIMULATED TEST SCENARIO |
| scene_006 | `ff-label-designed-test` | DESIGNED TEST — NOT AN ACTUAL EVENT |
| scene_009 | `ff-label-reported` | REPORTED |
| scene_012 | `ff-label-disclosed` | DISCLOSED BY THE COMPANY — REPORTED INCIDENT |
| scene_013 | `ff-label-company-assessment` | COMPANY'S OWN ASSESSMENT — NOT INDEPENDENTLY VERIFIED |
| scene_016 | `ff-label-forecast` | FORECAST — NOT A CONFIRMED OUTCOME |
| scene_019 | `ff-label-regulation-real` | EU AI ACT — COMPUTE THRESHOLD |
| scene_024 | `ff-label-same-incident-callback` | SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED |

## Hard stop conditions

Do not generate a prompt, and flag for human review instead, if a scene would require: depicting a specific named real company/government as itself, depicting operational cyber/biological/chemical procedure detail, rendering legible real **credential** values or real personal data, or making any visual claim not traceable to `scripts/script.md` or `storyboard/storyboard.json`.
