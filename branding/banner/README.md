# The Arcavira Files — channel banner

- `banner_source.html` — the design source. The deliverable is a 2560×1440 PNG
  (YouTube: Channel customization → Branding → Banner image) with all critical
  content inside the centered 1546×423 safe area. Rendered PNGs are not
  committed — this environment's network policy blocks Git LFS uploads
  (`lfs.github.com`), and `.gitattributes` tracks `*.png` via LFS.
  Re-render with:

```bash
/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
  --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=2560,1440 \
  --virtual-time-budget=4000 \
  --screenshot=banner_2560x1440.png file://$PWD/banner_source.html
```

Fonts are system-installed (Bitstream Charter + Courier 10 Pitch); render in this
repo's remote environment so the type matches.

## Identity tokens

| Token | Value | Role |
| --- | --- | --- |
| Ink | `#0B1512` | ground |
| Teal | `#2E7365` | accent (matches avatar) |
| Brass | `#C9A96A` | archival gold |
| Ivory | `#E9E4D6` | wordmark / text |
| Muted | `#6E837C` | secondary text |
