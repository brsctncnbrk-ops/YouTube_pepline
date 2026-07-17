# ORVYQ Evidence-Led Quality Overhaul

## Objective

Raise ORVYQ from a technically valid stock-footage documentary to a publishable, directed video essay with an evidence-based Aperture reference-alignment score of at least 95/100.

The target is editorial method and finish, not copying Aperture's text, visuals, music, or branding.

## Baseline

The last reviewed two-minute render passed technical QA but scored 73/100 in human editorial review. The primary deficits were:

- generic stock footage used as the visual equivalent of keywords;
- important research claims shown as labels over unrelated footage rather than visible evidence;
- repeated server, terminal, lock, government and city motifs;
- source and limitation text too small for mobile viewing;
- mechanical shot timing;
- a flat single-loop music bed;
- no safe full-duration editorial plan for the remaining film.

## Non-negotiable production rules

1. A shot must map to a claim in `research/evidence_map.json`.
2. A shot must declare an editorial purpose and visual role: evidence, archive, context, metaphor, or graphic.
3. Evidence must be shown before a metaphor is used to intensify it.
4. Critical claims cannot be carried only by generic stock.
5. Every source reconstruction must be visibly labelled as an ORVYQ recreation or source summary.
6. Important limitations must appear at main-reading hierarchy, not as tiny footnotes.
7. Any footage source or visual motif may appear at most twice.
8. Generic stock may occupy at most 25% of the timeline.
9. Evidence/archive material must occupy at least 30% of the timeline.
10. Full-screen graphics may occupy at most 10% of the timeline.
11. A single shot may not exceed eight seconds without a specific human-approved exception.
12. The full edit may never be auto-filled from an asset pool.
13. A full render requires a human-reviewed two-minute proof at 95%+.
14. Automated readiness is not the final Aperture score.

## Source architecture

`research/evidence_map.json` is the factual and visual-evidence authority. It records:

- official source title, publisher, date and URL;
- claim status: verified, attributed commentary, rewrite required, or source required;
- limitations that must remain visible;
- claim-specific visual-evidence requirements;
- allowed visual treatments;
- full-render blockers.

A full render is blocked while any claim remains `rewrite_required` or `source_required`.

## Editorial architecture

`direction/editorial_blueprint.json` defines:

- global quality policy;
- nine full-film sections;
- music state and dramatic function for every section;
- required evidence, context, metaphor and graphic balance;
- the full-production research blockers.

`direction/proof_preview_cut.json` defines the exact two-minute execution cut. Separating the blueprint from the cut allows editorial strategy to remain stable while shot timing and mobile presentation are revised precisely.

## Proof-cut visual method

The proof must demonstrate all of the following in one coherent sequence:

- an immediate branded question;
- real public safety-framework context;
- a clearly attributed incentive interpretation;
- primary research title/date;
- visible study scope and limitation;
- a labelled reconstruction of the fictional email scenario;
- a process diagram over moving footage;
- a test-versus-incident distinction;
- readable source context on a phone;
- restrained context footage and metaphor;
- a clean, complete narration ending and visual release.

## Remotion system

`EditorialOverlay.tsx` renders source-aware overlays over moving footage. Supported modes:

- source mosaic;
- comparison;
- document reconstruction;
- statistic;
- process;
- synthetic email reconstruction;
- sourced quote summary;
- limitation/boundary frame.

The overlay system uses large typography, explicit source/recreation labels, strong contrast and a safe upper-left reading zone that does not collide with captions.

## Audio system

The two-minute proof uses a four-movement original score:

1. controlled tension — opening paradox;
2. analytical unease — reports and evaluation setup;
3. engineered pressure — replacement threat and harmful result;
4. reflective release — limitation and outro.

The score is generated only from harmonic oscillators, uses no procedural noise and is ducked beneath narration.

A full render cannot repeat the two-minute proof score. It requires either:

- an approved full-duration licensed bed/cue structure; or
- an explicit full-duration ORVYQ cue sheet and score implementation.

## Automated audits

### Evidence coverage

`scripts/orvyq_evidence_audit.mjs`

- validates every active claim;
- validates source IDs;
- measures weighted supported coverage;
- measures weighted visual-evidence coverage;
- blocks unresolved full-film claims.

### Semantic visual audit

`scripts/orvyq_semantic_visual_audit.mjs`

- validates visual roles and editorial purpose;
- enforces generic-stock, evidence and graphic fractions;
- blocks critical claims without evidence;
- detects repeated motifs and consecutive source reuse.

### Pacing audit

`scripts/orvyq_pacing_audit.mjs`

- enforces maximum shot duration;
- requires sufficient reading time for overlays;
- blocks three identical durations in a row;
- requires short, medium and long shots;
- warns about excessive hard cuts.

### Mobile legibility audit

`scripts/orvyq_mobile_legibility_audit.mjs`

- enforces minimum overlay type size;
- limits title/body length;
- requires visible source context;
- requires recreation labels for recreated documents and emails.

### Alignment readiness

`scripts/orvyq_alignment_score.mjs`

- combines narration, evidence, semantics, pacing, legibility, music structure and technical readiness;
- produces an automated readiness score;
- never produces a final Aperture score;
- requires human review of the rendered video.

## Full-render protection

`scripts/orvyq_edit_plan.mjs` no longer selects fallback footage.

In full mode it requires:

- `full_production.status = ready`;
- no blocking or unresolved claims;
- an explicit `full_production.shots` array;
- every shot mapped to a claim and section;
- exact asset, trim, duration, role and editorial purpose;
- exact coverage of the approved composition duration.

`orvyq_edit_plan_tests.mjs` additionally requires `qa/proof_approval.json` with:

- `approved: true`;
- `review_type: human_rendered_video_review`;
- `aperture_alignment_score >= 95`.

## Workflow policy

During the rebuild, preview and diagnostic workflows are manual-only so incremental commits do not trigger expensive renders.

The next render is permitted only after:

1. all evidence-led code and audits are complete;
2. CI passes;
3. the proof cut passes pre-render audits;
4. the workflow trigger is deliberately restored;
5. exactly one new two-minute proof is generated.

No full render may start from this document or from automated readiness alone.

## Current implementation state

Completed:

- claim-level evidence map;
- full-film section blueprint;
- exact evidence-led proof cut;
- source-aware mobile overlay system;
- evidence, semantic, pacing and mobile audits;
- automated readiness report with mandatory human gate;
- four-movement proof score;
- removal of automatic full-edit fallback;
- proof-approval gate for full render;
- aligned preview and diagnostic environments.

Still required before the next proof render:

- run the complete audit stack in GitHub Actions;
- resolve any audit or type-check failures;
- restore the preview trigger for one deliberate run;
- download and conduct human visual/audio review;
- record the human score and next decision.

Still required before any full render:

- resolve all full-script claims marked source/rewrite required;
- obtain and log the remaining primary evidence assets;
- author every full-duration shot explicitly;
- build a full-duration music cue structure;
- approve the proof at 95%+.
