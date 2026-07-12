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
> `moodsupplement-generate`) — no laptop needs to be awake. Selection is not strict FIFO:
> the Routine is **coverage-floor + buy-intent aware** (below).
> The old `launchd` plists are retired to `~/Library/LaunchAgents/_retired/`; the local
> `scripts/generate-post.sh` is superseded (kept as rollback reference only).
>
> **Updated 2026-07-12 (growth-audit velocity cut):** batch dropped from 3 new posts per
> fire to **1 new post + 1 refresh of an existing post per fire** (2 new + 2 refreshes/week).
> Rationale: 6 AI posts/week on a one-month-old YMYL domain is the Helpful-Content-Update
> casualty profile; GSC shows the constraint is authority/indexation, not content volume.
> Freed capacity now deepens existing posts (citations, tables, FAQ top-ups) via
> `refresh-queue.txt`. Refreshes carry a byte-count truncation guard (`AFTER >= BEFORE`
> or revert) because the pipeline once truncated a live ranking post to zero.

## The model

- **Cadence: Mon + Fri, 1 new post + 1 refresh per fire = 2 new + 2 refreshes/week.**
  Cron `0 1 * * 1,5` (01:00 UTC = 09:00 HKT). Generation is a cloud Routine, not anything
  in this repo or on the Mac. Each fire does **one** combined `git commit`/push, so the week
  still costs only **2 Netlify deploys** (plain `astro build`, full static rebuild every
  push). New-post count is a **ceiling, not a KPI** — if `/optimize-content` signals are
  weak, pause new posts entirely and let refreshes run alone.
- **Refresh pass.** Each fire also pops the head of `refresh-queue.txt` and deepens that
  existing post: ≥2 primary-source citations (PubMed/NIH/ODS/NCCIH), one missing high-value
  section (comparison table / dosing-timing / who-should-skip), FAQ top-up to 4–6 items,
  `updatedDate` bump. Title/slug/cluster/relatedProducts/headTerm are immutable. A byte-count
  truncation guard (`wc -c` before vs after; `AFTER >= BEFORE` else `git checkout --`) makes
  a refresh strictly additive.
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
| `mindfulroots-topic-queue.txt` | **Active queue** — blog topics only, priority-ordered. The Routine selects 1 line per fire (coverage-floor + buy-intent aware, not `head -1`) and removes only what it consumes; file order is otherwise untouched. |
| `refresh-queue.txt` | **Refresh queue** — existing-post deepening backlog, `SLUG:… \| FOCUS:…` per line, oldest posts first. The Routine pops the head each fire, applies the additive refresh pass, and removes only lines that pass the truncation guard. |
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
