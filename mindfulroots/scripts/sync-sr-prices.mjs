// Refreshes live price + availability for every product on a direct (non-Amazon)
// affiliate program, writing src/data/product-prices.json.
//
// Why this exists: the /go/ router sends four products straight to
// store.sportsresearch.com at a pinned Shopify *variant*. A pinned variant is a
// liability — if Sports Research retires it, the money link quietly degrades and
// we'd find out from a reader. This script re-resolves every variant against the
// store's public product JSON, so a dead SKU becomes a build/CI failure instead.
//
// The price it fetches is shown in the buy box before the click, which is a
// conversion lever (no surprise at landing), not an SEO one — we deliberately do
// not emit Product/Offer schema, since we are not the seller. See the schema
// rationale in src/pages/products/[slug].astro.
//
// Amazon products are skipped by design: scraping Amazon prices violates their
// ToS (the Product Advertising API is the only sanctioned route), so those
// buy boxes stay priceless.
//
// Usage:  npm run sync:prices        (writes the file, non-zero exit on drift)
//         npm run sync:prices -- --check   (verifies only, writes nothing)

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const LINKS_PATH = join(ROOT, 'src/data/affiliate-links.json');
const OUT_PATH = join(ROOT, 'src/data/product-prices.json');
const CHECK_ONLY = process.argv.includes('--check');

/** Pulls the Shopify product handle + variant id back out of a Rakuten deep link. */
function parseRakutenMurl(url) {
  const murl = new URL(url).searchParams.get('murl');
  if (!murl) return null;
  const dest = new URL(decodeURIComponent(murl));
  const handle = dest.pathname.split('/products/')[1]?.replace(/\/$/, '');
  const variantId = dest.searchParams.get('variant');
  if (!handle || !variantId) return null;
  return { host: dest.host, handle, variantId };
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const links = JSON.parse(await readFile(LINKS_PATH, 'utf8'));
const prices = {};
const problems = [];

for (const [slug, entry] of Object.entries(links)) {
  if (entry.active !== 'direct' || !entry.direct) continue;

  const parsed = parseRakutenMurl(entry.direct);
  if (!parsed) {
    problems.push(`${slug}: could not parse a Shopify handle + variant out of the direct link`);
    continue;
  }

  const res = await fetch(`https://${parsed.host}/products/${parsed.handle}.json`);
  if (!res.ok) {
    problems.push(`${slug}: ${parsed.host}/products/${parsed.handle}.json returned ${res.status}`);
    continue;
  }

  const { product } = await res.json();
  const variant = product.variants.find((v) => String(v.id) === parsed.variantId);
  if (!variant) {
    const available = product.variants.map((v) => `${v.id} (${v.title})`).join(', ');
    problems.push(
      `${slug}: variant ${parsed.variantId} no longer exists on "${product.title}". ` +
        `Live variants: ${available}. Repoint the murl in affiliate-links.json.`,
    );
    continue;
  }

  prices[slug] = {
    price: fmt.format(Number(variant.price)),
    variantTitle: variant.title,
    available: variant.available !== false,
    checkedAt: new Date().toISOString().slice(0, 10),
    source: `${parsed.host}/products/${parsed.handle}`,
  };

  if (variant.available === false) {
    problems.push(`${slug}: variant ${parsed.variantId} (${variant.title}) is out of stock`);
  }
}

for (const [slug, p] of Object.entries(prices)) {
  console.log(`${slug.padEnd(20)} ${p.price.padStart(8)}  ${p.variantTitle}${p.available ? '' : '  [OUT OF STOCK]'}`);
}

if (problems.length > 0) {
  console.error('\nProblems:');
  for (const p of problems) console.error(`  - ${p}`);
}

// Never half-write the file. A partial run means a money link is broken, and
// overwriting good prices with a subset would hide the products that failed.
if (problems.length > 0) {
  console.error('\nNothing written — fix the above, then re-run.');
  process.exit(1);
}

if (!CHECK_ONLY) {
  await writeFile(OUT_PATH, JSON.stringify(prices, null, 2) + '\n');
  console.log(`\nWrote ${Object.keys(prices).length} price(s) to src/data/product-prices.json`);
}
