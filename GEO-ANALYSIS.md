# GEO Analysis: Omega-3s and Mood
**URL:** https://www.moodsupplement.net/blog/omega-3-brain-mood-evidence/
**Analysed:** 2026-06-30
**Published:** 2026-01-12 · **Last modified:** 2026-06-13 (17 days ago — fresh)

---

## GEO Readiness Score: 70/100

| Dimension | Score | Weight |
|---|---|---|
| Citability | 19/25 | 25% |
| Structural Readability | 14/20 | 20% |
| Multi-Modal Content | 5/15 | 15% |
| Authority & Brand Signals | 15/20 | 20% |
| Technical Accessibility | 17/20 | 20% |
| **Total** | **70/100** | |

---

## Platform Breakdown

| Platform | Score | Key gap |
|---|---|---|
| Google AI Overviews | 74/100 | No FAQPage schema; declarative H2s |
| Google AI Mode | 68/100 | Entity authority weak; no cross-platform mentions |
| ChatGPT | 52/100 | No Wikipedia (47.9% of ChatGPT citations) |
| Perplexity | 50/100 | No Reddit presence (46.7% of Perplexity citations) |

---

## AI Crawler Access

All major AI crawlers are explicitly allowed in `robots.txt` — this is best-practice and correctly configured.

| Crawler | Status |
|---|---|
| GPTBot (OpenAI) | ✅ Explicitly allowed |
| OAI-SearchBot (OpenAI) | ✅ Explicitly allowed |
| ClaudeBot (Anthropic) | ✅ Explicitly allowed |
| PerplexityBot | ✅ Explicitly allowed |
| Google-Extended | ✅ Explicitly allowed |
| Applebot-Extended | ✅ Explicitly allowed |
| CCBot (Common Crawl / training) | ⚪ Allowed by wildcard — consider explicit block if desired |
| anthropic-ai, Bytespider, cohere-ai | ⚪ Allowed by wildcard — no explicit rule |

No action needed for search visibility. Optional: add `Disallow: /` for `CCBot` if you want to opt out of training-data crawls.

---

## llms.txt Status

✅ **Present and well-structured** at `https://www.moodsupplement.net/llms.txt`

The file includes a clear site description, all 10 product reviews, all 11 research guides (including this page), and key pages — each with a short description. This is one of the better-implemented `llms.txt` files in the supplement niche.

