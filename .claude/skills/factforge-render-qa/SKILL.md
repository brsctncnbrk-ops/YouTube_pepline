---
name: factforge-render-qa
description: Final technical and approval gate before the expensive full ORVYQ GitHub Actions render. Use when current_stage is render_qa.
---

# ORVYQ Full Render QA

This is the last checkpoint before the expensive full render. A successful proof alone is not enough. The complete canonical production plan and its hash-bound human approval must both be valid.

## Step 1 — canonical plan gate

Run:

```bash
node scripts/orvyq_production_plan.mjs validate --project-id <project_id>
```

Require:

- `direction/production_plan.json` exists and has `status: "ready"`;
- sections and shots cover the complete composition duration;
- no unresolved or removed claims are referenced;
- all assets, trims, source reuse limits, role fractions, and quality policies pass;
- the proof boundary is an exact canonical shot boundary.

## Step 2 — proof approval and drift gate

Run:

```bash
node scripts/orvyq_production_plan.mjs check-approval --project-id <project_id>
```

Require:

- explicit human rendered-video review;
- score at or above the production-plan minimum;
- successful proof run ID and source commit SHA;
- `qa/proof_approval.json.production_plan_sha256` exactly equals the current plan hash.

If the hash differs, stop with `PROOF_PLAN_DRIFT`. The proof must be rebuilt and approved again. Never copy or edit the old hash.

## Step 3 — compile the exact approved full edit

```bash
node scripts/orvyq_production_plan.mjs build-full --project-id <project_id>
```

Confirm `direction/edit_plan.json` has:

- `render_mode: "full"`;
- `preview: false`;
- full composition duration;
- the same `production_plan_sha256` as the approval;
- every canonical shot.

## Step 4 — standard render readiness

```bash
node scripts/manifest_cli.mjs qa --project-id <project_id> --gate render_qa
node scripts/validate.mjs render-ready --project-id <project_id>
```

Also inspect the complete timeline for contiguous frames, correct dimensions, captions, audio mix, provenance, and final-section release.

Write the judgment result into `qa/render_qa.md`.

## Pass

Advance, then prepare render:

```bash
node scripts/manifest_cli.mjs advance --project-id <project_id> --stage render_qa --result success
node scripts/manifest_cli.mjs prepare-render --project-id <project_id>
```

Trigger only:

```bash
gh workflow run render.yml -f project_id=<project_id>
```

The workflow independently repeats the canonical-plan and approval-hash gates. Deprecated UI approval inputs cannot bypass them.

## Fail

Do not run `prepare-render`. Report the exact failing layer:

- plan incomplete → production_plan;
- editorial plan quality failed → production_plan_qa;
- proof missing or score low → new proof review;
- plan hash drift → new proof render and approval;
- render project/assets missing → editor/remotion/assets.

Never hand-edit `manifest.json`.
