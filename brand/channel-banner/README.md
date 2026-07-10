# The Arcavira Files — Channel Banner

YouTube channel banner (channel art) for **The Arcavira Files**.

- **Output:** `The_Arcavira_Files_banner.png` — 2560×1440, upload-ready.
- **Design:** "Declassified dossier" treatment tied to the channel's teal-on-dark
  avatar. Condensed *Oswald* wordmark, *Space Mono* case-file metadata, *Archivo*
  tagline, over a low-poly triangular texture that echoes the avatar's banner.
- **Safe zone:** wordmark and tagline are held inside YouTube's 1546×423
  centered mobile-safe area; corner metadata fills the wider desktop/TV crops.

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| ink | `#0B0F0E` | ground (teal-biased near-black) |
| teal | `#2E7D6B` | brand (from avatar) |
| teal-bright | `#43C9A8` | accent / glow |
| amber | `#C7A063` | single warm accent ("New Files Weekly") |
| paper | `#EAEDE9` | wordmark / primary text |
| muted | `#7C918A` | secondary text |

## Regenerate

```bash
node render.mjs   # writes The_Arcavira_Files_banner.png + safe-zone crop previews
```

Requires Playwright's Chromium. Fonts are bundled in `fonts/` (Oswald, Space
Mono, Archivo — SIL Open Font License) and embedded as data URIs at render time,
so the output is self-contained and deterministic. Edit `banner.html` to change
copy, layout, or palette.
