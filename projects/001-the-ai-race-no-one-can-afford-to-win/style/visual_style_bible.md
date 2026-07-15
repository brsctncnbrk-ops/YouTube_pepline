# Visual Style Bible — "The AI Race No One Can Afford to Win"

Project: `001-the-ai-race-no-one-can-afford-to-win`
Stage: `visual_style_bible` — footage-primary status: **all 33 scenes currently resolve to real licensed footage** (`footage/footage_manifest.json`: every scene has `fallback_to_ai_visual: false`). There are zero AI-fallback stills to style today. This bible therefore serves two purposes: (1) the graphic-overlay, color-grade-matching, and camera-grammar reference that governs how real footage is cut and dressed for the whole film, and (2) the standing reference `factforge-visual-prompt` and `factforge-director` must use verbatim if any scene is later re-flagged to AI fallback (e.g. after a licensing rejection or a re-run). Nothing here should be read as implying AI-generated stills currently exist in this project.

Reference channel style (`config/project_config.json`): *"modern cinematic documentary; serious, evidence-led, balanced, tense but not sensationalist."*

---

## 1. CREATIVE NORTH STAR

This is a calm, analytical, evidence-led documentary — not a thriller. The film argues that the danger in the AI race is systemic and human (competitive incentive structures, concentration of power) rather than a single malevolent machine. The visual language must reinforce that thesis at every turn: institutional, procedural, restrained. Tension is built through pacing, framing, and cold color temperature — never through horror-movie or sci-fi-apocalypse imagery.

Every frame should look like it could appear in a serious long-form investigative documentary (the kind that runs on a prestige streaming platform), not a tech-explainer channel or a cyberpunk trailer. When in doubt, choose the calmer, more procedural option over the more dramatic one.

The style consistency token below is the single string every AI-fallback still (now or in a future re-run) must incorporate verbatim, and the aesthetic target every real-footage cut should be graded/dressed toward:

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

---

## 2. VISUAL LANGUAGE

- **Core aesthetic:** cinematic observational documentary B-roll — real institutional environments (data centers, offices, government buildings, laboratories, SOC rooms) shot with a restrained, journalistic camera, not stylized illustration. Graphic overlays (labels, data viz, lower thirds) are a separate flat/minimal infographic layer composited on top, never blended into the photographic image itself.
- **Two registers, one grade:** (a) *observational footage* — real people, real environments, procedural pacing; (b) *abstract graphic inserts* — dashboards, network diagrams, projection lines, split-screen motifs. Both registers share the same color system (Section 3) so cuts between them never feel like a genre switch.
- **What this is not:** not a tech-explainer channel look (no floating 3D logos, no glossy gradients, no particle effects), not a cyberpunk/neon aesthetic, not found-footage horror, not a corporate stock-video sizzle reel.
- **Consistency mechanism:** every fallback still (if any are ever produced) and every graphic overlay must be checked against the style consistency token in Section 1 before it ships.

---

## 3. COLOR SYSTEM

Full token table lives in `color_palette.md`. Summary:

