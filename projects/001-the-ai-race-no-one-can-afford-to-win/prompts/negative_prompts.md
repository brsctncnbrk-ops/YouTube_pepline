# Negative Prompts — 001-the-ai-race-no-one-can-afford-to-win

All 33 scenes currently resolve to real, human-selected footage (`footage/footage_manifest.json`: every scene `fallback_to_ai_visual: false`). There are no AI-image-generation prompts to run today. This file exists for two reasons: (1) it is the standing negative-prompt baseline for the day any scene is re-flagged to AI fallback, and (2) it doubles as the graphic-overlay/negative-content rule set that applies to the real-footage cut and its illustrative-reconstruction overlays regardless of whether any still is ever AI-generated.

## Global negative baseline (apply to every scene)

```
humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim
```

Hard prohibitions restated explicitly: **no humanoid robot**, no robot face, no evil AI face, no glowing brain, no fake data, no invented statistics, no fake numeric dashboard, no unsupported company/government behavior claim, no new factual claim beyond `scripts/script.md` / `storyboard/storyboard.json`.

## Per-scene additional exclusions

### scene_001
- Additional exclusions: no fabricated multi-location composite claim

### scene_002
- Additional exclusions: no named real entity

### scene_003
- Additional exclusions: no ominous/horror lighting

### scene_004
- Additional exclusions: no depiction as real deployed incident

### scene_005
- Additional exclusions: no real blackmail implication, no real people/company/usernames/messages, no dramatic zoom on 'shocking' text, no red alert flash, no thriller sting

### scene_006
- Additional exclusions: no panicked running, no real emergency implication

### scene_007
- Additional exclusions: no identifiable real individual

### scene_008
- Additional exclusions: no real ticker symbol, no real company name

### scene_009
- Additional exclusions: no real company name/logo, no false precision

### scene_010
- Additional exclusions: no literal vehicle/runner rendering, no over-elaboration

### scene_011
- Additional exclusions: no named real institution

### scene_012
- Additional exclusions: no operational cyber/exploit detail

### scene_013
- Additional exclusions: no overstatement of certainty beyond hedge

### scene_014
- Additional exclusions: no interior lab imagery, no biological/chemical procedural detail, no equipment depiction

### scene_015
- Additional exclusions: no real platform branding, no real post/usernames

### scene_016
- Additional exclusions: no solid/confirmed line style, no false precision, no favoring one forecast

### scene_017
- Additional exclusions: no real company name on any node

### scene_018
- Additional exclusions: no real government seal/logo

### scene_019
- Additional exclusions: no fabricated regulatory detail beyond what script/storyboard state

### scene_020
- Additional exclusions: no real company name/logo

### scene_021
- Additional exclusions: no real government seal/name

### scene_022
- Additional exclusions: no asymmetry favoring open or closed, no real repo/product name

### scene_023
- Additional exclusions: no real repo/product name

### scene_024
- Additional exclusions: no operational cyber/exploit detail, no new claim beyond scene_012/013

### scene_025
- Additional exclusions: no new on-screen text, no left/right balance shift, no different clip substituted

### scene_026
- Additional exclusions: no real institution named

### scene_027
- Additional exclusions: no real institution/individual named

### scene_028
- Additional exclusions: no real government body named

### scene_029
- Additional exclusions: no real company name on any node

### scene_030
- Additional exclusions: no rogue-machine/robot-takeover imagery

### scene_031
- Additional exclusions: no rogue-machine/robot-takeover imagery, no single hero/villain figure

### scene_032
- Additional exclusions: no rogue-machine/robot-takeover imagery (explicit prior rejection precedent for this scene)

### scene_033
- Additional exclusions: no rogue-machine/robot imagery, no CTA/title card

