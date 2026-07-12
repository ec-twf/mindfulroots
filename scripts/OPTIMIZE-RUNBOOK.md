# Biweekly optimize-content runbook

What to do when the reminder fires (~1st and 15th of each month). The whole pass is ~15 min.
Everything runs **locally** — the GSC key and venv live on this Mac, not in the cloud.

Run everything from the repo root:

```bash
cd /Users/ejc/mindfulroots
```

---

## 1. Pull fresh Search Console data

```bash
venv/bin/python scripts/gsc-pull.py --days 28
```

- Writes `data/gsc/<date>.csv` (query, page, clicks, impressions, ctr, position).
- Property defaults to `sc-domain:moodsupplement.net`. Override with `--property` or `GSC_PROPERTY` if that ever changes.
- **403 error** = the service account isn't granted on the property string being queried. See `scripts/GSC-SETUP.md` (URL-prefix vs Domain property gotcha). Diagnose with the accessible-sites list in that doc.
- **Key missing error** = one-time setup not done; follow `scripts/GSC-SETUP.md`.

## 2. Run net-new discovery (credential-free)

```bash
venv/bin/python scripts/keyword-harvest.py data/keyword-harvest-raw.csv
venv/bin/python scripts/filter-candidates.py
```

- `keyword-harvest.py` scrapes Google + Amazon autocomplete (seed × modifier matrix). Hits live endpoints — takes a minute, be patient.
- `filter-candidates.py` drops anything already owned in `mindfulroots/src/lib/keyword-map.ts`, already in the queue, or already in `data/keyword-universe.csv`. Writes `data/discovery/<date>-candidates.csv` (buy-intent rows first).

## 3. Open Claude Code and run the pass

In Claude Code (from the repo), invoke:

```
/optimize-content
```

It orchestrates steps 1–2, then does the judgment work you can't script:

- **Bucket the GSC pages** — striking-distance (pos 4–15, tune title/H1/FAQ to the exact query), low-CTR (rewrite title/meta only), dormant (retarget or fold in), top-3 (protect + compound).
- **Harvest GSC demand** — queries earning impressions with no dedicated page → new queue lines.
- **Validate discovery candidates** — WebSearch the top buy-intent rows from `data/discovery/`, keep only the ones where the SERP is beatable (small blogs, no big authority).
- **Append survivors** to `mindfulroots/mindfulroots-topic-queue.txt` (blog) or `mindfulroots/product-page-tasks.txt` (product) in the pipe format:
  `CLUSTER:… | KEYWORD:… | ANGLE:… | SLUG:… | PRODUCTS:… | TYPE:… | PRIORITY:…`

## 4. What to keep vs drop (the review gate)

A candidate becomes a queue line only if **all** hold:

- Not already owned in `keyword-map.ts` (the filter enforces this — trust it).
- Maps to one of the 10 products + a cluster.
- Buy-intent (interaction / "vs" / "best … for" / dosage) **or** fills a real coverage gap.
- SERP is winnable for a small site (checked via WebSearch — no WebMD/Healthline wall).

When in doubt, drop it. A thin queue beats a cannibalizing one.

## 5. Checkpoint (don't skip)

Before finishing, sanity-check: are posts published since last pass getting indexed? Any manual action / quality flag in GSC? Are impressions trending up? If signals are weak, **pause new generation** and strengthen existing pages instead. This is a judgment call, not a hard gate.

## 6. Log + commit

- `/optimize-content` appends one paragraph to `data/optimize-log.md` (date, what moved, what changed, what's queued).
- Commit the queue + log changes on a branch and open a PR (raw `data/gsc/` and `data/discovery/` snapshots are gitignored — they don't get committed):

```bash
git checkout -b optimize/$(date +%Y-%m-%d)
git add mindfulroots/mindfulroots-topic-queue.txt mindfulroots/product-page-tasks.txt data/optimize-log.md
git commit -m "content: biweekly optimize pass"
git push -u origin HEAD
```

The generator Routine picks up the new queue lines on its next Mon/Fri fire.

---

## Cadence note

Right now the site is early — GSC returns a thin dataset, so most new topics come from **discovery** (step 2), not GSC harvest (step 1's mining). As impressions grow, the GSC half gets richer and becomes the primary source. Both run every pass regardless.
