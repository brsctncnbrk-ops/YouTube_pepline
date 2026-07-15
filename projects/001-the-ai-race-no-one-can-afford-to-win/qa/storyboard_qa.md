# storyboard_qa QA — 001-the-ai-race-no-one-can-afford-to-win

### Automated Checks

- Overall: PASS
- Schema (storyboard/storyboard.json): PASS
- Assets: PASS
- Scene filenames/numbering: PASS
- Prompt-to-scene coverage (fallback scenes only): PASS
- Footage provenance coverage: PASS
- Packaging deliverables: PASS
- Fact audit complete: PASS
- Zero hedge tokens in script: PASS

### Judgment-Based Checks

**Verdict: PASS**

**Authoritative audio verification**
- SHA-256 of `assets/audio/final_voice.mp3` = `3fb36e5e34c070b40abca48f8bec4594e46367e535c5265127b5ca60d23ccb17` — matches the approved hash exactly.
- Duration via `ffprobe` = 719.928000s — matches the approved 719.928s exactly. The obsolete 732.408s figure does not appear anywhere in the storyboard or timing math.
- File was only read (hash/duration probes), never modified — confirmed unchanged after this QA pass (same hash, same file listing).

**Timing / coverage**
- `total_duration_sec` = 719.928, `scene_001.start_sec` = 0.000, `scene_033.end_sec` = 719.928 — exact match to the audio boundaries.
- All 33 scenes are fully contiguous: each scene's `start_sec` equals the previous scene's `end_sec`; a programmatic check found zero gaps and zero overlaps across the full array.
- All 41 paragraphs of `voice/voice_script.txt` are covered by the 33 scenes' `voice_line_ref`/narration excerpts (verified 1:1 paragraph-to-scene-group mapping, no skipped or duplicated paragraphs). Scene boundaries were placed at existing paragraph/pause breaks in the recorded narration text (no mid-sentence splits) and durations are word-count-proportional against the real 719.928s duration, since no word-level forced-alignment timestamps exist for this recording.
- `target_duration_sec` (660, pre-recording estimate) vs. `total_duration_sec` (719.928, actual recorded audio) drift is expected and correct per the task's instruction to treat the real audio as sole authoritative source — the storyboard correctly uses 719.928, not the original estimate.

**Visual need / mood / producibility**
- Every scene's `visual_need` is concrete and actionable (specific setting, framing, no vague filler) — sufficient for `factforge-footage-retrieval` to build search queries and for `factforge-visual-prompt` to write fallback prompts.
- Moods are scene-specific, not copy-pasted: they shift appropriately within sections (e.g. `tense` → `reflective` across scenes 4-6 to mark the pull-back from the controlled-test description into the fire-drill clarification; `somber` → `hopeful` across scenes 31-33 of the safeguards sequence).
- All described visuals are producible with real stock footage, generic motion graphics, or standard documentary techniques (exteriors, generic dashboards, abstract diagrams, silhouettes) — nothing requires fabricated or impossible capture.

**Sensitive-content framing (explicit user requirements)**
- Controlled model evaluations (scenes 4-6): staged as a closed-door lab/testing-room environment with on-screen labels `CONTROLLED EVALUATION`, `SIMULATED TEST SCENARIO`, and `DESIGNED TEST — NOT AN ACTUAL EVENT`; factual-sensitivity notes on each explicitly forbid staging them as real deployed incidents.
- Real reported misuse (scenes 12-13, referenced again in scene 24): labeled `DISCLOSED BY THE COMPANY — REPORTED INCIDENT` / `COMPANY'S OWN ASSESSMENT — NOT INDEPENDENTLY VERIFIED` / `SAME REPORTED INCIDENTS AS EARLIER — REAL, NOT SIMULATED`, with scene 24 explicitly visually and textually calling back to scenes 12-13 so it reads as the same real case, not a new fictional one — clearly distinguished from the scene 4-6 controlled tests.
- Labor-market forecasts (scene 16): dual projection graphics explicitly styled as dashed/uncertain lines with on-screen label `FORECAST — NOT A CONFIRMED OUTCOME`, never rendered as a settled data line.
- No humanoid robots, generic evil-AI imagery, robot faces, glowing brains, code rain, or cliché AI stock footage anywhere — checked via full-text scan of `storyboard.md`/`storyboard.json`; the only hits are the storyboard's own prohibition notes, not visual descriptions.
- No operational cyber, biological, or chemical procedure depicted at any point — cyber scenes use abstract dashboards only (explicitly not "code rain"), biological-risk scene (14) is exterior-only with no lab interior or procedure shown.
- Open-weight vs. closed-model discussion (scenes 22-25) uses a deliberately symmetrical split-frame visual motif (open repository vs. locked vault) with equal framing/lighting/screen time on both sides, bookended at open (scene 22) and close (scene 25) for balance.
- Reflective closing (scenes 30-33) is paced deliberately slower: static holds, no rapid cuts, minimal/no on-screen text, explicit "human figures/environment not machine" framing to give the ending room to breathe.

**On-screen text / transitions**
- On-screen text is used sparingly (9 of 33 scenes) and only where it does real safety/framing work (distinguishing controlled tests, real incidents, and forecasts) — not redundant with narration, not decorative.
- Transitions vary appropriately: `cut` for urgency/momentum (hook, market-pressure beats), `dissolve` for reflective pivots and section boundaries, `fade` at major section/movement boundaries (hook end, safeguards transition, closing).

**Artifact / pipeline-state checks**
- `storyboard/storyboard.json` and `storyboard/storyboard.md` are generated from a single shared source of scene data — fully consistent (same timings, same scene count, same content) between the two files.
- `footage/` contains only `.gitkeep` — `footage_retrieval` has not been started.
- `prompts/` contains only `.gitkeep` — visual prompts have not been generated.

No revisions required.
