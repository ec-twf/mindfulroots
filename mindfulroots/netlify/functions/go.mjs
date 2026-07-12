// Netlify Function: first-party affiliate link router.
// Deploy path: /go/:slug  (see `config` below — no netlify.toml redirect needed).
//
// Why this exists (growth-audit Phase 1.2):
//   1. First-party click logging, immune to ad blockers that eat the GTM
//      `affiliate_click` event — counts feed scripts/kpi-digest.py.
//   2. Per-product retailer switching: flipping a product from Amazon to a
//      direct brand program is a one-line edit in src/data/affiliate-links.json,
//      no content or component changes.
//
// The destination map is bundled at deploy time from src/data/affiliate-links.json
// (single source of truth, also consumed by the seo-guard build gate). Click logs
// are written to Netlify Blobs as one key per click (no read-modify-write races):
//   clicks/<YYYY-MM-DD>/<epoch-ms>-<rand>  ->  { slug, placement, ua }
// Logging is best-effort: a Blobs failure must never break the money path.
//
// Amazon ToS note: the button label ("View … on Amazon") and the adjacent
// disclosure microcopy make the Amazon destination explicit before the click;
// this is an internal router, not a link cloaker or shortener.

import { getStore } from '@netlify/blobs';
import links from '../../src/data/affiliate-links.json' with { type: 'json' };

const AMAZON_TAG = 'moodsupplemen-20';
const IHERB_CODE = ''; // set when the iHerb program is approved

function destinationFor(entry) {
  const active = entry.active || 'amazon';
  const url = entry[active];
  if (!url) return null;
  if (active === 'amazon') {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}tag=${AMAZON_TAG}`;
  }
  if (active === 'iherb' && IHERB_CODE) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}rcode=${IHERB_CODE}`;
  }
  return url; // direct programs carry tracking in the stored URL itself
}

export default async function handler(request, context) {
  const slug = context.params?.slug ?? '';
  const entry = links[slug];
  if (!entry) return new Response('Not found', { status: 404 });

  const dest = destinationFor(entry);
  if (!dest) return new Response('Not found', { status: 404 });

  try {
    const store = getStore('affiliate-clicks');
    const day = new Date().toISOString().slice(0, 10);
    const key = `clicks/${day}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const placement = new URL(request.url).searchParams.get('p') ?? 'unknown';
    await store.setJSON(key, {
      slug,
      placement,
      retailer: entry.active || 'amazon',
      ua: request.headers.get('user-agent')?.slice(0, 120) ?? '',
    });
  } catch {
    // best-effort only — never block the redirect
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: dest,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export const config = { path: '/go/:slug' };
