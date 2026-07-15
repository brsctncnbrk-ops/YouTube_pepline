# Visual Prompts — Edit Direction — 001-the-ai-race-no-one-can-afford-to-win

**Status: no AI-fallback scenes.** `footage/footage_manifest.json` shows all 33 scenes with `fallback_to_ai_visual: false` — real, licensed stock footage covers every scene (`footage/scene_asset_map.json`, `footage/retrieval_report.md`). `prompts/visual_prompts.json` is therefore schema-valid with `scenes: []` per `schemas/visual_prompts.schema.json` ("AI-fallback prompts only ... a project may legitimately have zero such scenes").

This document is the human-readable, machine-oriented **edit direction** for all 33 existing-footage scenes: for each scene, the effective media asset already in hand, the provider asset it came from, how the editor should treat that existing footage (crop, camera motion, playback speed, grade, transitions, overlay), and the factual-sensitivity/style constraints that apply. It is not a set of image-generation prompts — there is nothing to generate — but it reuses the PRIMARY_VISUAL_PROMPT / EDIT_TREATMENT_PROMPT / OVERLAY_PROMPT / NEGATIVE_PROMPT naming convention as structured, consistent edit directives so the same fields translate directly if any scene is ever re-flagged to AI fallback.

## Style consistency token (verbatim, from `style/prompt_rules.md`)

```
FactForge institutional documentary style, cool desaturated cinematic grade, restrained clinical realism, generic unbranded institutional environments (data centers, offices, government buildings, laboratories), no humanoid robots, no evil AI face, no glowing brains, no neon cyberpunk, no heavy code-rain, no apocalyptic imagery, abstract UI and dashboard graphics only with no legible real text or real credentials, calm evidence-led documentary tone, high-contrast single-source lighting, thin amber (#D98E3B) accent used only for hedge/status labels, modern sans-serif infographic overlays, professional YouTube documentary look
```

Every scene's PRIMARY_VISUAL_PROMPT below references this token by name for consistency; do not shorten it or drop a prohibition if it is ever quoted in full for a future AI-fallback still.

## Context Label Glossary

On-screen evidentiary labels (exact `ff-label-*` text, per `style/visual_style_bible.md` Section 16 and `style/prompt_rules.md`) are distinct from each scene's **Context Label** classification below, which names the *category* of visual treatment a scene requires. Allowed categories: `CONCEPTUAL VISUALIZATION`, `CONTROLLED EVALUATION`, `ILLUSTRATIVE RECONSTRUCTION`, `FORECAST / ESTIMATE`, `GENERIC INTERFACE`, `SIMULATED TRANSCRIPT`, or `NONE` where no reconstruction/hedge treatment applies.

