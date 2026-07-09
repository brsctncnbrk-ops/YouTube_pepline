#!/usr/bin/env bash
# Primary render path: run this on the dedicated render VPS (never on an
# author's own machine). Mirrors the steps in .github/workflows/render.yml,
# which stays in the repo as a fallback path. See docs/VPS_RENDER.md for
# one-time VPS setup (Node, git-lfs, Chromium system deps, rclone).
#
# Usage: bash scripts/render_vps.sh <project_id>
set -euo pipefail

PID="${1:-}"
if [[ -z "$PID" ]]; then
  echo "Usage: bash scripts/render_vps.sh <project_id>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PROJECT_DIR="projects/$PID"
RENDER_PROJECT_DIR="$PROJECT_DIR/remotion/render_ready_project"
OUT_DIR="$RENDER_PROJECT_DIR/out"
DEST_DIR="$PROJECT_DIR/output"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "No such project: $PROJECT_DIR" >&2
  exit 1
fi

echo "==> Pulling LFS assets"
git lfs pull

echo "==> Installing root tooling deps"
npm ci

echo "==> Render-readiness hard gate"
node scripts/validate.mjs render-ready --project-id "$PID"

echo "==> Ensuring Remotion's headless Chromium is available"
npx remotion browser ensure

echo "==> Installing Remotion project deps"
(cd "$RENDER_PROJECT_DIR" && npm install --no-audit --no-fund)

echo "==> Rendering video"
mkdir -p "$OUT_DIR"
(
  cd "$RENDER_PROJECT_DIR"
  npx remotion render src/index.ts FactForgeVideo out/final_video.mp4 --codec=h264 2>&1 | tee out/render_stdout.txt
)

echo "==> Collecting output"
mkdir -p "$DEST_DIR"
cp "$OUT_DIR/final_video.mp4" "$DEST_DIR/final_video.mp4"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)_$(hostname)"
{
  echo "Rendered at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "VPS run: $RUN_ID"
  echo "---"
  tail -n 40 "$OUT_DIR/render_stdout.txt" || true
} > "$DEST_DIR/render_log.txt"

echo "==> Marking manifest RENDER_DONE"
node scripts/manifest_cli.mjs render-complete --project-id "$PID" --output-file "output/final_video.mp4"

echo "==> Secondary upload (rclone)"
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  RCLONE_PATH="${RCLONE_PATH:-factforge/$PID}"
  rclone copy "$DEST_DIR/final_video.mp4" "$RCLONE_REMOTE:$RCLONE_PATH/"
  echo "Uploaded to $RCLONE_REMOTE:$RCLONE_PATH/"
else
  echo "RCLONE_REMOTE not set - skipping secondary upload. Set RCLONE_REMOTE (and optionally RCLONE_PATH) to enable it."
fi

echo "==> Done"
echo "Output: $DEST_DIR/final_video.mp4"
echo "manifest.json and output/ were updated locally but NOT committed/pushed to git."
echo "Run 'git add', 'git commit', and 'git push' manually if you want this reflected in the repo history."