- **Base register (majority of the film, scenes_001–021, 026–029):** cool, desaturated institutional palette — deep navy-charcoal backgrounds (`ff-color-ink-950` #0B1220), steel-blue mid-tones (`ff-color-steel-600` #2E3A46), fog-grey neutrals (`ff-color-fog-400` #8B97A3), near-white text (`ff-color-paper-100` #F2F4F6).
- **Semantic accent (used only on label chips/status tags, never as a wash):** amber (`ff-color-amber-500` #D98E3B) for hedge/evidentiary labels (CONTROLLED EVALUATION, REPORTED, FORECAST, DISCLOSED). Rust (`ff-color-rust-600` #B5502F) reserved for the rare highest-sensitivity marker only (e.g. scene_005's SIMULATED TEST SCENARIO underline) — never used as a dominant color, never used to imply threat/danger in a horror sense.
- **Open/closed bookend (scene_022, scene_025):** identical symmetrical neutral treatment on both halves of the split frame — no color imbalance between "open" and "closed" sides.
- **Warm safeguards register (scenes_026–029):** the same base palette lifted toward daylight warmth (`ff-color-gold-400` #D4AF6A accent) to signal the pivot from critique to constructive proposal.
- **Closing dusk register (scenes_030–033):** base palette shifting toward warm dusk (`ff-color-coral-500` #E2795B) as the sequence progresses, darkening toward `ff-color-ink-950` by scene_033.
- **Footage color/tone matching (best-effort only):** `footage/footage_manifest.md` was not present as a separate file at authoring time; tone matching below is inferred from `footage_manifest.json` reasoning fields, `storyboard.md`'s explicit "Visual treatment" notes per scene, and native resolution/source metadata. **This is a best-effort read, not a colorimetric measurement — a human visual QC pass matching actual delivered clips against this palette is required once the edit is assembled**, since a text-level palette description cannot guarantee a true grade match to licensed stock footage.

---

## 4. TYPOGRAPHY

- **Primary UI/label typeface:** a clean grotesque sans-serif (`ff-font-primary`) for all on-screen labels, lower thirds, and titles — no serif, no script, no display/novelty faces. Evokes a broadcast-news chyron restrained down to documentary minimalism.
- **Secondary/data typeface:** a monospace (`ff-font-mono`) used only for abstract UI/dashboard reconstructions and data readouts (e.g. scene_004's "scenario running" indicator, scene_012's SOC dashboard) — reinforces "this is a system interface," not narration text.
- **Type scale, weights, and fallbacks:** see Section 16 tokens and `graphic_style.md`.
- **Case convention:** on-screen evidentiary labels (CONTROLLED EVALUATION, REPORTED, FORECAST, DISCLOSED BY THE COMPANY, etc.) are always set in uppercase, letter-spaced, to visually distinguish them as a system-level annotation layer distinct from narration captions.

---

## 5. COMPOSITION

- **Default framing:** wide establishing shots for institutional exteriors and context; medium/close shots for procedural detail (hands on documents, monitor close-ups). No extreme close-ups or Dutch angles — those read as thriller, not documentary.
- **Symmetry as meaning:** the open/closed subsection (scene_022, scene_025) is the one place in the film where perfectly symmetrical split-frame composition is mandatory — it visually encodes editorial balance. Elsewhere, natural documentary framing (rule-of-thirds, not perfect symmetry) is the norm.
- **Negative space:** graphic inserts (network diagrams, projection lines) use generous negative space against the dark base palette — never cluttered, never more than one data concept on screen at once.
- **Safe areas:** see Section 16 (`ff-safe-*` tokens) — all lower thirds and labels must sit inside YouTube-safe margins.

Full shot-grammar detail in `camera_language.md`.

---

## 6. MOTION SYSTEM

- **Footage motion:** slow parallel push-ins, static holds, and slow lateral tracking dominate scenes_001–029. The closing sequence (scenes_030–033) drops to near-static holds with minimal drift, per the storyboard's explicit slower-pacing instruction.
- **Graphic motion:** label chips slide/fade in on `ff-motion-base` (500ms), data-viz reveals animate on `ff-motion-slow` (900ms), and every static graphic (e.g. scene_010's decelerate/overtake motion graphic) must hold for at least `ff-motion-hold-min` (1200ms) before any cut — this is a calm film, not a kinetic-typography reel.
- **Easing:** `ff-ease-standard` for label/UI motion, `ff-ease-out` for graphic reveals settling into place. No bounce, no elastic, no overshoot easing anywhere — those read as playful/corporate-explainer, not documentary.
- **Forecast lines specifically animate by drawing on (path reveal), never by "counting up" a number — this avoids implying false precision on a labeled forecast.**

---

## 7. LOWER THIRDS / LABELS

Every on-screen evidentiary label in the storyboard (CONTROLLED EVALUATION, SIMULATED TEST SCENARIO, DESIGNED TEST — NOT AN ACTUAL EVENT, REPORTED, DISCLOSED BY THE COMPANY — REPORTED INCIDENT, COMPANY'S OWN ASSESSMENT — NOT INDEPENDENTLY VERIFIED, FORECAST — NOT A CONFIRMED OUTCOME, EU AI ACT — COMPUTE THRESHOLD, SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED) is a **hedge/evidentiary marker**, not a decorative caption. Rules:

- Flat rectangular chip, `ff-radius-sm`, amber accent border/underline only (never full amber fill — text stays `ff-color-paper-100` on `ff-color-ink-950`/scrim).
- Always uppercase, `ff-font-primary`, letter-spaced.
- Minimum on-screen hold: 1.5s, enough to read comfortably, per Section 14 accessibility rules.
- Positioned lower-third, inside `ff-safe-lower-third-bottom`.
- Never uses exclamation marks, never uses red/rust as a fill color (rust is reserved for the single rarest-sensitivity underline case, scene_005).
- These labels exist specifically to keep **controlled evaluation** scenes from being misread as real deployed incidents, and to keep **forecast** content from being misread as settled fact — see Section 12 for the scene-by-scene mapping.

---

## 8. DATA VISUALIZATION

- **Palette:** two-line-max charts using `ff-color-viz-line-a` (cool blue, #5B8FB9) and `ff-color-viz-line-b` (amber, #D98E3B) against `ff-color-ink-950`, gridlines in `ff-color-viz-grid` at hairline weight.
- **Forecast/projection content (scene_016's dual projection graphic):** MUST render as dashed lines (`ff-stroke-dashed-forecast`), MUST carry the on-screen label "FORECAST — NOT A CONFIRMED OUTCOME," and MUST NOT use a solid/confirmed line style. Two competing forecasts (labeled "Forecast A" / "Forecast B" per storyboard) are given equal visual weight — same stroke width, same treatment — since the script explicitly frames both as contested, hedged projections from parties with different incentives.
- **Reported-event graphics (scene_009's benchmark leaderboard, scene_008's ticker):** generic/unbranded bars and numbers only — no real company names, logos, or real ticker symbols, ever (see `graphic_style.md`).
- **Consolidation/competition diagrams (scene_017, scene_029):** abstract node diagrams only, generic circles/lines, no real company identification. Scene_017 shows nodes consolidating (concentration risk); scene_029 shows equally-sized competing nodes (deliberate visual contrast, per storyboard's own "contrast with the earlier consolidation diagram" note).
- **Decelerate/overtake motion graphic (scene_010):** minimal abstract shapes only, no literal race-car or runner rendering (the storyboard's own visual note is metaphorical, not literal, despite the search-query wording).

---

## 9. UI / SCREEN RECONSTRUCTIONS

Any reconstructed on-screen interface (dashboards, document scrolls, message/email UIs, benchmark leaderboards, social feeds, terminal/vault login screens) is an **illustrative reconstruction** — an abstracted, generic UI built for this film, not a real captured screenshot. Rules:

- No legible real text, no real usernames, no real platform branding/logos, no real **credential** fields with real-looking values, and no real company identification anywhere.
- Monospace type (`ff-font-mono`) signals "this is a system," matched to the dark base palette with a single accent-color status indicator (amber for neutral/pending, rust only for the scene_005 flagged-output marker).
- Scene_005's message/test-transcript UI is the single most sensitive reconstruction in the film: it must render as a blurred, abstracted document/email-list interface with a highlighted "flagged output" marker and the on-screen label SIMULATED TEST SCENARIO — it must never render legible fabricated email/message content, and must never be staged in a way that could be mistaken for a real blackmail event or real breach footage. See Section 12.
- Scene_004's evaluation-room dashboards similarly stay abstract status-light/scenario-label displays — never a literal rendering of model "thoughts" or chat output.

---

## 10. FOOTAGE TREATMENT

- **Grade:** cool, desaturated base grade across the majority of the film (Section 3); localized warm registers only for the safeguards section (026–029) and the closing dusk sequence (030–033).
- **No dramatization:** controlled-evaluation scenes (004–006) must read as calm lab/procedural environments, not thriller sets — no low-key horror lighting, no Dutch angles, no whip pans.
- **Genericism requirement:** any scene depicting a company, government, or institution (boardrooms, data centers, regulatory offices, legislative chambers) must stay unbranded/anonymous — no real logos, no identifiable real buildings presented as a specific named entity, consistent with the storyboard's per-scene factual-sensitivity notes.
- **No operational detail:** cyber (012–013), biological (014), and any security-adjacent scene stays at the exterior/dashboard/abstract level — no literal exploit code, no lab-interior/procedural biological content, no "hacker" code-rain cliché.
- **Best-effort tone matching to surrounding real footage:** since footage retrieval is complete for all 33 scenes, any future AI-fallback still must be graded to match the *specific* neighboring clips' warmth/contrast, not just the general section register — flag this for human visual QC per Section 3.

---

## 11. SCENE GROUPING

Every scene, `scene_001` through `scene_033`, appears in exactly one of the seven narrative groups below.

### Group A — Opening race pressure
`scene_001`, `scene_002`
Cold open establishing that AI labs know the risk and race anyway; lands the film's central question. Coolest, most restrained grade in the film; slow parallel push-ins, no cuts within shots.

### Group B — Evidence and controlled evaluations
`scene_003`, `scene_004`, `scene_005`, `scene_006`
Sets up "danger would announce itself," then the controlled-evaluation test cases, then the fire-drill clarifying metaphor. Clinical, procedural, lab-neutral lighting; the film's most safety-sensitive reconstruction (scene_005) lives here.

### Group C — Competitive incentives (and the risk spectrum they produce)
`scene_007`, `scene_008`, `scene_009`, `scene_010`, `scene_011`, `scene_012`, `scene_013`, `scene_014`, `scene_015`, `scene_016`
Why the race accelerates (boardroom pressure, markets, the reported CEO-emergency benchmark event), then the concrete cyber/biological risk spectrum this pressure produces, then the information-ecosystem and labor-market forecast material. Cool corporate register sliding into dark SOC lighting (012–013) and back to muted/dusk graphic inserts (015–016).

### Group D — Regulation and concentration of power
`scene_017`, `scene_018`, `scene_019`, `scene_020`, `scene_021`
Introduces concentration-of-power as "the quieter risk," then the control paradox, the EU AI Act as a real regulatory example, the incumbency-protection critique, and the balancing caveat. Bureaucratic, institutional, cooler-to-warmer as the section resolves into its caveat.

### Group E — Open versus closed systems
`scene_022`, `scene_023`, `scene_024`, `scene_025`
The open-weight vs. closed-model debate, treated with deliberate visual symmetry. Bookended by the identical split-frame composition in scene_022 and scene_025.

### Group F — Governance and oversight proposals
`scene_026`, `scene_027`, `scene_028`, `scene_029`
The safeguards section: technical, procedural, structural, and power-focused proposals. Warmest, most collaborative daylight register in the film — deliberate tonal contrast with Groups C/D.

### Group G — Unresolved closing thesis
`scene_030`, `scene_031`, `scene_032`, `scene_033`
The film's closing movement: quiet, human-scale, deliberately non-catastrophic. Slowest pacing in the film, warm dusk grade darkening toward black, no on-screen text, no cuts within shots.

---

## 12. SCENE-SPECIFIC EXCEPTIONS

- **scene_001:** Strong opening primary footage (aerial city/data-center-district exterior) is now in place and should anchor the cold open as-is. `footage/retrieval_report.md`'s `SUPPLEMENTAL_MONTAGE_RECOMMENDED` note flags that the storyboard's three-part motif (data center / anonymous office / government facade) is only literally covered by cross-cutting to *other already-acquired* clips, not by acquiring new footage. Complete the motif in-edit only: cross-cut the scene_001 primary clip against existing adjacent assets that already carry the right register — e.g. the server-room hallway in scene_002 and the government-building time-lapse in scene_011 — using short insert cuts on the beat of the narration, per the storyboard's own "cross-cut on the beat" camera note. Do not initiate a new footage-retrieval search for this.
- **scene_005:** The message/test-transcript reconstruction is conceptual visualization only — a blurred, abstracted document/email UI with a highlighted "flagged output" marker, SIMULATED TEST SCENARIO on screen, and zero legible fabricated content. It must not be staged, lit, or paced in a way that reads as an actual blackmail event or real breach footage — no dramatic zoom on "shocking" text, no thriller sting, no red alert flash. Keep the same clinical grade as scene_004, tightened framing only, per the storyboard's explicit CRITICAL note.
- **scene_022 and scene_025 (intentional bookend reuse):** `footage_manifest.json` confirms scene_025 is a deliberate `asset_role: "reuse"` of the scene_022 canonical clip (same physical asset, `reuse_of_scene: "scene_022"`). This repetition is intentional structural bookending, not an error — do not source a different clip for scene_025. To reduce an identical-repeat feel without changing the meaning (the balanced, non-favoring open/closed composition must stay identical in substance):
  - **Crop:** scene_025 may use a marginally tighter static crop on the same symmetrical split-frame than scene_022's fuller framing, since scene_025 is a held conclusion rather than a fresh establishing shot.
  - **Timing:** scene_022 introduces the split-frame with a `dissolve` in and a `cut` out (per storyboard); scene_025 holds the same frame static and exits on a slower `fade`, reinforcing "this is the section closing," not "this is new information."
  - **Overlay:** scene_025 may carry a marginally heavier scrim (`ff-overlay-scrim-low` → toward `ff-overlay-scrim-high`) to visually signal closure, but must not introduce new on-screen text or shift the left/right balance — both storyboard entries specify no on-screen text.
- **scene_030–scene_033 (closing sequence, avoid monotony):** All four scenes share the warm dusk register and slow/static pacing by design (the storyboard explicitly calls for slower pacing and no rapid cuts here), so variation must come from crop, timing, and transition choices, not content or text density:
  - **Crop:** scene_030 is the widest establishing skyline crop; scene_031 tightens toward office-tower windows with a single silhouette; scene_032 holds the darkest, stillest, most tightly-composed frame (one or two silhouettes only); scene_033 returns to a full wide final composition, distinct from scene_030's crop even though both are wide.
  - **Pacing:** durations already vary substantially per storyboard (scene_030: 6.4s, scene_031: 24.9s, scene_032: 29.6s, scene_033: 6.0s) — preserve this rhythm; do not normalize all four to the same length.
  - **Text density:** the deliberate absence of on-screen text across all four scenes *is* the intended text-density treatment for this section — do not introduce labels here even for consistency with earlier sections; the silence is thematic (ties to the "no CTA, no title card" closing instruction in the storyboard).
  - **Transitions:** storyboard already varies these (fade/dissolve → dissolve/dissolve → dissolve/dissolve → dissolve/fade) — preserve that variation rather than using an identical dissolve four times in a row.

---

## 13. AUDIO-VISUAL RHYTHM

- Cutting pace tracks narration density: faster matched cuts during market/competition beats (Group C early scenes, e.g. scene_008–009), slower holds during interpretive/thesis beats (scene_002, scene_010, scene_021, all of Group G).
- Graphic inserts (labels, data viz) always enter on a narration beat, never mid-sentence, so the evidentiary label reads as reinforcing the spoken claim rather than interrupting it.
- The closing sequence (Group G) deliberately abandons the cutting-pace-follows-density rule in favor of sustained stillness, per the storyboard's own instruction to give the reflective ending "room to breathe."
- No music-video-style beat-matched flash cuts anywhere — this is a spoken-word-led documentary, not a montage set to a track.

---

## 14. ACCESSIBILITY

- All on-screen labels must meet a minimum 4.5:1 contrast ratio against their background (achieved via the mandated scrim tokens in Section 16, `ff-overlay-scrim-low`/`ff-overlay-scrim-high`, behind `ff-color-paper-100` text) — never rely on footage contrast alone.
- Hedge/evidentiary meaning (controlled evaluation vs. reported vs. forecast vs. disclosed) is always carried by explicit label text, never by color alone — color (amber/rust) is a secondary reinforcement, not the sole signal, so the film remains legible to colorblind viewers and in autoplay/no-sound contexts via captions.
- Minimum label hold time is 1.5 seconds (Section 7) to remain readable at normal reading speed.
- No flashing/strobing content anywhere in the film (no graphic element may flicker faster than 3Hz) — consistent with the calm, non-sensationalist creative direction.
- Forecast/dashed-line graphics use a dash pattern plus an explicit "FORECAST" text label rather than color alone, so the uncertainty signal survives grayscale/colorblind viewing.

---

## 15. DO / DON'T MATRIX

| Category | DO | DON'T |
|---|---|---|
| AI/robot depiction | Abstract dashboards, status lights, generic UI | Humanoid robot, robot faces, glowing brains, evil AI face |
| Visual genre | Cool cinematic documentary realism | Neon cyberpunk as the main visual language |
| Code/hacking imagery | Abstract SOC dashboards, generic status graphics | Heavy code-rain, scrolling green-on-black "hacker" cliché |
| Tone/stakes | Restrained, procedural, evidence-led tension | Apocalyptic disaster imagery, thriller sting cuts |
| Controlled evaluations | Clinical lab framing + CONTROLLED EVALUATION label | Staging as a real deployed incident |
| Cyber/bio content | Exterior/dashboard/abstract-only framing | Operational cyber, biological, or chemical procedural detail |
| Named entities | Generic, unbranded institutions and companies | Depicting or implying a specific real company/government without script support |
| On-screen UI | Illustrative reconstruction, blurred/abstract, no real credential values | Legible real text, real usernames, real logos, real-looking credentials |
| Forecast content | Dashed lines + explicit FORECAST label, equal weight to both projections | Solid/confirmed line style, false precision, favoring one forecast |
| Open/closed debate | Perfectly symmetrical, equal-weight composition | Any framing that visually favors "open" or "closed" |
| Claims on screen | Only what's in `scripts/script.md` / `storyboard/storyboard.json` | Any visual factual claim not present in the script or storyboard |
| Closing sequence | Human silhouettes, environment, quiet stillness | Any rogue-machine or robot-takeover imagery |

---

## 16. MACHINE-READABLE TOKENS

Stable token names for reuse by `factforge-visual-prompt`, `factforge-director`, and Remotion (`remotion/composition.json` styling). Full palette table duplicated in `color_palette.md`.

```
# COLOR
ff-color-ink-950:        #0B1220   # primary dark background
ff-color-ink-800:        #16202C   # secondary dark surface
ff-color-steel-600:      #2E3A46   # neutral mid-tone / panel fill
ff-color-fog-400:        #8B97A3   # desaturated cool neutral / secondary text
ff-color-paper-100:      #F2F4F6   # primary text / UI foreground
ff-color-amber-500:      #D98E3B   # semantic accent: hedge/status labels only
ff-color-rust-600:       #B5502F   # rare highest-sensitivity marker only (scene_005)
ff-color-gold-400:       #D4AF6A   # warm accent, safeguards section (026-029)
ff-color-coral-500:      #E2795B   # warm accent, closing dusk sequence (030-033)
ff-color-viz-line-a:     #5B8FB9   # data viz line A (cool blue)
ff-color-viz-line-b:     #D98E3B   # data viz line B (amber)
ff-color-viz-grid:       #2E3A46   # chart gridlines, hairline weight

# TYPOGRAPHY
ff-font-primary:         "Inter", "Helvetica Neue", Arial, sans-serif
ff-font-mono:            "IBM Plex Mono", "Roboto Mono", monospace
ff-type-display:         64px / line-height 1.05 / weight 700
ff-type-h1:               44px / line-height 1.15 / weight 700
ff-type-h2:               32px / line-height 1.2  / weight 600
ff-type-label:             22px / line-height 1.3  / weight 600 / uppercase / tracking 0.08em
ff-type-body-caption:     18px / line-height 1.4  / weight 400
ff-type-micro:              14px / line-height 1.4  / weight 500  # source/hedge micro-tags

# SPACING
ff-space-1: 8px
ff-space-2: 16px
ff-space-3: 24px
ff-space-4: 40px
ff-space-5: 64px

# BORDER RADIUS
ff-radius-none: 0px    # data-viz panels: sharp, institutional
ff-radius-sm:   4px    # label chips
ff-radius-md:   8px    # lower-third cards

# STROKE WIDTHS
ff-stroke-hairline:          1px          # chart gridlines
ff-stroke-thin:              2px          # solid data lines
ff-stroke-dashed-forecast:   2px, dash [6,4]   # forecast/projection lines only
ff-stroke-emphasis:          3px          # rare critical-marker emphasis only

# ANIMATION DURATIONS
ff-motion-fast:      200ms   # label chip enter
ff-motion-base:      500ms   # lower-third slide/fade
ff-motion-slow:      900ms   # graphic/data-viz reveal
ff-motion-hold-min: 1200ms   # minimum hold on any static graphic before cut

# EASING
ff-ease-standard: cubic-bezier(0.4, 0, 0.2, 1)
ff-ease-out:      cubic-bezier(0,   0, 0.2, 1)
ff-ease-in:       cubic-bezier(0.4, 0, 1,   1)

# OVERLAY OPACITY
ff-overlay-scrim-low:   0.25   # footage legibility scrim under lower thirds
ff-overlay-scrim-high:  0.55   # behind full label cards / scene_025 closure
ff-overlay-panel:       0.85   # data-viz panel background over footage

# SAFE AREAS
ff-safe-title-area:          90% width x 80% height, centered
ff-safe-lower-third-bottom:  12% from bottom edge
ff-safe-side-margin:         6% each side

# LABEL TYPES (on-screen evidentiary markers)
ff-label-controlled-evaluation:   "CONTROLLED EVALUATION"                                  # scene_004
ff-label-simulated-test:          "SIMULATED TEST SCENARIO"                                 # scene_005
ff-label-designed-test:           "DESIGNED TEST — NOT AN ACTUAL EVENT"                     # scene_006
ff-label-reported:                "REPORTED"                                                # scene_009
ff-label-disclosed:               "DISCLOSED BY THE COMPANY — REPORTED INCIDENT"            # scene_012
ff-label-company-assessment:      "COMPANY'S OWN ASSESSMENT — NOT INDEPENDENTLY VERIFIED"   # scene_013
ff-label-forecast:                "FORECAST — NOT A CONFIRMED OUTCOME"                      # scene_016
ff-label-regulation-real:         "EU AI ACT — COMPUTE THRESHOLD"                           # scene_019
ff-label-same-incident-callback:  "SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED" # scene_024

# CONCEPTUAL-CONTENT MARKERS (pipeline metadata, not rendered on screen)
ff-conceptual-visualization:        boolean   # true = a conceptual visualization, not literal document footage
ff-illustrative-reconstruction:     boolean   # true = abstracted UI/interface reconstruction, no real content
ff-controlled-evaluation-context:   boolean   # true = scene depicts a controlled evaluation, not a real deployment
ff-forecast-content:                boolean   # true = scene depicts a forecast/estimate, not a measured outcome
ff-no-legible-real-content:         true      # enforced on every UI/document/feed insert: no real credential values, no real usernames/logos
```

---

## Safety and editorial rule cross-reference

This bible prohibits: **humanoid robot** depictions, **evil AI face** imagery, heavy code-rain, neon cyberpunk as the primary visual language, **apocalyptic** disaster imagery, treating controlled evaluations as real deployment, operational cyber/biological/chemical procedural detail, unsupported company/government claims, on-screen **credential**-like values that could read as real, and any visual factual claim not present in `scripts/script.md` or `storyboard/storyboard.json`. It requires: **conceptual visualization** treatment for reconstructed test/incident content, explicit **controlled evaluation** labeling wherever a designed test is depicted, **illustrative reconstruction** treatment (abstract, non-legible) for any UI/document/screen insert, and explicit **forecast** labeling with non-solid line styling for any projection/prediction graphic. See `prompt_rules.md` for the concrete negative-prompt list derived from these rules.
