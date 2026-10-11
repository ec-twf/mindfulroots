# Title-pattern study, 2026-10-11

Which title shapes earn position and clicks on moodsupplement.net, scored against real demand
instead of guessed volume.

## Data and its limits

| Source | Window | What it gives |
|---|---|---|
| `data/gsc/*-patterns.csv`, 10 snapshots | 2026-07-08 to 2026-10-02 | longitudinal type and cluster scoring |
| `scripts/gsc-pull.py --days 90` | 2026-07-10 to 2026-10-08 | 1,970 human query/page rows for shape grouping |
| `data/gsc/2026-10-11-rewrite-triage.csv` | GSC 90d x GA4 30d | per-post bucketing |
| `/Users/ejc/Downloads/views.csv` (GA4) | 2026-09-13 to 2026-10-10 | 331 views, used only as a do-not-touch rule |

**No absolute search volume is used anywhere in this study.** There is no volume source in the repo:
`data/keyword-universe.csv` carries `difficulty_observed` as a qualitative label and
`source: own-harvest`, with no volume column. Patterns below are ranked by own-site impressions
(confirmed real searchers) and by SERP contestability. A term with zero own-site impressions is
unproven, not proven absent.

**GA4 views are deliberately not a demand signal here.** 331 views in 30 days against 10 Google
clicks in 28 days means roughly 97% of views arrive from somewhere other than Google search. Nine of
the twelve posts with 5+ views have zero Google impressions. Views answer "is anyone reading this",
not "is anyone searching for this".

**One contamination note.** `type/safety` shows median position 26.0 on only 21 impressions, and the
safety query shape shows median 9.6. Both are inflated by retrieval-bot queries that name
authorities this site is not ("nih office of dietary supplements 5-htp safety serotonin syndrome",
"nccih 5-htp safety interactions serotonin syndrome") and that scored below the agent filter's
threshold in `scripts/gsc-pull.py`, so they stayed in the human split. Do not treat safety position
as real.

## Finding 1: page type, scored across 10 weekly snapshots

Median impressions-per-page and median average position across all snapshots, so a one-week blip
cannot promote a pattern. Sorted by position.

| Type | Snapshots | Total imp | Total clicks | Median imp/page | Median position |
|---|---|---|---|---|---|
| safety | 9 | 21 | 0 | 2.0 | 26.0 (bot-inflated, ignore) |
| **brand-comparison** | 9 | 4,355 | **33** | 124.3 | **26.8** |
| duration | 8 | 337 | 0 | 8.4 | 43.7 |
| interaction | 9 | 318 | 0 | 8.5 | 45.4 |
| explainer | 10 | 638 | 0 | 7.5 | 65.7 |
| dosage | 9 | 589 | 0 | 13.8 | 67.1 |
| comparison | 10 | **8,849** | 9 | 65.5 | 69.7 |
| timing | 5 | 1,776 | 0 | **129.3** | 70.8 |
| pillar | 10 | 765 | 0 | 44.5 | 74.9 |

`brand-comparison` took 33 of the site's 42 clicks over ten weeks from 6 pages. `comparison` drew
twice the impressions from 22 pages and returned 9 clicks at position 69.7. `timing` has the single
highest impressions-per-page on the site and has never converted a click, because it sits at
position 70.8.

## Finding 2: query shape, from 1,970 real 90-day queries

Queries bucketed by syntax, not by the post that happened to catch them.

| Shape | Rows | Impressions | Clicks | Median position |
|---|---|---|---|---|
| **brand vs brand** | 62 | 599 | **9** | **9.7** |
| brand vs generic | 71 | 2,298 | 6 | 52.0 |
| branded term alone | 127 | 466 | 2 | 54.0 |
| duration ("how long to work") | 60 | 87 | 0 | 49.5 |
| dosage | 110 | 189 | 0 | 58.8 |
| timing | 84 | 268 | 0 | 65.6 |
| generic X vs Y | 310 | 1,337 | **0** | 68.0 |
| interaction | 73 | 213 | 0 | 69.5 |
| **"X for <condition>" / "best X for <condition>"** | 56 | 144 | **0** | **81.5** |
| other | 968 | 3,008 | 2 | 67.5 |

Two results decide the rewrite target:

1. **`brand vs brand` is the only shape that converts.** Median position 9.7, nine clicks from 599
   impressions. Every other shape is at 49 or worse.
2. **`X for <condition>` is the worst-performing shape on the site.** Median position 81.5, zero
   clicks from 144 impressions across 56 query rows. This is exactly the "how supplement Y helps
   with condition X" shape, and the site has already been running it at scale: 22 `comparison` and
   various `explainer`/`dosage` pages functionally occupy it. It does not work here. Broad-condition
   phrasing is owned by Healthline, WebMD and Examine, and on this site it also collides with the
   `/guides/<condition>` hubs that already claim "best supplements for X" in `src/lib/keyword-map.ts`.

`brand vs generic` carries 2,298 impressions but 1,813 of those are a single query, "affron vs
saffron", already owned by `/blog/saffron-extract-vs-affron/`. Strip that one query and the shape
drops to 485 impressions.

## Finding 3: the winning pattern

**`<Branded extract> vs <Branded extract> for <narrow condition>`**

Both halves are evidence-backed. The `brand vs brand` core is the only converting shape. The
condition qualifier is kept because it is what the ask wanted and because it adds specificity
without claiming a hub term, but it must be **narrow**. Condition modifiers that appear in real
90-day queries, by impressions:

