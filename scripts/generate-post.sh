#!/bin/bash
# Generates ONE blog post from the top of the active topic queue, then pops it.
# Triggered by the launchd agent com.moodsupplement.generate (Mon/Wed/Fri 9am).
# The separate WatchPaths agent + scripts/local-push.sh handles the git push/deploy.
#
# ASSUMPTIONS (adjust if your setup differs):
#   - `claude` CLI is installed and logged in for user ejc.
#   - Active queue lives at mindfulroots/mindfulroots-topic-queue.txt (data-only lines).
#   - Posts are written to mindfulroots/src/content/blog/<slug>.md with draft:false.
#   - When the queue is EMPTY, this exits cleanly — that empty state IS the measurement gate.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$REPO_ROOT/mindfulroots"
QUEUE="$PROJECT/mindfulroots-topic-queue.txt"
BLOG="$PROJECT/src/content/blog"
STAMP="$(date -u +%FT%TZ)"

# Editorial + SEO/GEO conventions, injected into the prompt below. Single source of
# truth for post quality — edit scripts/writing-guide.md, not this script.
GUIDE_FILE="$REPO_ROOT/scripts/writing-guide.md"
if [[ ! -s "$GUIDE_FILE" ]]; then
  echo "$STAMP  ERROR: writing guide missing at $GUIDE_FILE — aborting." >&2
  exit 1
fi
GUIDE="$(cat "$GUIDE_FILE")"

# --- The gate: stop if the active queue is empty or missing ---
if [[ ! -s "$QUEUE" ]]; then
  echo "$STAMP  active queue empty — generation paused (measurement gate). Nothing to do."
  exit 0
fi

line="$(head -n 1 "$QUEUE")"
get() { printf '%s' "$line" | sed -E "s/.*${1}:[[:space:]]*([^|]*).*/\1/" | sed -E 's/[[:space:]]+$//'; }
CLUSTER="$(get CLUSTER)"; KEYWORD="$(get KEYWORD)"; ANGLE="$(get ANGLE)"
SLUG="$(get SLUG)";       PRODUCTS="$(get PRODUCTS)"

OUT="$BLOG/$SLUG.md"
if [[ -s "$OUT" ]] && head -1 "$OUT" | grep -q '^---'; then
  echo "$STAMP  $SLUG already exists (valid post) — popping without regenerating."
  tail -n +2 "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
  exit 0
fi

echo "$STAMP  generating: $SLUG  [$CLUSTER]"

PROMPT="You are the staff writer for MoodSupplement, an evidence-aware iHerb mood/stress/sleep
affiliate site. Write ONE complete, publish-ready blog post as a single Markdown (.md) file.

TOPIC
- Keyword: \"$KEYWORD\"
- Angle: \"$ANGLE\"
- Cluster: $CLUSTER
- Related product IDs: $PRODUCTS
- Today: $(date +%Y-%m-%d)

Your response MUST begin with the '---' of the YAML frontmatter and end with the last line of the
article. No preamble, planning, commentary, or code fences. Plain Markdown only — no MDX
components or import statements. Fill this frontmatter shape exactly:
---
title: \"<=45 chars, keyword near the front>\"
description: \"<150-158 char meta description, keyword-first>\"
pubDate: $(date +%Y-%m-%d)
updatedDate: $(date +%Y-%m-%d)
cluster: $CLUSTER
relatedProducts: [$PRODUCTS]
draft: false
faq:
  - q: \"<question>\"
    a: \"<concise answer>\"
  # 4-6 items, mirroring the visible FAQ section
---

Follow this writing guide in full:

$GUIDE"

# Fail loudly if the CLI is missing (launchd PATH problems) instead of writing an
# empty file and silently popping the queue.
if ! command -v claude >/dev/null 2>&1; then
  echo "$STAMP  ERROR: claude CLI not found on PATH ($PATH) — kept topic in queue." >&2
  exit 1
fi

# Generate to a temp file and only accept it if it looks like a real post. This
# rejects auth errors / empty output (e.g. "403 Request not allowed") that would
# otherwise be committed as a post AND pop the topic off the queue.
TMP="$(mktemp)"
claude --model claude-opus-4-8 --print "$PROMPT" > "$TMP.raw" || true

# The CLI sometimes prefixes a line of reasoning before the file. Keep only from the
# first frontmatter fence onward so a chatty preamble can't invalidate the post.
sed -n '/^---[[:space:]]*$/,$p' "$TMP.raw" > "$TMP"

if [[ "$(head -c 3 "$TMP")" == "---" ]] && [[ "$(wc -c < "$TMP")" -ge 500 ]]; then
  # --- Humanizer pass ---
  HUMANIZER_GUIDE="$REPO_ROOT/scripts/humanizer-guide.md"
  if [[ -s "$HUMANIZER_GUIDE" ]]; then
    HUM_PROMPT="$(cat "$HUMANIZER_GUIDE")
$(cat "$TMP")"
    TMP2="$(mktemp)"
    claude --model claude-sonnet-4-6 --print "$HUM_PROMPT" > "$TMP2" 2>/dev/null || true
    ORIG_SIZE="$(wc -c < "$TMP")"
    HUM_SIZE="$(wc -c < "$TMP2")"
    if [[ "$HUM_SIZE" -ge $(( ORIG_SIZE * 80 / 100 )) ]] && \
       [[ "$(head -c 3 "$TMP2")" == "---" ]]; then
      mv "$TMP2" "$TMP"
      echo "$STAMP  humanizer pass accepted ($HUM_SIZE bytes)."
    else
      rm -f "$TMP2"
      echo "$STAMP  WARN: humanizer output rejected ($HUM_SIZE bytes vs $ORIG_SIZE) — using raw generated output." >&2
    fi
  fi
  mv "$TMP" "$OUT"
  rm -f "$TMP.raw"
  tail -n +2 "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
  echo "$STAMP  wrote $OUT and popped queue ($(wc -l < "$QUEUE" | tr -d ' ') topics left)."
else
  cp "$TMP.raw" /tmp/moodsupplement-last-rejected.txt 2>/dev/null || true
  echo "$STAMP  ERROR: invalid output ($(wc -c < "$TMP.raw") bytes; first line: $(head -1 "$TMP.raw")) — raw saved to /tmp/moodsupplement-last-rejected.txt, kept topic in queue." >&2
  rm -f "$TMP" "$TMP.raw"
  exit 1
fi
