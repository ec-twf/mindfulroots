# MoodSupplement — Session Handoff Log

## 🚨 Hotfix needed — push to main separately BEFORE final deploy

The `site` value in `astro.config.mjs` is still the placeholder `https://mindfulroots.example.com`.
This means every live page has the wrong canonical tag and sitemap URL.

Fix:
1. Open `astro.config.mjs`, change `site` to `https://mindfulroots.thewisefoolstudio.com`
2. Check `public/robots.txt` for the same placeholder and fix it
3. `git checkout main && git add astro.config.mjs public/robots.txt`
4. `git commit -m "hotfix: set real site URL for canonical tags and sitemap"`
5. `git push` → this triggers one Netlify build (worth the credit)

Status: ⬜ not yet done

---



Paste the block under **"Opening message template"** as your very first message.
Update the SESSION GOAL and TODO list before pasting.
The repo clone gives the model the working files — no conversation history needed.

---

## Opening message template

```
MoodSupplement project — session N

Repo: https://github.com/ec-twf/mindfulroots (public)
Working branch: feat/gap-integration-omega3-preview
Stack: Astro 5 + Tailwind v4, Netlify deploy (single build at end — no PR previews to save credits)

SESSION GOAL: [one sentence]

SCHEMA FIELDS ADDED (all in src/content.config.ts):
- Products: seoTitle, metaDescription, qualityCriterion, criterionRationale,
  criterionSourceUrl, recommendedProduct, comparison{}
- comparison fields: criterion, verdict, columns, rows[]
- rows fields: brand, productName, iherbKeyword, cells[], pass, pick, verifiedDate
- Blog: postType (pillar | buying-guide | comparison | explainer)

COMPONENT: src/components/ComparisonTable.astro
- Reusable across product hubs and future comparison blog posts
- verdict paragraph renders ABOVE the table on the product page
- Comparison block placed HIGH on product page (before article body, after shortDescription)

EVIDENCE WORKFLOW (per product):
1. Read pillar blog post + product .md to align with existing claims
2. Research trial literature to derive the criterion (what actually worked in studies)
3. Identify 3 brand candidates likely to meet/fail it (for instructive contrast)
4. User pastes real nutrition panel labels
5. Compute specs, verify pass/fail honestly, write verdict paragraph
6. Write YAML block into product .md, local npm run build to verify

COMPLETED PRODUCTS:
- omega-3-fish-oil   criterion: EPA ≥60% EPA+DHA, high concentration, IFOS purity  ✅ verified
- ashwagandha        criterion: named trialed extract (KSM-66/Sensoril/Shoden) + withanolides stated  ✅ verified

SEO: all 10 products have seoTitle + metaDescription
VOICE: all 10 products have botanical shortDescription

TODO THIS SESSION:
- [ ] [product name] — [criterion type from checklist]
- [ ] [product name] — [criterion type from checklist]

NETLIFY: conserve credits — local npm run build only, no merges to main until final deploy
SESSION ENDS WITH: git push to feat/gap-integration-omega3-preview (free, no Netlify build)
```

---

## Session log

### Session 1 — 2026-06-14
**Goal:** Content gap integration + omega-3 preview

**Completed:**
- Gap 1–4 actions: Our Pick buy box (image removed), EvidenceTag in blog headers,
  evidence-tier explainer band on homepage, botanical voice pass
- `seoTitle`/`metaDescription` schema fix (fields were being silently stripped by Zod)
- `ComparisonTable.astro` component (new)
- `src/pages/products/[slug].astro` — Our Pick column, no image, comparison wired in
- `src/pages/blog/[slug].astro` — EvidenceTag in post headers
- `src/pages/index.astro` — evidence-tier explainer band (3-tier grid)
- `src/content/products/omega-3-fish-oil.md` — botanical voice, verified comparison table
- `public/admin/config.yml` — SEO fields, comparison editor added
- `src/content.config.ts` — seoTitle/metaDescription, comparison schema

**Pushed to:** `feat/gap-integration-omega3-preview`

---

### Session 2 — 2026-06-14 (same day, continued)
**Goal:** SEO fields for remaining 9 products, postType schema, voice pass

**Completed:**
- `seoTitle` + `metaDescription` added to all 9 remaining products
- `ashwagandha` + `b-complex` shortDescription warmed to botanical voice
- `postType` field added to blog schema + CMS (pillar/buying-guide/comparison/explainer)
- `comparison.verdict` field added to schema + CMS
- Comparison block moved HIGH on product page (before article body)
- `ashwagandha.md` — criterion derived, comparison table + verdict written, verified
- `omega-3-fish-oil.md` — verdict paragraph added
- `src/pages/products/[slug].astro` — verdict paragraph renders above table

**Pushed to:** `feat/gap-integration-omega3-preview`

---

### Session 3 — [date]
**Goal:** [fill in]

**Completed:**
- [ ]

**Pushed to:** `feat/gap-integration-omega3-preview`

---

## Remaining comparison tables (label data needed from user)

| Product | Criterion type | Status |
|---|---|---|
| omega-3-fish-oil | EPA ≥60%, concentration, IFOS purity | ✅ done |
| ashwagandha | Named trialed extract (KSM-66/Sensoril/Shoden) | ✅ done |
| rhodiola-rosea | Standardized extract (SHR-5 type, rosavins/salidroside ratio) | ⬜ todo |
| saffron-extract | Standardized extract (affron® or HPLC-verified) at trialed dose | ⬜ todo |
| magnesium-glycinate | Bioavailable form + labeled elemental mg | ⬜ todo |
| vitamin-d3 | D3 not D2, sensible dose range | ⬜ todo |
| b-complex | Methylated forms (methylcobalamin, methylfolate) | ⬜ todo |
| l-theanine | Dose at trialed level (~200 mg), ideally Suntheanine | ⬜ todo |
| probiotic-gut-brain | Named psychobiotic strains + CFU | ⬜ todo |
| 5-htp | Purity/safety criterion (not efficacy — emerging evidence) | ⬜ todo |

## Outstanding (non-comparison)
- [ ] Delete unused `public/products/sports-research-omega-3.jpg`
- [ ] Disclosure, Disclaimer pages — confirm if still placeholder
- [ ] Write buying-guide blog posts (Gap 1) — postType: buying-guide
- [ ] Write comparison blog posts (Gap 2) — postType: comparison
- [ ] Final single Netlify deploy (merge feat branch → main)

## Model guidance
| Work type | Model |
|---|---|
| Criterion derivation, evidence judgment, verdict writing | Opus |
| YAML fill, build verify, packaging, git commands | Sonnet 4.6 |
| Blog post drafting | Sonnet 4.6 |
