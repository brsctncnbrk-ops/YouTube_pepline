# Prompt Rules — The Voynich Manuscript

Concrete rules for `factforge-visual-prompt` when writing each scene's
Leonardo AI prompt.

## Style consistency token (include verbatim in every main prompt)

```
FactForge archival mystery-documentary style, painterly semi-realistic illustration, aged vellum and parchment texture, muted sepia and deep teal duotone palette, warm candlelight accents, cinematic high-contrast lighting, restrained painterly detail, no modern elements, museum-archive atmosphere
```

## Always include

- The style consistency token above, verbatim, in every scene's main prompt.
- A specific camera framing drawn from `camera_language.md` (wide
  establishing / macro close-up / slow push-in / slow pan-reveal / portrait
  medium shot) — never leave framing unspecified.
- At least one named color cue from `color_palette.md` when the scene's
  lighting matters (e.g. "Candlelight Amber key light against Deep Archive
  Teal shadow").
- A clear subject drawn directly from that scene's `visual_need` in
  `storyboard.json` — don't generalize away the specific detail (e.g. keep
  "tube-and-vessel network with small illustrated figures in green-tinted
  liquid," don't flatten it to "biological illustration").

## Always avoid

- Bright/saturated modern colors (pure red, neon, pure white, pure black) —
  stay inside the five-color palette described in `color_palette.md`.
- Photorealistic human faces — use the painterly, partially-obscured
  approach from `character_style.md`.
- Flat vector icons, modern sans-serif text baked into the image, or
  dashboard-style chart aesthetics — see `graphic_style.md` for how
  diagrams/text should look instead.
- Handheld/shaky-cam or whip-pan descriptors — this video's camera language
  is deliberate and slow (see `camera_language.md`).
- Anachronisms: no visible modern technology, signage, or clothing in any
  historical-era scene (scenes 1-9); scenes 10-12's lab/data imagery should
  look "archival-modern" (a research lab, but still processed through the
  aged/painterly texture), never a slick tech-product render.

## Consistency check before finalizing prompts

Every scene's prompt should be recognizable as "the same video" if shown
side by side — same palette, same illustration technique, same restrained
character treatment. If a generated prompt reads like it belongs to a
different documentary (too clean, too modern, too colorful), revise it
against this file and `visual_style_bible.md` before finalizing.
