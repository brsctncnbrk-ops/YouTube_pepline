# research_qa QA — 001-the-ai-race-no-one-can-afford-to-win

### Automated Checks

- Overall: PASS
- Schema (research/research.json): PASS
- Assets: PASS
- Scene filenames/numbering: PASS
- Prompt-to-scene coverage (fallback scenes only): PASS
- Footage provenance coverage: PASS
- Packaging deliverables: PASS
- Fact audit complete: PASS
- Zero hedge tokens in script: PASS

### Judgment-Based Checks

**Verdict: PASS**

- **Source count/quality**: 27 sources, 12 primary/official (Anthropic, OpenAI, ACM, UK NCSC, EU AI Act official text, Montreal Declaration official site, International AI Safety Report, Turing's own 1950 paper) — well above the 8-minimum/5-primary floor and above the 10–15 preferred range. Secondary sources (Wikipedia, aggregators) are explicitly flagged in their `credibility_note` as needing re-verification rather than being cited as settled fact.
- **Traceability**: Programmatically verified every `key_facts[].source_ref` and `timeline[].source_ref` resolves to a real `sources[].id` (0 unresolved). Every one of the 10 `notable_claims` carries 2 independent source_refs (meets the 2–3 minimum).
- **Factual precision on the 13 flagged claims**: All 13 were individually researched and correctly classified/corrected, not passed through as-is from the source brief:
  1. Bengio (position/Turing Award/citations) — VERIFIED, with the citation-count figure explicitly flagged as time-sensitive.
  2. Turing 1950/1951 — CORRECTED: the "machines take control" line is 1951, not 1950; both texts and the correction are documented.
  3. Anthropic state-linked cyber report — VERIFIED (Nov 2025), attribution explicitly caveated as Anthropic's own assessment.
  4. OpenAI "code red" — VERIFIED with exact date (2025-12-02) and context, correctly caveated as reporting (The Information) rather than an OpenAI-confirmed statement.
  5. Montreal Declaration — CORRECTED: Bengio was a steering-committee member/co-host, not sole author; dates (announced 2017, launched 2018) documented.
  6. International AI Safety Report — VERIFIED: official title, Jan 29 2025 publication, ~96 experts/~30 countries, Bengio as chair.
  7. "The Day After" — PARTIALLY_VERIFIED/nuanced: broadcast facts and Reagan's reported reaction documented, but explicitly presented as one of several contributing factors (Able Archer 83, Gorbachev's rise), not sole causation.
  8. EU AI Act — VERIFIED: Article 9 (risk management) and Article 51 (systemic risk, 10^25 FLOP threshold) both cited to the Act's own text.
  9. Deceptive alignment/shutdown resistance/blackmail — VERIFIED as controlled-evaluation findings, explicitly caveated (per the lead researcher's own clarification) as scenario-engineered rather than spontaneous — this nuance is preserved in both `research.md` and the `open_questions`.
  10. AI-assisted bio/chem/cyber misuse — PARTIALLY_VERIFIED, kept high-level (uplift-over-2021-baseline framing, no operational detail).
  11. "Mirror life" — VERIFIED, correctly framed as a preventable/long-horizon (10–30 year) risk, not imminent.
  12. Cognitive job displacement in 5 years — FORECAST/DISPUTED: Amodei's industry forecast is explicitly contrasted with more conservative Goldman Sachs-derived estimates; flagged as contested rather than settled.
  13. Humanoid robots/physical infrastructure — SPECULATIVE: framed as unverified corporate projections, with Tesla's history of missed timelines noted as relevant context; recommended for exclusion or heavy hedging at script stage.
- **Evidence vs. forecast separation**: Consistently maintained — `open_questions` and the "Corrections to the Source Brief" section in `research.md` explicitly call out which claims are contested forecasts (job displacement, humanoid robots) versus documented evidence (cyber incidents, regulatory text).
- **Open vs. closed AI balance**: The thesis and `unique_angles` hold both risks (catastrophic misuse vs. concentrated power) in tension rather than resolving toward one side. One gap: the concrete misuse case studies found (Anthropic disclosures) all involve a *closed* model, so there isn't yet a documented open-weight-model misuse case for symmetry. This is flagged in `open_questions_angles` as something the scriptwriter/next research pass should actively balance — not a blocking gap, since the general tension is already well-articulated, but worth a targeted follow-up search during `script`/`fact_audit`.
- **Operational safety**: No lab procedures, attack commands, exploit code, or target-selection detail anywhere in the output — bio/chem/cyber content stays at the capability/policy level throughout.
- **No copied interview language / no Bengio personal material**: Confirmed absent — no anecdotes, no interview dialogue, no personal quotes beyond the sourced, institutional facts above.
- **Internal date consistency**: Cross-checked `key_facts` dates against `timeline` dates — no contradictions found.
- **`topic_discovery` completeness**: `core_topic`/`thesis` are substantive (not restatements of the one-line video idea); `unique_angles` are genuinely distinct framings (Turing misattribution as meta-example, compute-threshold-favors-incumbents angle, closed-model-still-gets-misused angle), not rephrasings of the thesis.
- **`source_structure_summary`**: Present and non-trivial (10-item topic order, 8-step argument sequence derived from the brief's own source material) — usable by `factforge-final-qa` later for reused-content comparison.
- **Script readiness**: Sufficient material (27 facts, 19-event timeline, 10 well-sourced notable claims, explicit corrections and open questions) exists for a scriptwriter to build a 10–12 minute (~1,550–1,850 word) script without inventing facts.

**Recommendation for the script stage**: preserve the "controlled evaluation, not spontaneous behavior" caveat when dramatizing the blackmail/deception findings; keep the job-displacement and humanoid-robot claims explicitly hedged or omitted; seek one additional example of open-weight-model misuse or defensive use during script/fact-audit research to fully balance the open-source side of the control paradox.
