# Graphic Style — The Voynich Manuscript

## On-screen text

Where used (3 of 13 scenes: "Botanical Section", "Pharmaceutical Section",
"Astronomical Section", "Word Frequency Graph"), text should render in the
existing FactForge template style (dark translucent card, warm cream text,
bold serif-adjacent weight) — consistent with `Scene.tsx`'s default text
overlay treatment; no scene-specific font changes needed since the source
images themselves already carry some in-world lettering (e.g. the
"Pharmaceutical Section" label and "Word Frequency Graph" title visible on
the manuscript pages).

## Motion graphics treatment

For the 3 scenes carrying a `data_point` (scene_008 counter, scene_009
timeline, scene_013 map_highlight), motion graphics should use warm amber
accent colors (`#ffc454`-family, matching the candlelight palette) rather
than a cold/neutral UI color — keeps the counters/markers feeling like part
of the same lit-archive world rather than a bolted-on dashboard aesthetic.

## Diagram/technical pages (scene_005, scene_007, scene_011)

These already read as in-world diagrams (alchemical apparatus, astronomical
chart, cipher device) — no additional graphic overlay treatment needed
beyond the standard overlay-effects vocabulary (glow/vignette) to keep them
visually distinct from straight photographic scenes.
