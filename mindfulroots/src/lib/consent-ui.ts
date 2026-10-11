/**
 * Consent banner UI, in its own module so Vite code-splits it. Nothing here is
 * on the critical path: returning visitors have their choice replayed inline by
 * ConsentInit.astro, so this chunk (and its ~32KB of stylesheet) only loads for
 * someone who actually needs the dialog.
 */
import * as CookieConsent from 'vanilla-cookieconsent';

/**
 * The stylesheet is fetched at runtime from /vendor/, not imported. Importing
 * it here would make Astro hoist a blocking <link> into every page's <head>
 * for a dialog most visitors never open. public/vendor/cookieconsent.css is
 * copied out of node_modules by scripts/copy-consent-css.mjs on prebuild.
 */
function loadStylesheet() {
  const href = '/vendor/cookieconsent.css';
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    // Resolve either way: an unstyled banner is still usable and still records
    // consent, so a failed stylesheet must not swallow the dialog.
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __msAnalyticsOK?: boolean;
  }
}

function syncGtag() {
  const granted = CookieConsent.acceptedCategory('analytics');
  window.gtag?.('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
  window.__msAnalyticsOK = granted;

  // Withdrawal has to clear what consent allowed us to write, not just stop
  // future writes. autoClear handles the _ga cookies; session storage is ours.
  if (!granted) {
    try {
      sessionStorage.removeItem('ms_src');
      sessionStorage.removeItem('ms_ref');
    } catch {}
    return;
  }

  // The in-head classifier ran with storage withheld. Once analytics is granted
  // mid-session, persist this pageview's bucket so later pages attribute to the
  // entry channel instead of reclassifying against an internal referrer.
  try {
    if (sessionStorage.getItem('ms_src')) return;
    const first = window.dataLayer.find(
      (d): d is Record<string, string> =>
        typeof d === 'object' && d !== null && 'source_bucket' in d,
    );
    if (first) {
      sessionStorage.setItem('ms_src', first.source_bucket);
      sessionStorage.setItem('ms_ref', first.raw_referrer ?? '(none)');
    }
  } catch {
    // storage blocked; the dataLayer push already carried the classification
  }
}

/** The library ships light/dark behind a body class; the site drives theme off
 *  documentElement.dataset.theme, so mirror one onto the other. */
function syncTheme() {
  document.body.classList.toggle(
    'cc--darkmode',
    document.documentElement.dataset.theme === 'dark',
  );
}

export async function initConsent({
  autoShow,
  analyticsDefault = false,
}: {
  autoShow: boolean;
  /** Pre-state of the analytics toggle for a visitor who has not chosen yet.
   *  True outside the consent regions, where Consent Mode's unscoped default
   *  already granted it — the modal has to show what is actually happening. A
   *  stored choice always wins over this. */
  analyticsDefault?: boolean;
}) {
  // Style before the banner paints, or it flashes unstyled at the top of the page.
  await loadStylesheet();
  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributeFilter: ['data-theme'],
  });

  await CookieConsent.run({
    autoShow,
    disablePageInteraction: false,
    guiOptions: {
      consentModal: { layout: 'box inline', position: 'bottom left' },
      preferencesModal: { layout: 'box' },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: {
        enabled: analyticsDefault,
        autoClear: { cookies: [{ name: /^_ga/ }, { name: '_gid' }] },
      },
    },
    onFirstConsent: syncGtag,
    onConsent: syncGtag,
    onChange: syncGtag,
    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'Cookies on MoodSupplement',
            description:
              'We use a couple of cookies to see which pages people actually read. Nothing goes to advertisers, and nothing loads until you choose. Decline and the site works exactly the same.',
            acceptAllBtn: 'Accept',
            acceptNecessaryBtn: 'Decline',
            showPreferencesBtn: 'Choose',
            footer: '<a href="/privacy/">Privacy &amp; cookies</a>',
          },
          preferencesModal: {
            title: 'Cookie settings',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all',
            savePreferencesBtn: 'Save my choice',
            closeIconLabel: 'Close',
            serviceCounterLabel: 'cookie|cookies',
            sections: [
              {
                title: 'What these do',
                description:
                  'Two groups, described below. You can change your mind any time from the "Cookie settings" link in the footer.',
              },
              {
                title: 'Strictly necessary',
                description:
                  'Remembers your light or dark theme and which consent rules apply to you. Set by us, read by nobody else, and the site cannot work without them.',
                linkedCategory: 'necessary',
                cookieTable: {
                  headers: { name: 'Name', desc: 'Purpose', dur: 'Expires' },
                  body: [
                    {
                      name: 'theme',
                      desc: 'Light or dark mode (browser storage, not a cookie)',
                      dur: 'Until cleared',
                    },
                    { name: 'cc_cookie', desc: 'Your answer to this banner', dur: '6 months' },
                    {
                      name: 'ms_geo',
                      desc: 'Country group, so we know which rules to apply',
                      dur: '1 day',
                    },
                  ],
                },
              },
              {
                title: 'Analytics',
                description:
                  'Google Analytics 4, via Google Tag Manager. Tells us which articles get read and which search engine or AI assistant sent you. Aggregate only. Decline and GA4 still receives an anonymous, cookieless hit that cannot be tied back to you across visits.',
                linkedCategory: 'analytics',
                cookieTable: {
                  headers: { name: 'Name', desc: 'Purpose', dur: 'Expires' },
                  body: [
                    { name: '_ga', desc: 'Distinguishes one browser from another', dur: '2 years' },
                    { name: '_ga_*', desc: 'Keeps session state for GA4', dur: '2 years' },
                    {
                      name: 'ms_src / ms_ref',
                      desc: 'Entry channel for this visit (browser storage, not a cookie)',
                      dur: 'End of session',
                    },
                  ],
                },
              },
              {
                title: 'More detail',
                description:
                  'Our <a href="/privacy/">privacy and cookie policy</a> covers what we collect, why, and how to ask for it to be deleted.',
              },
            ],
          },
        },
      },
    },
  });

  return CookieConsent;
}
