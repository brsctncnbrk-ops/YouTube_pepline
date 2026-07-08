# Storyboard — The Voynich Manuscript: 600 Years of Mystery

Total runtime: 656.2s (20 scenes, built from the 13 real images provided —
the six longest original beats are now split into two or three shorter
reframed shots of the same source photo each, so no single shot holds the
screen static for more than ~34s; see `direction/direction_plan.md`'s
revision note).

| # | Time | Scene type | Purpose | Visual need | On-screen text | Transitions |
|---|---|---|---|---|---|---|
| scene_001 | 0:00-0:27 | cinematic | Cold-open hook, first beat | Manuscript in a lit glass case, dark archive | — | fade → cut |
| scene_002 | 0:27-0:55 | macro_shot | Cold-open hook, second beat (reframe) | Same case, tighter reframe | — | cut → dissolve |
| scene_003 | 0:55-1:31 | documentary | Establish where it's kept | Grand library hall, scholar examining manuscripts | — | dissolve → cut |
| scene_004 | 1:31-2:03 | macro_shot | Close look at the handwriting | Gloved hand examining a page | — | cut → zoom_through |
| scene_005 | 2:03-2:39 | hand_drawn_sketch | Botanical section | Two botanical illustrations, unidentified plants | "Botanical Section" | zoom_through → wipe |
| scene_006 | 2:39-3:07 | diagram | Alchemical/vessel bridge | Interconnected glass vessels/tubes | — | wipe → dissolve |
| scene_007 | 3:07-3:42 | archive_documents | Pharmaceutical section | Labeled parchment, roots/leaves/jar | "Pharmaceutical Section" | dissolve → cut |
| scene_008 | 3:42-4:13 | diagram | Astronomical section, first beat | Circular star/zodiac diagram | "Astronomical Section" | cut → slide |
| scene_009 | 4:13-4:45 | macro_shot | Astronomical section, second beat (reframe) | Same diagram, tighter on the rings | — | slide → dissolve |
| scene_010 | 4:45-5:18 | historical_painting | Provenance - Rudolf II / Bacon, first beat | Medieval monk writing by candlelight | — | dissolve → cut |
| scene_011 | 5:18-5:52 | macro_shot | Provenance, second beat (reframe) | Same desk, closer on the writing hand | — | cut → zoom_through |
| scene_012 | 5:52-6:25 | cinematic | Radiocarbon dating (reframe, pulled back) | Same desk, wider room view | — | zoom_through → blur |
| scene_013 | 6:25-6:55 | character_scene | WWII cryptanalysis, first beat | 1940s codebreaker with cipher machine | — | blur → cut |
| scene_014 | 6:55-7:25 | macro_shot | WWII cryptanalysis, second beat (reframe) | Same desk, tighter on the cipher device | — | cut → light_flash |
| scene_015 | 7:25-7:54 | data_visualization | Statistical evidence, first beat | Word frequency graph over manuscript pages | "Word Frequency Graph" | light_flash → dissolve |
| scene_016 | 7:54-8:22 | macro_shot | Statistical evidence, second beat (reframe) | Same graph, tighter on the curves | — | dissolve → cut |
| scene_017 | 8:22-8:57 | isometric | Cryptographic tools accent | Ornate astrolabe/cipher wheel device | — | cut → slide |
| scene_018 | 8:57-9:39 | macro_shot | Modern scientific analysis | Precision scanning instrument on manuscript | — | slide → dissolve |
| scene_019 | 9:39-10:17 | documentary | Closing, first beat - where it resides today | Grand museum courtyard, manuscript displayed | — | dissolve → cut |
| scene_020 | 10:17-10:56 | macro_shot | Closing, second beat (reframe) - open question | Same courtyard, tighter on the case | — | cut → fade |

No two consecutive scenes repeat `scene_type` or `transition_in`
(mechanically enforced at `storyboard_qa`/`render_qa`). `data_point` set on
scene_010 (600 ducats), scene_013 (1940s), and scene_019 (Yale/North
America) — the three moments with a genuinely concrete, verifiable number/
date/location worth calling out visually; the rest carry the story through
narration and image alone, per the "most scenes won't have one" guidance.

Narration captions are a separate, denser timeline
(`remotion/captions.json`, 290 short bursts, ~2.2s average) generated
mechanically from `scripts/script.md` by `scripts/generate_captions.mjs` —
not part of this per-scene table, since captions are independent of scene
boundaries.
