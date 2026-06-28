# MoodSupplement

An SEO-focused affiliate site (Astro + Tailwind v4 + Decap CMS) for evidence-aware
mood / stress / sleep supplements, linking out to iHerb. Two sections: a Shopify-style
supplement catalog and a blog, wired together as an SEO hub-and-spoke.

## Quick start
```bash
npm install
npm run dev        # local dev at http://localhost:4321
npm run build      # static output in ./dist
```

## Before you launch
1. **Affiliate code** — open `src/config.ts` and set `IHERB_AFFILIATE_CODE`. Every
   product "View on iHerb" button uses it automatically (with rel="sponsored").
2. **Domain** — set `site` in `astro.config.mjs` (used for canonical URLs + sitemap)
   and update the sitemap URL in `public/robots.txt`.
3. **Real content** — replace the placeholder copy in About, Contact, Disclosure,
   Disclaimer, and Get help. Verify the crisis-helpline numbers for your audience.
4. **Brand** — "MoodSupplement" is a placeholder; change it in `src/config.ts`.

## Editing content
- **No-code:** deploy to Netlify, enable Identity + Git Gateway, then log in at
  `/admin` to write posts and supplements from a web form (Decap CMS).
- **In code:** add Markdown files to `src/content/blog/` or `src/content/products/`.

## The SEO hub-and-spoke
- Each **product page** is a hub; it lists related blog posts (`relatedPosts`).
- Each **blog post** is a spoke; it links back to its products (`relatedProducts`).
- New posts that target an existing cluster strengthen that hub over time. Aim for
  long-tail, specific queries rather than head terms like "best supplement for depression".

## Deploy (Netlify example)
Build command `npm run build`, publish directory `dist`. Astro static output also
works on Vercel, Cloudflare Pages, or any static host.

## A note on responsibility
This niche is YMYL ("Your Money or Your Life"). The template deliberately frames
supplements as *support*, never as treatment for depression, states cautions up front,
and signposts professional/crisis help throughout — which is both the right thing to do
and what Google rewards here. Please keep that framing as you add content.
