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
>
> **Updated 2026-07-19 (impression-dip diagnosis + longtail experiment):** the velocity cut
> above turned out to be the *cause* of the impression dip it was meant to prevent, not a
> guard against it. GSC daily series: impressions peaked at 307–314/day on 9–12 Jul (riding
> the ~21 posts published in W27–W28) and fell to 163–187/day from 13 Jul — the day after
> publishing dropped to ~1 post/week. No HCU-shaped penalty is visible: the winners kept
> winning (`5-htp-serotonin-safety` 56→445 impressions at position 8.7). The dip is the
> freshness/indexation spike ending, plus two one-off losses (the `fish-oil-and-cortisol`
> outage, and winter-mood seasonality decaying in July).
>
> Cadence therefore goes back up, but **batched every 2 days rather than daily** so the
> deploy count stays low, and structured as a **measured experiment** rather than raw volume.

## The model

- **Cadence: every 2 days, 4 new posts + 1 refresh per fire** (~14 new/week). Cron
  `0 1 */2 * *` (01:00 UTC = 09:00 HKT). Generation is a cloud Routine, not anything in this
  repo or on the Mac. Each fire does **one** combined `git commit`/push, so the whole week
  costs **~3–4 Netlify deploys** — fewer than the old Mon+Fri schedule cost per post.
- **Scale gate.** Move to **6 new per fire** (~21/week, the 3/day target) only when, at the
  day-14 checkpoint, **≥70%** of the new URLs are indexed within 7 days *and* site-wide
  impressions are trending up. Indexation is the binding constraint on a young domain: pages
  stuck in "Discovered – currently not indexed" earn nothing regardless of how many ship.
- **Kill switch.** If indexation falls below 50% at 7 days, or impressions fall *while*
  publishing is running, drop back to 2 new per fire. That combination means the constraint
  has become authority/crawl budget, and more volume actively hurts.
- New-post count is a **ceiling, not a KPI** — if `/optimize-content` signals are weak, pause
  new posts entirely and let refreshes run alone.

## The longtail experiment

The point of the higher cadence is to find out **which longtail pattern earns impressions at
our authority level**, which needs volume across varied patterns, not volume alone.

Queue lines carry `TYPE:` and posts carry the matching `postType`, so `scripts/gsc-pull.py`
can roll Search Console up by pattern into `data/gsc/<date>-patterns.csv`. Current standings
(28 days to 16 Jul, average position):

| Pattern | Example | Position | Read |
|---|---|---|---|
| `safety` | "5-htp serotonin syndrome" | **9.0** | ranks at zero authority |
| `interaction` | "can you take rhodiola with levothyroxine" | **21.8** | ranks at zero authority |
| `dosage` | "b complex dosage" | 53.5 | volume, needs position work |
| `comparison` | "epa vs dha" | 57.6 | mixed — some winners, many stragglers |
| `explainer` | general mechanism posts | 70.0 | weakest; deprioritised |

**Per-fire allocation (4 new):** 1 `interaction`, 1 `dosage`, 1 `comparison`, 1 rotating from
`timing` → `safety` → `duration` (round-robin, in that order). At 6 per fire, add a second
`interaction` and a second rotating slot — the two patterns with the best proven positions.

**Every post also targets a buy-intent term.** `buyIntentTerm` frontmatter is required and
ingredient-level ("best magnesium glycinate for anxiety"); condition-level commercial terms
("best supplements for anxiety") stay owned by the `/guides/` hubs via `KEYWORD_MAP`. The
reasoning is the position table above: the hubs sit at 80–95 and cannot yet rank for
commercial queries, so the money intent rides on informational pages that already can.
`seo-guard` enforces uniqueness and requires a `/products/` or `/guides/` link on any post
declaring one. See §9 of `../scripts/writing-guide.md`.
- **Refresh pass.** Each fire also pops the head of `refresh-queue.txt` and deepens that
  existing post: ≥2 primary-source citations (PubMed/NIH/ODS/NCCIH), one missing high-value
  section (comparison table / dosing-timing / who-should-skip), FAQ top-up to 4–6 items,
  `updatedDate` bump. Title/slug/cluster/relatedProducts/headTerm are immutable. A byte-count
  truncation guard (`wc -c` before vs after; `AFTER >= BEFORE` else `git checkout --`) makes
  a refresh strictly additive.
- **Coverage-floor selection (not strict FIFO).** Each fire computes per-product published
  post counts (by scanning blog frontmatter `relatedProducts`), and fills its slots from
  products **under a FLOOR of 3 posts**, most-deficient first, falling back to strict
  priority/FIFO once all 10 products are at floor. This closes per-product coverage gaps that
  pure priority order left open. The **type allocation above takes precedence**: fill each
  type slot with the most-deficient product that has a queue line of that type.
  (`cluster` was normalised to product slugs on 2026-07-19 and is no longer fragmented, but
  `relatedProducts` stays the field coverage counting reads.)
- **Buy-intent bias within a target.** For each under-floor product the Routine prefers
  buy-intent queue lines (`TYPE:comparison`, "can you take X with Y" interaction queries,
  `ANGLE` flagged BOFU) over generic mechanism explainers — serving the buy-intent goal and
  the coverage goal in one pass. P1 lines remain validated low-difficulty buy-intent
  keywords, SERP-checked as small-blog/niche, not authority-locked.
- **Queue file order is never rewritten by the Routine** — it only removes the lines it
  consumes. `/optimize-content` still owns reprioritization/replenishment of file order, so
  the two mechanisms don't fight.
- **`TYPE:` field routes the line.** `interaction` / `dosage` / `timing` / `safety` /
  `duration` / `comparison` / `explainer` → the Routine writes a blog post and copies the
  value into `postType`. `product-section` / `pillar` → skipped-over and left in the queue
  untouched (unattended generation is too risky for product-page frontmatter/ASINs); that
  work lives in `product-page-tasks.txt` for manual handling.
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
| `../data/gsc/<date>.csv` | Search Console query/page snapshot pulled by `scripts/gsc-pull.py`. |
| `../data/gsc/<date>-daily.csv` | Daily impressions/clicks series. The dip was only legible here — 28-day totals average the pre-drop peak back in and hid a 45% fall. |
| `../data/gsc/<date>-patterns.csv` | **Experiment scoreboard** — impressions/position rolled up by `cluster` and by `postType`. Written weekly by `.github/workflows/gsc-patterns.yml`. |
| `../data/optimize-log.md` | One paragraph per optimize session — what moved, what changed, what's queued next. |
| `../scripts/netlify-should-build.sh` | Netlify `ignore` command: skips the deploy when a push only touched `data/`, `scripts/` or `.github/`, so the weekly scoreboard commit doesn't burn a build. |

Queue files are data-only (one topic per line, `CLUSTER:… | KEYWORD:… | ANGLE:… | SLUG:… | PRODUCTS:… | TYPE:… | PRIORITY:…`). Keep them comment-free so `head -1` / `sed -i '1d'` stays safe.

## Running the checkpoint

```
/optimize-content
```
First run should wait until Search Console has ~4 weeks of data on the current post set. See `scripts/GSC-SETUP.md` for the one-time API setup this depends on.
