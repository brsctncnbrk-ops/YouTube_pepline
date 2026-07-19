---
name: factforge-production-plan
description: Authors the canonical full-duration ORVYQ shot plan from the completed storyboard, evidence map, footage manifest, direction plan, canonical narration timeline, and Remotion composition. Use when a project's manifest current_stage is production_plan.
---

# ORVYQ Canonical Production Plan

You create the single editorial source of truth used by both the human-reviewed proof and the final full render.

The old approach of maintaining a polished short proof separately from an unfinished full-film plan is forbidden. Audio, editorial pauses, captions, shots, proof, and full render must use one pause-expanded canonical timeline. Any later plan or narration-timeline change invalidates proof approval through SHA-256 drift detection.

## Inputs

Read all of the following before writing:

- `direction/narration_timeline.json` — authoritative source duration, editorial-pause transform, semantic proof boundary, full output duration, and voice SHA-256.
- `remotion/composition.json` — exact fps and total duration; it must equal `narration_timeline.full_duration_frames`.
- `storyboard/storyboard.json` — narration purpose and section flow.
- `direction/direction_plan.md` — pacing and emotional direction.
- `footage/footage_manifest.json` and `footage/scene_asset_map.json` when present — licensed assets, trim limits, and provenance.
- `research/evidence_map.json` plus `research/evidence_resolutions.json` when present — active claims, sources, limitations, and allowed evidence treatments.
- `research/primary_evidence_manifest.json` and runtime evidence manifest when present.
- project style documents and any user-approved proof grammar from prior reviews.

Standalone legacy files such as `cinematic_proof_cut.json`, `proof_preview_cut.json`, or `motion_hook.json` may not seed a new canonical plan. Migrate or remove them first.

## Output

Author `direction/production_plan.json` matching `schemas/orvyq_production_plan.schema.json`.

It must contain:

- `status: "ready"` only after every rule below passes;
- exact `fps` and `duration_frames` matching both composition and canonical narration timeline;
- a `proof` object using `type: "prefix"`, a minimum output duration, and `semantic_boundary_required: true`;
- a quality-policy SHA-256 binding to `direction/narration_timeline.json`;
- full-film sections covering frame 0 through the final frame without gaps;
- explicit shots covering frame 0 through the final frame without gaps or overlaps;
- the same approved cinematic grammar throughout the complete film, not only the proof prefix.

A ready hash-bound plan may not be regenerated in place. Create an intentional new plan revision and invalidate approval instead.

## Non-negotiable shot rules

Every shot must declare:

- stable `shot_id`, `scene_id`, and `section_id`;
- exact `start_frame` and `end_frame`;
- a verified active `claim_id`;
- `visual_role`: evidence, archive, context, metaphor, or graphic;
- a specific editorial purpose of at least one complete sentence;
- an explicit footage, evidence, or graphic asset;
- transitions and whether it is generic stock.

Additionally:

1. No shot may exceed the configured maximum, normally eight seconds.
2. No automatic asset-pool fallback is permitted.
3. Evidence must appear before metaphor intensifies the same claim.
4. Critical claims may not be carried only by generic stock.
5. Generic stock, evidence/archive, and full-screen graphic fractions must satisfy the quality policy across the whole film.
6. The same source or footage asset may not exceed the configured reuse limit.
7. Footage trims must exactly match shot duration and remain inside the licensed source duration.
8. Evidence images must be paired with evidence asset IDs and visible source labels.
9. Removed or unresolved claims are forbidden.
10. Editorial pauses, emphasis beats, music states, captions, and visuals must use the same canonical time transform.
11. Long runs of documents or tables must be interrupted by semantically relevant moving context, archive, human-scale decisions, or restrained metaphor.
12. Exactly one `brand_close` is allowed. It must be the final shot and end at `duration_frames`. A section bridge must never imitate a film ending.
13. The final section must resolve visually and musically rather than ending on a document or unresolved graphic.

## Proof/full identity rule

The proof is not a second edit and 150 seconds is not a cut point. The system must:

1. treat the configured proof duration as a minimum;
2. select the first complete script paragraph at or after that minimum;
3. apply the same editorial-pause transform used by the full film;
4. extend to the next exact canonical shot boundary;
5. reject a boundary that resolves to a terminal brand graphic.

Therefore:

- the first proof frames of the full render are identical to the reviewed proof;
- no narration may be physically cut at an arbitrary duration or in the middle of a word;
- do not author proof-only shot definitions;
- do not change either the canonical plan or narration timeline after approval without intentionally creating and approving a new proof.

## Validation

Run:

```bash
node scripts/orvyq_production_plan.mjs validate --project-id <project_id>
```

This command runs both the mechanical production-plan validator and the fail-closed canonical timeline contract. Read:

- `qa/production_plan_audit.json`
- `qa/canonical_timeline_contract.json`

Fix every issue. Do not mark the plan ready by suppressing or weakening a gate.

When valid, advance:

```bash
node scripts/manifest_cli.mjs advance --project-id <project_id> --stage production_plan --result success
```

Never hand-edit `manifest.json`.
