# MoodSupplement — Blog Writing Guide (fed to the generator on every run)

This guide is injected into the generation prompt in `generate-post.sh`. It encodes the
standing editorial + SEO/GEO conventions, refined from the SEO audits of the omega-3 and
b-vitamins posts. Every automated post must follow it.

---

## 0. Output contract (non-negotiable)

- Your response is a **single Markdown (`.md`) file** and nothing else.
- It **must begin with the `---` of the YAML frontmatter** and **end with the last line of the
  article**.
- **No preamble, planning, reasoning, or commentary** before or after the file. Not one sentence.
- **No code fences** around the output.
- **Never include build notes, dev notes, editorial TODOs, or component-wrapping instructions**
  (e.g. "wrap this in `<WarningBox>`"). Anything you write is published verbatim to a live page.
- Write **plain Markdown only**. Do **not** use MDX components or `import` statements (the
  automated pipeline writes `.md`). For side-by-side evidence, use a compact Markdown table.

## 1. Frontmatter (fill every field)

- `title` — **≤ 45 characters**, keyword near the front. It renders as `Title · MoodSupplement`,
  so anything longer truncates in Google. (Bad: 63-char sentence titles. Good:
  "B Vitamins for Stress & Adrenal Support".)
- `description` — **150–158 characters**, keyword-first, no fluff. Never exceed 160.
- `pubDate` — today's date (provided).
- `updatedDate` — today's date. This drives the visible "Updated" line, the Article
  `dateModified` schema, and the sitemap `lastmod`. Recency is a major citation factor — always
  set it.
- `cluster` — the topic cluster (provided). **Must be the product slug** (`magnesium-glycinate`,
  not `magnesium`; `5-htp`, not `5-HTP`). GSC results are rolled up by this field, and a
  fragmented value silently splits one topic across two buckets in the scoreboard.
- `postType` — copy the queue line's `TYPE:` verbatim (`interaction`, `dosage`, `timing`,
  `safety`, `duration`, `comparison`, `explainer`, `pillar`). This is the unit of the publishing
  experiment; a wrong or missing value makes the post unmeasurable.
- `buyIntentTerm` — **required.** The long-tail *commercial* variant this post should also be
  able to satisfy, at **ingredient level**: "best magnesium glycinate for anxiety", "which b
  complex supplement to buy". Never a condition-level term ("best supplements for anxiety") —
  those belong to the `/guides/` hubs and the build fails if you take one. It must also be
  unique across every post; the build fails if two posts declare the same one.
- `relatedProducts` — the product ID(s) (provided).
- `draft: false`.
- `faq:` — a 4–6 item `q`/`a` array (see §4). This is the **only** place the FAQ lives. The
  template renders it into the page *and* emits the **FAQPage** structured data from the same
  array, so the two can never disagree. Always include it.

## 2. Voice & compliance (YMYL / E-E-A-T)

- Botanical-apothecary voice: care-forward, evidence-aware, calm. Always **"support"** language —
  never "treat", "cure", or any disease claim.
- Frame supplements as support for mood/stress/sleep, **not** treatment for depression, anxiety,
  or any diagnosed condition.
- Match evidence-tier language to the related product's tier (**Emerging / Moderate /
  Well-studied**); don't cite one favourable study to imply "well-studied". If the post uses its
  own labelled scale, define it once up front and stay consistent.
- The author is credited site-wide as **"Enoch C."** — refer to the author only as **Enoch C.**
  Never use a full name in body copy.
- If `relatedProducts` includes **5-htp**, the post **must** carry the serotonin-syndrome caution
  (5-HTP + SSRIs/SNRIs/MAOIs/other serotonergics → risk of serotonin syndrome; see a doctor).

## 3. Structure (GEO-optimised)

- **Definitional opener:** the first sentence is an "X is a…" definition of the supplement, in
  the first ~60 words. This wins AI-citation for definition queries.
- **Self-contained passages** of roughly **134–167 words** — strong AI-citation candidates.
- Single `H1` (the title); `H2`/`H3` only, no skipped levels.
- Set the length floor by the top ~5 ranking pages for the keyword; match or exceed, never pad.
- Mandatory sections: definitional intro → mechanism/body → **evidence summary** → **typical use**
  → **cautions/interactions** → **sources**. The FAQ and "supplements mentioned" blocks are
  rendered by the template from frontmatter — do **not** write them as body sections.

## 4. FAQ (frontmatter only — never in the body)

- Put **4–6** real People-Also-Ask questions in the `faq:` frontmatter array, each answered
  concisely (2–4 sentences).
- **Never write a `## Frequently asked questions` or `## FAQ` heading in the body.** The blog
  template renders the `faq:` array as a visible section automatically, and emits the FAQPage
  structured data from that same array. Writing it in the body too produces a duplicated FAQ and
  desynchronised schema. **The build now fails if a body FAQ heading is present.**
- Answers may contain inline Markdown links (`[text](url)`); they render as real links.

## 5. Evidence tables

- When you compare ≥3 studies, forms, or doses, present them in a **compact Markdown table**
  (≤ 4 columns, short cells) — tables are strong citation signals. Example columns:
  `Year | Sample | Population | Key finding`.
- Keep cells terse so the table stays readable on mobile.

## 6. Citations (biggest E-E-A-T lever)

- **5–8 real, verifiable studies**, prioritising systematic reviews / meta-analyses and RCTs from
  PubMed, Cochrane, or the NIH Office of Dietary Supplements. Cite the primary study, not
  Examine.com. **Never invent a DOI, author, journal, or finding.** If you can only verify 5, use 5.
