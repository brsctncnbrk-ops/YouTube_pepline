---
name: factforge-proof-qa
description: Prepares and validates the exact proof prefix derived from the canonical ORVYQ production plan before a human review render. Use when current_stage is proof_qa.
---

# ORVYQ Canonical Proof QA

The proof is the exact opening prefix of `direction/production_plan.json`. It is not a separate edit and may not contain proof-only shots.

## Preflight

Run:

```bash
node scripts/orvyq_production_plan.mjs validate --project-id <project_id>
node scripts/orvyq_production_plan.mjs build-proof --project-id <project_id>
node scripts/remotion_build.mjs derive-configs --project-id <project_id>
node scripts/remotion_build.mjs build-project --project-id <project_id>
```

Confirm:

- `direction/edit_plan.json` has `render_mode: "proof"`;
- its `production_plan_sha256` matches `qa/production_plan_audit.json`;
- its duration equals `production_plan.proof.duration_frames`;
- its shots are byte-for-byte derived from the opening canonical shots;
- narration, pauses, captions, music, evidence labels, and asset provenance are ready.

Write `qa/proof_qa.md` with the preflight result and source-plan hash.

On PASS, advance:

```bash
node scripts/manifest_cli.mjs advance --project-id <project_id> --stage proof_qa --result success
```

Then trigger only the system workflow:

```bash
gh workflow run orvyq-proof.yml -f project_id=<project_id>
```

After the rendered proof is reviewed, record approval only through `orvyq-approve-proof.yml` or `scripts/orvyq_production_plan.mjs approve-proof`. The approval must contain the successful proof run ID, source commit SHA, human score, and current production-plan SHA-256.

Any production-plan change after approval invalidates it and requires a new proof render. Never copy an old approval forward.
