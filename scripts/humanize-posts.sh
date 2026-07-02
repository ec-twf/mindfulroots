#!/bin/bash
# One-time batch humanizer for existing MoodSupplement blog posts.
# Passes the full post (frontmatter + body) to claude-sonnet-4-6.
# Claude preserves frontmatter/imports and rewrites only prose.
#
# Usage:
#   bash humanize-posts.sh            # process all un-humanized posts
#   bash humanize-posts.sh --dry-run  # list files that would be processed
#
# Idempotent: already-humanized files are skipped.
# Sentinels: <!-- humanized --> for .md, {/* humanized */} for .mdx
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BLOG="$REPO_ROOT/mindfulroots/src/content/blog"
GUIDE="$REPO_ROOT/scripts/humanizer-guide.md"
STAMP="$(date -u +%FT%TZ)"
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if [[ ! -s "$GUIDE" ]]; then
  echo "$STAMP  ERROR: humanizer-guide.md missing at $GUIDE — aborting." >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "$STAMP  ERROR: claude CLI not found on PATH — aborting." >&2
  exit 1
fi

processed=0; skipped=0; errors=0

for POST in "$BLOG"/*.md "$BLOG"/*.mdx; do
  [[ -f "$POST" ]] || continue
  FNAME="$(basename "$POST")"

  # Skip if already humanized (HTML comment for .md, JSX comment for .mdx)
  if grep -qE "(<!-- humanized -->|\{/\* humanized \*/\})" "$POST" 2>/dev/null; then
    echo "$STAMP  [SKIP] $FNAME — already humanized"
    (( skipped++ )) || true
    continue
  fi

  if $DRY_RUN; then
    echo "$STAMP  [DRY-RUN] would humanize: $FNAME"
    continue
  fi

  echo "$STAMP  [START] $FNAME"

  ORIG_SIZE="$(wc -c < "$POST")"

  # --- Build prompt: guide instructions + full post ---
  PROMPT="$(cat "$GUIDE")

$(cat "$POST")"

  # --- Call claude ---
  # < /dev/null suppresses the "no stdin data" warning.
  # Strip CLI warning/info lines that can pollute stdout.
  TMP="$(mktemp)"
  TRAW="$(mktemp)"
  claude --model claude-sonnet-4-6 --print "$PROMPT" < /dev/null > "$TRAW" 2>/dev/null || true
  grep -v -E '^(Warning:|Ignoring |Error: )' "$TRAW" > "$TMP" || true
  rm -f "$TRAW"

  HUM_SIZE="$(wc -c < "$TMP")"
  MIN_SIZE=$(( ORIG_SIZE * 75 / 100 ))

  # Reject if output doesn't start with --- (preamble leak) or is too small
  if [[ "$(head -c 3 "$TMP")" != "---" ]] || \
     [[ "$HUM_SIZE" -lt "$MIN_SIZE" ]] || \
     [[ "$HUM_SIZE" -lt 200 ]]; then
    echo "$STAMP  [ERROR] $FNAME — rejected (${HUM_SIZE} bytes, starts: '$(head -c 20 "$TMP" | tr '\n' ' ')'); kept original." >&2
    rm -f "$TMP"
    (( errors++ )) || true
    continue
  fi

  # --- Inject sentinel after the closing --- of frontmatter ---
  if [[ "$POST" == *.mdx ]]; then
    SENTINEL="{/* humanized */}"
  else
    SENTINEL="<!-- humanized -->"
  fi
  awk -v s="$SENTINEL" 'BEGIN{n=0} /^---/{n++; print; if(n==2){print s}; next} {print}' "$TMP" > "$POST"

  rm -f "$TMP"

  FINAL_SIZE="$(wc -c < "$POST")"
  echo "$STAMP  [OK] $FNAME — $ORIG_SIZE → $FINAL_SIZE bytes"
  (( processed++ )) || true
done

echo ""
echo "$STAMP  Done. processed=$processed skipped=$skipped errors=$errors"
