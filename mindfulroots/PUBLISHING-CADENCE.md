# Publishing cadence & the optimize checkpoint

> Implements the paced rollout decided 2026-06-30, restructured 2026-07-05 after
> independent keyword research (autocomplete harvest + live SERP validation) surfaced
> a large set of low-difficulty comparison/interaction keywords the original queue
> didn't have. See `../data/keyword-universe.csv` for the scored research behind the
> current queue order.
>
> **Updated 2026-07-05:** the hard measurement gate (queue empties → stop → manual
> resume) is replaced by a recurring **optimize checkpoint** (`/optimize-content`,
> biweekly). The gate was a one-time training-wheels device for the first 22 posts;
> a real feedback loop against Search Console data is a better long-term mechanism
> than a queue running dry. Cadence itself is unchanged — it's still the primary
> safety valve for a young YMYL domain.

## The model

- **Cadence: 2–3 posts/week** (not daily). Steady cadence is what Google rewards and is
  defensible for a young health-adjacent domain. Generation frequency is set by the
  launchd agent on the Mac, not by anything in this repo — see "Manual steps" below.
- **Priority-first order.** `mindfulroots-topic-queue.txt` is ordered by evidence-backed
  priority (`PRIORITY:P1/P2/P3` field per line), not strict breadth-first rotation.
  P1 = validated low-difficulty buy-intent keywords (comparisons, drug/supplement
  interaction explainers) — SERP-checked to confirm small-blog/niche SERPs, not
  authority-locked. Clusters still interleave within each priority band so no single
  supplement dominates a given week.
- **`TYPE:` field routes the line.** `comparison` / `explainer` → the generator writes a
  blog post. `product-section` / `pillar` → the generator pops the line *without*
  generating (unattended generation is too risky for product-page frontmatter/ASINs)
  and the topic instead lives for manual handling in `product-page-tasks.txt`.
- **The checkpoint is judgment, not mechanical.** Every `/optimize-content` run (biweekly)
  checks indexation rate, impression trend, and manual-action flags for recently
  published posts. Weak signals → explicitly recommend pausing new generation and
  strengthening existing pages instead of letting cadence run on autopilot. Healthy
  signals → keep going. Nothing about the queue running empty stops generation by
  itself anymore; `/optimize-content` is also where the queue gets replenished, from
  real GSC query data instead of guesswork.

## Files

| File | Role |
|---|---|
| `mindfulroots-topic-queue.txt` | **Active queue** — blog topics only, priority-ordered. The generator pops `head -1` from here. |
| `product-page-tasks.txt` | **Product-page work** — dosage/safety sections, buying-guide angles, pillar-hub backlog. Handled manually, never by the unattended generator. |
| `../data/keyword-universe.csv` | Durable keyword research asset — own-scored superset of the original xlsx research, SERP-evidence notes per keyword. `/optimize-content` appends newly GSC-validated keywords here over time. |
| `../data/gsc/*.csv` | Search Console snapshots pulled by `scripts/gsc-pull.py`, one per optimize run. |
| `../data/optimize-log.md` | One paragraph per optimize session — what moved, what changed, what's queued next. |

Queue files are data-only (one topic per line, `CLUSTER:… | KEYWORD:… | ANGLE:… | SLUG:… | PRODUCTS:… | TYPE:… | PRIORITY:…`). Keep them comment-free so `head -1` / `sed -i '1d'` stays safe.

## Running the checkpoint

```
/optimize-content
```
First run should wait until Search Console has ~4 weeks of data on the current post set. See `scripts/GSC-SETUP.md` for the one-time API setup this depends on.
