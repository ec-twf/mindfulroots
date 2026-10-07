import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import pagefind from 'astro-pagefind';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'node:child_process';
import seoGuard from './src/integrations/seo-guard.ts';

const SITE = 'https://www.moodsupplement.net';

// ─── sitemap lastmod ────────────────────────────────────────────────────────
// Every URL gets a lastmod tied to when its source actually changed. The old
// fallback stamped the *build* date on everything without frontmatter dates —
// 26 URLs, restamped every build, on a site that builds every two days. A
// lastmod that moves while the page does not is a lie Google learns to ignore,
// and once it discounts the signal sitewide it loses the only scheduling hint
// the sitemap offers for the pages that genuinely did change. That mattered
// here: the 2026-10-07 coverage export had 74 posts discovered and never
// fetched, so every honest crawl-priority signal is worth keeping intact.

/** Last commit date per repo-relative path, from a single `git log` pass. */
function gitCommitDates() {
  const map = new Map();
  try {
    // Paths in `git log` are repo-root-relative; this package may sit in a
    // subdirectory, so strip the prefix to match the paths used below.
    const prefix = execFileSync('git', ['rev-parse', '--show-prefix'], {
      encoding: 'utf8',
      cwd: import.meta.dirname,
    }).trim();
    // Reverse-chronological by default, so the first mention of a path wins.
    const log = execFileSync(
      'git',
      ['log', '--pretty=format:%cs', '--name-only', '--diff-filter=ACMRT'],
      { encoding: 'utf8', cwd: import.meta.dirname, maxBuffer: 256 * 1024 * 1024 },
    );
    let date = null;
    for (const line of log.split('\n')) {
      if (!line) continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(line)) {
        date = line;
        continue;
      }
      const rel = prefix && line.startsWith(prefix) ? line.slice(prefix.length) : line;
      if (date && !map.has(rel)) map.set(rel, date);
    }
  } catch {
    // Shallow clone, exported tarball, or no git binary. mtime covers it.
  }
  return map;
}

const COMMIT_DATES = gitCommitDates();

/** Commit date for a source file, falling back to its mtime. Null if absent. */
function sourceDate(relPath) {
  const committed = COMMIT_DATES.get(relPath);
  if (committed) return committed;
  const abs = join(import.meta.dirname, relPath);
  if (!existsSync(abs)) return null;
  return statSync(abs).mtime.toISOString().split('T')[0];
}

const laterOf = (...dates) => dates.filter(Boolean).sort().pop() ?? null;

/**
 * URL → lastmod.
 *
 * Content collections keep using `updatedDate ?? pubDate`: that is an authored
 * claim about when the advice changed, and it deliberately does NOT move when a
 * mechanical sitewide pass (an answer-box backfill, a component rename) touches
 * the file. Everything else resolves to the commit that last changed the source
 * behind it.
 */
function buildLastmodMap(baseUrl) {
  const map = new Map();
  const collections = [
    { dir: 'src/content/blog', path: 'blog' },
    { dir: 'src/content/hubs', path: 'guides' },
  ];

  const newestIn = {};
  for (const { dir, path } of collections) {
    const absDir = join(import.meta.dirname, dir);
    if (!existsSync(absDir)) continue;
    for (const file of readdirSync(absDir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const raw = readFileSync(join(absDir, file), 'utf8');
      const slug = file.replace(/\.mdx?$/, '');
      const updated = raw.match(/^updatedDate:\s*["']?([^"'\r\n]+)/m);
      const pub = raw.match(/^pubDate:\s*["']?([^"'\r\n]+)/m);
      const dateStr = (updated?.[1] ?? pub?.[1] ?? '').trim();
      if (!dateStr) continue;
      const iso = new Date(dateStr).toISOString().split('T')[0];
      map.set(`${baseUrl}/${path}/${slug}/`, iso);
      newestIn[path] = laterOf(newestIn[path], iso);
    }
  }

  // Products carry no pubDate, so the file's own history is the honest signal.
  const productDir = join(import.meta.dirname, 'src/content/products');
  if (existsSync(productDir)) {
    for (const file of readdirSync(productDir)) {
      if (!file.endsWith('.md')) continue;
      const slug = file.replace(/\.md$/, '');
      const date = sourceDate(`src/content/products/${file}`);
      if (date) {
        map.set(`${baseUrl}/products/${slug}/`, date);
        newestIn.products = laterOf(newestIn.products, date);
      }
    }
  }

  // Listing pages move when their template OR their newest entry moves.
  for (const path of ['blog', 'guides', 'products']) {
    const tpl = sourceDate(`src/pages/${path}/index.astro`);
    const date = laterOf(tpl, newestIn[path]);
    if (date) map.set(`${baseUrl}/${path}/`, date);
  }

  return map;
}

const lastmodMap = buildLastmodMap(SITE);
const buildDate = new Date().toISOString().split('T')[0];

/**
 * Standalone pages (/about/, /method/, /authors/enoch-c/ …) resolve straight to
 * the .astro file that renders them.
 */
function lastmodFor(url) {
  const known = lastmodMap.get(url);
  if (known) return known;

  const path = url.slice(SITE.length).replace(/^\/|\/$/g, '');
  const base = path ? `src/pages/${path}` : 'src/pages/index';
  return sourceDate(`${base}.astro`) ?? sourceDate(`${base}/index.astro`) ?? buildDate;
}

export default defineConfig({
  // TODO: change to your production domain before launch (used for sitemap + canonical URLs)
  site: SITE,
  integrations: [
    seoGuard(),
    mdx(),
    pagefind(),
    sitemap({
      serialize(item) {
        item.lastmod = lastmodFor(item.url);
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
