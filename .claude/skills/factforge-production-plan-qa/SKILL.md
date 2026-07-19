---
name: factforge-production-plan-qa
description: Performs deterministic and editorial QA on the canonical full-duration ORVYQ production plan. Use when current_stage is production_plan_qa.
---

# ORVYQ Production Plan QA

This is the full-film editorial gate. Passing a short proof is not sufficient; this gate verifies that the same standard has actually been authored across the complete timeline.

## Mechanical checks

Run:

```bash
node scripts/orvyq_production_plan.mjs validate --project-id <project_id>
```

The command writes `qa/production_plan_audit.json` and must pass all of the following:

- exact full timeline coverage with no gaps or overlaps;
- exact section coverage;
- exact proof-prefix shot boundary;
- valid active claims and no unresolved claims;
- explicit existing assets and matching footage trims;
- maximum shot duration;
- source reuse limits;
- generic-stock, evidence/archive, and graphic fractions;
- visible evidence attribution;
- no automatic fallback.

## Judgment-based review

Review the whole `direction/production_plan.json`, not only its first 150 seconds. Confirm:

- every section has a distinct dramatic function and music state;
- the approved proof grammar continues across all sections;
- documents/tables never dominate for an extended run;
- moving context is semantically relevant and never presented as literal evidence;
- evidence precedes metaphor;
- pacing varies intentionally without three mechanical equal-duration shots in a row;
- recurring motifs are controlled;
- limitations remain readable and prominent;
- the final section has a deliberate visual and musical release.

Write `qa/production_plan_qa.md` with the mechanical result, qualitative findings, and a clear PASS/FAIL verdict.

On PASS:

```bash
node scripts/manifest_cli.mjs advance --project-id <project_id> --stage production_plan_qa --result success
```

On FAIL, leave the project at this stage and return it to `factforge-production-plan` for revision. Never weaken the policy to force a pass.
