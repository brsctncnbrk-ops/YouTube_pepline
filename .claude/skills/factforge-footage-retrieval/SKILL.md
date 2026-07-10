---
name: factforge-footage-retrieval
description: Selects stock footage per scene for a FactForge video, with full provenance and a fallback flag for scenes real footage can't cover. Use when a FactForge project's manifest current_stage is "footage_retrieval".
---

# FactForge Footage Retrieval

You turn the storyboard's scenes into the video's **primary visual source**:
real cinematic stock footage, calm and atmospheric (Aperture-style), not
per-scene AI stills. AI image generation (`factforge-visual-style-bible` /
`factforge-visual-prompt`, which run after you) is a narrow fallback for
scenes you flag here as unmatched — most scenes should resolve to real
footage.

You do not generate or edit video yourself; you search, score, and record
**why** each clip was chosen. The actual bytes are downloaded afterward by
`node scripts/footage_fetch.mjs fetch --project-id <project_id>` (run this
yourself once your manifest is written — it's mechanical, no judgment
needed).

## Inputs

`storyboard/storyboard.json` (`visual_need`, `mood`, `duration_sec` per
scene) and `config/footage_apis.json` (which providers are enabled,
`min_native_resolution_height`, `search_queries_per_scene`).

## Task

For **every** scene in `storyboard.json`:

1. **Generate 3-5 English search queries** from the scene's narration
   context, `mood`, and `visual_need` — concrete, filmable phrases ("hand
   hesitating over a phone screen", "empty office at dusk"), not abstract
   concepts.
2. **Search**, per query, in priority order:
   ```
   node scripts/footage_search_cli.mjs search --query "<query>" \
     --min-duration-sec <scene's duration_sec> --min-height 1080 \
     --providers pexels,pixabay,coverr
   ```
   This already applies the **hard filters** — a candidate shorter than the
   scene's `duration_sec`, or under 1080p, is excluded before you ever see
   it. Mixkit has no public API; if you want to use it, that's a manual
   curated addition only — never scrape or automate against it.
3. **Score the surviving candidates** against the scene's narration, mood,
   and visual_need — not just keyword overlap. Pick the best one.
4. **If no candidate survives** (across all queries and providers) — set
   `fallback_to_ai_visual: true` for that scene. Do **not** loop or
   freeze-frame a too-short/low-resolution clip to force a fit; that's a
   visible quality compromise the migration is specifically trying to avoid.
   A fallback-flagged scene gets picked up by `factforge-visual-style-bible`/
   `factforge-visual-prompt` next.
5. **Record your reasoning** — one line on *why* this clip, not just that it
   matched keywords (e.g. "slow push-in on a clock reads calmer than the
   busy-office alternatives, matching the scene's reflective mood"). This is
   evidence of deliberate editorial choice, not compliance bookkeeping — it
   matters if a monetization review or appeal ever asks how the video was
   made original.
6. **Trim points**: set `trim_in_sec`/`trim_out_sec` to select
   `duration_sec` worth of the clip — prefer the segment that best matches
   the visual need, not always the start of the clip.
7. **Attribution**: Pexels/Pixabay require none (`attribution_required:
   false`). Coverr's own pages disagree on API-sourced attribution terms —
   treat every Coverr pick as `attribution_required: true` by default.

## Output

Write both files under `projects/<project_id>/footage/`:

**`footage_manifest.json`** — must validate against
`schemas/footage_manifest.schema.json`:

```json
{
  "schema_version": "1.0",
  "project_id": "...",
  "scenes": [
    {
      "scene_id": "scene_001",
      "asset_type": "video",
      "source": "pexels",
      "search_queries": ["...", "...", "..."],
      "selected_url": "https://...",
      "license": "Pexels License",
      "license_verified_date": "2026-01-01",
      "attribution_required": false,
      "attribution_text": null,
      "reasoning": "...",
      "native_duration_sec": 14,
      "native_resolution": { "width": 1920, "height": 1080 },
      "trim_in_sec": 2,
      "trim_out_sec": 12,
      "fallback_to_ai_visual": false
    }
  ],
  "generated_at": "<ISO 8601 timestamp>"
}
```

For a `fallback_to_ai_visual: true` scene: `asset_type: "image"`,
`source: "ai_fallback"`, and `selected_url`/`license`/`license_verified_date`/
`native_duration_sec`/`native_resolution`/`trim_in_sec`/`trim_out_sec` all
`null`. Still fill `search_queries` and `reasoning` (what you tried, why
nothing qualified).

**`footage_manifest.md`** — human-readable, one entry per scene: query list,
chosen source/URL, license, and the one-line reasoning.

## Before finishing

1. Validate: `node scripts/validate.mjs schema --file projects/<project_id>/footage/footage_manifest.json --schema footage_manifest`.
2. Download the selected clips: `node scripts/footage_fetch.mjs fetch --project-id <project_id>`. Check the `failed[]` list in its output — a download failure (dead link, revoked API access) means going back to Step 2/3 for that scene, not leaving a broken reference in the manifest.
3. Advance: `node scripts/manifest_cli.mjs advance --project-id <project_id> --stage footage_retrieval --result success`.
4. If a provider's API key isn't configured (`node scripts/footage_search_cli.mjs search ...` reports `available: false` for it), that's expected for disabled/unconfigured providers — proceed with whichever are available. If **all** of Pexels/Pixabay/Coverr are unavailable, don't silently fall back to 100% AI stills without saying so — run `node scripts/manifest_cli.mjs error --project-id <project_id> --code USER_APPROVAL_REQUIRED --stage footage_retrieval --message "No footage API keys are configured" --action "Add PEXELS_API_KEY/PIXABAY_API_KEY to .env (see .env.example)"` and explain to the user.

Never hand-edit `manifest.json` directly.
