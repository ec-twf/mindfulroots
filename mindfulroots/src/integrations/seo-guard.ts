import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import type { AstroIntegration } from 'astro';
import { KEYWORD_MAP } from '../lib/keyword-map.ts';

const TITLE_SUFFIX_LEN = 17; // " · MoodSupplement" — mirrors the Base.astro rule
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

interface Violation {
  file: string;
  kind: 'title' | 'description' | 'body-faq' | 'keyword-duplicate' | 'keyword-registry' | 'hero-cta';
  length: number;
  limit: number;
  text: string;
}

// The blog template renders `faq` frontmatter into a visible section AND emits the
// FAQPage JSON-LD from it. A body FAQ heading duplicates that section and desyncs
// the schema. Posts are machine-generated, so catch a prompt regression at build.
const BODY_FAQ_HEADING = /^##\s+(Frequently asked questions|FAQ)\s*$/im;

// Reads a single quoted frontmatter scalar, e.g. `title: "Foo's Bar"`. Values in
// this codebase are always wrapped in double quotes and never span multiple
// lines, so anchoring greedily to the LAST `"` on the line (rather than the
// first) correctly handles apostrophes inside the value.
function readFrontmatterField(raw: string, key: string): string | undefined {
  const match = raw.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm'));
  return match?.[1];
}

// Reads an unquoted frontmatter boolean, e.g. `draft: true`.
function readFrontmatterBoolean(raw: string, key: string): boolean {
  const match = raw.match(new RegExp(`^${key}:\\s*(true|false)\\s*$`, 'm'));
  return match?.[1] === 'true';
}

