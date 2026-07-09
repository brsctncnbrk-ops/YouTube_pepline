# Prompt Rules — The Voynich Manuscript

## Style consistency token (verbatim, matches `visual_style_bible.md`)

```
Cinematic archival documentary photography, cool teal ambient lighting
contrasted with warm candlelight, moody atmospheric depth, richly detailed
period-accurate props and parchment, shallow depth of field, high production
value in the style of a prestige history documentary
```

## General dos / don'ts

- **Always:** teal/cyan ambient base + at least one warm practical light
  source, aged-parchment texture on any manuscript page, photoreal rendering.
- **Avoid:** saturated primary colors, modern objects/technology breaking
  the archival mood (except the deliberately period-appropriate WWII cipher
  machine in scene_009 and the modern scanning instrument in scene_012,
  which are narratively justified, not mistakes), cartoon/flat-illustration
  rendering, direct-to-camera character close-ups.

## Fixed `scene_type` → `render_treatment` table

Copied verbatim — this is a fixed lookup, not a creative per-video choice:

```
photoreal_cinematic  <- cinematic, documentary, character_scene, macro_shot, before_after
archival_period      <- historical_painting, archive_documents, newspaper, magazine, hand_drawn_sketch
technical_diagram    <- blueprint, technical_drawing, diagram, ui_hud_screen, isometric, whiteboard
cartographic_aerial  <- world_map, satellite_view
scan_xray            <- xray
vector_infographic   <- infographic, data_visualization, timeline, split_screen, animated_illustration
```
