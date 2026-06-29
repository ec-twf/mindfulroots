#!/bin/bash
# Pushes newly generated posts to GitHub. Triggered by a launchd WatchPaths
# agent whenever the blog folder changes — so it runs any time of day the
# Mac is on, not on a fixed schedule. Netlify publishes on push.
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

cd "$(dirname "$0")/.."   # repo root

git pull --rebase --autostash origin main
git add -A
if git diff --cached --quiet; then
  echo "$(date -u +%FT%TZ) nothing to push"
  exit 0
fi
git commit -m "content: $(date -u +%Y-%m-%dT%H:%MZ)"
git push origin main
echo "$(date -u +%FT%TZ) pushed"