**Note (per Google's guidance):** llms.txt is not currently confirmed as a citation signal by any major AI search platform. It provides structural context to AI crawlers and is worth keeping, but should not be weighted as a ranking lever.

---

## Brand Mention Analysis

| Platform | Status | Impact |
|---|---|---|
| LinkedIn | ✅ Present (author page; in schema sameAs) | Moderate |
| Wikipedia (brand) | ❌ Absent | High — 47.9% of ChatGPT citations |
| Wikipedia (author) | ❌ Absent | High |
| Reddit | ❌ No posts or mentions found | High — 46.7% of Perplexity citations |
| YouTube | ❌ Absent | Very high — 0.737 correlation with AI citations (Ahrefs) |
| Wikidata | ❌ Absent | High — entity recognition across AI systems |

**The single biggest gap in this site's AI visibility is off-page entity presence.** The on-page content is genuinely strong. What's holding back ChatGPT and Perplexity citation rates is the absence of third-party mentions — Reddit discussions, YouTube content, Wikipedia coverage. Brand mentions correlate 3× more strongly with AI citation than backlinks (Ahrefs, 75k-brand study).

---

## Passage-Level Citability

**Optimal range: 134–167 words per passage.** 44% of AI citations come from the first 30% of a page.

### Strongest citable passages

**1. Cochrane review paragraph** (~140 words — within optimal range ✅)
> "The most rigorous synthesis is the 2021 Cochrane review by Appleton and colleagues, which pooled 35 trials... They rated the certainty of the evidence as low to very low..."

Self-contained, attributed, specific statistics. High citation likelihood.

**2. EPA threshold paragraph** (~110 words — slightly short)
> "A 2023 systematic review by Kelaiditis and colleagues (10 trials, 1,426 people)... a statistically significant effect appeared when EPA made up at least 60% of the total EPA + DHA..."

Specific numerical thresholds make this highly quotable for "how much EPA" queries.

**3. FAQ answers** (40–80 words each — below optimal)
Direct Q&A format is strong structurally, but answers are somewhat short to hit the 134-word optimal. Expanding each answer by 50–70 words would move them into the citation-sweet spot.

**4. "The bottom line" section** (~80 words — below optimal)
Good summary framing but too short to be cited as a standalone passage. Expanding to ~140 words would significantly improve AI extraction.

### Weak zone: opening (first 30% of page)
The article opens with narrative framing rather than a definitional answer. Per the SE Ranking study, 44% of AI citations come from the first 30% of content. The first section ("Why omega-3s reach the brain") contains no statistics. Moving the Cochrane findings earlier — or adding a definitional opener — would substantially boost citability.

---

## Server-Side Rendering Check

✅ **Full SSR confirmed.** The site is built with Astro in static output mode. All content is present in the raw HTML response — no JavaScript rendering required. AI crawlers (which do not execute JS) receive the complete page content. No action needed.

---

## Top 5 Highest-Impact Changes

### 1. Add FAQPage schema (High impact · 1 hour)
The 7-question FAQ is already excellent content and the single easiest schema win on the page. Without markup, AI Overviews cannot extract Q&A pairs as structured rich results.

Add to the blog post's layout or as a script tag in the Astro template:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Does fish oil actually help with depression?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The honest answer is 'modestly, and inconsistently.' The most cautious high-quality review (Cochrane, 2021) found a small effect that's probably below the threshold people would notice, with low-certainty evidence. Other meta-analyses are more positive when they focus on EPA-rich formulas in people who are already depressed. It is best thought of as possible support alongside professional care, not a standalone treatment."
      }
    },
    {
      "@type": "Question",
      "name": "EPA or DHA — which one matters for mood?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The mood evidence consistently points to EPA. Several meta-analyses found that EPA-predominant supplements drove the benefit while DHA-only preparations didn't, with a signal when EPA made up at least 60% of the EPA + DHA total."
      }
    },
    {
      "@type": "Question",
      "name": "How much omega-3 should I take for mood?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In the trials that showed an effect, roughly 1 to 2 grams of EPA per day was the useful range — and higher doses didn't clearly do better. Your appropriate dose depends on your health and medications, so confirm it with a clinician."
      }
    },
    {
      "@type": "Question",
      "name": "How long until omega-3s work for mood?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Where benefits appeared, they generally built up over about 8 to 12 weeks of consistent daily use, not overnight."
      }
    },
    {
      "@type": "Question",
      "name": "Can I take omega-3s with antidepressants?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Much of the supportive research used omega-3s as an add-on to standard treatment, but this is exactly the kind of decision to make with the doctor managing your medication rather than on your own."
      }
    },
    {
      "@type": "Question",
      "name": "Should I take omega-3s to prevent low mood if I feel fine?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The largest prevention trial (VITAL-DEP, 18,353 adults, 5–7 years) found no benefit for preventing depression in the general population. Eating oily fish a couple of times a week is a reasonable choice; supplementing solely to prevent low mood isn't well supported."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a vegan version of omega-3?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — algae-derived (algal) oil provides EPA and DHA directly, with no fish involved."
      }
    }
  ]
}
```

### 2. Add a definitional opener in the first 60 words (Medium impact · 30 minutes)

The current opening is narrative framing. AI systems prioritise pages that answer the query immediately. Adding one sentence of definition before the current opening would capture "what are omega-3s" queries:

**Current opening:**
> "Omega-3 fatty acids are one of the few supplements with a genuinely large body of mood research behind them..."

**Suggested revision:**
> "Omega-3 fatty acids — specifically EPA (eicosapentaenoic acid) and DHA (docosahexaenoic acid) — are essential long-chain fats found in oily fish that become structural components of brain cell membranes and are involved in inflammation, neurotransmitter signalling, and neuroplasticity. They're one of the few supplements with a genuinely large body of mood research behind them, though "a lot of research" is not the same as "a strong, reliable effect."..."

This adds ~45 words and converts the page into a citation candidate for definition queries.

### 3. Add a comparison table for EPA vs DHA studies (Medium impact · 1 hour)

Tables are strong AI citation signals and add unique structured data. The EPA vs DHA section describes four key studies in prose — a table would make this extractable:

| Study | Year | n | Population | EPA threshold | Key finding |
|---|---|---|---|---|---|
| Martins | 2009 | 28 trials | Mixed | EPA-predominant | DHA-only preparations showed no effect |
| Liao et al. | 2019 | 26 trials, ~2,160 | Adults with depression | EPA proportion | Small reduction; EPA:DHA ratio was the driver |
| Kelaiditis et al. | 2023 | 10 trials, 1,426 | Adults | ≥60% EPA | Significant effect at 1–<2 g/day EPA |
| Norouziasl et al. | 2025 | 67 trials | Depressed adults | Dose–response | Each +1 g/day associated with greater improvement |
| Cochrane (Appleton) | 2021 | 33 trials, 1,848 | MDD diagnosis | — | SMD −0.40; low certainty; below clinical threshold |
| VITAL-DEP (Okereke) | 2021 | 18,353 | General population | — | No benefit for prevention in non-depressed adults |

Add this immediately after the prose in the "EPA versus DHA" section.

### 4. Show "Last updated" date on-page (Low effort · 15 minutes)

The `updatedDate: 2026-06-13` is in the frontmatter and in the Article schema, but is not visibly rendered on the page. Recency is a key AI citation factor (content under 3 months is ~3× more likely to be cited). Displaying "Updated June 2026" next to the byline surfaces this signal both for AI crawlers and readers.

The publish date is already rendered ("January 12, 2026"). Adding the updated date alongside it is a template-level change.

### 5. Add `speakable` property to Article schema (Low effort · 20 minutes)

Google supports the `speakable` schema property for identifying passages suitable for AI-generated summaries. Add it to the existing Article schema pointing to the intro and bottom-line paragraphs:

```json
"speakable": {
  "@type": "SpeakableSpecification",
  "cssSelector": [".prose-mr > p:first-child", ".prose-mr > h2:last-of-type + p"]
}
```

---

## Schema Recommendations

| Schema | Status | Action |
|---|---|---|
| Article | ✅ Present | Add `speakable`; add article-specific image |
| BreadcrumbList | ✅ Present | No action needed |
| Organization | ✅ Present | Add Wikidata/Wikipedia sameAs when created |
| Person (author) | ✅ Present | Add Wikidata sameAs when created |
| FAQPage | ❌ Missing | Add — see Top 5 #1 above |
| WebSite | ❌ Missing | Add at site level with `SearchAction` |

---

## Content Reformatting Suggestions

### FAQ: convert to H3 question headings
Currently the FAQ answers are rendered as bold prose. Proper `<h3>` question headings improve AI Q&A extraction:

```markdown
### Does fish oil actually help with depression?
The honest answer is "modestly, and inconsistently."...