- **conceptual visualization** — a reconstructed test/incident artifact rendered as an abstract, non-literal visualization rather than literal captured content (e.g. scene_005's flagged-output marker).
- **controlled evaluation** — the scene depicts a designed, controlled test, never a real live deployment (scene_004, scene_006).
- **illustrative reconstruction** — any UI/document/screen insert is abstracted and generic, explicitly not a captured real screenshot (scene_005, scene_012-013, scene_019, scene_022, scene_024-025, scene_028).
- **forecast** — a projection/prediction graphic, dashed-line styled, explicitly labeled as a forecast, never a confirmed outcome (scene_016).
- **generic interface** — a graphic/dashboard insert that is unbranded and generic but not specifically a reconstruction of a real incident (scene_008-009, scene_015, scene_017, scene_022-025, scene_029).
- **simulated transcript** — a test-scenario message/document artifact with zero real content (scene_005 only).

---

## scene_001

- **scene_id:** scene_001
- **Timing/duration:** 0.000s – 28.780s (00:00.000 – 00:28.780), duration 28.780s
- **Narration intent:** voice_script.txt para 1-2: "Every major AI lab on Earth believes moving this fast might be dangerous..."
- **Narrative purpose:** Cold open: establish that AI labs know the risk and race anyway.
- **Storyboard visual need:** Rapid, restrained cross-cuts between a data-center exterior, an anonymous AI-company office at night, and a government building facade, all in parallel motion. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_001_52c2ebe35b131555e20a5ab5.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 12719806
- **Existing footage treatment:** Anchor the cold open as-is on this single canonical clip. Do not claim or imply the primary clip itself shows three separate locations (data center / office / government building) — it does not.
- **Framing/crop:** Wide establishing aerial/exterior; do not crop tight enough to lose the district-scale read.
- **Camera motion:** Slow parallel push-in on the aerial city/data-center-district exterior; restrained urgency, not action-movie energy (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group A register — coolest ink/steel (ff-color-ink-950/ff-color-ink-800), no accent
- **Lighting/exposure:** Night exterior, high-contrast single-source city lighting, cool desaturated grade (ff-color-ink-950 base).
- **Transition in/out:** fade / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Do not narrate or caption this shot as depicting three distinct institutions in one clip; the three-part motif (data center/office/government) is completed only via cross-cutting to other already-acquired clips in-edit (scene_002 server hallway, scene_011 government time-lapse), per visual_style_bible.md Section 12. SUPPLEMENTAL_MONTAGE_RECOMMENDED preserved: reserve an open director/editor supplemental montage slot for these cross-cut inserts; any such inserts require separately approved assets and are not authorized by this stage.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no fabricated multi-location composite claim
- **Style token references:** ff-color-ink-950, ff-color-ink-800, ff-motion-hold-min
- **Accessibility constraints:** No on-screen text this scene; no flashing (<3Hz) during cross-cut inserts if added later.
- **Editor notes:** SUPPLEMENTAL_MONTAGE_RECOMMENDED (footage/retrieval_report.md, visual_style_bible.md Section 12): the storyboard's literal three-part cross-cut motif is only achievable by cutting to other existing assets (scene_002, scene_011) — this is an open, director/editor-owned montage slot, not resolved by this stage, and any additional footage would need separate approval. Do not initiate new footage-retrieval search.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_001_52c2ebe35b131555e20a5ab5.mp4` (provider asset pexels/12719806) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Anchor the cold open as-is on this single canonical clip. Do not claim or imply the primary clip itself shows three separate locations (data center / office / government building) — it does not.
- **EDIT_TREATMENT_PROMPT:** Wide establishing aerial/exterior; do not crop tight enough to lose the district-scale read. Slow parallel push-in on the aerial city/data-center-district exterior; restrained urgency, not action-movie energy (camera_language.md). Native speed, no ramping. Grade to Group A register (coolest ink/steel (ff-color-ink-950/ff-color-ink-800), no accent). Night exterior, high-contrast single-source city lighting, cool desaturated grade (ff-color-ink-950 base).
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no fabricated multi-location composite claim
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_002

- **scene_id:** scene_002
- **Timing/duration:** 28.780s – 51.546s (00:28.780 – 00:51.546), duration 22.766s
- **Narration intent:** voice_script.txt para 3-4: "That fear is the real engine... Not someday. Right now."
- **Narrative purpose:** Land the thesis question the film sits with.
- **Storyboard visual need:** A single held wide shot (server hallway or night skyline) as narration delivers the core question; short, declarative close. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_002_55b0a8af17f137fd76d52766.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pixabay / 39183
- **Existing footage treatment:** Use as the connective thesis-question beat immediately following scene_001's cross-cuts.
- **Framing/crop:** Single held wide shot for the full duration; no cutting away mid-line.
- **Camera motion:** Slow parallel push-in on server hallway, or a held wide shot on night skyline; camera stillness increases as the line lands (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group A register — coolest ink/steel (ff-color-ink-950/ff-color-ink-800), no accent
- **Lighting/exposure:** Cool desaturated night interior/exterior, ff-color-ink-950/ff-color-steel-600.
- **Transition in/out:** cut / dissolve
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Generic/unbranded server hallway or skyline only; no real company identified.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no named real entity
- **Style token references:** ff-color-ink-950, ff-color-steel-600, ff-motion-hold-min
- **Accessibility constraints:** No on-screen text this scene.
- **Quality-flag note:** footage/footage_manifest.json retains a historical LOW_RESOLUTION_REVIEW_REQUIRED flag from an earlier corrective batch; footage/scene_asset_map.json (current authoritative record) shows approved_for_final_edit=true, editorial_quality_approved=true, human_review_status=NOT_REQUIRED for this scene's current asset. Treat scene_asset_map.json as current.
- **Editor notes:** Held, static hold for the interpretive thesis line ('Not someday. Right now.') — let it land without a cut, per camera_language.md cutting-rhythm notes.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_002_55b0a8af17f137fd76d52766.mp4` (provider asset pixabay/39183) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Use as the connective thesis-question beat immediately following scene_001's cross-cuts.
- **EDIT_TREATMENT_PROMPT:** Single held wide shot for the full duration; no cutting away mid-line. Slow parallel push-in on server hallway, or a held wide shot on night skyline; camera stillness increases as the line lands (camera_language.md). Native speed, no ramping. Grade to Group A register (coolest ink/steel (ff-color-ink-950/ff-color-ink-800), no accent). Cool desaturated night interior/exterior, ff-color-ink-950/ff-color-steel-600.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no named real entity
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); LOW_RESOLUTION_REVIEW_REQUIRED historical flag (see quality-flag note above); no fabricated data, no new factual claim introduced by this stage.

## scene_003

- **scene_id:** scene_003
- **Timing/duration:** 51.546s – 70.446s (00:51.546 – 01:10.446), duration 18.900s
- **Narration intent:** voice_script.txt para 5: "It's tempting to think we'd know if something were seriously wrong..."
- **Narrative purpose:** Set up the section's core assumption: that danger would announce itself.
- **Storyboard visual need:** Clinical research-lab exterior or corridor; calm, procedural, not ominous. (mood: curious)
- **Effective media path (existing footage):** `assets/footage/scene_003_d69cde76dfac1e29bd6f9946.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 6224298
- **Existing footage treatment:** Clinical, not ominous, despite the 'curious' mood tag — avoid any implication of an active incident.
- **Framing/crop:** Medium-wide corridor/exterior framing; calm, procedural.
- **Camera motion:** Slow lateral tracking along a research-lab exterior or corridor (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group B register — clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)
- **Lighting/exposure:** Clinical ink/steel/fog register, even lighting, no dramatic shadow.
- **Transition in/out:** dissolve / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Generic research-lab exterior/corridor only; no real institution named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no ominous/horror lighting
- **Style token references:** ff-color-steel-600, ff-color-fog-400
- **Accessibility constraints:** No on-screen text this scene.
- **Quality-flag note:** footage/footage_manifest.json retains a historical LOW_RESOLUTION_REVIEW_REQUIRED flag from an earlier corrective batch; footage/scene_asset_map.json (current authoritative record) shows approved_for_final_edit=true, editorial_quality_approved=true, human_review_status=NOT_REQUIRED for this scene's current asset. Treat scene_asset_map.json as current.
- **Editor notes:** Sets up the assumption ('danger would announce itself') that scene_004-006 will complicate — keep tone calm/procedural, not tense-foreshadowing.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_003_d69cde76dfac1e29bd6f9946.mp4` (provider asset pexels/6224298) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Clinical, not ominous, despite the 'curious' mood tag — avoid any implication of an active incident.
- **EDIT_TREATMENT_PROMPT:** Medium-wide corridor/exterior framing; calm, procedural. Slow lateral tracking along a research-lab exterior or corridor (camera_language.md). Native speed, no ramping. Grade to Group B register (clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)). Clinical ink/steel/fog register, even lighting, no dramatic shadow.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no ominous/horror lighting
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); LOW_RESOLUTION_REVIEW_REQUIRED historical flag (see quality-flag note above); no fabricated data, no new factual claim introduced by this stage.

## scene_004

- **scene_id:** scene_004
- **Timing/duration:** 70.446s – 89.347s (01:10.446 – 01:29.347), duration 18.901s
- **Narration intent:** voice_script.txt para 6: "In controlled evaluations, researchers have deliberately pushed frontier models..."
- **Narrative purpose:** Introduce controlled model evaluations as designed adversarial tests.
- **Storyboard visual need:** Closed-door testing room: evaluation dashboards and monitors showing abstracted (non-literal) test-scenario UI — charts, status flags, not code. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_004_52abd7f745cc24b4ecad0215.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pixabay / 1210
- **Existing footage treatment:** Must read as a designed test environment, never a real deployed incident (prompt_rules.md scene-category rule).
- **Framing/crop:** Medium/observational: evaluation dashboards and monitors in a closed-door testing room.
- **Camera motion:** Static or slow handheld, observational documentary feel (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group B register — clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)
- **Lighting/exposure:** Clinical ink/steel/fog, amber label accent introduced here for the first time.
- **Transition in/out:** cut / cut
- **Overlay/text:** CONTROLLED EVALUATION — token: CONTROLLED EVALUATION (ff-label-controlled-evaluation)
- **Source/context label requirement:** CONTROLLED EVALUATION
- **Conceptual/reconstruction marker:** CONTROLLED EVALUATION
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Abstracted (non-literal) test-scenario UI — charts, status flags, not code; illustrative reconstruction only, no legible real text (graphic_style.md).
- **Factual-sensitivity constraints:** Controlled/designed adversarial test, not a live deployment; must not be staged as an actual incident.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no depiction as real deployed incident
- **Style token references:** ff-color-amber-500 (label only), ff-font-mono (UI readout), ff-radius-sm, ff-type-label
- **Accessibility constraints:** Label ff-label-controlled-evaluation must hold >=1.5s, meet 4.5:1 contrast via ff-overlay-scrim-low/high; hedge meaning carried by label text, not color alone.
- **Quality-flag note:** footage/footage_manifest.json retains a historical LOW_RESOLUTION_REVIEW_REQUIRED flag from an earlier corrective batch; footage/scene_asset_map.json (current authoritative record) shows approved_for_final_edit=true, editorial_quality_approved=true, human_review_status=NOT_REQUIRED for this scene's current asset. Treat scene_asset_map.json as current.
- **Editor notes:** First amber-accent label in the film; sets the visual grammar for every subsequent hedge label.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_004_52abd7f745cc24b4ecad0215.mp4` (provider asset pixabay/1210) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Must read as a designed test environment, never a real deployed incident (prompt_rules.md scene-category rule).
- **EDIT_TREATMENT_PROMPT:** Medium/observational: evaluation dashboards and monitors in a closed-door testing room. Static or slow handheld, observational documentary feel (camera_language.md). Native speed, no ramping. Grade to Group B register (clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)). Clinical ink/steel/fog, amber label accent introduced here for the first time.
- **OVERLAY_PROMPT:** On-screen label CONTROLLED EVALUATION (ff-label-controlled-evaluation) UI/data requirement: Abstracted (non-literal) test-scenario UI — charts, status flags, not code; illustrative reconstruction only, no legible real text (graphic_style.md).
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no depiction as real deployed incident
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); LOW_RESOLUTION_REVIEW_REQUIRED historical flag (see quality-flag note above); no fabricated data, no new factual claim introduced by this stage.

## scene_005

- **scene_id:** scene_005
- **Timing/duration:** 89.347s – 111.254s (01:29.347 – 01:51.254), duration 21.907s
- **Narration intent:** voice_script.txt para 7: "In one widely reported case, a model given access to fictional emails..."
- **Narrative purpose:** Depict the specific reported blackmail-style test case at a high level, without dramatization.
- **Storyboard visual need:** Continuation of the evaluation-room setting; abstract representation of a flagged/highlighted test transcript, no literal chat-log text rendered. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_005_e98a421f0d9c432e4d2036fb.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pixabay / 1058
- **Existing footage treatment:** Conceptual visualization only — a blurred, abstracted document/email UI with a highlighted 'flagged output' marker. This is the single most sensitive reconstruction in the project.
- **Framing/crop:** Tight but calm framing on the abstracted document/email UI; no dramatic zoom.
- **Camera motion:** Static, tightened framing versus scene_004 — continuation of the same clinical grade (prompt_rules.md, visual_style_bible.md Section 12).
- **Playback speed:** Native speed. No speed ramping, no whip-zoom, no thriller sting.
- **Color grade:** Group B register — clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)
- **Lighting/exposure:** Same clinical grade as scene_004; the rust accent (ff-color-rust-600) appears only as the 'flagged output' underline, nowhere else.
- **Transition in/out:** cut / dissolve
- **Overlay/text:** SIMULATED TEST SCENARIO — token: SIMULATED TEST SCENARIO (ff-label-simulated-test)
- **Source/context label requirement:** SIMULATED TRANSCRIPT, ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** SIMULATED TRANSCRIPT
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Illustrative reconstruction of a generic, unbranded message/email UI. Zero legible fabricated content, zero real usernames/company names/messages. SIMULATED TRANSCRIPT label required on screen. This is not a depiction of any real blackmail event or real breach.
- **Factual-sensitivity constraints:** Generic unbranded conceptual test transcript only — no real people, no real company, no real usernames, no real message content. Must not imply a real blackmail event.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real blackmail implication, no real people/company/usernames/messages, no dramatic zoom on 'shocking' text, no red alert flash, no thriller sting
- **Style token references:** ff-color-rust-600 (flagged-output underline ONLY, no other use), ff-font-mono, ff-color-amber-500 not used here (rust reserved)
- **Accessibility constraints:** Label must hold >=1.5s, 4.5:1 contrast; no flashing >3Hz (explicitly forbids any 'alert flash').
- **Quality-flag note:** footage/footage_manifest.json retains a historical LOW_RESOLUTION_REVIEW_REQUIRED flag from an earlier corrective batch; footage/scene_asset_map.json (current authoritative record) shows approved_for_final_edit=true, editorial_quality_approved=true, human_review_status=NOT_REQUIRED for this scene's current asset. Treat scene_asset_map.json as current.
- **Editor notes:** Highest-sensitivity reconstruction in the project (prompt_rules.md, graphic_style.md). Keep as a calm annotation of a test artifact, not a real event. No legible fabricated email content under any circumstance.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_005_e98a421f0d9c432e4d2036fb.mp4` (provider asset pixabay/1058) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Conceptual visualization only — a blurred, abstracted document/email UI with a highlighted 'flagged output' marker. This is the single most sensitive reconstruction in the project.
- **EDIT_TREATMENT_PROMPT:** Tight but calm framing on the abstracted document/email UI; no dramatic zoom. Static, tightened framing versus scene_004 — continuation of the same clinical grade (prompt_rules.md, visual_style_bible.md Section 12). Native speed. No speed ramping, no whip-zoom, no thriller sting. Grade to Group B register (clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)). Same clinical grade as scene_004; the rust accent (ff-color-rust-600) appears only as the 'flagged output' underline, nowhere else.
- **OVERLAY_PROMPT:** On-screen label SIMULATED TEST SCENARIO (ff-label-simulated-test) UI/data requirement: Illustrative reconstruction of a generic, unbranded message/email UI. Zero legible fabricated content, zero real usernames/company names/messages. SIMULATED TRANSCRIPT label required on screen. This is not a depiction of any real blackmail event or real breach.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real blackmail implication, no real people/company/usernames/messages, no dramatic zoom on 'shocking' text, no red alert flash, no thriller sting
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); LOW_RESOLUTION_REVIEW_REQUIRED historical flag (see quality-flag note above); no fabricated data, no new factual claim introduced by this stage.

## scene_006

- **scene_id:** scene_006
- **Timing/duration:** 111.254s – 140.034s (01:51.254 – 02:20.034), duration 28.780s
- **Narration intent:** voice_script.txt para 8-9: "None of this happened in the wild... the difference between a fire drill and a fire."
- **Narrative purpose:** Deliver the film's clarifying distinction: designed test vs. real-world incident (the 'fire drill' framing).
- **Storyboard visual need:** A literal, calm fire-drill/alarm-test visual as the narration's own metaphor — non-graphic, procedural, safety-drill imagery. (mood: reflective)
- **Effective media path (existing footage):** `assets/footage/scene_006_7e0d77fb76615c10d441204a.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pixabay / 15629
- **Existing footage treatment:** This is the narration's own metaphor rendered literally — non-graphic, procedural, safety-drill imagery, not a real emergency.
- **Framing/crop:** Medium/wide, procedural safety-drill framing.
- **Camera motion:** Calm, literal fire-drill/alarm-test coverage; people evacuating calmly, walking not running (character_style.md).
- **Playback speed:** Native speed, no ramping (panic-implying speed changes prohibited).
- **Color grade:** Group B register — clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)
- **Lighting/exposure:** Clinical ink/steel base; no red alarm-wash lighting despite the alarm subject matter.
- **Transition in/out:** dissolve / dissolve
- **Overlay/text:** DESIGNED TEST — NOT AN ACTUAL EVENT — token: DESIGNED TEST — NOT AN ACTUAL EVENT (ff-label-designed-test)
- **Source/context label requirement:** CONTROLLED EVALUATION
- **Conceptual/reconstruction marker:** CONTROLLED EVALUATION
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Designed test / metaphor only — not an actual event.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no panicked running, no real emergency implication
- **Style token references:** ff-color-amber-500 (label)
- **Accessibility constraints:** Label ff-label-designed-test must hold >=1.5s, 4.5:1 contrast.
- **Editor notes:** Delivers the film's fire-drill-vs-fire distinction; keep evacuation calm per character_style.md scene_006 note.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_006_7e0d77fb76615c10d441204a.mp4` (provider asset pixabay/15629) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — This is the narration's own metaphor rendered literally — non-graphic, procedural, safety-drill imagery, not a real emergency.
- **EDIT_TREATMENT_PROMPT:** Medium/wide, procedural safety-drill framing. Calm, literal fire-drill/alarm-test coverage; people evacuating calmly, walking not running (character_style.md). Native speed, no ramping (panic-implying speed changes prohibited). Grade to Group B register (clinical ink/steel/fog (ff-color-steel-600/ff-color-fog-400), amber label from scene_004 (ff-color-amber-500)). Clinical ink/steel base; no red alarm-wash lighting despite the alarm subject matter.
- **OVERLAY_PROMPT:** On-screen label DESIGNED TEST — NOT AN ACTUAL EVENT (ff-label-designed-test) UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no panicked running, no real emergency implication
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_007

