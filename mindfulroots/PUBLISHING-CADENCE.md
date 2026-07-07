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
>
> **Updated 2026-07-07:** generation moved off the local `launchd` agent onto a
> cloud **claude.ai Routine** (`RemoteTrigger` `trig_01WwJ2NwCxg9ABveQqhJ5aK2`, name
> `moodsupplement-generate`) — no laptop needs to be awake. Cadence changed to **Mon+Fri,
> batch of 3 posts per fire** (6 posts/week from 2 Netlify deploys/week — batching keeps
> deploy count down while raising output; see the deploy-cost note below). Selection is no
> longer strict FIFO: the Routine is now **coverage-floor + buy-intent aware** (below).
> The old `launchd` plists are retired to `~/Library/LaunchAgents/_retired/`; the local
> `scripts/generate-post.sh` is superseded (kept as rollback reference only).

## The model

- **Cadence: Mon + Fri, 3 posts per fire = 6 posts/week.** Cron `0 1 * * 1,5`
  (01:00 UTC = 09:00 HKT). Generation is a cloud Routine, not anything in this repo or on
  the Mac. Each fire writes up to 3 posts then does **one** combined `git commit`/push, so
  the week costs only **2 Netlify deploys** — the site is plain `astro build` (full static
  rebuild every push, no incremental/ISR), so batching is how post volume scales without
  scaling deploy cost. Steady cadence is still what a young health-adjacent domain wants; if
  `/optimize-content` signals are weak, drop the batch size back rather than pushing higher.
- **Coverage-floor selection (not strict FIFO).** Each fire computes per-product published
  post counts (by scanning blog frontmatter `relatedProducts`, the reliable field — *not*
  `cluster`, which is fragmented), and fills its 3 slots from products **under a FLOOR of 3
  posts**, most-deficient first, falling back to strict priority/FIFO once all 10 products
  are at floor. This closes per-product coverage gaps that pure priority order left open.
- **Buy-intent bias within a target.** For each under-floor product the Routine prefers
  buy-intent queue lines (`TYPE:comparison`, "can you take X with Y" interaction queries,
  `ANGLE` flagged BOFU) over generic mechanism explainers — serving the buy-intent goal and
  the coverage goal in one pass. P1 lines remain validated low-difficulty buy-intent
  keywords, SERP-checked as small-blog/niche, not authority-locked.
- **Queue file order is never rewritten by the Routine** — it only removes the lines it
  consumes. `/optimize-content` still owns reprioritization/replenishment of file order, so
  the two mechanisms don't fight.
- **`TYPE:` field routes the line.** `comparison` / `explainer` → the Routine writes a
  blog post. `product-section` / `pillar` → skipped-over and left in the queue untouched
  (unattended generation is too risky for product-page frontmatter/ASINs); that work lives
  in `product-page-tasks.txt` for manual handling.
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
| `mindfulroots-topic-queue.txt` | **Active queue** — blog topics only, priority-ordered. The Routine selects up to 3 lines per fire (coverage-floor + buy-intent aware, not `head -1`) and removes only what it consumes; file order is otherwise untouched. |
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
