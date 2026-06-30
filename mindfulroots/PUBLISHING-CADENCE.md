# Publishing cadence & the measurement gate

> Implements the paced rollout decided 2026-06-30. Replaces the "2 posts/day, bulk
> publish all 65" plan, which is risky for a new YMYL domain.
>
> **Updated 2026-06-30:** queue deduplicated against published posts — 9 overlapping
> topics removed, 9 buyer-intent (BOFU) topics added. Active batch now ~19 remaining.

## The model

- **Cadence: 2–3 posts/week** (not daily). Steady cadence is what Google rewards and is
  defensible for a young health-adjacent domain. Generation frequency is set by the
  launchd agent on the Mac, not by anything in this repo — see "Manual steps" below.
- **Breadth-first order.** `mindfulroots-topic-queue.txt` now holds the **first 2 posts
  of every cluster (22 topics)**, interleaved so each week covers different supplements.
  This builds topical breadth fast instead of going deep on one supplement.
- **The gate is mechanical.** When the active queue empties (~7–10 weeks at 2–3/week),
  generation naturally stops. That pause **is** the measurement gate — nothing resumes
  until you act.

## Files

| File | Role |
|---|---|
| `mindfulroots-topic-queue.txt` | **Active batch** — 22 topics (first 2 per cluster). The generator pops `head -1` from here. |
| `mindfulroots-topic-queue-after-gate.txt` | **Held** — remaining 43 topics. Data-only, same format. Do **not** point the generator at this file until the gate passes. |

Both files are data-only (one topic per line, `CLUSTER:… | KEYWORD:… | ANGLE:… | SLUG:… | PRODUCTS:…`). Keep them comment-free so `head -1` / `sed -i '1d'` stays safe.

## Passing the gate (after the 22 are live & indexed)

Check Google Search Console for the 22 posts:
1. **Indexation** — are most indexed (not "Discovered – currently not indexed")?
2. **Impressions trending up**, and at least some posts earning ranked queries.
3. **No manual action / quality flags.**

If signals are positive, resume:
```bash
cat mindfulroots-topic-queue-after-gate.txt >> mindfulroots-topic-queue.txt
: > mindfulroots-topic-queue-after-gate.txt   # empty the held file
```
If signals are weak, hold, improve the existing 22 (citations, internal links, E-E-A-T) before adding more.
