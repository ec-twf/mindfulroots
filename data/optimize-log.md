# Optimize-content log

Biweekly GSC + discovery passes. One paragraph per run: date, what moved, what changed, what's queued next.

## 2026-08-01 — NO_DATA (pipeline broken, queue untouched)

NO_DATA: `data/gsc/` holds only `.gitkeep`; no `*-patterns.csv` exists, so Parts B–D
could not run and the topic queue was left byte-for-byte unchanged.

Root cause (definitive): `.gitignore:6` = `data/gsc/*.csv` ignores every file the weekly
`gsc-patterns.yml` job writes. That job actually succeeds — the 2026-07-27 run log shows
"Wrote 16 cluster/type buckets to data/gsc/2026-07-24-patterns.csv" — but the next step,
`git add data/gsc/`, stages nothing (gitignored), so it prints "no new GSC data", exits 0,
and the run is GREEN. The scoreboard never reaches the repo. This has been silently true
since setup (both scheduled gsc-patterns runs, 07-20 and 07-27, hit the same no-op path),
which is why this log had no prior entries.

Fix (owner action, NOT taken here — out of this Routine's scope): narrow `.gitignore:6`
to exclude the committed outputs, e.g. replace `data/gsc/*.csv` with a rule that still
ignores the large raw pull but tracks the scoreboard — simplest is `!data/gsc/*-patterns.csv`
(and `!*-daily.csv` if wanted) after line 6, or drop the raw `data/gsc/YYYY-MM-DD.csv` write.
Then re-run the gsc-patterns workflow (workflow_dispatch) to backfill. Until then every
optimizer fire is a no-op.

Next action: fix `.gitignore`, dispatch `gsc-patterns.yml`, confirm a `*-patterns.csv` lands.

## 2026-08-15 — NO_DATA (still broken, 2nd optimizer no-op, queue untouched)

NO_DATA again: `data/gsc/` still holds only `.gitkeep`; no `*-patterns.csv` exists, so Parts
B–D did not run and the topic queue was left byte-for-byte unchanged. This is the second
consecutive optimizer fire (after 2026-08-01) that no-op'd for the same reason.

Nothing has changed since the 08-01 diagnosis. The root cause is still live:
`.gitignore:6` = `data/gsc/*.csv` matches the scoreboard the weekly `gsc-patterns.yml` job
writes (`git check-ignore` confirms `data/gsc/2026-07-24-patterns.csv` → ignored). The job
runs GREEN, `git add data/gsc/` stages nothing, prints "no new GSC data", exits 0 — so the
CSVs never land in the repo. `git log -- data/gsc/` shows no commit has ever touched it.

Owner action (still NOT taken, out of this Routine's scope): after `.gitignore:6` add
`!data/gsc/*-patterns.csv` (keep ignoring the raw daily pull), then dispatch
`gsc-patterns.yml` (workflow_dispatch) to backfill. Until that lands, every optimizer fire
stays a no-op — ~4 weeks and counting.

Next action: fix `.gitignore`, dispatch `gsc-patterns.yml`, confirm a `*-patterns.csv` commits.

## 2026-09-01 — brand-comparison WINNER (but 0 queue lines), 87% indexation warning

Scoreboard: 2026-08-28-patterns.csv vs 2026-08-21 delta available. WINNER type=**brand-comparison**
(pos 29.4, ipp 245.5, imp 491) and WINNER cluster=**saffron-extract** (pos 17.4, ipp 78.6, imp 393).
PROMISING: safety (pos 26.0), b-complex (pos 22.8, ipp 10). LAGGING types: pillar (pos 76, 208d),
dosage (pos 66.9, 21d), explainer (pos 64, 58d). Safety row is clean-filtered (2.0 ipp / 4 imp),
not the pre-08-18 bot-poisoned 106 ipp — no requeue trap.

Queue (88 lines, count unchanged, C3 OK): safety→P1 top, saffron-extract lines lifted within each
band, explainer→P3 bottom. NOTE the WINNER type has **zero** queue lines: no TYPE:brand-comparison
exists in the queue, and BRAND_COMPARISON_DEPTH=0 → BRAND_COMPARISON_LOW. The lever that would
capitalize on the top-performing type is empty; the generator's two brand-comparison slots/fire
will starve on the next fires. New brand-comparison targets need a human SERP check.

Indexation (pages 2026-08-28, 4d fresh, gate passed): 45/52 posts from the last 28d absent from the
GSC page rollup → LIKELY_UNINDEXED 45, INDEXATION_WARNING 87% → cadence scale gate says drop to 2 new
posts/fire. Match logic verified against raw page column (relative paths, no false positives).
CTR: 5 CTR_UNDERPERFORM, all anchors/root of /blog/saffron-extract-vs-affron/ (pos ~9-11, ~0.9% CTR)
— highest-leverage SERP-title/meta rewrites, report only. Agent retrieval: 207 imp, one page
(5-htp-serotonin-safety, 198 imp, pos 9.3) pulled into LLM retrieval uncited — GEO signal, no action.
Buy-intent + answer-box coverage both complete (0 missing). Discovery proposed 40 lines (queue not
low, left for human review; no append).

Next action: HUMAN — (1) SERP-check and add brand-comparison targets to the queue (winner type, 0 runway),
and (2) act on the 87% indexation warning: cut cadence to 2 new posts/fire per PUBLISHING-CADENCE.md
until the backlog indexes.
