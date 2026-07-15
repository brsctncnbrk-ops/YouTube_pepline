# voice_qa QA — 001-the-ai-race-no-one-can-afford-to-win

### Automated Checks

- Overall: PASS
- Assets: PASS
- Scene filenames/numbering: PASS
- Prompt-to-scene coverage (fallback scenes only): PASS
- Footage provenance coverage: PASS
- Packaging deliverables: PASS
- Fact audit complete: PASS
- Zero hedge tokens in script: PASS

### Judgment-Based Checks

**Context:** first voice pass for this project, produced from the
post-refinement, fact-audited, script_qa-passed `scripts/script.md`.

- **Paste-ready as-is:** Yes. `voice_script.txt` contains only narration
  prose — all Markdown headings (`# Title`, `## Hook`, `## Section: ...`)
  removed, no metadata/commentary embedded. Verified programmatically: no
  `#`/`##` lines remain in the file.
- **Hard-to-pronounce content:** No proper names, foreign terms, or
  acronyms requiring phoneticization appear in the spoken text (script
  deliberately omits company/product names). Numbers are all in
  narration-friendly language ("half a million dollars," "one to five
  years") — nothing needing digit-by-digit reading. Confirmed accurate in
  `voice_notes.md`.
- **Pause points:** Blank lines land at genuine beat/paragraph boundaries
  matching the original section breaks; the closing has extra short
  standalone lines ("Maybe nothing sudden.", "That work hasn't been done
  yet.") as deliberate slow, reflective beats. Natural, not arbitrary.
- **Sentence length / run-ons:** Checked every sentence programmatically.
  Found three sentences with a long (20+ word) unbroken clause and no
  internal comma/dash breath point — the espionage-campaign sentence in
  the cyber passage, the "who writes the rules" sentence in The Control
  Paradox, and the "power itself"/sunset-clauses sentence in Safeguards.
  Split each into two sentences at the natural clause boundary (period
  replacing a comma/connector only — no wording, facts, or hedges changed).
  Longest remaining sentence is 48 words in the closing, which retains
  frequent internal commas/em-dash and is intentionally one cascading
  thought for the slower, reflective closing register — acceptable as
  written.
- **Pacing vs. tone match:** Dramatic/tense beats (cyber, dark-turning-point
  sections) are not rushed by the pause markers; the closing's blank-line
  spacing and added ellipsis ("It's still being decided... by people, right
  now.") support a slower, unhurried delivery as directed.
- **Content integrity vs. `scripts/script.md`:** Programmatically confirmed
  all existing factual hedges are preserved verbatim ("may allow smaller
  teams," "may also be better able," "centralized access did not eliminate
  misuse," "provider visibility," "investigate, restrict, and disrupt").
  No new claims, dates, examples, or statistics introduced. No
  CTA/comment/subscribe language present anywhere in the file
  (`closing.cta: "none"` honored).

**Verdict: PASS** (after in-place breath-point fixes to three sentences,
documented above and in `voice/voice_notes.md`).