- **scene_id:** scene_007
- **Timing/duration:** 140.034s – 158.075s (02:20.034 – 02:38.075), duration 18.041s
- **Narration intent:** voice_script.txt para 10: "The natural response is to ask why anyone would keep building..."
- **Narrative purpose:** Introduce the structural question of why labs keep building despite acknowledged risk.
- **Storyboard visual need:** Tense boardroom or strategy-meeting interior, generic/unbranded. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_007_6c8401e76cd6e2697fc70d7c.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 8170427
- **Existing footage treatment:** Generic/unbranded boardroom; landscape 3840x2160 asset (corrected from an earlier portrait selection per retrieval_report.md).
- **Framing/crop:** Tense boardroom/strategy-meeting interior; favor backs-of-heads/over-the-shoulder framing over identifiable close-up faces (character_style.md).
- **Camera motion:** Static or slow handheld, observational documentary feel (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Ink/steel base register.
- **Transition in/out:** dissolve / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** No real company/executives identified; generic professional figures only.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no identifiable real individual
- **Style token references:** ff-color-ink-950, ff-color-steel-600
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Landscape-adjusted asset supersedes an earlier portrait-orientation candidate (now quarantined per footage/retrieval_report.md cleanup note).
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_007_6c8401e76cd6e2697fc70d7c.mp4` (provider asset pexels/8170427) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Generic/unbranded boardroom; landscape 3840x2160 asset (corrected from an earlier portrait selection per retrieval_report.md).
- **EDIT_TREATMENT_PROMPT:** Tense boardroom/strategy-meeting interior; favor backs-of-heads/over-the-shoulder framing over identifiable close-up faces (character_style.md). Static or slow handheld, observational documentary feel (camera_language.md). Native speed, no ramping. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Ink/steel base register.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no identifiable real individual
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_008

- **scene_id:** scene_008
- **Timing/duration:** 158.075s – 178.693s (02:38.075 – 02:58.693), duration 20.618s
- **Narration intent:** voice_script.txt para 11: "Markets reward whoever ships the most capable model first..."
- **Narrative purpose:** Explain market and investor pressure driving the race between labs and states.
- **Storyboard visual need:** Stock-ticker style displays and a data-center scaling-up motif; abstract racing/overtaking visual motif. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_008_42946788405d61ee3a28fa31.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 7578632
- **Existing footage treatment:** Market-pressure beat; cross-cutting momentum without becoming frenetic.
- **Framing/crop:** Stock-ticker style display over/against data-center exterior; abstract racing/overtaking motif.
- **Camera motion:** Matched cut between ticker/graphic insert and data-center scaling-up footage (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Ink/steel base, amber accent reserved for label chips only (none in this scene).
- **Transition in/out:** cut / cut
- **Overlay/text:** none
- **Source/context label requirement:** GENERIC INTERFACE
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** Simple ticker-style bar/number display, generic/unbranded, two-series max per graphic_style.md conventions; no real company names, logos, or real ticker symbols.
- **UI reconstruction requirement:** NONE beyond the ticker graphic itself (illustrative, generic).
- **Factual-sensitivity constraints:** No real company names, logos, or real ticker symbols on screen.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real ticker symbol, no real company name
- **Style token references:** ff-color-viz-line-a, ff-color-viz-line-b, ff-color-viz-grid, ff-stroke-hairline
- **Accessibility constraints:** No flashing >3Hz in ticker animation.
- **Editor notes:** Matched cut to data-center scaling motif reinforces continuity of evidence across the film (camera_language.md cutting-rhythm).
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_008_42946788405d61ee3a28fa31.mp4` (provider asset pexels/7578632) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Market-pressure beat; cross-cutting momentum without becoming frenetic.
- **EDIT_TREATMENT_PROMPT:** Stock-ticker style display over/against data-center exterior; abstract racing/overtaking motif. Matched cut between ticker/graphic insert and data-center scaling-up footage (camera_language.md). Native speed, no ramping. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Ink/steel base, amber accent reserved for label chips only (none in this scene).
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: NONE beyond the ticker graphic itself (illustrative, generic).; Simple ticker-style bar/number display, generic/unbranded, two-series max per graphic_style.md conventions; no real company names, logos, or real ticker symbols.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real ticker symbol, no real company name
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_009

- **scene_id:** scene_009
- **Timing/duration:** 178.693s – 203.607s (02:58.693 – 03:23.607), duration 24.914s
- **Narration intent:** voice_script.txt para 12: "Late in 2025, a rival's model reportedly overtook one leading company's flagship..."
- **Narrative purpose:** Depict the specific reported overtaking-benchmark and CEO-emergency event as a real, hedged, reported occurrence.
- **Storyboard visual need:** Abstract benchmark leaderboard visual (generic bar chart, unbranded) shifting rank; newsroom-style ticker text conveying 'reportedly'. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_009_8366baffbbfa53ec1a18715e.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 38412247
- **Existing footage treatment:** Depict as a real, hedged, reported occurrence — 'reportedly' framing must be visually reinforced, not undercut.
- **Framing/crop:** Abstract benchmark leaderboard visual (generic bar chart, unbranded) shifting rank; newsroom-style ticker text.
- **Camera motion:** Matched cut, cross-cutting on the narration beat (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Ink/steel base, amber REPORTED label.
- **Transition in/out:** cut / dissolve
- **Overlay/text:** REPORTED — token: REPORTED (ff-label-reported)
- **Source/context label requirement:** GENERIC INTERFACE
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** Generic/unbranded leaderboard bars ranking shift; two-series max; carries ff-label-reported tag (graphic_style.md).
- **UI reconstruction requirement:** NONE beyond the leaderboard graphic itself.
- **Factual-sensitivity constraints:** Real, disclosed/reported event (rival model reportedly overtaking a flagship) — must stay hedged ('reportedly'); no real company names/logos.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real company name/logo, no false precision
- **Style token references:** ff-color-viz-line-a, ff-color-viz-line-b, ff-color-amber-500 (REPORTED label)
- **Accessibility constraints:** Label ff-label-reported must hold >=1.5s, 4.5:1 contrast.
- **Editor notes:** This is a real reported event (per storyboard/script), distinct from the earlier controlled-evaluation scenes — keep the REPORTED hedge visually explicit.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_009_8366baffbbfa53ec1a18715e.mp4` (provider asset pexels/38412247) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Depict as a real, hedged, reported occurrence — 'reportedly' framing must be visually reinforced, not undercut.
- **EDIT_TREATMENT_PROMPT:** Abstract benchmark leaderboard visual (generic bar chart, unbranded) shifting rank; newsroom-style ticker text. Matched cut, cross-cutting on the narration beat (camera_language.md). Native speed, no ramping. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Ink/steel base, amber REPORTED label.
- **OVERLAY_PROMPT:** On-screen label REPORTED (ff-label-reported) UI/data requirement: NONE beyond the leaderboard graphic itself.; Generic/unbranded leaderboard bars ranking shift; two-series max; carries ff-label-reported tag (graphic_style.md).
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real company name/logo, no false precision
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_010

- **scene_id:** scene_010
- **Timing/duration:** 203.607s – 210.051s (03:23.607 – 03:30.051), duration 6.444s
- **Narration intent:** voice_script.txt para 13: "Slowing down alone doesn't remove the risk..."
- **Narrative purpose:** Deliver the section's closing thesis line on why unilateral slowdown fails.
- **Storyboard visual need:** Short punchy visual: a single racer/vehicle motif overtaking, or a baton-handoff style abstraction implying 'ceding the lead'. (mood: somber)
- **Effective media path (existing footage):** `assets/footage/scene_010_6f7bc11f2a696985af0db15f.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 17026821
- **Existing footage treatment:** Section-closing thesis line ('Slowing down alone doesn't remove the risk') delivered on a held, uncomplicated visual.
- **Framing/crop:** Tight, brief connective-beat framing.
- **Camera motion:** Short, punchy held static beat; two abstract shapes only, no literal vehicle/runner rendering (graphic_style.md decelerate/overtake note).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Ink/steel base, somber mood.
- **Transition in/out:** dissolve / fade
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** Two abstract shapes, minimal detail, brief duration — no literal vehicle/runner.
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Purely abstract motif; no real-world entity implied.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no literal vehicle/runner rendering, no over-elaboration
- **Style token references:** ff-color-viz-line-a, ff-color-viz-line-b
- **Accessibility constraints:** No on-screen text this scene.
- **Resolution note:** Actual resolution 1280x720 (RENDITION_METADATA_MISMATCH vs. 1920x1080 staged, approval_basis=actual_ffprobe). Avoid aggressive crop/upscale; keep framing loose enough that 1280x720 source detail remains acceptable at delivery scale.
- **Editor notes:** Held, static hold for the interpretive thesis line — let a single line land without a cut (camera_language.md).
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_010_6f7bc11f2a696985af0db15f.mp4` (provider asset pexels/17026821) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Section-closing thesis line ('Slowing down alone doesn't remove the risk') delivered on a held, uncomplicated visual.
- **EDIT_TREATMENT_PROMPT:** Tight, brief connective-beat framing. Short, punchy held static beat; two abstract shapes only, no literal vehicle/runner rendering (graphic_style.md decelerate/overtake note). Native speed, no ramping. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Ink/steel base, somber mood.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none; Two abstract shapes, minimal detail, brief duration — no literal vehicle/runner.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no literal vehicle/runner rendering, no over-elaboration
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); RENDITION_METADATA_MISMATCH (see resolution note above); no fabricated data, no new factual claim introduced by this stage.

## scene_011

- **scene_id:** scene_011
- **Timing/duration:** 210.051s – 221.219s (03:30.051 – 03:41.219), duration 11.168s
- **Narration intent:** voice_script.txt para 14: "The deeper problem is that this competitive pressure..."
- **Narrative purpose:** Transition into the risk-spectrum sections: institutions can't absorb the pace.
- **Storyboard visual need:** Wide shot conveying institutional scale being outpaced — a large regulatory/government building against a fast-moving sky or traffic time-lapse. (mood: somber)
- **Effective media path (existing footage):** `assets/footage/scene_011_bff417a92fed9423fe0dd580.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pixabay / 21985
- **Existing footage treatment:** Transition into risk-spectrum sections; institutions outpaced by competitive pace.
- **Framing/crop:** Wide establishing, large regulatory/government building facade.
- **Camera motion:** Wide shot; institutional scale contrasted against a fast-moving sky/traffic time-lapse.
- **Playback speed:** Native speed for the building; the sky/traffic time-lapse element is the scene's own inherent motion, not an artificial speed ramp applied by the editor.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Ink/steel base, somber.
- **Transition in/out:** fade / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Generic/unbranded government building; no specific real institution named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no named real institution
- **Style token references:** ff-color-ink-950, ff-color-steel-600
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Reusable in-edit as one of the scene_001 supplemental cross-cut candidates per visual_style_bible.md Section 12.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_011_bff417a92fed9423fe0dd580.mp4` (provider asset pixabay/21985) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Transition into risk-spectrum sections; institutions outpaced by competitive pace.
- **EDIT_TREATMENT_PROMPT:** Wide establishing, large regulatory/government building facade. Wide shot; institutional scale contrasted against a fast-moving sky/traffic time-lapse. Native speed for the building; the sky/traffic time-lapse element is the scene's own inherent motion, not an artificial speed ramp applied by the editor. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Ink/steel base, somber.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no named real institution
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_012

- **scene_id:** scene_012
- **Timing/duration:** 221.219s – 254.724s (03:41.219 – 04:14.724), duration 33.505s
- **Narration intent:** voice_script.txt para 15: "In cybersecurity, AI has already lowered the barrier to entry..."
- **Narrative purpose:** Present the real, disclosed cyber-misuse case (coding-model-enabled extortion) as an actual reported incident.
- **Storyboard visual need:** A darkened analyst workstation with an abstract, non-literal security-dashboard UI (alerts, graphs) — no depiction of actual exploit code or technique. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_012_d356fd9efe14c61c8594ff1f.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pixabay / 3735
- **Existing footage treatment:** Present the real, disclosed cyber-misuse case as an actual reported incident — carry hedge language in prompt/direction notes even though it renders as an on-screen label (prompt_rules.md).
- **Framing/crop:** Darkened analyst workstation, medium/observational.
- **Camera motion:** Static or slow handheld, observational documentary feel (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Darker SOC treatment per color_palette.md Group C register.
- **Transition in/out:** cut / cut
- **Overlay/text:** DISCLOSED BY THE COMPANY — REPORTED INCIDENT — token: DISCLOSED BY THE COMPANY — REPORTED INCIDENT (ff-label-disclosed)
- **Source/context label requirement:** GENERIC INTERFACE, ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** Abstract, non-literal security-dashboard UI (alerts, graphs) — no depiction of actual exploit code or technique.
- **UI reconstruction requirement:** Illustrative reconstruction only, ff-font-mono readouts, no real usernames/logos/credentials. No operational cyber procedural detail (visual_style_bible.md Do/Don't matrix).
- **Factual-sensitivity constraints:** Real, disclosed, reported incident — 'company's own disclosure, not independently verified' hedge applies (carried by on-screen label ff-label-disclosed, not by this prompt's visual). No operational exploit detail.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no operational cyber/exploit detail
- **Style token references:** ff-color-amber-500 (DISCLOSED label), ff-font-mono
- **Accessibility constraints:** Label ff-label-disclosed must hold >=1.5s, 4.5:1 contrast.
- **Editor notes:** scene_024 will explicitly echo this SOC dashboard's UI treatment later in the film (graphic_style.md) — keep this scene's dashboard style consistent so that later callback reads correctly.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_012_d356fd9efe14c61c8594ff1f.mp4` (provider asset pixabay/3735) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Present the real, disclosed cyber-misuse case as an actual reported incident — carry hedge language in prompt/direction notes even though it renders as an on-screen label (prompt_rules.md).
- **EDIT_TREATMENT_PROMPT:** Darkened analyst workstation, medium/observational. Static or slow handheld, observational documentary feel (camera_language.md). Native speed, no ramping. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Darker SOC treatment per color_palette.md Group C register.
- **OVERLAY_PROMPT:** On-screen label DISCLOSED BY THE COMPANY — REPORTED INCIDENT (ff-label-disclosed) UI/data requirement: Illustrative reconstruction only, ff-font-mono readouts, no real usernames/logos/credentials. No operational cyber procedural detail (visual_style_bible.md Do/Don't matrix).; Abstract, non-literal security-dashboard UI (alerts, graphs) — no depiction of actual exploit code or technique.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no operational cyber/exploit detail
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_013

- **scene_id:** scene_013
- **Timing/duration:** 254.724s – 281.356s (04:14.724 – 04:41.356), duration 26.632s
- **Narration intent:** voice_script.txt para 16: "These are the company's own assessments of its own product's misuse..."
- **Narrative purpose:** Present the hedge (company's own assessment, not independently verified) and the balancing point that automation also helps defenders.
- **Storyboard visual need:** Split visual: the same SOC-style room reframed to show analysts actively investigating/defending, conveying balance rather than pure threat. (mood: neutral)
- **Effective media path (existing footage):** `assets/footage/scene_013_d8d3231e6f0b69b7def0fd48.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pixabay / 2176
- **Existing footage treatment:** Balancing point: automation also helps defenders; company's own assessment, not independently verified.
- **Framing/crop:** Same SOC-style room reframed to show analysts actively investigating/defending — split visual conveying balance.
- **Camera motion:** Static or slow handheld, observational documentary feel (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Neutral mood, same dark SOC register as scene_012 but reframed to convey active defense rather than pure threat.
- **Transition in/out:** cut / dissolve
- **Overlay/text:** COMPANY'S OWN ASSESSMENT — NOT INDEPENDENTLY VERIFIED — token: COMPANY'S OWN ASSESSMENT — NOT INDEPENDENTLY VERIFIED (ff-label-company-assessment)
- **Source/context label requirement:** GENERIC INTERFACE, ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** Abstract dashboard/graph elements only, consistent token set with scene_012.
- **UI reconstruction requirement:** Illustrative reconstruction, no real credentials/usernames/logos.
- **Factual-sensitivity constraints:** Company's own assessment of its own product's misuse — must carry 'not independently verified' hedge (on-screen label, not the visual itself).
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no overstatement of certainty beyond hedge
- **Style token references:** ff-color-amber-500 (COMPANY'S OWN ASSESSMENT label), ff-font-mono
- **Accessibility constraints:** Label ff-label-company-assessment must hold >=1.5s, 4.5:1 contrast.
- **Editor notes:** Same room as scene_012, reframed for balance — do not restage as a new location.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_013_d8d3231e6f0b69b7def0fd48.mp4` (provider asset pixabay/2176) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Balancing point: automation also helps defenders; company's own assessment, not independently verified.
- **EDIT_TREATMENT_PROMPT:** Same SOC-style room reframed to show analysts actively investigating/defending — split visual conveying balance. Static or slow handheld, observational documentary feel (camera_language.md). Native speed, no ramping. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Neutral mood, same dark SOC register as scene_012 but reframed to convey active defense rather than pure threat.
- **OVERLAY_PROMPT:** On-screen label COMPANY'S OWN ASSESSMENT — NOT INDEPENDENTLY VERIFIED (ff-label-company-assessment) UI/data requirement: Illustrative reconstruction, no real credentials/usernames/logos.; Abstract dashboard/graph elements only, consistent token set with scene_012.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no overstatement of certainty beyond hedge
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_014

- **scene_id:** scene_014
- **Timing/duration:** 281.356s – 301.545s (04:41.356 – 05:01.545), duration 20.189s
- **Narration intent:** voice_script.txt para 17: "On biological risk, the safety frameworks leading labs published in 2025..."
- **Narrative purpose:** Present the biological-risk capability-boost finding at a high, non-operational level.
- **Storyboard visual need:** Secure biosecurity-lab exterior only — cautious, non-graphic, no interior lab-procedure imagery. (mood: somber)
- **Effective media path (existing footage):** `assets/footage/scene_014_416086d1c7285d9e6a01fc67.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 13307522
- **Existing footage treatment:** High-level, non-operational framing of the biological-risk capability-boost finding.
- **Framing/crop:** Secure biosecurity-lab exterior only.
- **Camera motion:** Wide establishing, exterior-only; no interior lab movement (prompt_rules.md hard rule).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Somber, ink/steel base.
- **Transition in/out:** dissolve / fade
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Exterior-only; no depiction of any biological procedure or equipment; no operational bio/chem detail (prompt_rules.md Biological-risk scene note).
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no interior lab imagery, no biological/chemical procedural detail, no equipment depiction
- **Style token references:** ff-color-ink-950, ff-color-steel-600
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Hard stop condition: exterior-only, cautious, non-graphic — this is a project-wide non-negotiable rule (prompt_rules.md, visual_style_bible.md Section 15).
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_014_416086d1c7285d9e6a01fc67.mp4` (provider asset pexels/13307522) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — High-level, non-operational framing of the biological-risk capability-boost finding.
- **EDIT_TREATMENT_PROMPT:** Secure biosecurity-lab exterior only. Wide establishing, exterior-only; no interior lab movement (prompt_rules.md hard rule). Native speed, no ramping. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Somber, ink/steel base.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no interior lab imagery, no biological/chemical procedural detail, no equipment depiction
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_015

- **scene_id:** scene_015
- **Timing/duration:** 301.545s – 327.318s (05:01.545 – 05:27.318), duration 25.773s
- **Narration intent:** voice_script.txt para 18: "Beyond cyber and bio, the risk spreads into subtler territory..."
- **Narrative purpose:** Extend the risk spectrum to information-ecosystem and political-manipulation concerns.
- **Storyboard visual need:** A crowded, fast-scrolling social-media feed abstraction conveying volume and ambiguity, not any specific real platform or post. (mood: somber)
- **Effective media path (existing footage):** `assets/footage/scene_015_ed4bf30c1279d75b6cfe8187.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 35888104
- **Existing footage treatment:** Extend risk spectrum to information-ecosystem/political-manipulation concerns.
- **Framing/crop:** Crowded, fast-scrolling feed abstraction conveying volume and ambiguity.
- **Camera motion:** Static camera on a fast-scrolling social-media feed graphic abstraction.
- **Playback speed:** The scroll itself is the graphic's animation, not a footage speed ramp; scroll speed must not exceed 3Hz-equivalent flicker.
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Somber, ink/steel base.
- **Transition in/out:** fade / cut
- **Overlay/text:** none
- **Source/context label requirement:** GENERIC INTERFACE
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** NONE (feed abstraction, not a chart).
- **UI reconstruction requirement:** Illustrative reconstruction of a generic social feed — no specific real platform, no real post content, no real usernames/handles/logos.
- **Factual-sensitivity constraints:** Not any specific real platform or post; ambiguous/generic only.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real platform branding, no real post/usernames
- **Style token references:** ff-font-mono (feed micro-text), ff-color-steel-600
- **Accessibility constraints:** Scroll animation must not flicker faster than 3Hz.
- **Editor notes:** Convey volume/ambiguity, not a specific claim — no real platform ever identified.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_015_ed4bf30c1279d75b6cfe8187.mp4` (provider asset pexels/35888104) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Extend risk spectrum to information-ecosystem/political-manipulation concerns.
- **EDIT_TREATMENT_PROMPT:** Crowded, fast-scrolling feed abstraction conveying volume and ambiguity. Static camera on a fast-scrolling social-media feed graphic abstraction. The scroll itself is the graphic's animation, not a footage speed ramp; scroll speed must not exceed 3Hz-equivalent flicker. Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Somber, ink/steel base.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Illustrative reconstruction of a generic social feed — no specific real platform, no real post content, no real usernames/handles/logos.; NONE (feed abstraction, not a chart).
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real platform branding, no real post/usernames
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_016

- **scene_id:** scene_016
- **Timing/duration:** 327.318s – 362.971s (05:27.318 – 06:02.971), duration 35.653s
- **Narration intent:** voice_script.txt para 19: "Then there's work. Predictions here diverge sharply..."
- **Narrative purpose:** Present the two competing labor-market forecasts as forecasts, not established outcomes.
- **Storyboard visual need:** Split-screen graphic of two divergent projection curves, each explicitly labeled as a forecast, over a shot of quiet empty office desks at dusk. (mood: curious)
- **Effective media path (existing footage):** `assets/footage/scene_016_e324304f99b3502cad464d69.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 7947504
- **Existing footage treatment:** Present two competing labor-market forecasts as forecasts, not established outcomes; equal visual weight for both.
- **Framing/crop:** Split-screen: two divergent projection curves, each explicitly labeled as forecast.
- **Camera motion:** Static; split-screen graphic over a shot of quiet empty office desks at dusk.
- **Playback speed:** Native speed for the desks footage; graphic reveal uses ff-motion-slow (900ms).
- **Color grade:** Group C register — ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013
- **Lighting/exposure:** Curious mood, ink/steel base with dusk quality on the desks shot.
- **Transition in/out:** cut / dissolve
- **Overlay/text:** FORECAST — NOT A CONFIRMED OUTCOME — token: FORECAST — NOT A CONFIRMED OUTCOME (ff-label-forecast)
- **Source/context label requirement:** FORECAST / ESTIMATE
- **Conceptual/reconstruction marker:** FORECAST / ESTIMATE
- **Data visualization requirement:** Dashed-line styling explicit (ff-stroke-dashed-forecast), both competing projections at identical stroke weight/treatment — no favoring either, no solid/confirmed line style, no 'counting up' animation implying false precision (graphic_style.md).
- **UI reconstruction requirement:** NONE beyond the forecast chart itself.
- **Factual-sensitivity constraints:** Forecast/estimate only, not a confirmed outcome — carried by dashed line + explicit FORECAST label.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no solid/confirmed line style, no false precision, no favoring one forecast
- **Style token references:** ff-stroke-dashed-forecast, ff-color-viz-line-a, ff-color-viz-line-b, ff-color-amber-500 (FORECAST label)
- **Accessibility constraints:** Dash pattern plus explicit FORECAST text label (not color alone) so the uncertainty signal survives grayscale/colorblind viewing (visual_style_bible.md Section 14).
- **Editor notes:** The two forecast lines must render with identical stroke weight/treatment — this is a hard equal-weight rule, not a styling preference.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_016_e324304f99b3502cad464d69.mp4` (provider asset pexels/7947504) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Present two competing labor-market forecasts as forecasts, not established outcomes; equal visual weight for both.
- **EDIT_TREATMENT_PROMPT:** Split-screen: two divergent projection curves, each explicitly labeled as forecast. Static; split-screen graphic over a shot of quiet empty office desks at dusk. Native speed for the desks footage; graphic reveal uses ff-motion-slow (900ms). Grade to Group C register (ink/steel base, amber REPORTED/DISCLOSED/FORECAST labels (ff-color-amber-500), darker SOC treatment scene_012-013). Curious mood, ink/steel base with dusk quality on the desks shot.
- **OVERLAY_PROMPT:** On-screen label FORECAST — NOT A CONFIRMED OUTCOME (ff-label-forecast) UI/data requirement: NONE beyond the forecast chart itself.; Dashed-line styling explicit (ff-stroke-dashed-forecast), both competing projections at identical stroke weight/treatment — no favoring either, no solid/confirmed line style, no 'counting up' animation implying false precision (graphic_style.md).
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no solid/confirmed line style, no false precision, no favoring one forecast
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_017

- **scene_id:** scene_017
- **Timing/duration:** 362.971s – 391.321s (06:02.971 – 06:31.321), duration 28.350s
- **Narration intent:** voice_script.txt para 20: "The quieter risk may be the most durable one: concentration..."
- **Narrative purpose:** Introduce the concentration-of-power risk across models, compute, data, and infrastructure.
- **Storyboard visual need:** A network diagram animating many nodes converging into a small handful of central hubs. (mood: somber)
- **Effective media path (existing footage):** `assets/footage/scene_017_17388828bde9ac80bd22eb8e.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 30607101
- **Existing footage treatment:** Introduce concentration-of-power risk across models, compute, data, infrastructure.
- **Framing/crop:** Many nodes converging into a small handful of central hubs.
- **Camera motion:** Static camera on an animating network-diagram graphic.
- **Playback speed:** Graphic reveal at ff-motion-slow (900ms), ff-ease-out; minimum ff-motion-hold-min (1200ms) hold before cut.
- **Color grade:** Group D register — bureaucratic ink/steel, warming slightly by scene_021
- **Lighting/exposure:** Somber, ink/steel base.
- **Transition in/out:** dissolve / fade
- **Overlay/text:** none
- **Source/context label requirement:** GENERIC INTERFACE
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** Abstract circles/lines only; many small nodes animate into a handful of large central nodes; never label a node with a real company name (graphic_style.md).
- **UI reconstruction requirement:** NONE beyond the node diagram itself.
- **Factual-sensitivity constraints:** Abstract concentration motif only; no real company/entity named on any node.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real company name on any node
- **Style token references:** ff-color-viz-line-a, ff-color-viz-grid, ff-motion-slow, ff-ease-out, ff-motion-hold-min
- **Accessibility constraints:** No flashing >3Hz in node animation.
- **Editor notes:** Deliberately contrasts scene_029's static, equally-sized-nodes composition later in the film (graphic_style.md).
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_017_17388828bde9ac80bd22eb8e.mp4` (provider asset pexels/30607101) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Introduce concentration-of-power risk across models, compute, data, infrastructure.
- **EDIT_TREATMENT_PROMPT:** Many nodes converging into a small handful of central hubs. Static camera on an animating network-diagram graphic. Graphic reveal at ff-motion-slow (900ms), ff-ease-out; minimum ff-motion-hold-min (1200ms) hold before cut. Grade to Group D register (bureaucratic ink/steel, warming slightly by scene_021). Somber, ink/steel base.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: NONE beyond the node diagram itself.; Abstract circles/lines only; many small nodes animate into a handful of large central nodes; never label a node with a real company name (graphic_style.md).
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real company name on any node
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_018

- **scene_id:** scene_018
- **Timing/duration:** 391.321s – 411.510s (06:31.321 – 06:51.510), duration 20.189s
- **Narration intent:** voice_script.txt para 21: "Which brings us to the paradox at the center of this whole debate..."
- **Narrative purpose:** Introduce the control paradox: oversight requires an empowered administrator.
- **Storyboard visual need:** Bureaucratic-tense interior: a regulatory or legislative office setting, documents and stamps. (mood: tense)
- **Effective media path (existing footage):** `assets/footage/scene_018_f681c3057e36f147005d2652.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 7593780
- **Existing footage treatment:** Introduce the control paradox: oversight requires an empowered administrator.
- **Framing/crop:** Regulatory/legislative office setting; documents and stamps.
- **Camera motion:** Static, bureaucratic-tense interior.
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group D register — bureaucratic ink/steel, warming slightly by scene_021
- **Lighting/exposure:** Bureaucratic ink/steel register (Group D).
- **Transition in/out:** fade / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Illustrative reconstruction only if any document/checklist insert is used — no real agency seal/logo, no real form content.
- **Factual-sensitivity constraints:** Generic regulatory/legislative office; no specific real agency named or implied.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real government seal/logo
- **Style token references:** ff-color-steel-600, ff-color-fog-400
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Sets up the paradox the next several scenes (019-021) unpack concretely via the EU AI Act example.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_018_f681c3057e36f147005d2652.mp4` (provider asset pexels/7593780) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Introduce the control paradox: oversight requires an empowered administrator.
- **EDIT_TREATMENT_PROMPT:** Regulatory/legislative office setting; documents and stamps. Static, bureaucratic-tense interior. Native speed, no ramping. Grade to Group D register (bureaucratic ink/steel, warming slightly by scene_021). Bureaucratic ink/steel register (Group D).
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Illustrative reconstruction only if any document/checklist insert is used — no real agency seal/logo, no real form content.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real government seal/logo
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_019

- **scene_id:** scene_019
- **Timing/duration:** 411.510s – 432.988s (06:51.510 – 07:12.988), duration 21.478s
- **Narration intent:** voice_script.txt para 22: "Take Europe's AI Act. It requires makers of high-risk systems..."
- **Narrative purpose:** Explain the EU AI Act's compute-threshold mechanism as a concrete, real regulatory example.
- **Storyboard visual need:** European institutional architecture exterior, plus abstract regulatory paperwork imagery representing the compute-threshold rule. (mood: neutral)
- **Effective media path (existing footage):** `assets/footage/scene_019_bdc83a162db95b4b9eba43f9.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 18872181
- **Existing footage treatment:** Explain the EU AI Act's compute-threshold mechanism as a concrete, real regulatory example — this is a real, factual regulatory reference, not a reconstruction of a private event.
- **Framing/crop:** European institutional architecture exterior, plus abstract regulatory paperwork imagery.
- **Camera motion:** Slow tilt/pan on the institutional exterior facade (camera_language.md explicit example).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group D register — bureaucratic ink/steel, warming slightly by scene_021
- **Lighting/exposure:** Neutral, Group D bureaucratic register.
- **Transition in/out:** cut / cut
- **Overlay/text:** EU AI ACT — COMPUTE THRESHOLD — token: EU AI ACT — COMPUTE THRESHOLD (ff-label-regulation-real)
- **Source/context label requirement:** ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** ILLUSTRATIVE RECONSTRUCTION
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Abstract regulatory paperwork imagery representing the compute-threshold rule — illustrative reconstruction, no real form/document content rendered legibly.
- **Factual-sensitivity constraints:** EU AI Act compute-threshold mechanism is a real, named regulation per script/storyboard — this is the one scene where naming a real regulatory framework is explicitly authorized by the storyboard's own label (ff-label-regulation-real); do not extend this authorization to naming any other real company/government beyond what the script states.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no fabricated regulatory detail beyond what script/storyboard state
- **Style token references:** ff-color-amber-500 (EU AI ACT label), ff-font-mono (paperwork insert)
- **Accessibility constraints:** Label ff-label-regulation-real must hold >=1.5s, 4.5:1 contrast.
- **Resolution note:** Actual resolution 1280x720 (RENDITION_METADATA_MISMATCH vs. 1920x1080 staged, approval_basis=actual_ffprobe). Avoid aggressive crop/upscale; favor wide/medium framing over tight crops that would visibly soften.
- **Editor notes:** Actual resolution 1280x720 — see resolution note below; slow tilt/pan is the camera_language.md-specified movement for this exact shot.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_019_bdc83a162db95b4b9eba43f9.mp4` (provider asset pexels/18872181) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Explain the EU AI Act's compute-threshold mechanism as a concrete, real regulatory example — this is a real, factual regulatory reference, not a reconstruction of a private event.
- **EDIT_TREATMENT_PROMPT:** European institutional architecture exterior, plus abstract regulatory paperwork imagery. Slow tilt/pan on the institutional exterior facade (camera_language.md explicit example). Native speed, no ramping. Grade to Group D register (bureaucratic ink/steel, warming slightly by scene_021). Neutral, Group D bureaucratic register.
- **OVERLAY_PROMPT:** On-screen label EU AI ACT — COMPUTE THRESHOLD (ff-label-regulation-real) UI/data requirement: Abstract regulatory paperwork imagery representing the compute-threshold rule — illustrative reconstruction, no real form/document content rendered legibly.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no fabricated regulatory detail beyond what script/storyboard state
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); RENDITION_METADATA_MISMATCH (see resolution note above); no fabricated data, no new factual claim introduced by this stage.

## scene_020

- **scene_id:** scene_020
- **Timing/duration:** 432.988s – 452.318s (07:12.988 – 07:32.318), duration 19.330s
- **Narration intent:** voice_script.txt para 23: "Established companies may also be better able to absorb..."
- **Narrative purpose:** Explain how compliance costs may structurally favor large incumbents.
- **Storyboard visual need:** A large, established company's data-center campus exterior next to a stack of compliance paperwork, implying scale advantage. (mood: somber)
- **Effective media path (existing footage):** `assets/footage/scene_020_820a251a5b10ad8f5a63266f.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 7735823
- **Existing footage treatment:** Explain how compliance costs may structurally favor large incumbents.
- **Framing/crop:** Large established company's data-center campus exterior + compliance paperwork stack.
- **Camera motion:** Static/slow push on a large data-center campus exterior next to a stack of compliance paperwork.
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group D register — bureaucratic ink/steel, warming slightly by scene_021
- **Lighting/exposure:** Somber, Group D register.
- **Transition in/out:** cut / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Illustrative reconstruction only for the paperwork stack insert — no real company name/logo on the campus or paperwork.
- **Factual-sensitivity constraints:** Generic/unbranded 'large established company' — no specific real company named or implied.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real company name/logo
- **Style token references:** ff-color-steel-600
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Keep the campus generic even though the narration implies a specific class of large incumbent.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_020_820a251a5b10ad8f5a63266f.mp4` (provider asset pexels/7735823) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Explain how compliance costs may structurally favor large incumbents.
- **EDIT_TREATMENT_PROMPT:** Large established company's data-center campus exterior + compliance paperwork stack. Static/slow push on a large data-center campus exterior next to a stack of compliance paperwork. Native speed, no ramping. Grade to Group D register (bureaucratic ink/steel, warming slightly by scene_021). Somber, Group D register.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Illustrative reconstruction only for the paperwork stack insert — no real company name/logo on the campus or paperwork.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real company name/logo
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_021

- **scene_id:** scene_021
- **Timing/duration:** 452.318s – 472.506s (07:32.318 – 07:52.506), duration 20.188s
- **Narration intent:** voice_script.txt para 24: "That's not an argument against regulation..."
- **Narrative purpose:** Deliver the balanced caveat: this isn't an argument against regulation, only for scrutiny of who writes the rules.
- **Storyboard visual need:** Reflective transition shot — empty legislative chamber or hearing room, calm. (mood: reflective)
- **Effective media path (existing footage):** `assets/footage/scene_021_d2e9e57773ef446f8e402456.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 4474271
- **Existing footage treatment:** Deliver the balanced caveat: not an argument against regulation, only for scrutiny of who writes the rules.
- **Framing/crop:** Empty legislative chamber or hearing room, calm.
- **Camera motion:** Static hold; reflective transition shot (camera_language.md 'scene_021's caveat' held-static example).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group D register — bureaucratic ink/steel, warming slightly by scene_021
- **Lighting/exposure:** Reflective mood, Group D warming slightly.
- **Transition in/out:** cut / dissolve
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Generic legislative/hearing room; no real government body named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real government seal/name
- **Style token references:** ff-color-fog-400
- **Accessibility constraints:** No on-screen text this scene.
- **Resolution note:** Actual resolution 1280x720 (RENDITION_METADATA_MISMATCH vs. 1920x1080 staged, approval_basis=actual_ffprobe). Avoid aggressive crop/upscale; this is a held caveat shot so keep the frame static and loose rather than punching in.
- **Editor notes:** Held static for the caveat line to land without a cut, matching scene_002/scene_010's held-line treatment.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_021_d2e9e57773ef446f8e402456.mp4` (provider asset pexels/4474271) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Deliver the balanced caveat: not an argument against regulation, only for scrutiny of who writes the rules.
- **EDIT_TREATMENT_PROMPT:** Empty legislative chamber or hearing room, calm. Static hold; reflective transition shot (camera_language.md 'scene_021's caveat' held-static example). Native speed, no ramping. Grade to Group D register (bureaucratic ink/steel, warming slightly by scene_021). Reflective mood, Group D warming slightly.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real government seal/name
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); RENDITION_METADATA_MISMATCH (see resolution note above); no fabricated data, no new factual claim introduced by this stage.

## scene_022

- **scene_id:** scene_022
- **Timing/duration:** 472.506s – 492.266s (07:52.506 – 08:12.266), duration 19.760s
- **Narration intent:** voice_script.txt para 25: "That tension sharpens further around one of the field's most contested questions..."
- **Narrative purpose:** Frame the open-weight versus closed-model question the film will treat evenhandedly.
- **Storyboard visual need:** Establish the split visual motif that will recur: an open code repository on one side, a locked vault/restricted terminal on the other — introduced neutrally, without favoring either side. (mood: curious)
- **Effective media path (existing footage):** `assets/footage/scene_022_740741da33e14d6a45468490.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 6804117
- **Existing footage treatment:** Introduce the split visual motif that will recur (scene_025 bookend) — introduced neutrally, without favoring either side.
- **Framing/crop:** Perfectly symmetrical split-frame: open code repository (left) vs. locked vault/restricted terminal (right), equal in size, brightness, and detail level (graphic_style.md).
- **Camera motion:** Symmetrical static composition — the one shot type in the film built to encode meaning through composition itself (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group E register — perfectly symmetrical neutral ink/steel, no side favors either accent
- **Lighting/exposure:** Perfectly symmetrical neutral ink/steel (Group E); identical lighting/detail on both halves.
- **Transition in/out:** dissolve / cut
- **Overlay/text:** none
- **Source/context label requirement:** GENERIC INTERFACE, ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Illustrative reconstruction: open-repository interface (left) and locked-vault/restricted-terminal interface (right); no real repo names, no real usernames/credentials.
- **Factual-sensitivity constraints:** Neutral framing of the open-vs-closed debate; no favoring of either side; no real product/repo named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no asymmetry favoring open or closed, no real repo/product name
- **Style token references:** ff-font-mono, ff-color-steel-600, ff-radius-none (data panel)
- **Accessibility constraints:** No on-screen text this scene (storyboard specifies none).
- **Editor notes:** Establishes the bookend pair with scene_025 (same physical asset per footage_manifest.json asset_role=canonical / reuse). Transition: dissolve in, cut out per storyboard.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_022_740741da33e14d6a45468490.mp4` (provider asset pexels/6804117) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Introduce the split visual motif that will recur (scene_025 bookend) — introduced neutrally, without favoring either side.
- **EDIT_TREATMENT_PROMPT:** Perfectly symmetrical split-frame: open code repository (left) vs. locked vault/restricted terminal (right), equal in size, brightness, and detail level (graphic_style.md). Symmetrical static composition — the one shot type in the film built to encode meaning through composition itself (camera_language.md). Native speed, no ramping. Grade to Group E register (perfectly symmetrical neutral ink/steel, no side favors either accent). Perfectly symmetrical neutral ink/steel (Group E); identical lighting/detail on both halves.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Illustrative reconstruction: open-repository interface (left) and locked-vault/restricted-terminal interface (right); no real repo names, no real usernames/credentials.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no asymmetry favoring open or closed, no real repo/product name
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_023

- **scene_id:** scene_023
- **Timing/duration:** 492.266s – 520.187s (08:12.266 – 08:40.187), duration 27.921s
- **Narration intent:** voice_script.txt para 26: "Neither side has a clean claim to safety. Open-weight models let independent researchers audit them..."
- **Narrative purpose:** Present the case for open-weight models: independent audit and defensive tool-building.
- **Storyboard visual need:** Left half of the split motif brought forward: independent researchers working with an open repository interface. (mood: curious)
- **Effective media path (existing footage):** `assets/footage/scene_023_dbe758e1473aee29a155377a.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 853919
- **Existing footage treatment:** Present the case for open-weight models: independent audit and defensive tool-building.
- **Framing/crop:** Independent researchers working with an open-repository interface.
- **Camera motion:** Cut in/cut out; left half of the split motif brought forward.
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group E register — perfectly symmetrical neutral ink/steel, no side favors either accent
- **Lighting/exposure:** Group E neutral register, curious mood.
- **Transition in/out:** cut / cut
- **Overlay/text:** none
- **Source/context label requirement:** GENERIC INTERFACE
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Illustrative open-repository interface; no real repo/product names.
- **Factual-sensitivity constraints:** Neither side has a clean claim to safety (per script) — present open-weight case fairly, without overstating.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real repo/product name
- **Style token references:** ff-font-mono, ff-color-steel-600
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Balances against scene_024's closed-model case; keep visual weight comparable.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_023_dbe758e1473aee29a155377a.mp4` (provider asset pexels/853919) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Present the case for open-weight models: independent audit and defensive tool-building.
- **EDIT_TREATMENT_PROMPT:** Independent researchers working with an open-repository interface. Cut in/cut out; left half of the split motif brought forward. Native speed, no ramping. Grade to Group E register (perfectly symmetrical neutral ink/steel, no side favors either accent). Group E neutral register, curious mood.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Illustrative open-repository interface; no real repo/product names.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real repo/product name
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_024

- **scene_id:** scene_024
- **Timing/duration:** 520.187s – 548.537s (08:40.187 – 09:08.537), duration 28.350s
- **Narration intent:** voice_script.txt para 27: "Closed models let a company monitor, restrict, and shut down misuse in real time..."
- **Narrative purpose:** Present the case for closed models, including the real disclosed misuse cases as counter-evidence that centralization didn't prevent harm.
- **Storyboard visual need:** Right half of the split motif brought forward: a monitored, restricted-access terminal, referencing back to the same two real cyber cases shown earlier. (mood: somber)
- **Effective media path (existing footage):** `assets/footage/scene_024_6e6f4af26cad60cc78930d6d.mp4` (project-relative path, no URL)
- **Asset role:** primary
- **Provider / provider asset ID:** pexels / 7255101
- **Existing footage treatment:** Present the case for closed models, including the real disclosed misuse cases as counter-evidence that centralization didn't prevent harm.
- **Framing/crop:** Monitored, restricted-access terminal, referencing back to the same two real cyber cases shown earlier.
- **Camera motion:** Cut in/cut out; right half of the split motif brought forward. Explicitly echoes scene_012's SOC dashboard UI treatment, not just its palette (graphic_style.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group E register — perfectly symmetrical neutral ink/steel, no side favors either accent
- **Lighting/exposure:** Group E neutral register, somber mood.
- **Transition in/out:** cut / cut
- **Overlay/text:** SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED — token: SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED (ff-label-same-incident-callback)
- **Source/context label requirement:** GENERIC INTERFACE, ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Same UI treatment as scene_012's SOC dashboard (illustrative reconstruction), reused deliberately so the callback reads as 'the same real case' (graphic_style.md).
- **Factual-sensitivity constraints:** SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED; must carry hedge language ('company's own disclosure, not independently verified') consistent with scene_012/013; no operational cyber detail.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no operational cyber/exploit detail, no new claim beyond scene_012/013
- **Style token references:** ff-color-amber-500 (callback label), ff-font-mono
- **Accessibility constraints:** Label ff-label-same-incident-callback must hold >=1.5s, 4.5:1 contrast.
- **Resolution note:** Actual resolution 2732x1440 (RENDITION_METADATA_MISMATCH vs. 4096x2160 staged, approval_basis=actual_ffprobe). Still comfortably above delivery resolution; normal crop tolerance applies.
- **Editor notes:** Actual resolution 2732x1440 (see resolution note). Must visually echo scene_012's exact SOC UI style, not merely its color palette.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_024_6e6f4af26cad60cc78930d6d.mp4` (provider asset pexels/7255101) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Present the case for closed models, including the real disclosed misuse cases as counter-evidence that centralization didn't prevent harm.
- **EDIT_TREATMENT_PROMPT:** Monitored, restricted-access terminal, referencing back to the same two real cyber cases shown earlier. Cut in/cut out; right half of the split motif brought forward. Explicitly echoes scene_012's SOC dashboard UI treatment, not just its palette (graphic_style.md). Native speed, no ramping. Grade to Group E register (perfectly symmetrical neutral ink/steel, no side favors either accent). Group E neutral register, somber mood.
- **OVERLAY_PROMPT:** On-screen label SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED (ff-label-same-incident-callback) UI/data requirement: Same UI treatment as scene_012's SOC dashboard (illustrative reconstruction), reused deliberately so the callback reads as 'the same real case' (graphic_style.md).
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no operational cyber/exploit detail, no new claim beyond scene_012/013
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); RENDITION_METADATA_MISMATCH (see resolution note above); no fabricated data, no new factual claim introduced by this stage.

## scene_025

- **scene_id:** scene_025
- **Timing/duration:** 548.537s – 564.001s (09:08.537 – 09:24.001), duration 15.464s
- **Narration intent:** voice_script.txt para 28: "Openness spreads capability — and risk — outward..."
- **Narrative purpose:** Close the open/closed subsection with the balanced 'no simply safe option' conclusion.
- **Storyboard visual need:** Return to the symmetrical split-frame composition from scene 22, now settled/static, to bookend the subsection. (mood: reflective)
- **Effective media path (existing footage):** `assets/footage/scene_022_740741da33e14d6a45468490.mp4` (project-relative path, no URL)
- **Asset role:** reuse
- **Provider / provider asset ID:** pexels / 6804117
- **Existing footage treatment:** Close the open/closed subsection with the balanced 'no simply safe option' conclusion. Effective media and provider asset are identical to scene_022 by design (deliberate bookend reuse, not an error).
- **Framing/crop:** reuse_of_scene=scene_022. Marginally tighter static crop on the same symmetrical split-frame than scene_022's fuller framing (allowed variance per visual_style_bible.md Section 12); left/right balance must not shift.
- **Camera motion:** Symmetrical static composition, held/settled — return to scene_022's split-frame, now static rather than freshly establishing (camera_language.md, visual_style_bible.md Section 12).
- **Playback speed:** Native speed, no ramping; held static rather than scene_022's push-in-adjacent introduction.
- **Color grade:** Group E register — perfectly symmetrical neutral ink/steel, no side favors either accent
- **Lighting/exposure:** Identical symmetrical neutral ink/steel to scene_022; may carry a marginally heavier scrim (ff-overlay-scrim-low toward ff-overlay-scrim-high) to signal closure, per visual_style_bible.md Section 12 — must not introduce new on-screen text or shift left/right balance.
- **Transition in/out:** dissolve / fade
- **Overlay/text:** none
- **Source/context label requirement:** GENERIC INTERFACE, ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Same open-repository/locked-vault illustrative reconstruction as scene_022 (reuse_of_scene=scene_022); no new UI content introduced.
- **Factual-sensitivity constraints:** reuse_of_scene=scene_022 — deliberate structural bookend per footage/footage_manifest.json (asset_role: reuse, reuse_of_scene: scene_022) and footage/scene_asset_map.json (canonical_asset_path=assets/footage/scene_022_740741da33e14d6a45468490.mp4). Do not source a different clip. No on-screen text (storyboard specifies none); balance must remain identical in substance to scene_022.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no new on-screen text, no left/right balance shift, no different clip substituted
- **Style token references:** ff-overlay-scrim-low, ff-overlay-scrim-high (closure-only variation), ff-font-mono
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Vary crop/timing/overlay-scrim only, per visual_style_bible.md Section 12, to reduce an identical-repeat feel without altering meaning: tighter static crop, slower fade exit (vs. scene_022's cut exit), marginally heavier scrim. reuse_of_scene=scene_022.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_022_740741da33e14d6a45468490.mp4` (provider asset pexels/6804117) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Close the open/closed subsection with the balanced 'no simply safe option' conclusion. Effective media and provider asset are identical to scene_022 by design (deliberate bookend reuse, not an error).
- **EDIT_TREATMENT_PROMPT:** reuse_of_scene=scene_022. Marginally tighter static crop on the same symmetrical split-frame than scene_022's fuller framing (allowed variance per visual_style_bible.md Section 12); left/right balance must not shift. Symmetrical static composition, held/settled — return to scene_022's split-frame, now static rather than freshly establishing (camera_language.md, visual_style_bible.md Section 12). Native speed, no ramping; held static rather than scene_022's push-in-adjacent introduction. Grade to Group E register (perfectly symmetrical neutral ink/steel, no side favors either accent). Identical symmetrical neutral ink/steel to scene_022; may carry a marginally heavier scrim (ff-overlay-scrim-low toward ff-overlay-scrim-high) to signal closure, per visual_style_bible.md Section 12 — must not introduce new on-screen text or shift left/right balance.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Same open-repository/locked-vault illustrative reconstruction as scene_022 (reuse_of_scene=scene_022); no new UI content introduced.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no new on-screen text, no left/right balance shift, no different clip substituted
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); reuse_of_scene=scene_022; no fabricated data, no new factual claim introduced by this stage.

## scene_026

- **scene_id:** scene_026
- **Timing/duration:** 564.001s – 572.162s (09:24.001 – 09:32.162), duration 8.161s
- **Narration intent:** voice_script.txt para 29: "None of this argues for doing nothing..."
- **Narrative purpose:** Transition into the safeguards section: precision, not paralysis.
- **Storyboard visual need:** Brief calm connective shot — daylight office or research setting, resolute but unhurried. (mood: calm)
- **Effective media path (existing footage):** `assets/footage/scene_026_8a460acd7183fb80baaa455e.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 33810505
- **Existing footage treatment:** Transition into the safeguards section: precision, not paralysis.
- **Framing/crop:** Daylight office or research setting.
- **Camera motion:** Brief calm connective shot, daylight, resolute but unhurried.
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group F register — ink/steel lifted toward ff-color-gold-400 warmth
- **Lighting/exposure:** Ink/steel lifted toward ff-color-gold-400 warmth (Group F begins).
- **Transition in/out:** fade / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Generic daylight office/research setting; no real institution named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real institution named
- **Style token references:** ff-color-gold-400
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Short connective beat (8.2s) — brief by design, do not pad.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_026_8a460acd7183fb80baaa455e.mp4` (provider asset pexels/33810505) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Transition into the safeguards section: precision, not paralysis.
- **EDIT_TREATMENT_PROMPT:** Daylight office or research setting. Brief calm connective shot, daylight, resolute but unhurried. Native speed, no ramping. Grade to Group F register (ink/steel lifted toward ff-color-gold-400 warmth). Ink/steel lifted toward ff-color-gold-400 warmth (Group F begins).
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real institution named
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_027

- **scene_id:** scene_027
- **Timing/duration:** 572.162s – 601.801s (09:32.162 – 10:01.801), duration 29.639s
- **Narration intent:** voice_script.txt para 30-31: "Some of it is technical... Some of it is procedural..."
- **Narrative purpose:** Present technical and procedural safeguards: constrained design, independent audits, incident reporting, whistleblower protection.
- **Storyboard visual need:** Auditors/researchers reviewing documents and evaluation results calmly and collaboratively. (mood: calm)
- **Effective media path (existing footage):** `assets/footage/scene_027_57a43a4f4b65321112dfb0bf.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 7579340
- **Existing footage treatment:** Present technical/procedural safeguards: constrained design, independent audits, incident reporting, whistleblower protection. Warmest, most human-positive framing in the film (character_style.md).
- **Framing/crop:** Auditors/researchers reviewing documents and evaluation results, collaboratively.
- **Camera motion:** Static or slow handheld, 'observational documentary feel' (camera_language.md explicit example for this scene).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group F register — ink/steel lifted toward ff-color-gold-400 warmth
- **Lighting/exposure:** Group F warm register (ff-color-gold-400).
- **Transition in/out:** cut / cut
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Illustrative reconstruction only if a compliance-report/checklist insert is used — generic, no real institution name.
- **Factual-sensitivity constraints:** Generic auditors/researchers; no real institution or individual named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real institution/individual named
- **Style token references:** ff-color-gold-400
- **Accessibility constraints:** No on-screen text this scene.
- **Editor notes:** Marks the pivot from critique to constructive proposal — keep collaborative, unhurried tone (character_style.md).
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_027_57a43a4f4b65321112dfb0bf.mp4` (provider asset pexels/7579340) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Present technical/procedural safeguards: constrained design, independent audits, incident reporting, whistleblower protection. Warmest, most human-positive framing in the film (character_style.md).
- **EDIT_TREATMENT_PROMPT:** Auditors/researchers reviewing documents and evaluation results, collaboratively. Static or slow handheld, 'observational documentary feel' (camera_language.md explicit example for this scene). Native speed, no ramping. Grade to Group F register (ink/steel lifted toward ff-color-gold-400 warmth). Group F warm register (ff-color-gold-400).
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Illustrative reconstruction only if a compliance-report/checklist insert is used — generic, no real institution name.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real institution/individual named
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_028

- **scene_id:** scene_028
- **Timing/duration:** 601.801s – 630.581s (10:01.801 – 10:30.581), duration 28.780s
- **Narration intent:** voice_script.txt para 32: "Some of it is structural: governing access to the enormous computing clusters..."
- **Narrative purpose:** Present structural safeguards: compute governance, independent researcher access, cross-border verification.
- **Storyboard visual need:** A legislative chamber in session, plus an abstract compute-cluster oversight visual. (mood: calm)
- **Effective media path (existing footage):** `assets/footage/scene_028_d4c7a6d60c700cc3f1dddeff.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 6952221
- **Existing footage treatment:** Present structural safeguards: compute governance, independent researcher access, cross-border verification.
- **Framing/crop:** Legislative chamber in session, plus an abstract compute-cluster oversight visual.
- **Camera motion:** Slow tilt/pan on the legislative chamber (camera_language.md 'scene_028's chamber pan' explicit example).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group F register — ink/steel lifted toward ff-color-gold-400 warmth
- **Lighting/exposure:** Group F warm register.
- **Transition in/out:** cut / cut
- **Overlay/text:** none
- **Source/context label requirement:** ILLUSTRATIVE RECONSTRUCTION
- **Conceptual/reconstruction marker:** ILLUSTRATIVE RECONSTRUCTION
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** Abstract compute-cluster oversight visual — illustrative reconstruction, no real facility/company named.
- **Factual-sensitivity constraints:** Generic legislative chamber; no real government body named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real government body named
- **Style token references:** ff-color-gold-400, ff-font-mono
- **Accessibility constraints:** No on-screen text this scene.
- **Resolution note:** Actual resolution 2560x1440 (RENDITION_METADATA_MISMATCH vs. 3840x2160 staged, approval_basis=actual_ffprobe). Above delivery resolution; normal crop tolerance applies.
- **Editor notes:** Actual resolution 2560x1440 (see resolution note) — comfortably above delivery resolution.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_028_d4c7a6d60c700cc3f1dddeff.mp4` (provider asset pexels/6952221) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Present structural safeguards: compute governance, independent researcher access, cross-border verification.
- **EDIT_TREATMENT_PROMPT:** Legislative chamber in session, plus an abstract compute-cluster oversight visual. Slow tilt/pan on the legislative chamber (camera_language.md 'scene_028's chamber pan' explicit example). Native speed, no ramping. Grade to Group F register (ink/steel lifted toward ff-color-gold-400 warmth). Group F warm register.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Abstract compute-cluster oversight visual — illustrative reconstruction, no real facility/company named.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real government body named
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); RENDITION_METADATA_MISMATCH (see resolution note above); no fabricated data, no new factual claim introduced by this stage.

## scene_029

- **scene_id:** scene_029
- **Timing/duration:** 630.581s – 652.918s (10:30.581 – 10:52.918), duration 22.337s
- **Narration intent:** voice_script.txt para 33: "And some of it is about power itself: keeping enough competition..."
- **Narrative purpose:** Present the safeguard aimed at power itself: competition and sunset clauses against permanent concentration.
- **Storyboard visual need:** A visual motif of ongoing review/renewal — a document with a visible 'review date' or sunset-clause marker, plus a market with multiple competing players (not one dominant entity). (mood: hopeful)
- **Effective media path (existing footage):** `assets/footage/scene_029_94d5bdac38165c3c273344f7.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 8134446
- **Existing footage treatment:** Present the safeguard aimed at power itself: competition and sunset clauses against permanent concentration.
- **Framing/crop:** Document with a visible 'review date'/sunset-clause marker, plus a market with multiple competing players.
- **Camera motion:** Static; several equally-sized nodes, deliberately contrasting scene_017's convergence (graphic_style.md).
- **Playback speed:** Graphic reveal at ff-motion-slow (900ms); static hold, no convergence animation (deliberately unlike scene_017).
- **Color grade:** Group F register — ink/steel lifted toward ff-color-gold-400 warmth
- **Lighting/exposure:** Group F warm register, hopeful mood.
- **Transition in/out:** cut / dissolve
- **Overlay/text:** none
- **Source/context label requirement:** GENERIC INTERFACE
- **Conceptual/reconstruction marker:** GENERIC INTERFACE
- **Data visualization requirement:** Several equally-sized, static nodes — never label a node with a real company name; deliberately contrasts scene_017's many-small-to-few-large convergence.
- **UI reconstruction requirement:** Illustrative document insert for the sunset-clause/review-date marker — no real document content.
- **Factual-sensitivity constraints:** Abstract competition/sunset-clause motif only; no real company/entity named.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no real company name on any node
- **Style token references:** ff-color-viz-line-a, ff-color-viz-grid, ff-color-gold-400
- **Accessibility constraints:** No flashing >3Hz.
- **Editor notes:** Static, equally-sized nodes is the deliberate visual contrast to scene_017's concentration animation — do not reuse scene_017's convergence motion here.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_029_94d5bdac38165c3c273344f7.mp4` (provider asset pexels/8134446) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Present the safeguard aimed at power itself: competition and sunset clauses against permanent concentration.
- **EDIT_TREATMENT_PROMPT:** Document with a visible 'review date'/sunset-clause marker, plus a market with multiple competing players. Static; several equally-sized nodes, deliberately contrasting scene_017's convergence (graphic_style.md). Graphic reveal at ff-motion-slow (900ms); static hold, no convergence animation (deliberately unlike scene_017). Grade to Group F register (ink/steel lifted toward ff-color-gold-400 warmth). Group F warm register, hopeful mood.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: Illustrative document insert for the sunset-clause/review-date marker — no real document content.; Several equally-sized, static nodes — never label a node with a real company name; deliberately contrasts scene_017's many-small-to-few-large convergence.
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no real company name on any node
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_030

- **scene_id:** scene_030
- **Timing/duration:** 652.918s – 659.361s (10:52.918 – 10:59.361), duration 6.443s
- **Narration intent:** voice_script.txt para 34-35: "So what happens when the race outpaces our ability to govern it? Maybe nothing sudden."
- **Narrative purpose:** Open the closing movement with the film's final question and its quiet, non-catastrophic answer.
- **Storyboard visual need:** Wide shot of a city at dusk beginning to settle — calm, unhurried, first breath of the reflective close. (mood: reflective)
- **Effective media path (existing footage):** `assets/footage/scene_030_3bee64eb585a0f8f6b6895c0.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 35581160
- **Existing footage treatment:** Open the closing movement: the film's final question and its quiet, non-catastrophic answer.
- **Framing/crop:** Widest establishing skyline crop of the four closing scenes (visual_style_bible.md Section 12 crop guidance).
- **Camera motion:** Near-static hold, minimal drift only — camera stillness as deliberate pacing signal (camera_language.md).
- **Playback speed:** Native speed, no ramping; slowest rhythm in the film begins here.
- **Color grade:** Group G register — ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033
- **Lighting/exposure:** Group G warm dusk register (ff-color-coral-500), settling.
- **Transition in/out:** fade / dissolve
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Quiet human silhouettes/environment only — no rogue-machine or robot imagery (visual_style_bible.md Do/Don't matrix).
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no rogue-machine/robot-takeover imagery
- **Style token references:** ff-color-coral-500
- **Accessibility constraints:** No on-screen text (deliberate silence, per visual_style_bible.md Section 12 text-density note).
- **Editor notes:** Distinct crop/hold/motion-density/text-density/transition from scene_031-033 to avoid monotony across the closing sequence (visual_style_bible.md Section 12): widest crop, shortest duration (6.4s) of the four, fade-in/dissolve-out.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_030_3bee64eb585a0f8f6b6895c0.mp4` (provider asset pexels/35581160) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Open the closing movement: the film's final question and its quiet, non-catastrophic answer.
- **EDIT_TREATMENT_PROMPT:** Widest establishing skyline crop of the four closing scenes (visual_style_bible.md Section 12 crop guidance). Near-static hold, minimal drift only — camera stillness as deliberate pacing signal (camera_language.md). Native speed, no ramping; slowest rhythm in the film begins here. Grade to Group G register (ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033). Group G warm dusk register (ff-color-coral-500), settling.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no rogue-machine/robot-takeover imagery
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_031

- **scene_id:** scene_031
- **Timing/duration:** 659.361s – 684.275s (10:59.361 – 11:24.275), duration 24.914s
- **Narration intent:** voice_script.txt para 36: "No single machine seizing control, no one moment of collapse..."
- **Narrative purpose:** Convey the film's core closing idea: risk accumulates through many small decisions, not a single dramatic event.
- **Storyboard visual need:** Screens dimming one by one across a cityscape or office building, quiet contemplative human silhouettes. (mood: reflective)
- **Effective media path (existing footage):** `assets/footage/scene_031_12e168b42df0ef02be3b9707.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 36926169
- **Existing footage treatment:** Convey the film's core closing idea: risk accumulates through many small decisions, not a single dramatic event.
- **Framing/crop:** Tightens toward office-tower windows with a single silhouette (visual_style_bible.md Section 12 crop guidance) — distinct from scene_030's wide skyline and scene_032's darker tight hold.
- **Camera motion:** Near-static hold, minimal drift only (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group G register — ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033
- **Lighting/exposure:** Group G warm dusk, deepening slightly from scene_030.
- **Transition in/out:** dissolve / dissolve
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Quiet contemplative human silhouettes only — no rogue-machine/robot imagery (character_style.md scene_031/032 note).
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no rogue-machine/robot-takeover imagery, no single hero/villain figure
- **Style token references:** ff-color-coral-500
- **Accessibility constraints:** No on-screen text (deliberate silence).
- **Editor notes:** Distinct crop/hold/motion-density/text-density/transition from scene_030/032/033 to avoid monotony across the closing sequence: office-tower-window crop, longest duration (24.9s) of the four, dissolve-in/dissolve-out.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_031_12e168b42df0ef02be3b9707.mp4` (provider asset pexels/36926169) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Convey the film's core closing idea: risk accumulates through many small decisions, not a single dramatic event.
- **EDIT_TREATMENT_PROMPT:** Tightens toward office-tower windows with a single silhouette (visual_style_bible.md Section 12 crop guidance) — distinct from scene_030's wide skyline and scene_032's darker tight hold. Near-static hold, minimal drift only (camera_language.md). Native speed, no ramping. Grade to Group G register (ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033). Group G warm dusk, deepening slightly from scene_030.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no rogue-machine/robot-takeover imagery, no single hero/villain figure
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_032

- **scene_id:** scene_032
- **Timing/duration:** 684.275s – 713.914s (11:24.275 – 11:53.914), duration 29.639s
- **Narration intent:** voice_script.txt para 37-39: "The greatest danger here may not be a rogue machine at all... reducing catastrophic misuse without building a machine for concentrating power."
- **Narrative purpose:** Reframe the danger as systemic incentive rather than a rogue machine, and state the real, harder challenge.
- **Storyboard visual need:** Continued quiet dusk cityscape, minimal or no on-screen text, unhurried pacing. (mood: reflective)
- **Effective media path (existing footage):** `assets/footage/scene_032_29ff7ef6ff7df132006f8e97.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pixabay / 88219
- **Existing footage treatment:** Reframe the danger as systemic incentive rather than a rogue machine; state the real, harder challenge.
- **Framing/crop:** Darkest, stillest, most tightly-composed frame of the four — one or two silhouettes only (visual_style_bible.md Section 12 crop guidance).
- **Camera motion:** Near-static hold, minimal drift only (camera_language.md).
- **Playback speed:** Native speed, no ramping.
- **Color grade:** Group G register — ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033
- **Lighting/exposure:** Group G darkest point, approaching ff-color-ink-950 by scene_033.
- **Transition in/out:** dissolve / dissolve
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Quiet human silhouettes only; an earlier humanoid-robot candidate for this exact scene was rejected editorially during footage retrieval (footage/retrieval_report.md editorial correction) — the rule against robot/humanoid imagery is enforced with a concrete precedent here, not just a stylistic preference.
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no rogue-machine/robot-takeover imagery (explicit prior rejection precedent for this scene)
- **Style token references:** ff-color-coral-500, ff-color-ink-950
- **Accessibility constraints:** No on-screen text (deliberate silence).
- **Editor notes:** Distinct crop/hold/motion-density/text-density/transition from scene_030/031/033 to avoid monotony across the closing sequence: darkest/tightest crop, second-longest duration (29.6s), dissolve-in/dissolve-out. Current asset (pixabay 88219) supersedes a rejected humanoid-robot candidate and an oversized skyline candidate per footage/retrieval_report.md.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_032_29ff7ef6ff7df132006f8e97.mp4` (provider asset pixabay/88219) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Reframe the danger as systemic incentive rather than a rogue machine; state the real, harder challenge.
- **EDIT_TREATMENT_PROMPT:** Darkest, stillest, most tightly-composed frame of the four — one or two silhouettes only (visual_style_bible.md Section 12 crop guidance). Near-static hold, minimal drift only (camera_language.md). Native speed, no ramping. Grade to Group G register (ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033). Group G darkest point, approaching ff-color-ink-950 by scene_033.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no rogue-machine/robot-takeover imagery (explicit prior rejection precedent for this scene)
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

## scene_033

- **scene_id:** scene_033
- **Timing/duration:** 713.914s – 719.928s (11:53.914 – 11:59.928), duration 6.014s
- **Narration intent:** voice_script.txt para 40-41: "That work hasn't been done yet. It's still being decided... by people, right now."
- **Narrative purpose:** Final closing lines: the work is undone, still being decided by people, right now — end on human agency.
- **Storyboard visual need:** Held final wide shot, calm and unresolved rather than triumphant or bleak; ample breathing room before black. (mood: reflective)
- **Effective media path (existing footage):** `assets/footage/scene_033_1b2f289c850d35e4a6e96dc4.mp4` (project-relative path, no URL)
- **Asset role:** canonical
- **Provider / provider asset ID:** pexels / 30346632
- **Existing footage treatment:** Final closing lines: the work is undone, still being decided by people, right now — end on human agency, calm and unresolved rather than triumphant or bleak.
- **Framing/crop:** Full wide final composition — returns to wide but distinct from scene_030's opening crop (visual_style_bible.md Section 12 crop guidance).
- **Camera motion:** Near-static hold, minimal drift only (camera_language.md).
- **Playback speed:** Native speed, no ramping; ample breathing room before black.
- **Color grade:** Group G register — ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033
- **Lighting/exposure:** Group G darkening to ff-color-ink-950 by this final scene.
- **Transition in/out:** dissolve / fade
- **Overlay/text:** none
- **Source/context label requirement:** NONE
- **Conceptual/reconstruction marker:** none required
- **Data visualization requirement:** NONE
- **UI reconstruction requirement:** NONE
- **Factual-sensitivity constraints:** Quiet human agency framing only; no rogue-machine/robot imagery; no CTA/title card (per storyboard closing instruction).
- **Prohibited visual elements:** global baseline (`negative_prompts.md`) plus: no rogue-machine/robot imagery, no CTA/title card
- **Style token references:** ff-color-ink-950, ff-color-coral-500
- **Accessibility constraints:** No on-screen text (deliberate silence).
- **Editor notes:** Distinct crop/hold/motion-density/text-density/transition from scene_030-032 to avoid monotony across the closing sequence: full wide (but distinct from scene_030), shortest duration (6.0s) alongside scene_030, dissolve-in/fade-out to black. Calm, open-ended analytical close.
- **PRIMARY_VISUAL_PROMPT:** Use effective media `assets/footage/scene_033_1b2f289c850d35e4a6e96dc4.mp4` (provider asset pexels/30346632) as-is; no image generation for this scene. Treat per style token "FactForge institutional documentary style, cool desaturated ..." — Final closing lines: the work is undone, still being decided by people, right now — end on human agency, calm and unresolved rather than triumphant or bleak.
- **EDIT_TREATMENT_PROMPT:** Full wide final composition — returns to wide but distinct from scene_030's opening crop (visual_style_bible.md Section 12 crop guidance). Near-static hold, minimal drift only (camera_language.md). Native speed, no ramping; ample breathing room before black. Grade to Group G register (ink/steel shifting toward ff-color-coral-500, darkening to ff-color-ink-950 by scene_033). Group G darkening to ff-color-ink-950 by this final scene.
- **OVERLAY_PROMPT:** No on-screen label this scene. UI/data requirement: none
- **NEGATIVE_PROMPT:** humanoid robot, robot face, evil AI face, glowing brain, anthropomorphized AI character, neon cyberpunk lighting, scrolling code rain, hacker-in-a-hoodie cliche, apocalyptic imagery, disaster/explosion iconography, dystopian ruins, horror lighting, Dutch angle, extreme close-up on a face, real company logo, real government seal, named real individual, legible real text, legible real credential values, real platform branding, gore, violence, weapons, photorealistic fabricated news headline, sensationalist stock-photo cliche, fake data, invented statistics, fake numeric dashboard, unsupported company/government behavior claim; no rogue-machine/robot imagery, no CTA/title card
- **Validation flags:** fallback_to_ai_visual=false; human_review_status=NOT_REQUIRED (per `footage/scene_asset_map.json`); no fabricated data, no new factual claim introduced by this stage.

