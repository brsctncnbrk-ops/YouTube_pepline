# Visual Style Bible — The Voynich Manuscript

## Overview

The look is **archival mystery-documentary**: every frame should feel like
it was pulled from a hushed, climate-controlled rare-book vault — painterly,
semi-realistic illustration rendered as if lit by candlelight and museum
spotlights, printed on textures that recall aged vellum and parchment. This
directly extends the project's `reference_channel_style` ("moody archival
documentary aesthetic, aged parchment textures, muted sepia and deep teal
palette, cinematic lighting") into a single consistent illustration system
across all 13 storyboard scenes — from the Yale vault opening, through the
manuscript's six illustrated sections, through the Rudolf II / Kircher / 1912
Voynich provenance chain, to the closing library shot.

Nothing in this video is flat vector or clinical/modern-infographic. Every
image — whether it's a manuscript close-up, a historical reenactment
tableau, or a data-visualization overlay — is rendered through the same
painterly, textured, low-saturation lens so a viewer could screenshot any
frame and instantly recognize which video it's from.

## Style consistency token

Every scene's main Leonardo AI prompt must include this string verbatim:

```
FactForge archival mystery-documentary style, painterly semi-realistic illustration, aged vellum and parchment texture, muted sepia and deep teal duotone palette, warm candlelight accents, cinematic high-contrast lighting, restrained painterly detail, no modern elements, museum-archive atmosphere
```

## See also

- `color_palette.md` — the exact named colors behind "sepia and deep teal."
- `character_style.md` — how any human figures (scholars, dealers, the
  manuscript's "nymphs") are depicted.
- `graphic_style.md` — how on-screen text and diagram overlays should look.
- `camera_language.md` — the shot vocabulary for this video.
- `prompt_rules.md` — concrete dos/don'ts for `factforge-visual-prompt`,
  plus the token above repeated verbatim.
