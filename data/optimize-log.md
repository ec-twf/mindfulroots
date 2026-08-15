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