- **Every source must be hyperlinked** — this is a required E-E-A-T signal and was the #1 miss in
  audit. Use a Markdown link to the DOI (`https://doi.org/<doi>`) or the PubMed/PMC/Cochrane URL:
  `Author(s). *Title.* Journal. Year. [doi:10.xxxx/yyyy](https://doi.org/10.xxxx/yyyy)`.
- If a (usually older) paper has no DOI or stable URL, cite it as plain text and say so briefly —
  don't fabricate a link.
- Attribute every health claim inline in plain language ("A 2019 meta-analysis found…"); no
  reproduced abstracts or long quotations.

## 7. Internal linking

- Link each mentioned product to its hub `/products/<id>/` with descriptive anchor text (never
  "click here").
- Where mood/mental-health framing appears, link `/get-help/` and `/disclaimer/`.
- Link to a genuinely relevant sibling cluster post where it helps the reader.
- End with a short italic medical-disclaimer line pointing to `/disclaimer/` and `/get-help/`.
- **Affiliate-funnel rule:** every buy-intent post (comparison, "best X", dosage/safety) must link
  the relevant product page(s) **high in the article** — first couple hundred words, not just the
  closing section. The product page carries the Amazon link and the criterion-based comparison
  table; the post's job is to route interested readers there fast, not to hold the affiliate link
  itself.

## 8. Comparison posts (TYPE:comparison)

- **Verdict-first structure:** open with a short paragraph naming who each option suits, before
  the mechanism deep-dive. Readers of "X vs Y" queries want the answer fast; make them earn the
  detail, not wait for it.
- Include one head-to-head Markdown table (mechanism, onset/timeline, typical dose, best-for) —
  this is the single highest-value table type for AI-citation on comparison queries.
- If the honest answer is "it depends on use case" or "they're often stacked together," say that
  plainly instead of forcing an artificial single winner — false-certainty verdicts undermine the
  evidence-honest voice and don't hold up to a reader's own research.
- If the two things being compared are actually the same compound under different label names
  (e.g. an ingredient sold under both a generic and an industry shorthand name), say so directly
  in the opening paragraph — this is a stronger trust signal than pretending a real difference
  exists.

## 9. Buy-intent section (every post, informational ones included)

Every post carries a `buyIntentTerm`, so every post needs one short section that actually
answers it — not a CTA bolted on, a real answer to "which one should I buy". Why: GSC shows
informational long-tails on this domain rank at position 9–22 while the commercial hubs sit at
80–95. The domain is too young to rank for commercial queries directly, so the commercial intent
has to ride on pages that can already rank.

- Place it **after** the evidence, before the safety section. Heading should read naturally and
  contain the buy-intent phrasing, e.g. `## What to look for in a magnesium glycinate supplement`.
- 100–180 words. Give **selection criteria** (elemental dose per serving, standardised extract
  and %, third-party testing, form) — not brand hype. Criteria are what make the section
  genuinely useful and what AI assistants cite.
- Link the relevant `/products/<id>/` page and, where a condition frame fits, the `/guides/<x>/`
  hub. The build fails if a post declares `buyIntentTerm` and links to neither.
- Add one `faq:` entry phrased as the buy-intent query itself.
- Never invent prices, ratings, or specs. The product page owns verified specs; this section
  owns the criteria that lead there.

## 10. Refresh pass (`refresh-queue.txt`)

Refreshes are **strictly additive** — `wc -c` after must be ≥ before, else `git checkout --` the
file. The build now enforces this too: any published post whose body drops below half its
committed length, or under 1200 chars, fails `seo-guard`.

`FOCUS:` flags on the queue line:

- `buy-intent` — add the §9 section and its FAQ entry; set `buyIntentTerm` if absent.
- `buy-intent-additive-only` + `ranking-winner` — **the page already ranks (position < 15).**
  Append the buy-intent section and FAQ entry only. Do **not** touch `title`, `seoTitle`, `slug`,
  the opening paragraph, or existing headings. Re-ranking a winner is a real risk and the upside
  is small; the whole point is to add commercial reach without disturbing what works.
- `recovery-critical` — page lost rankings after an outage and is being rebuilt: refresh
  citations, strengthen the section that matches its head term, and add internal links **to** it
  from sibling posts in the same cluster.
- `citations-critical` — post has fewer than 2 primary sources and would fail the citations gate.
- `table`, `faq-audit` — add the missing evidence table / top FAQ up to 4–6 items.

Title, slug, `cluster`, `relatedProducts` and `headTerm` are immutable in a refresh. Always bump
`updatedDate`.

---

### Quick pre-publish checklist
- [ ] Starts with `---`; no preamble, no code fences, no build/editorial notes anywhere.
- [ ] `title` ≤ 45 chars; `description` 150–158 chars; `updatedDate` set; `faq:` array present.
- [ ] Definitional opener in first ~60 words; support-not-treatment throughout.
- [ ] 5–8 verified sources, **every one hyperlinked**; no invented citations.
- [ ] `faq:` frontmatter present; **no `## Frequently asked questions` / `## FAQ` body heading**.
- [ ] Evidence table if comparing ≥3 items.
- [ ] Product hub + `/get-help/` + `/disclaimer/` links present; author referred to as "Enoch C."
- [ ] Product link appears high in the article (first couple hundred words), not only at the end.
- [ ] 5-HTP posts include the serotonin-syndrome caution.
- [ ] Comparison posts: verdict-first opener, head-to-head table, no false-certainty winner.
- [ ] `cluster` is the product slug; `postType` matches the queue `TYPE:`.
- [ ] `buyIntentTerm` set, ingredient-level, not already used by another post.
- [ ] Buy-intent section present (§9) with selection criteria + a `/products/` or `/guides/` link.
- [ ] Refreshes: body did not shrink; `ranking-winner` posts kept their title and opener.
