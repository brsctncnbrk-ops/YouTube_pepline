# Leonardo AI Settings — 001-the-ai-race-no-one-can-afford-to-win

## Status: NOT_REQUIRED

`footage/footage_manifest.json` shows zero scenes with `fallback_to_ai_visual: true` out of 33 total scenes. Real, licensed stock footage covers every scene (`footage/scene_asset_map.json`, `footage/retrieval_report.md`). No Leonardo AI image generation is required or authorized for this project at this time. Do not run any image generation against the settings below — they are recorded only as safe defaults for future use, should a scene ever be re-flagged to AI fallback (e.g. if a licensed footage asset is later invalidated).

## Safe default settings (for future fallback use only — not executed)

| Setting | Value |
|---|---|
| Model | Leonardo Phoenix (or current default photoreal-documentary model) |
| Aspect ratio | 16:9 (matches project video dimensions) |
| Guidance scale | 7 |
| Seed | null (no prior generation to anchor to) |
| Style reference | null (no prior generation to reuse) |
| Style token | Must incorporate the verbatim style consistency token from `style/prompt_rules.md` (reproduced in `visual_prompts.md`) — do not paraphrase. |
| Negative prompt | Use the global baseline in `negative_prompts.md` plus the scene-specific exclusions for whichever scene is being generated. |

## If a scene is ever re-flagged to AI fallback

1. Confirm `footage/footage_manifest.json` for that scene now shows `fallback_to_ai_visual: true` and the reason (e.g. license invalidated, asset lost).
2. Re-run `factforge-visual-prompt` so `visual_prompts.json` gains a real entry for that scene (main_prompt, negative_prompt, camera_angle, lighting, composition, alt_prompts, leonardo_settings, status: pending), validated against `schemas/visual_prompts.schema.json`.
3. Only then paste the generated main/negative prompts into Leonardo AI manually — this pipeline never calls the Leonardo API itself.

