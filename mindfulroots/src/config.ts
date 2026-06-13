// ─── Site-wide configuration ────────────────────────────────────────────────
// Update these values once your iHerb affiliate account is approved.

export const SITE = {
  name: 'MindfulRoots',
  tagline: 'Evidence-aware mood & stress support, explained calmly.',
  description:
    'MindfulRoots reviews mood, stress and sleep-support supplements with an evidence-aware, no-hype approach — plus honest guidance on when supplements are not the answer.',
};

// Your iHerb affiliate / rewards code. Leave as-is until you have one.
export const IHERB_AFFILIATE_CODE = 'YOUR_CODE_HERE';

/**
 * Builds an iHerb link with your affiliate code attached.
 * Accepts either a full iHerb product URL or a search keyword.
 */
export function iherbLink(productUrlOrKeyword: string): string {
  const base = productUrlOrKeyword.startsWith('http')
    ? productUrlOrKeyword
    : `https://www.iherb.com/search?kw=${encodeURIComponent(productUrlOrKeyword)}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}rcode=${IHERB_AFFILIATE_CODE}`;
}
