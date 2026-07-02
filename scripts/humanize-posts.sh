#!/bin/bash
# One-time batch humanizer for existing MoodSupplement blog posts.
# Rewrites prose bodies through claude-sonnet-4-6, preserving YAML frontmatter
# and MDX import/component lines verbatim.
#
# Usage:
#   bash humanize-posts.sh            # process all un-humanized posts
#   bash humanize-posts.sh --dry-run  # list files that would be processed
#
# Idempotent: already-humanized files are skipped (sentinel: <!-- humanized -->).
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

  # Skip if already humanized
  if grep -q "<!-- humanized -->" "$POST" 2>/dev/null; then
    echo "$STAMP  [SKIP] $FNAME — already humanized"
    (( skipped++ )) || true
    continue
  fi

  if $DRY_RUN; then
    echo "$STAMP  [DRY-RUN] would humanize: $FNAME"
    continue
  fi

  echo "$STAMP  [START] $FNAME"

  # --- Split file into parts ---

  # 1. FRONTMATTER: from line 1 to the closing --- (second fence)
  #    awk: print from start, stop after we've seen the second --- line.
  FRONTMATTER="$(awk 'BEGIN{n=0} /^---/{n++; print; if(n==2) exit; next} {print}' "$POST")"

  # 2. IMPORT lines: lines immediately after frontmatter that start with "import "
  #    Count the line number of the closing --- then check subsequent lines.
  FM_END_LINE="$(awk 'BEGIN{n=0} /^---/{n++; if(n==2){print NR; exit}}' "$POST")"
  IMPORTS="$(awk -v start="$FM_END_LINE" 'NR > start && /^import / {print}' "$POST")"

  # 3. BODY: everything after frontmatter and imports (skip blank lines between)
  if [[ -n "$IMPORTS" ]]; then
    IMPORT_COUNT="$(echo "$IMPORTS" | wc -l | tr -d ' ')"
    BODY_START=$(( FM_END_LINE + IMPORT_COUNT + 1 ))
  else
    BODY_START=$(( FM_END_LINE + 1 ))
  fi
  BODY="$(awk -v start="$BODY_START" 'NR >= start' "$POST")"

  ORIG_SIZE="$(wc -c < "$POST")"

  # --- Build prompt ---
  PROMPT="$(cat "$GUIDE")
$BODY"

  # --- Call claude ---
  # < /dev/null suppresses the "no stdin data" warning.
  # After capture, strip any CLI warning/info lines that pollute the output
  # (lines starting with "Warning:", "Ignoring", "Error:") before size check.
  TMP="$(mktemp)"
  TRAW="$(mktemp)"
  claude --model claude-sonnet-4-6 --print "$PROMPT" < /dev/null > "$TRAW" 2>/dev/null || true
  grep -v -E '^(Warning:|Ignoring |Error: )' "$TRAW" > "$TMP" || true
  rm -f "$TRAW"

  HUM_SIZE="$(wc -c < "$TMP")"
  MIN_SIZE=$(( ORIG_SIZE * 75 / 100 ))

  if [[ "$HUM_SIZE" -lt "$MIN_SIZE" ]] || [[ "$HUM_SIZE" -lt 200 ]]; then
    echo "$STAMP  [ERROR] $FNAME — humanized output too small ($HUM_SIZE bytes vs $ORIG_SIZE original); skipping." >&2
    rm -f "$TMP"
    (( errors++ )) || true
    continue
  fi

  # --- Reconstruct file ---
  {
    echo "$FRONTMATTER"
    echo "<!-- humanized -->"
    if [[ -n "$IMPORTS" ]]; then
      echo ""
      echo "$IMPORTS"
    fi
    echo ""
    cat "$TMP"
  } > "$POST.new"

  rm -f "$TMP"
  mv "$POST.new" "$POST"

  echo "$STAMP  [OK] $FNAME — $ORIG_SIZE → $HUM_SIZE bytes"
  (( processed++ )) || true
done

echo ""
echo "$STAMP  Done. processed=$processed skipped=$skipped errors=$errors"
