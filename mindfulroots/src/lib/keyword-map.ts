// Registry of head keywords + owned long-tail variants, one row per claimed
// term. Cross-checked at build time by src/integrations/seo-guard.ts against
// the `headTerm` / `ownsKeywords` frontmatter on every blog and product file:
//
//   - every term claimed in frontmatter must appear here, pointing at the
//     claiming file's own URL
//   - every row here must correspond to a real, non-draft page that actually
//     claims the term in its frontmatter
//
// Keep this small and correct — only add a row when a real page clearly owns
// that query. Do not bulk-import speculative keywords (see
// data/keyword-universe.csv for the wider discovery list; most of it has no
// page written yet).
export interface KeywordOwner {
  headTerm: string;
  owner: string; // site-absolute path, e.g. "/blog/magnesium-stress-sleep-guide/"
  intent: string; // "informational" | "comparison" | "commercial" | ...
}

export const KEYWORD_MAP: KeywordOwner[] = [
  // Magnesium cluster — the old thin glycinate-vs-citrate comparison post was
  // retired (draft: true, 301'd) in favor of this pillar, which already
  // covers glycinate, citrate and oxide in depth.
  { headTerm: 'magnesium glycinate vs citrate', owner: '/blog/magnesium-stress-sleep-guide/', intent: 'comparison' },
  { headTerm: 'magnesium citrate vs glycinate', owner: '/blog/magnesium-stress-sleep-guide/', intent: 'comparison' },
  { headTerm: 'citrate vs glycinate', owner: '/blog/magnesium-stress-sleep-guide/', intent: 'comparison' },
  { headTerm: 'magnesium glycinate or citrate', owner: '/blog/magnesium-stress-sleep-guide/', intent: 'comparison' },

  // Omega-3 cluster — three pages, each assigned a distinct head term so
  // Google stops merging them (GSC showed "omega 3 mood" stuck at position
  // 64 with no clear owner).
  { headTerm: 'omega 3 mood', owner: '/blog/omega-3-brain-mood-evidence/', intent: 'informational' },
  { headTerm: 'epa vs dha', owner: '/blog/epa-vs-dha-for-mood/', intent: 'comparison' },
  { headTerm: 'fish oil cortisol', owner: '/blog/fish-oil-and-cortisol/', intent: 'informational' },

  // 5-HTP
  { headTerm: '5-htp serotonin syndrome', owner: '/blog/5-htp-serotonin-safety/', intent: 'informational' },

  // Vitamin D
  { headTerm: 'vitamin d seasonal depression', owner: '/blog/vitamin-d-winter-mood/', intent: 'informational' },

  // Adaptogens
  { headTerm: 'ashwagandha vs rhodiola', owner: '/blog/adaptogens-ashwagandha-rhodiola/', intent: 'comparison' },
  { headTerm: 'ashwagandha cortisol', owner: '/blog/ashwagandha-cortisol-research/', intent: 'informational' },
];