// Reads a frontmatter array field in either of the two styles used in this repo:
// inline (`key: ["a", "b"]`) or block-list (`key:` followed by `  - "a"` lines).
// Items may or may not be quoted. Returns [] if the key is absent, matching the
// Zod schema's `.default([])`.
function readFrontmatterArray(raw: string, key: string): string[] {
  const keyLine = raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!keyLine) return [];

  const inline = keyLine[1].trim();
  if (inline.startsWith('[')) {
    const bracketed = inline.match(/\[(.*)\]/);
    if (!bracketed) return [];
    return bracketed[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  const lines = raw.split('\n');
  const keyIdx = lines.findIndex((l) => new RegExp(`^${key}:\\s*$`).test(l));
  if (keyIdx === -1) return [];

  const items: string[] = [];
  for (let i = keyIdx + 1; i < lines.length; i++) {
    const itemMatch = lines[i].match(/^\s*-\s*(.+?)\s*$/);
    if (!itemMatch) break;
    items.push(itemMatch[1].replace(/^["']|["']$/g, ''));
  }
  return items;
}

function checkFile(dir: string, file: string, kind: 'blog' | 'product' | 'hub'): Violation[] {
  const raw = readFileSync(join(dir, file), 'utf8');
  const violations: Violation[] = [];

  const title = readFrontmatterField(raw, 'title');
  const seoTitle = readFrontmatterField(raw, 'seoTitle');
  // Products carry the SERP copy in shortDescription; blog and hubs use description.
  const description =
    kind === 'product' ? readFrontmatterField(raw, 'shortDescription') : readFrontmatterField(raw, 'description');
  const metaDescription = readFrontmatterField(raw, 'metaDescription');

  const effectiveTitle = seoTitle ?? title;
  if (effectiveTitle) {
    // Mirrors the Base.astro rule: the brand suffix is only appended when the
    // combined title would stay within TITLE_LIMIT, otherwise it's dropped.
    const withSuffix = effectiveTitle.length + TITLE_SUFFIX_LEN;
    const renderedLength = withSuffix <= TITLE_LIMIT ? withSuffix : effectiveTitle.length;
    if (renderedLength > TITLE_LIMIT) {
      violations.push({ file, kind: 'title', length: renderedLength, limit: TITLE_LIMIT, text: effectiveTitle });
    }
  }

  const effectiveDescription = metaDescription ?? description;
  if (effectiveDescription && effectiveDescription.length > DESCRIPTION_LIMIT) {
    violations.push({
      file,
      kind: 'description',
      length: effectiveDescription.length,
      limit: DESCRIPTION_LIMIT,
      text: effectiveDescription,
    });
  }

  if (kind !== 'product') {
    const body = raw.replace(/^---[\s\S]*?\n---/, '');
    const heading = body.match(BODY_FAQ_HEADING);
    if (heading) {
      violations.push({
        file,
        kind: 'body-faq',
        length: 0,
        limit: 0,
        text: `${heading[0].trim()} — put the FAQ in \`faq:\` frontmatter only; the template renders it`,
      });
    }
  }

  // A hub whose top pick (products[0]) has a recommendedProduct must place the
  // hero buy box inline via exactly one <HeroCTA /> in its body. Without it the
  // box silently doesn't render and the guide loses its primary affiliate CTA.
  if (kind === 'hub' && !readFrontmatterBoolean(raw, 'draft')) {
    const heroSlug = readFrontmatterArray(raw, 'products')[0];
    const heroFile = heroSlug && join(process.cwd(), 'src/content/products', `${heroSlug}.md`);
    const heroHasRec =
      heroFile && existsSync(heroFile) && /^recommendedProduct:/m.test(readFileSync(heroFile, 'utf8'));
    if (heroHasRec) {
      const body = raw.replace(/^---[\s\S]*?\n---/, '');
      const count = (body.match(/<HeroCTA\b/g) ?? []).length;
      if (count !== 1) {
        violations.push({
          file,
          kind: 'hero-cta',
          length: 0,
          limit: 0,
          text: `top pick "${heroSlug}" has a recommendedProduct, so the body must contain exactly one <HeroCTA .../> (found ${count})`,
        });
      }
    }
  }

  return violations;
}

// ─── Keyword cannibalization guard ──────────────────────────────────────────
// Two live GSC-proven cases (magnesium, omega-3) showed Google unable to pick
// an owner between near-duplicate pages, tanking both. `headTerm` /
// `ownsKeywords` frontmatter declares a single owner per query; this checks
// (a) no two files claim the same term, and (b) every claim is reflected in
// KEYWORD_MAP (src/lib/keyword-map.ts) in both directions, so the registry
// can't silently drift from the content.

interface KeywordClaim {
  term: string;
  file: string;
  url: string; // site-absolute path this file renders at, e.g. "/blog/foo/"
  source: 'headTerm' | 'ownsKeywords';
}

function slugFor(file: string): string {
  return file.replace(/\.mdx?$/, '');
}

function collectKeywordClaims(dir: string, files: string[], kind: 'blog' | 'product' | 'hub'): KeywordClaim[] {
  const claims: KeywordClaim[] = [];
  const base = kind === 'blog' ? '/blog/' : kind === 'hub' ? '/guides/' : '/products/';

  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    // Draft posts/hubs are retired (dropped from getStaticPaths + sitemap) —
    // they don't render, so they can't own a live query.
    if (kind !== 'product' && readFrontmatterBoolean(raw, 'draft')) continue;

    const url = `${base}${slugFor(file)}/`;

    const headTerm = readFrontmatterField(raw, 'headTerm');
    if (headTerm) claims.push({ term: headTerm, file, url, source: 'headTerm' });

    for (const term of readFrontmatterArray(raw, 'ownsKeywords')) {
      claims.push({ term, file, url, source: 'ownsKeywords' });
    }
  }

  return claims;
}

function checkKeywordUniqueness(claims: KeywordClaim[]): Violation[] {
  const byTerm = new Map<string, KeywordClaim[]>();
  for (const claim of claims) {
    const norm = claim.term.trim().toLowerCase();
    if (!byTerm.has(norm)) byTerm.set(norm, []);
    byTerm.get(norm)!.push(claim);
  }

  const violations: Violation[] = [];
  for (const group of byTerm.values()) {
    const files = [...new Set(group.map((c) => c.file))];
    if (files.length > 1) {
      violations.push({
        file: files.join(' AND '),
        kind: 'keyword-duplicate',
        length: 0,
        limit: 0,
        text: `"${group[0].term}" is claimed by both ${files.join(' AND ')} — a keyword must have exactly one owner`,
      });
    }
  }
  return violations;
}

function checkKeywordRegistry(claims: KeywordClaim[]): Violation[] {
  const violations: Violation[] = [];

  for (const claim of claims) {
    const norm = claim.term.trim().toLowerCase();
    const row = KEYWORD_MAP.find((r) => r.headTerm.trim().toLowerCase() === norm);
    if (!row) {
      violations.push({
        file: claim.file,
        kind: 'keyword-registry',
        length: 0,
        limit: 0,
        text: `claims "${claim.term}" (via ${claim.source}) but no KEYWORD_MAP row exists for it — add a row to src/lib/keyword-map.ts`,
      });
      continue;
    }
    if (row.owner !== claim.url) {
      violations.push({
        file: claim.file,
        kind: 'keyword-registry',
        length: 0,
        limit: 0,
        text: `claims "${claim.term}" but KEYWORD_MAP lists its owner as "${row.owner}", not "${claim.url}" — update the frontmatter or src/lib/keyword-map.ts so they agree`,
      });
    }
  }

  const claimedPairs = new Set(claims.map((c) => `${c.term.trim().toLowerCase()}|||${c.url}`));
  for (const row of KEYWORD_MAP) {
    const key = `${row.headTerm.trim().toLowerCase()}|||${row.owner}`;
    if (!claimedPairs.has(key)) {
      violations.push({
        file: row.owner,
        kind: 'keyword-registry',
        length: 0,
        limit: 0,
        text: `KEYWORD_MAP claims "${row.headTerm}" is owned by "${row.owner}", but no page at that URL declares it via headTerm/ownsKeywords — remove the row or add the frontmatter`,
      });
    }
  }

  return violations;
}

// The frontmatter pass above cannot see .astro pages (homepage, /blog/, /products/,
// /authors/*). This walks the built HTML instead, so every rendered page is covered.
// Entities are decoded and length is counted in codepoints, because `&amp;` occupies
// 5 bytes in the markup but one character in the SERP, and an em dash is 3 UTF-8 bytes.
const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

function decode(html: string): string {
  return html.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

function walkHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function checkBuiltPage(path: string, root: string): Violation[] {
  const html = readFileSync(path, 'utf8');
  const violations: Violation[] = [];
  const file = relative(root, path);

  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  if (title) {
    const text = decode(title);
    const length = [...text].length;
    if (length > TITLE_LIMIT) violations.push({ file, kind: 'title', length, limit: TITLE_LIMIT, text });
  }

  const description = html.match(/<meta name="description" content="([\s\S]*?)"/)?.[1];
  if (description) {
    const text = decode(description);
    const length = [...text].length;
    if (length > DESCRIPTION_LIMIT) {
      violations.push({ file, kind: 'description', length, limit: DESCRIPTION_LIMIT, text });
    }
  }

  return violations;
}

export default function seoGuard(): AstroIntegration {
  return {
    name: 'seo-guard',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const violations = walkHtml(root).flatMap((p) => checkBuiltPage(p, root));

        if (violations.length > 0) {
          const lines = violations.map(
            (v) => `  [${v.kind}] ${v.file}: ${v.length}/${v.limit} chars — "${v.text}"`,
          );
          throw new Error(
            `seo-guard: ${violations.length} rendered SEO length violation(s):\n${lines.join('\n')}`,
          );
        }

        logger.info(`seo-guard: ${walkHtml(root).length} rendered pages within title/description limits. ✔`);
      },

      'astro:build:start': ({ logger }) => {
        const violations: Violation[] = [];

        const blogDir = join(process.cwd(), 'src/content/blog');
        const blogFiles = readdirSync(blogDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
        for (const file of blogFiles) {
          violations.push(...checkFile(blogDir, file, 'blog'));
        }

        const productsDir = join(process.cwd(), 'src/content/products');
        const productFiles = readdirSync(productsDir).filter((f) => f.endsWith('.md'));
        for (const file of productFiles) {
          violations.push(...checkFile(productsDir, file, 'product'));
        }

        const hubsDir = join(process.cwd(), 'src/content/hubs');
        const hubFiles = existsSync(hubsDir)
          ? readdirSync(hubsDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
          : [];
        for (const file of hubFiles) {
          violations.push(...checkFile(hubsDir, file, 'hub'));
        }

        const claims = [
          ...collectKeywordClaims(blogDir, blogFiles, 'blog'),
          ...collectKeywordClaims(productsDir, productFiles, 'product'),
          ...collectKeywordClaims(hubsDir, hubFiles, 'hub'),
        ];
        violations.push(...checkKeywordUniqueness(claims));
        violations.push(...checkKeywordRegistry(claims));

        if (violations.length > 0) {
          const lines = violations.map((v) => {
            if (v.kind !== 'title' && v.kind !== 'description') {
              return `  [${v.kind}] ${v.file}: ${v.text}`;
            }
            return `  [${v.kind}] ${v.file}: ${v.length}/${v.limit} chars — "${v.text}"`;
          });
          throw new Error(
            `seo-guard: ${violations.length} content violation(s) found:\n${lines.join('\n')}`,
          );
        }

        logger.info(
          `seo-guard: titles ≤60, descriptions ≤160, no body FAQ headings, ${claims.length} keyword claim(s) unique + registry-consistent. ✔`,
        );
      },
    },
  };
}
