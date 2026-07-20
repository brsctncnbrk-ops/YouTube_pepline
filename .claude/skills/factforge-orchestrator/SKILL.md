---
name: factforge-orchestrator
description: Owns and sequences the ORVYQ / FactForge documentary pipeline, including canonical full-film production planning, proof rendering, human proof approval, full render, packaging, and final QA.
---

# ORVYQ / FactForge Orchestrator

You manage state and sequencing. Producer and QA skills do the creative or judgment work. Never hand-edit `projects/<id>/manifest.json`; all state changes go through `node scripts/manifest_cli.mjs`.

The manifest and canonical production plan are authoritative. Conversation memory, a successful short render, or a UI checkbox can never substitute for those files.

## Pipeline

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

The critical architectural rule is that `direction/production_plan.json` covers the complete film before any proof is rendered. The proof is the exact opening prefix of that same plan. `qa/proof_approval.json` is bound to the production-plan SHA-256. A plan change invalidates the approval automatically.

## Stage-to-skill mapping

| current_stage | Skill |
|---|---|
| research | factforge-research |
| research_qa | factforge-research-qa |
| script | factforge-script |
| fact_audit | factforge-fact-audit |
| script_qa | factforge-script-qa |
| voice_script | factforge-voice |
| voice_qa | factforge-voice-qa |
| storyboard | factforge-storyboard |
| storyboard_qa | factforge-storyboard-qa |
| footage_retrieval | factforge-footage-retrieval |
| visual_style_bible | factforge-visual-style-bible |
| visual_prompt | factforge-visual-prompt |
| visual_qa | factforge-visual-qa |
| director | factforge-director |
| remotion | factforge-motion |
| production_plan | factforge-production-plan |
| production_plan_qa | factforge-production-plan-qa |
| editor | factforge-editor |
| proof_qa | factforge-proof-qa |
| render_qa | factforge-render-qa |
| packaging | factforge-packaging |
| final_qa | factforge-final-qa |

Read `scripts/lib/pipeline.mjs` for exact required and output files.

## Standard commands

- Start: `node scripts/manifest_cli.mjs init ...`
- Status: `node scripts/manifest_cli.mjs status --project-id <id>`
- Audio ready: `node scripts/manifest_cli.mjs gate --project-id <id> --gate audio`
- Visual assets ready: `node scripts/manifest_cli.mjs gate --project-id <id> --gate visual_assets`
- Retry: `node scripts/manifest_cli.mjs retry --project-id <id>`
- Reset: `node scripts/manifest_cli.mjs reset-stage --project-id <id> --stage <stage> [--force-clean]`
- Validate full plan: `node scripts/orvyq_production_plan.mjs validate --project-id <id>`
- Build proof plan: `node scripts/orvyq_production_plan.mjs build-proof --project-id <id>`
- Check proof approval: `node scripts/orvyq_production_plan.mjs check-approval --project-id <id>`
- Build approved full plan: `node scripts/orvyq_production_plan.mjs build-full --project-id <id>`

## Proof lifecycle

1. `production_plan` authors the complete timeline.
2. `production_plan_qa` validates the complete timeline.
3. `editor` assembles the render project.
4. `proof_qa` compiles the exact proof prefix from the canonical plan.
5. Trigger:

```bash
gh workflow run orvyq-proof.yml -f project_id=<id>
```

6. Review the rendered video, not only automated reports.
7. Approve through `orvyq-approve-proof.yml`, supplying the successful proof run ID, source commit SHA, human score, and review note.
8. `render_qa` verifies the approval hash still matches the plan.
9. Trigger the full render only after the approval gate passes:

```bash
gh workflow run render.yml -f project_id=<id>
```

Do not use the legacy `orvyq-preview.yml` as the approval authority for new projects. It remains only for historical diagnostics during migration.

## Hard stops

Never claim a project is ready for full render when any of these is true:

- `direction/production_plan.json` is absent or `status` is not `ready`;
- shots or sections do not cover the complete duration;
- unresolved claims remain;
- assets or provenance are incomplete;
- the proof is based on a separate cut;
- `qa/proof_approval.json` is absent;
- the proof score is below the plan minimum;
- the production-plan SHA differs from the approved SHA;
- full render was not built by `build-full`.

A successful proof demonstrates the grammar. It does not prove that the remaining film was authored. Only the canonical full-plan audit proves that.

## Status reporting

Be concise and explicit:

- current stage;
- exact blocker;
- whether the canonical full plan is complete;
- whether a proof exists;
- whether approval is valid for the current plan hash;
- the next executable action.

Never describe work as completed solely because it was discussed or visually approved in conversation.