### EPA or DHA — which one matters for mood?
The mood evidence consistently points to EPA...
```

### "The bottom line" section: expand to ~140 words
At ~80 words it's below the optimal citation range. Add the VITAL-DEP prevention finding and the EPA threshold as specific callouts to bring it to 134–167 words:

> "Omega-3s are well researched — but 'well-researched' describes the volume of studies, not the size of the effect. The Cochrane review (35 trials, 1,848 people) found a real but small benefit (SMD −0.40) rated low-certainty, likely below the threshold most people notice. The largest prevention trial (VITAL-DEP, 18,353 adults) found no benefit for people who aren't already depressed. Where a signal does appear, it's EPA-driven — supplements with at least 60% EPA at 1–2 g/day — and in people with more significant symptoms, not general low mood. The fairer summary: a small, real, EPA-driven signal that works best as a supporting player within a plan you build with a professional. The EPA:DHA ratio and consistency matter more than the milligrams on the front of the bottle."

---

## Quick Reference: What's Already Working

- ✅ Astro static site — full SSR, all content AI-accessible
- ✅ All major AI crawlers explicitly allowed
- ✅ llms.txt present and well-structured
- ✅ Article schema with author Person, dates, publisher
- ✅ 6 primary sources cited with DOIs and URLs (Cochrane, JAMA, PubMed, NIH)
- ✅ Content last modified 17 days ago — within the 3-month freshness window
- ✅ FAQ section with 7 questions
- ✅ Specific numerical thresholds (SMD −0.40, 60% EPA, 1–2 g/day, 8–12 weeks)
- ✅ Honest, calibrated framing — strong E-E-A-T signal

---

*Generated by claude-seo/seo-geo · 2026-06-30*
