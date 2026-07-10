---
name: factforge-fact-audit
description: Runs the post-draft Fact Audit for a FactForge video - scans the finished script for factual/statistical/scientific/health/named claims and verifies each one independently. Use when a FactForge project's manifest current_stage is "fact_audit".
---

# FactForge Fact Audit

You run **after** `factforge-script` and **before** `script_qa` — the script
was written to read confident and fluent, with zero hedging, on the
understanding that verification happens here, in a separate pass, not during
writing. You do not rewrite the script's voice or structure; you verify,
replace, or cut specific claims.

There is **no separate QA gate** for this stage — you are both the producer
and the auditor. Hold yourself to the same bar a QA gate would: don't let a
shaky claim through because you're also the one who has to fix it.

## Step 1 — find the claims

Read `scripts/script.md` (the prose actually being spoken — not just
`script_metadata.json`, which won't contain a phrase-level view). Extract
every claim that is factual, statistical, scientific, health-related,
psychological, or that names a specific person/study/organization. Tag each
with a `category`: `health`, `psychological`, `scientific`, `statistical`,
`named`, or `other`.

## Step 2 — check the registry first, verify independently if it misses

For **every** claim, run:

```
node scripts/fact_registry_cli.mjs lookup --claim "<the exact claim text as it appears in the script>"
```

- If `registry_hit: true` — the claim has a non-expired `verified` entry
  already. You may treat it as `registry_hit: true` in your report without
  re-verifying. This will be the exception, not the norm, for anything
  freshly pulled from research — most claims will miss.
- If `found: false`, or `found: true` but `registry_hit: false` (expired or
  previously `disputed`/`outdated`) — checking the registry is **not**
  verification by itself. You **must** independently verify the claim (use
  your web search tool against credible, current sources) before marking it
  resolved.

After verifying a claim independently, persist the result so future audits
(this project or another) get a registry hit:

```
node scripts/fact_registry_cli.mjs append --claim "<exact claim text>" \
  --category <health|psychological|scientific|statistical|named|other> \
  --verdict <verified|disputed|outdated> \
  --project-id <project_id> \
  --sources '[{"url":"...","publisher":"...","accessed_date":"..."}]' \
  --notes "<one line on what you found>"
```

## Step 3 — resolve every claim: verify, replace, or cut — never hedge

For each claim, land on exactly one outcome:

- **`verified`** — confirmed accurate (fresh check or registry hit). Leave it
  in the script as written.
- **`replaced`** — the original claim was wrong, outdated, or you can't
  confirm the specific number/detail, but a defensible, accurately-sourced
  version exists. Edit `scripts/script.md` (and `scripts/script_metadata.json`
  if the change affects word count/timing) in place to use the corrected
  version. Do **not** turn it into a hedge ("some say X may be true") —
  either state the corrected fact plainly or cut it.
- **`cut`** — no defensible version exists. Remove the claim from
  `scripts/script.md` entirely (and adjust surrounding prose so the cut
  doesn't leave a dangling transition). Re-run word counts if you touch
  `script_metadata.json`.
- **`escalated`** — reserved for claims you could not resolve on your own.
  This should be rare, and is **only acceptable for `other`/`statistical`/
  `named` categories** you intend to keep working on within this same run —
  see Step 4 for why `health`/`psychological`/`scientific` claims can't be
  left here.

## Step 4 — the hard rule for health/medical/psychological/scientific claims

Any claim in the `health`, `psychological`, or `scientific` categories is
**mandatory and non-skippable**: it must reach `verified`, `replaced`, or
`cut` before you finish. It may **not** remain `escalated`. If, after a real
attempt at independent verification, you genuinely cannot resolve one (the
science is contested, no reliable source exists either way), your options
are: cut the claim, or stop and hand it to the human via the hard-block error
in "Before finishing" below — never leave it in the script disguised as fact,
and never hedge it into vague language as a way of avoiding the decision.

## Outputs

Write both files under `projects/<project_id>/fact_audit/`:

**`claims.json`** — must validate against `schemas/fact_audit.schema.json`:

```json
{
  "schema_version": "1.0",
  "project_id": "...",
  "claims": [
    {
      "claim_text": "...",
      "category": "health",
      "location_ref": "e.g. section id or beat name",
      "registry_hit": false,
      "verification_status": "verified",
      "source_refs": ["https://..."],
      "resolution_note": "..."
    }
  ],
  "unresolved_count": 0,
  "generated_at": "<ISO 8601 timestamp>"
}
```

`unresolved_count` = the number of claims still `escalated`. It must be `0`
before you advance.

**`fact_audit_report.md`** — human-readable: one entry per claim (text,
category, status, one-line resolution note), plus a short summary at the top.

## Before finishing

1. Run `node scripts/validate.mjs fact-audit --project-id <project_id>`.
2. **If it reports `valid: true`** — advance:
   `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage fact_audit --result success`.
   This moves the project into `script_qa`, which reviews the **post-audit**
   text — make sure any `replaced`/`cut` edits are actually saved to
   `scripts/script.md`/`scripts/script_metadata.json` before you advance.
3. **If it reports `valid: false`** — do not advance.
   - If any unresolved (`escalated`) claim is `health`/`psychological`/
     `scientific`, this is a hard, non-waivable block: run
     `node scripts/manifest_cli.mjs error --project-id <project_id> --code UNRESOLVED_CLAIM --stage fact_audit --message "<which claim(s) and why they couldn't be resolved>" --action "<cut the claim, or provide a source the human trusts>"`
     and explain the blocker to the user directly — don't just log it and move on.
   - If the only unresolved claims are `statistical`/`named`/`other`, that
     means you didn't finish your own job in this pass — go back to Step 3
     and resolve them (verify, replace, or cut) rather than leaving the
     audit incomplete.

Never hand-edit `manifest.json` directly.
