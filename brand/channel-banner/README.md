# The Arcavira Files — Channel Banner

YouTube channel banner (channel art) for **The Arcavira Files**.

- **Output:** `The_Arcavira_Files_banner.png` — 2560×1440, upload-ready.
- **Design:** "Declassified dossier" treatment in a blood-red / charcoal palette.
  Condensed *Oswald* wordmark, *Space Mono* case-file metadata, *Archivo*
  tagline, over a low-poly triangular texture with a warm red glow.
- **Safe zone:** wordmark and tagline are held inside YouTube's 1546×423
  centered mobile-safe area; corner metadata fills the wider desktop/TV crops.

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| ink | `#100807` | ground (warm near-black charcoal) |
| brand red | `#C0392B` | brand accent |
| bright red | `#FF5A43` | accent / glow / aperture mark |
| amber | `#E0A458` | single warm counterpoint ("New Files Weekly") |
| paper | `#EDE7E4` | wordmark / primary text |
| muted | `#9A817B` | secondary text |

## Regenerate

```bash
node render.mjs   # writes The_Arcavira_Files_banner.png + safe-zone crop previews
```

Requires Playwright's Chromium. Fonts are bundled in `fonts/` (Oswald, Space
Mono, Archivo — SIL Open Font License) and embedded as data URIs at render time,
so the output is self-contained and deterministic. Edit `banner.html` to change
copy, layout, or palette.
