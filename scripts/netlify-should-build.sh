#!/usr/bin/env bash
# Netlify `ignore` command. Exit 0 = SKIP the build, exit 1 = RUN it.
#
# The weekly GSC report commits CSVs under data/. Those commits change nothing
# the site renders, so rebuilding for them burns a deploy for no reason. This
# skips a build only when EVERY changed path is data/scripts/CI tooling.
#
# Run from the Netlify base directory (mindfulroots/), hence the `cd ..`.
set -u

cd "$(dirname "$0")/.." || exit 1

# No cached ref (first build, cleared cache) — never skip.
if [ -z "${CACHED_COMMIT_REF:-}" ] || [ -z "${COMMIT_REF:-}" ]; then
  echo "netlify-should-build: no cached ref, building"
  exit 1
fi

CHANGED=$(git diff --name-only "$CACHED_COMMIT_REF" "$COMMIT_REF" 2>/dev/null)
if [ -z "$CHANGED" ]; then
  echo "netlify-should-build: no diff resolvable, building to be safe"
  exit 1
fi

# Any changed path outside the tooling prefixes means the site itself changed.
if echo "$CHANGED" | grep -qvE '^(data/|scripts/|\.github/)'; then
  echo "netlify-should-build: site files changed, building"
  exit 1
fi

echo "netlify-should-build: only data/scripts/CI changed, skipping deploy"
exit 0
