import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
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

    // Human-readable rule shown to the reader (the "why this pick").
    qualityCriterion: z.string().optional(),
    // One sentence on why the criterion matters.
    criterionRationale: z.string().optional(),
    // Stable, citable source backing the criterion itself (a real standard/body).
    criterionSourceUrl: z.string().url().optional(),

    // The specific product the affiliate CTA points to BECAUSE it meets the
    // criterion. Verified by a human, with a date — never scraped live.
    recommendedProduct: z
      .object({
        brand: z.string(),
        productName: z.string(),
        // Specific product URL or precise keyword for iherbLink().
        iherbKeyword: z.string(),
        meetsCriterion: z.boolean().default(true),
        // Short pass-evidence lines shown as ticks in the buy box.
        concentrationNote: z.string().optional(),
        oxidationNote: z.string().optional(),
        // When a human last checked the label/spec. Shown on the page.
        verifiedDate: z.coerce.date(),
        // Optional link to where the spec was verified.
        sourceUrl: z.string().url().optional(),
        // Internal caveat (e.g. SKU/count variation). Not rendered.
        note: z.string().optional(),
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
