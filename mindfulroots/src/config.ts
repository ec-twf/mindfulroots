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
