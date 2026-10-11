// Stamps a coarse region flag onto HTML responses so the client can decide
// whether a consent banner is owed. Netlify resolves the country from the
// request IP at the edge, which is the only reliable signal available before
// the page renders — timezone guessing misses any European visitor whose
// machine is set to another zone, and that miss is the expensive direction.
//
// The cookie carries a country GROUP, never the country itself: 'eu' or 'row'
// is all the banner logic needs, and it keeps this cookie genuinely
// strictly-necessary rather than something that profiles the visitor.

// EEA (EU 27 + Iceland, Liechtenstein, Norway) plus the UK and Switzerland.
// Must stay in sync with CONSENT_REGIONS in src/components/ConsentInit.astro.
const CONSENT_REGIONS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
]);

export default async (request, context) => {
  const response = await context.next();

  // Only HTML carries the banner. Anything else (a 301 from a redirect rule, a
  // JSON endpoint) gets left untouched so we never attach a cookie to a
  // long-cached asset.
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const country = context.geo?.country?.code || '';
  // Unknown country fails closed: no flag is set, and the client defaults to
  // showing the banner.
  if (!country) return response;

  const group = CONSENT_REGIONS.has(country) ? 'eu' : 'row';
  response.headers.append(
    'Set-Cookie',
    `ms_geo=${group}; Path=/; Max-Age=86400; SameSite=Lax; Secure`,
  );
  return response;
};

export const config = {
  path: '/*',
  excludedPath: [
    '/_astro/*',
    '/pagefind/*',
    '/go/*',
    '/api/*',
    '/.netlify/*',
    '/*.xml',
    '/*.txt',
    '/*.json',
    '/*.js',
    '/*.css',
    '/*.png',
    '/*.jpg',
    '/*.jpeg',
    '/*.webp',
    '/*.avif',
    '/*.svg',
    '/*.ico',
    '/*.woff2',
  ],
};
