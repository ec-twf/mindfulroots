import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    // SEO overrides. If omitted, the page falls back to `title` /
    // `shortDescription`. (These MUST be declared here — Zod strips any
    // frontmatter key the schema doesn't know about, which is why an
    // undeclared `seoTitle` never reached the <title> tag.)
    seoTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    latinName: z.string().optional(),
    category: z.string(),            // e.g. "Adaptogen", "Mineral", "Amino acid"
    evidence: z.enum(['Emerging', 'Moderate', 'Well-studied']),
    shortDescription: z.string(),
    benefits: z.array(z.string()),
    typicalUse: z.string(),
    cautions: z.string(),
    interactionWarning: z.string().optional(), // rendered as a prominent warning box
    iherbKeyword: z.string(),        // keyword or full iHerb URL for the affiliate link (generic fallback CTA)
    relatedPosts: z.array(z.string()).default([]),
    order: z.number().default(99),

    // ─── Evidence-first product recommendation (all optional) ────────────────
    // When present, the buy box shows the criterion + a verified specific
    // product, and the CTA points at THAT product instead of the generic
    // `iherbKeyword` search. Products without these fields fall back to the
    // existing generic button, so this can be rolled out one product at a time.
    qualityCriterion: z.string().optional(),
    criterionRationale: z.string().optional(),
    criterionSourceUrl: z.string().url().optional(),

    recommendedProduct: z
      .object({
        brand: z.string(),
        productName: z.string(),
        iherbKeyword: z.string(),       // specific product URL or precise keyword
        meetsCriterion: z.boolean().default(true),
        concentrationNote: z.string().optional(),
        oxidationNote: z.string().optional(),
        verifiedDate: z.coerce.date(),
        sourceUrl: z.string().url().optional(),
        note: z.string().optional(),    // internal caveat, not rendered

        // Product image. Use an image you are LICENSED to use (your own photo or
        // an affiliate-program-approved asset) — NOT a copied iHerb/brand photo.
        // Path is relative to /public, e.g. "/products/sports-research-omega3.jpg".
        image: z.string().optional(),
        imageAlt: z.string().optional(),

        // Feeds the Review schema's reviewRating.ratingValue (1-5). Omitted
        // from JSON-LD entirely when unset — do not fabricate.
        rating: z.number().min(1).max(5).optional(),
        // Plain display text near the buy-box CTA, e.g. "$24.99" or "Check
        // price on Amazon". Manually entered, never scraped. Display-only —
        // never fed into structured data (see schema notes in [slug].astro).
        priceDisplay: z.string().optional(),
      })
      .optional(),

    // ─── "How the options compare" table (optional) ──────────────────────────
    // A transparent, criterion-based comparison of 3–5 real products. This is
    // the commercial answer to "best [supplement]" intent AND an E-E-A-T signal,
    // because every row is scored pass/fail against `comparison.criterion`.
    // IMPORTANT: only enter rows whose specs you have personally verified
    // against the live iHerb/brand listing — never invent EPA %, IFOS ratings,
    // or concentrations. Leave the field off entirely until you have real data.
    comparison: z
      .object({
        criterion: z.string().optional(), // shown above the table; defaults to qualityCriterion
        verdict: z.string().optional(),   // prose paragraph: why the pick wins and the others fall short
        columns: z.array(z.string()).optional(), // header labels for the spec cells
        rows: z.array(
          z.object({
            brand: z.string(),
            productName: z.string(),
            iherbKeyword: z.string(),       // specific product URL or precise keyword
            cells: z.array(z.string()),     // spec values, same order/length as `columns`
            pass: z.boolean().default(true),// meets the stated criterion?
            pick: z.boolean().default(false),// our recommended pick (highlighted row)
            verifiedDate: z.coerce.date().optional(),
          }),
        ),
      })
      .optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // SEO overrides. If omitted, the page falls back to `title` /
    // `description`. (These MUST be declared here — Zod strips any
    // frontmatter key the schema doesn't know about, which is why an
    // undeclared `seoTitle` never reached the <title> tag.)
    seoTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cluster: z.string(),             // topic cluster, e.g. "magnesium"
    // The longtail pattern this post is testing. Beyond routing the template,
    // this is the unit of the publishing experiment: gsc-pull.py rolls GSC up
    // by postType so we can see which patterns earn impressions at our current
    // authority. Keep in sync with the TYPE: field in mindfulroots-topic-queue.txt.
    //   pillar / buying-guide / explainer — legacy formats
    //   interaction  "can you take X with Y"      (proven: position 9-16)
    //   dosage       "how much X per day"          (proven: position 13-44)
    //   comparison   "X vs Y"
    //   timing       "when to take X"
    //   safety       "X side effects"
    //   duration     "how long does X take to work"
    postType: z
      .enum([
        'pillar', 'buying-guide', 'explainer',
        'interaction', 'dosage', 'comparison', 'timing', 'safety', 'duration',
      ])
      .optional(),
    relatedProducts: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    // Per-post share/hero image (path relative to /public). Feeds og:image,
    // twitter:image and the Article schema `image`. Falls back to /og-default.png.
    image: z.string().optional(),
    imageAlt: z.string().optional(),

    // ─── Keyword ownership (cannibalization guard) ────────────────────────────
    // The one head keyword this page owns, e.g. "magnesium glycinate vs
    // citrate". Cross-checked at build time (seo-guard) against every other
    // blog/product file and against src/lib/keyword-map.ts so two pages never
    // silently compete for the same query.
    headTerm: z.string().optional(),
    // Additional long-tail variants this same page owns (e.g. close phrasing
    // of the head term). Also uniqueness- and registry-checked.
    ownsKeywords: z.array(z.string()).default([]),

    // ─── Buy-intent affordance ────────────────────────────────────────────────
    // The long-tail commercial variant this post should ALSO be able to satisfy,
    // e.g. "best magnesium glycinate for anxiety" on an evidence post about
    // magnesium and sleep. Informational longtails are what actually rank at
    // zero authority (GSC-proven: interaction + dosage posts sit at position
    // 8-13 while the commercial hubs sit at 80-95), so the commercial term
    // rides on a page that can already rank rather than one that cannot yet.
    //
    // Deliberately NOT part of KEYWORD_MAP: this is a secondary intent the page
    // competes for, not a head term it owns. seo-guard only enforces that no
    // two posts declare the same one, so the layers still cannot cannibalize.
    buyIntentTerm: z.string().optional(),
  }),
});

const hubs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/hubs' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string(),
    metaDescription: z.string().optional(),
    condition: z.string(),          // canonical slug-like id, e.g. "stress"
    conditionLabel: z.string(),     // display label, e.g. "Stress"
    // Head keyword this hub owns, cross-checked by seo-guard against
    // src/lib/keyword-map.ts (same cannibalization guard as blog/products).
    headTerm: z.string(),
    ownsKeywords: z.array(z.string()).default([]),
    intent: z.enum(['best', 'how-to-choose', 'comparison-roundup', 'where-to-buy']).default('best'),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Product collection slugs, in recommendation-rank order. products[0] is
    // the hero pick surfaced in the GuideHeroBox with a direct affiliate CTA.
    products: z.array(z.string()).min(1),
    // One-line, condition-framed reason the hero pick leads (shown in the hero
    // box). Falls back to the product's shortDescription if omitted.
    heroPitch: z.string().optional(),
    // Blog collection slugs whose evidence backs the picks above.
    supportingPosts: z.array(z.string()).default([]),
    // Sibling hub slugs (under src/content/hubs) for "Related guides".
    relatedHubs: z.array(z.string()).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    draft: z.boolean().default(false),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { products, blog, hubs };
