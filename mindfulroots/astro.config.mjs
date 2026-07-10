import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import pagefind from 'astro-pagefind';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import seoGuard from './src/integrations/seo-guard.ts';

// Build a URL → lastmod map at config time by reading frontmatter directly.
// Blog posts use updatedDate if present, otherwise pubDate.
// Products and all other pages fall back to the current build date.
function buildLastmodMap(baseUrl) {
  const map = new Map();
  const blogDir = join(import.meta.dirname, 'src/content/blog');

  for (const file of readdirSync(blogDir)) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const raw = readFileSync(join(blogDir, file), 'utf8');
    const slug = file.replace(/\.mdx?$/, '');
    const updated = raw.match(/^updatedDate:\s*["']?([^"'\r\n]+)/m);
    const pub = raw.match(/^pubDate:\s*["']?([^"'\r\n]+)/m);
    const dateStr = (updated?.[1] ?? pub?.[1] ?? '').trim();
    if (dateStr) {
      map.set(`${baseUrl}/blog/${slug}/`, new Date(dateStr).toISOString().split('T')[0]);
    }
  }

  return map;
}

const SITE = 'https://www.moodsupplement.net';
const lastmodMap = buildLastmodMap(SITE);
const buildDate = new Date().toISOString().split('T')[0];

export default defineConfig({
  // TODO: change to your production domain before launch (used for sitemap + canonical URLs)
  site: SITE,
  integrations: [
    seoGuard(),
    mdx(),
    pagefind(),
    sitemap({
      serialize(item) {
        item.lastmod = lastmodMap.get(item.url) ?? buildDate;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
