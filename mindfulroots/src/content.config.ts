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
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cluster: z.string(),             // topic cluster, e.g. "magnesium"
    relatedProducts: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { products, blog };
