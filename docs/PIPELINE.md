# ORVYQ / FactForge Pipeline

## Canonical stage graph

```text
research -> research_qa -> script -> fact_audit -> script_qa
-> voice_script -> voice_qa
-- audio gate --
-> storyboard -> storyboard_qa -> footage_retrieval
-> visual_style_bible -> visual_prompt -> visual_qa
-- visual-assets gate --
-> director -> remotion
-> production_plan -> production_plan_qa
-> editor -> proof_qa
-- external canonical proof render + human approval --
-> render_qa
-- external full render --
-> packaging -> final_qa -> DONE
```

The machine-readable authority is `scripts/lib/pipeline.mjs`.

## Why the production-plan stages exist

A polished short proof does not guarantee that the complete documentary has been authored. The previous system allowed the proof cut and the full-film plan to drift: the proof could pass while the remaining timeline had only section notes or legacy footage.

The updated system requires `direction/production_plan.json` before any approval proof is generated. It is the single source of truth for:

- every section and shot across the full duration;
- claim-to-visual mapping;
- exact assets and footage trims;
- evidence attribution and limitations;
- pacing, transitions, emphasis beats, and music states;
- generic-stock, evidence/archive, graphic, and source-reuse policies.

The proof is generated as the exact opening prefix of this plan. There is no separate proof edit.

## Production-plan lifecycle

### `production_plan`

`factforge-production-plan` authors `direction/production_plan.json` from the completed storyboard, direction, composition, evidence map, and licensed assets.

### `production_plan_qa`

`factforge-production-plan-qa` runs:

```bash
node scripts/orvyq_production_plan.mjs validate --project-id <id>
```

The gate requires exact full timeline coverage, active claims, complete assets, valid trims, evidence balance, source reuse limits, and an exact proof boundary. Results are written to `qa/production_plan_audit.json` and summarized in `qa/production_plan_qa.md`.

### `proof_qa`

`factforge-proof-qa` compiles the exact prefix:

```bash
node scripts/orvyq_production_plan.mjs build-proof --project-id <id>
```

Then the external proof render is triggered:

```bash
gh workflow run orvyq-proof.yml -f project_id=<id>
```

### Human approval

Approval is recorded only after reviewing the rendered video. `orvyq-approve-proof.yml` verifies that the proof workflow succeeded and that its source commit matches the supplied SHA. It writes `qa/proof_approval.json` containing:

- proof run ID;
- source commit SHA;
- human score;
- review type;
- SHA-256 of the complete canonical production plan.

Any plan change invalidates the approval automatically.

### `render_qa`

The final gate requires:

```bash
node scripts/orvyq_production_plan.mjs validate --project-id <id>
node scripts/orvyq_production_plan.mjs check-approval --project-id <id>
node scripts/orvyq_production_plan.mjs build-full --project-id <id>
node scripts/validate.mjs render-ready --project-id <id>
```

Only then may the full render run:

```bash
gh workflow run render.yml -f project_id=<id>
```

The full workflow repeats the plan and approval-hash gates independently. UI checkboxes cannot bypass them.

## Manifest statuses

| Status | Meaning |
|---|---|
| `NOT_STARTED` | Project scaffolded. |
| `IN_PROGRESS` | A pipeline stage is active. |
| `WAITING_FOR_AUDIO` | Manual narration file is missing. |
| `WAITING_FOR_VISUAL_ASSETS` | Required footage or fallback images are missing. |
| `READY_FOR_PROOF_RENDER` | Canonical plan and proof preflight passed. |
| `PROOF_RENDERING` | Proof workflow is running. |
| `WAITING_FOR_PROOF_APPROVAL` | Rendered proof awaits human review. |
| `PROOF_APPROVED` | Human approval exists for the current plan hash. |
| `READY_FOR_RENDER` | Full plan, approval hash, assets, and render project passed. |
| `RENDERING` | Full workflow is running. |
| `RENDER_DONE` | Full video exists. |
| `DONE` | Packaging and final QA passed. |
| `ERROR` | A deterministic or judgment gate failed. |

## Error classes added by the canonical system

- `PRODUCTION_PLAN_INCOMPLETE` — full timeline, assets, claims, or quality policy failed.
- `PROOF_APPROVAL_REQUIRED` — no valid rendered-video approval exists.
- `PROOF_PLAN_DRIFT` — the plan changed after proof approval.

## Core invariant

A proof may demonstrate the visual grammar. Only a complete canonical plan proves that the grammar was extended to the entire film.
