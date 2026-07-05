export interface CategoryGroup {
  label: string;
  /** Slugified anchor id, e.g. "minerals-and-vitamins" — for /products/#<id> links */
  id: string;
  /** Product content-collection slugs belonging to this group */
  products: string[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const GROUPS: { label: string; products: string[] }[] = [
  { label: 'Minerals & vitamins', products: ['magnesium-glycinate', 'vitamin-d3', 'b-complex'] },
  { label: 'Botanicals & adaptogens', products: ['ashwagandha', 'rhodiola-rosea', 'saffron-extract'] },
  { label: 'Aminos & precursors', products: ['l-theanine', '5-htp'] },
  { label: 'Omegas & gut', products: ['omega-3-fish-oil', 'probiotic-gut-brain'] },
];

export const CATEGORY_GROUPS: CategoryGroup[] = GROUPS.map((g) => ({
  label: g.label,
  id: slugify(g.label),
  products: g.products,
}));

export function groupForProduct(slug: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.products.includes(slug));
}

// Maps the messy cluster strings in blog frontmatter to canonical display labels.
const CLUSTER_LABELS: Record<string, string> = {
  '5-htp': '5-HTP',
  'adaptogens': 'Adaptogens',
  'ashwagandha': 'Ashwagandha',
  'b vitamins': 'B vitamins',
  'b-complex': 'B vitamins',
  'gut-brain probiotics': 'Gut-brain probiotics',
  'l-theanine': 'L-theanine',
  'lifestyle-foundations': 'Lifestyle foundations',
  'magnesium': 'Magnesium',
  'magnesium-glycinate': 'Magnesium',
  'omega-3': 'Omega-3',
  'omega-3-fish-oil': 'Omega-3',
  'saffron': 'Saffron',
  'vitamin d & mood': 'Vitamin D',
};

export function normalizeCluster(raw: string): string {
  const key = raw.trim().toLowerCase();
  return CLUSTER_LABELS[key] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}
