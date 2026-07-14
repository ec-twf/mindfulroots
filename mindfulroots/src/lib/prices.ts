// Live retailer prices for products on a direct affiliate program, refreshed by
// `npm run sync:prices` (scripts/sync-sr-prices.mjs) and committed as data.
//
// Shown in the buy box so the reader knows the price before the click. Amazon
// products have no entry — scraping their prices breaks Amazon's ToS — so every
// consumer must treat a missing price as normal, not as an error.
import productPrices from '../data/product-prices.json';

export interface ProductPrice {
  /** Formatted for display, e.g. "$53.95". */
  price: string;
  /** Retailer's own variant label, e.g. "1250 MG / 180 Softgels". */
  variantTitle: string;
  available: boolean;
  /** ISO date the price was last re-fetched from the store. */
  checkedAt: string;
  source: string;
}

const PRICES = productPrices as Record<string, ProductPrice>;

export function priceFor(slug?: string): ProductPrice | null {
  if (!slug) return null;
  const entry = PRICES[slug];
  return entry && entry.available ? entry : null;
}

/** One-line price + pack size for a CTA, e.g. "$53.95 · 1250 MG / 180 Softgels". */
export function priceLabel(slug?: string): string | null {
  const entry = priceFor(slug);
  return entry ? `${entry.price} · ${entry.variantTitle}` : null;
}
