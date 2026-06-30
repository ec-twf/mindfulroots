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
if [[ -e "$OUT" ]]; then
  echo "$STAMP  $SLUG already exists — popping without regenerating."
  tail -n +2 "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
  exit 0
fi

echo "$STAMP  generating: $SLUG  [$CLUSTER]"

PROMPT="Write a complete blog post for the MoodSupplement site (evidence-aware iHerb mood/stress/sleep
affiliate). Topic keyword: \"$KEYWORD\". Angle: \"$ANGLE\". Cluster: $CLUSTER. Related products: $PRODUCTS.

Output ONLY the raw Markdown file content, nothing else. Start with YAML frontmatter exactly in this shape:
---
title: <compelling, keyword-aware title>
description: <150-160 char meta description>
pubDate: $(date +%Y-%m-%d)
cluster: $CLUSTER
relatedProducts: [$PRODUCTS]
draft: false
---

Rules: YMYL/E-E-A-T — frame supplements as *support*, never treatment for depression. Cite primary
studies (not aggregators). Keep evidence-tier language consistent. If the cluster is 5-htp, include a
serotonin-syndrome <WarningBox/> caution. End with a 'Supplements mentioned' section linking the related
product hub(s)."

claude --model claude-opus-4-8 --print "$PROMPT" > "$OUT"

# Pop the topic only after a successful write
if [[ -s "$OUT" ]]; then
  tail -n +2 "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
  echo "$STAMP  wrote $OUT and popped queue ($(wc -l < "$QUEUE" | tr -d ' ') topics left)."
else
  rm -f "$OUT"
  echo "$STAMP  ERROR: empty output, kept topic in queue." >&2
  exit 1
fi
