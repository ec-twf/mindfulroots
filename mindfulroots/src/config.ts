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
