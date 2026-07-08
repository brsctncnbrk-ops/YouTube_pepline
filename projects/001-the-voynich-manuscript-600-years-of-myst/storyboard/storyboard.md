# Storyboard — The Voynich Manuscript: 600 Years of Mystery

Total runtime: 656.2s (13 scenes, matching the 13 real images provided).

| # | Time | Scene type | Purpose | Visual need | On-screen text | Transitions |
|---|---|---|---|---|---|---|
| scene_001 | 0:00-0:55 | cinematic | Cold-open hook | Manuscript in a lit glass case, dark archive | — | fade → cut |
| scene_002 | 0:55-1:31 | documentary | Establish where it's kept | Grand library hall, scholar examining manuscripts | — | cut → dissolve |
| scene_003 | 1:31-2:04 | macro_shot | Close look at the handwriting | Gloved hand examining a page | — | dissolve → cut |
| scene_004 | 2:04-2:40 | hand_drawn_sketch | Botanical section | Two botanical illustrations, unidentified plants | "Botanical Section" | cut → wipe |
| scene_005 | 2:40-3:08 | diagram | Alchemical/vessel bridge | Interconnected glass vessels/tubes | — | wipe → cut |
| scene_006 | 3:08-3:42 | archive_documents | Pharmaceutical section | Labeled parchment, roots/leaves/jar | "Pharmaceutical Section" | cut → dissolve |
| scene_007 | 3:42-4:45 | diagram | Astronomical section | Circular star/zodiac diagram | "Astronomical Section" | dissolve → cut |
| scene_008 | 4:45-6:26 | historical_painting | Provenance + radiocarbon dating | Medieval monk writing by candlelight | — | cut → blur |
| scene_009 | 6:26-7:26 | character_scene | WWII cryptanalysis | 1940s codebreaker with cipher machine | — | blur → light_flash |
| scene_010 | 7:26-8:22 | data_visualization | Statistical evidence | Word frequency graph over manuscript pages | "Word Frequency Graph" | light_flash → cut |
| scene_011 | 8:22-8:57 | isometric | Cryptographic tools accent | Ornate astrolabe/cipher wheel device | — | cut → slide |
| scene_012 | 8:57-9:39 | macro_shot | Modern scientific analysis | Precision scanning instrument on manuscript | — | slide → dissolve |
| scene_013 | 9:39-10:56 | documentary | Closing / where it resides today | Grand museum courtyard, manuscript displayed | — | dissolve → fade |

No two consecutive scenes repeat `scene_type` or `transition_in`
(mechanically enforced at `storyboard_qa`/`render_qa`). `data_point` set on
scene_008 (600 ducats), scene_009 (1940s), and scene_013 (Yale/North America)
— the three moments with a genuinely concrete, verifiable number/date/
location worth calling out visually; the rest carry the story through
narration and image alone, per the "most scenes won't have one" guidance.