| Modifier | Imp | Usable in a post title? |
|---|---|---|
| mood | 349 | No, hub-owned |
| **cortisol** | 99 | **Yes** |
| depression | 78 | Yes but YMYL-heavy, phrase carefully |
| anxiety | 67 | No, hub-owned (`/guides/anxiety/`) |
| **seasonal** | 36 | **Yes** |
| sleep | 31 | No, hub-owned (`/guides/sleep/`) |
| **winter** | 23 | **Yes**, combine with seasonal |
| emotional resilience | 23 | Bot-origin phrasing, skip |
| focus | 20 | No, hub-owned (`/guides/focus/`) |
| fatigue | 19 | No, hub-owned (`/guides/energy/`) |
| stress | 18 | No, hub-owned (`/guides/stress/`) |
| pms | 3 | Yes, thin but defensible |
| exam | 1 | Unproven |

So the usable narrow conditions with real demand are **cortisol**, **seasonal / winter low mood**,
**PMS**, and **depression** with careful YMYL phrasing. Broad labels (mood, anxiety, stress, sleep,
focus, energy) stay with the `/guides/<condition>` hubs and must never be claimed by a post.

## Finding 4: branded extracts with demand and no owner

Impressions are 90-day; ownership is `headTerm` declarations in `src/content/blog/`.

| Brand | 90d imp | Posts mentioning | Owns a headTerm | Gap |
|---|---|---|---|---|
| affron | 2,726 | 16 | 8 | owned |
| safr(’inside) | 321 | 15 | 0 | **unclaimed** |
| ksm-66 / ksm 66 | 387 | 28 | 1 | thin |
| quatrefolic | 158 | 2 | 0 | **unclaimed** |
| shoden | 145 | 2 | 0 | **unclaimed** |
| metafolin | 117 | 2 | 0 | **unclaimed** |
| silexan | 70 | 3 | 2 | owned |
| sensoril | 70 | 19 | 0 | **unclaimed** |
| satiereal | 53 | 2 | 0 | **unclaimed** |
| safranal | 51 | 15 | 0 | **unclaimed** |
| suntheanine | 0 | 23 | 0 | **unclaimed, no demand yet** |
| traacs | 9 | 1 | 0 | unclaimed |

`sensoril` is named in 19 posts and `suntheanine` in 23, and neither owns a single head term. The
site keeps mentioning the brands that convert while pointing its titles at the shapes that do not.

## Finding 5: candidate titles and the two rankability gates

Gate 1: no major health authority (Healthline, WebMD, Mayo, Examine, NIH) in the top three. Gate 2:
at least one top-ten result is a niche site this one can plausibly outrank.

| Candidate | Existing page | Gate 1 | Gate 2 | SERP owners observed | Verdict |
|---|---|---|---|---|---|
| KSM-66 vs Sensoril for cortisol | `ksm-66-vs-sensoril` (53 imp, pos 25.6) | pass | pass | nakedcompound, takeroon, ingredientmd, verifiedsupplementdata, drsamrobbins | **build** |
| Shoden vs KSM-66 for cortisol | `shoden-vs-ksm-66` (105 imp, pos 11.1) | pass | pass | same niche cohort | **build** |
| Suntheanine vs generic L-theanine | none (`l-theanine-vs-caffeine`, 52 imp, pos 85.4, is the retarget host) | pass | pass | nootropicsdepot, takeroon, svpplements, everydaydose, vagarights | **build** |
| Safranal vs crocin for mood | none | pass (PMC/USPTO top 3, Healthline at 4) | pass | priceplow, balanceone, meonutrition | **marginal**, PMC papers are hard to displace |
| Best time to take vitamin D3 | `vitamin-d3-morning-or-night` (476 imp, pos 73.4) | pass | pass | ubiehealth, ora.organic, cymbiotika, greatist, rhonutrition, scienceinsights | **build**, biggest single rescue on the site |

Rejected without a SERP check, because the host page already has traffic and the triage rule says do
not touch it: `affron vs Safr'Inside`, `Quatrefolic vs Metafolin`, `affron vs Satiereal`.

## Finding 6: the largest untapped pool is vitamin D3 timing

The `vitamin-d3` cluster has drawn 3,066 impressions across ten snapshots at median position 69.5
and converted zero clicks, with the highest median impressions-per-page of any cluster (126.5).
`vitamin-d3-morning-or-night` alone holds 476 impressions over 90 days across 94 distinct queries at
position 73.4, and the GA4 export shows 2 views. The query cluster is concrete and repetitive: "best
time to take d3" (56), "when is the best time to take d3" (48), "vitamin d3 before bed" (26), "what
is the best time to take vitamin d" (13), "vitamin d empty stomach" (5).

This page is not a pattern problem. It already matches demand and the SERP has no authority holding
the top three. It is at position 73 because it is one of 151 pages on a crawl-starved site. That
makes it the clearest argument for consolidating before rewriting.

## What to do with this

1. Retarget the 3 `STRIKING` and 20 `INDEXED_DEEP` posts to the Finding 3 pattern, keeping URLs.
2. Claim `sensoril`, `shoden`, `safr-inside`, `safranal` and `suntheanine` head terms, one page each,
   registered in `src/lib/keyword-map.ts`.
3. Stop producing `comparison` and `timing` posts at generic ingredient level. Ten weeks of data say
   they draw impressions and never convert.
4. Do not write any post titled "how X helps with <broad condition>". Finding 2 prices that shape at
   position 81.5 and zero clicks, and `src/lib/keyword-map.ts` will fail the build on the collision.
