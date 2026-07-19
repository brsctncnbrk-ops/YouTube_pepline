---
name: factforge-proof-qa
description: Prepares and validates the semantic proof prefix derived from the canonical ORVYQ production plan and narration timeline before a human review render. Use when current_stage is proof_qa.
---

# ORVYQ Canonical Proof QA

The proof is the exact opening prefix of `direction/production_plan.json`, interpreted through `direction/narration_timeline.json`. It is not a separate edit and may not contain proof-only shots.

The configured duration, normally 150 seconds, is a minimum—not a physical audio cut point. The proof must end after the first complete script paragraph at or beyond that minimum and then extend to the next canonical shot boundary.

## Preflight

Run:

```bash
node scripts/orvyq_production_plan.mjs validate --project-id <project_id>
node scripts/orvyq_production_plan.mjs build-proof --project-id <project_id>
node scripts/remotion_build.mjs derive-configs --project-id <project_id>
node scripts/remotion_build.mjs build-project --project-id <project_id>
```

Confirm:

- `qa/canonical_timeline_contract.json` passes;
- `direction/edit_plan.json` has `render_mode: "proof"`;
- its `production_plan_sha256` matches `qa/production_plan_audit.json`;
- its `narration_timeline_asset` points to the hash-bound canonical timeline;
- its duration equals `qa/effective_proof_window.json`, not merely the configured proof minimum;
- `effective_proof_window.semantic_terminal_text` ends with terminal punctuation;
- its shots are derived from the opening canonical shots;
- it contains no `brand_close` or other terminal film graphic;
- narration, pauses, visuals, captions, music, evidence labels, and asset provenance use one identical time transform.

Run the complete audit suite. It must include the canonical timeline audit and must pass every check before rendering.

Write `qa/proof_qa.md` with the preflight result, semantic paragraph boundary, proof duration, narration-timeline hash, and source-plan hash.

On PASS, advance:

```bash
node scripts/manifest_cli.mjs advance --project-id <project_id> --stage proof_qa --result success
```

Then trigger only the system workflow:

```bash
gh workflow run orvyq-proof.yml -f project_id=<project_id>
```

## Post-render hard gate

The rendered proof must pass all of the following:

- media and speech QA;
- `scripts/orvyq_rendered_proof_ending_audit.mjs`;
- final recognized token has terminal punctuation and acceptable confidence;
- spoken ending matches the semantic paragraph boundary;
- no mid-word or mid-sentence ending;
- no internal ORVYQ closing card.

After the rendered proof is reviewed, record approval only through `orvyq-approve-proof.yml` or `scripts/orvyq_production_plan.mjs approve-proof`. The approval must contain the successful proof run ID, source commit SHA, human score, and current production-plan SHA-256.

Any production-plan or narration-timeline change after approval invalidates it and requires a new proof render. Never copy an old approval forward.
