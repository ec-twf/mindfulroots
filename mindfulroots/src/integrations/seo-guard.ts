import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import type { AstroIntegration } from 'astro';

const TITLE_SUFFIX_LEN = 17; // " · MoodSupplement" — mirrors the Base.astro rule
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

interface Violation {
  file: string;
  kind: 'title' | 'description';
  length: number;
  limit: number;
  text: string;
}

// Reads a single quoted frontmatter scalar, e.g. `title: "Foo's Bar"`. Values in
// this codebase are always wrapped in double quotes and never span multiple
// lines, so anchoring greedily to the LAST `"` on the line (rather than the
// first) correctly handles apostrophes inside the value.
function readFrontmatterField(raw: string, key: string): string | undefined {
  const match = raw.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm'));
  return match?.[1];
}

function checkFile(dir: string, file: string, kind: 'blog' | 'product'): Violation[] {
  const raw = readFileSync(join(dir, file), 'utf8');
  const violations: Violation[] = [];

  const title = readFrontmatterField(raw, 'title');
  const seoTitle = readFrontmatterField(raw, 'seoTitle');
  const description =
    kind === 'blog' ? readFrontmatterField(raw, 'description') : readFrontmatterField(raw, 'shortDescription');
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
        for (const file of readdirSync(blogDir)) {
          if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
          violations.push(...checkFile(blogDir, file, 'blog'));
        }

        const productsDir = join(process.cwd(), 'src/content/products');
        for (const file of readdirSync(productsDir)) {
          if (!file.endsWith('.md')) continue;
          violations.push(...checkFile(productsDir, file, 'product'));
        }

        if (violations.length > 0) {
          const lines = violations.map(
            (v) => `  [${v.kind}] ${v.file}: ${v.length}/${v.limit} chars — "${v.text}"`,
          );
          throw new Error(
            `seo-guard: ${violations.length} SEO length violation(s) found:\n${lines.join('\n')}`,
          );
        }

        logger.info('seo-guard: all titles ≤60 chars (rendered) and descriptions ≤160 chars. ✔');
      },
    },
  };
}
