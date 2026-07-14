// ─── Site-wide configuration ────────────────────────────────────────────────
// Update these values once your iHerb affiliate account is approved.

export const SITE = {
  name: 'MoodSupplement',
  tagline: 'Evidence-aware mood & stress support, explained calmly.',
  /** Short form used in the homepage <title>; `tagline` is too long for a SERP. */
  seoTagline: 'Evidence-Aware Mood & Stress Support',
  description:
    'Mood, stress and sleep supplements reviewed with an evidence-aware, no-hype approach — plus honest guidance on when supplements are not the answer.',
};

// Your iHerb affiliate / rewards code. Leave as-is until you have one.
export const IHERB_AFFILIATE_CODE = 'YOUR_CODE_HERE';

// Amazon Associates tracking tag.
export const AMAZON_ASSOCIATES_TAG = 'moodsupplemen-20';

// Which retailer's links the site currently generates.
export const ACTIVE_RETAILER: 'amazon' | 'iherb' = 'amazon';

// Display name for the active retailer, e.g. "View on {RETAILER_NAME}".
export const RETAILER_NAME = ACTIVE_RETAILER === 'amazon' ? 'Amazon' : 'iHerb';

/**
 * Builds an iHerb link with your affiliate code attached.
 * Accepts either a full iHerb product URL or a search keyword.
 */
export function iherbLink(productUrlOrKeyword: string): string {
  const base = productUrlOrKeyword.startsWith('http')
    ? productUrlOrKeyword
    : `https://www.iherb.com/search?kw=${encodeURIComponent(productUrlOrKeyword)}`;
  // Until a real affiliate code is set, return clean links (no rcode) so the
  // site can go live without publishing a placeholder tracking code. Once
  // IHERB_AFFILIATE_CODE is set to your real code, every link picks it up
  // automatically on the next build — no per-page edits.
  if (!IHERB_AFFILIATE_CODE || IHERB_AFFILIATE_CODE === 'YOUR_CODE_HERE') {
    return base;
  }
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}rcode=${IHERB_AFFILIATE_CODE}`;
}

/**
 * Builds an Amazon link with the Associates tag attached.
 * Accepts either a full Amazon product URL or a search keyword.
 */
export function amazonLink(productUrlOrKeyword: string): string {
  const base = productUrlOrKeyword.startsWith('http')
    ? productUrlOrKeyword
    : `https://www.amazon.com/s?k=${encodeURIComponent(productUrlOrKeyword)}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}tag=${AMAZON_ASSOCIATES_TAG}`;
}

/** Builds a retailer link using whichever retailer is currently active. */
export function retailerLink(productUrlOrKeyword: string): string {
  return ACTIVE_RETAILER === 'amazon' ? amazonLink(productUrlOrKeyword) : iherbLink(productUrlOrKeyword);
}

// ─── Per-product retailer resolution ────────────────────────────────────────
// `RETAILER_NAME` above is the site-wide default. Individual products can be on
// a different program (e.g. omega-3 and vitamin-d3 go direct to Sports Research
// via Rakuten instead of Amazon), so any CTA that routes through /go/ must take
// its label from that product's row in affiliate-links.json — otherwise a button
// reading "on Amazon" would send the click to a different store, which is both
// dishonest to the reader and an Amazon Associates ToS breach.
import affiliateLinks from './data/affiliate-links.json';

interface AffiliateEntry {
  amazon?: string | null;
  iherb?: string | null;
  direct?: string | null;
  /** Display name for the `direct` program's store, e.g. "SportsResearch.com". */
  directName?: string | null;
  active?: string;
}
const LINKS = affiliateLinks as Record<string, AffiliateEntry>;

/** Display name of the retailer a product's /go/ link actually lands on. */
export function retailerNameFor(slug?: string): string {
  const entry = slug ? LINKS[slug] : undefined;
  if (!entry) return RETAILER_NAME;
  switch (entry.active) {
    case 'direct':
      return entry.directName || 'the brand store';
    case 'iherb':
      return 'iHerb';
    default:
      return 'Amazon';
  }
}

/** True when the product sells through the brand's own store rather than a marketplace. */
export function isDirectRetailer(slug?: string): boolean {
  return Boolean(slug && LINKS[slug]?.active === 'direct');
}

/**
 * Full CTA label for a product. On a marketplace the brand and the store are
 * different things ("View Sports Research on Amazon"); on a direct program they
 * are the same, so naming the brand twice reads as a stutter.
 */
export function ctaLabel(slug?: string, brand?: string): string {
  const retailer = retailerNameFor(slug);
  if (isDirectRetailer(slug)) return `View at ${retailer}`;
  return brand ? `View ${brand} on ${retailer}` : `View on ${retailer}`;
}

/**
 * First-party affiliate router URL for a product slug (see netlify/functions/go.mjs).
 * Destination + retailer live in src/data/affiliate-links.json; the function logs the
 * click server-side (ad-blocker-proof) and 302s to the active retailer with the tag
 * attached. Prefer this over `retailerLink()` wherever the product slug is known.
 */
export function goLink(productSlug: string, placement?: string): string {
  return placement ? `/go/${productSlug}?p=${encodeURIComponent(placement)}` : `/go/${productSlug}`;
}
