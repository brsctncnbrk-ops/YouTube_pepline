# Rendering on the VPS

`scripts/render_vps.sh` is the primary way to render a FactForge video. It
mirrors `.github/workflows/render.yml` (kept in the repo as a fallback path)
but runs on the render VPS's persistent disk instead of an ephemeral GitHub
Actions runner.

## One-time VPS setup

Prerequisites:

- Node.js 20+ and npm
- `git` and `git-lfs` (`sudo apt-get install -y git git-lfs`)
- Chromium's runtime shared libraries — GitHub's `ubuntu-latest` image ships
  these already; a bare VPS needs them installed explicitly (exact package
  names vary by distro/version, adjust as needed):
  ```bash
  sudo apt-get update && sudo apt-get install -y \
    libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0 fonts-liberation
  ```
- `rclone` (optional — only needed for the secondary upload step:
  `sudo apt-get install -y rclone`)

Setup steps:

```bash
git clone <repo-url> factforge && cd factforge
git lfs install
git lfs pull
npm ci
npx remotion browser ensure   # downloads Remotion's headless Chromium once
rclone config                 # optional: set up a remote for secondary uploads
```

## Usage

```bash
bash scripts/render_vps.sh <project_id>
```

This runs the render-readiness gate, renders the video, writes
`projects/<id>/output/final_video.mp4` + `render_log.txt`, marks the manifest
`RENDER_DONE`, and — if `RCLONE_REMOTE` is set — copies the video to that
remote as a secondary copy:

```bash
RCLONE_REMOTE=my-remote bash scripts/render_vps.sh 001-my-video
# optional: override the remote sub-path (defaults to factforge/<project_id>)
RCLONE_REMOTE=my-remote RCLONE_PATH=videos/my-video bash scripts/render_vps.sh 001-my-video
```

The script does **not** commit or push anything to git — unlike the GitHub
Actions fallback, the VPS's disk is persistent, so there's no need to push
just to avoid losing the output. If you want the render reflected in the
repo's git history, commit and push manually:

```bash
git add projects/<id>/output/final_video.mp4 projects/<id>/output/render_log.txt \
        projects/<id>/manifest.json projects/<id>/assets/asset_manifest.json
git commit -m "Render <id>: final_video.mp4"
git push
```

## Troubleshooting

- **Chromium/browser launch errors** (missing `.so` files): re-check the
  shared-library list above against the actual error message and install
  whatever's missing.
- **`final_video.mp4` or scene images fail to load / are tiny pointer
  files**: `git lfs pull` wasn't run (or `git-lfs` isn't installed) — LFS
  pointer files look like plain text, not binary media.
- **`render-ready` gate fails**: run `node scripts/validate.mjs render-ready
  --project-id <id> --human` for a readable breakdown of which check failed.
