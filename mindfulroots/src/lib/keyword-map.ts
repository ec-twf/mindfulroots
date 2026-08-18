// Registry of head keywords + owned long-tail variants, one row per claimed
// term. Cross-checked at build time by src/integrations/seo-guard.ts against
// the `headTerm` / `ownsKeywords` frontmatter on every blog and product file:
//
//   - every term claimed in frontmatter must appear here, pointing at the
//     claiming file's own URL
//   - every row here must correspond to a real, non-draft page that actually
//     claims the term in its frontmatter
//
// Every published post now declares a head term, so this file is a full census
// of what the site claims rather than a short curated list. That is deliberate:
// checkKeywordUniqueness only sees terms that are actually declared, so the 82
// posts that declared nothing were invisible to the cannibalization guard and
// could collide freely. What still must NOT happen is bulk-importing
// speculative keywords with no page behind them (see data/keyword-universe.csv
// for the wider discovery list; most of it has no page written yet) — a row
// here is a claim by a real, live page, and seo-guard fails the build if it is
// not.
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

  // Condition hubs (/guides/*) — commercial-intent middle layer. Each owns a
  // "best supplements for <condition>" head term; the underlying evidence posts
  // own the informational terms, so the two layers don't cannibalize.
  { headTerm: 'best supplements for stress', owner: '/guides/stress/', intent: 'commercial' },
  { headTerm: 'best supplements for low mood', owner: '/guides/low-mood/', intent: 'commercial' },
  { headTerm: 'best supplements for sleep', owner: '/guides/sleep/', intent: 'commercial' },
  { headTerm: 'best supplements for anxiety', owner: '/guides/anxiety/', intent: 'commercial' },
  { headTerm: 'best supplements for energy and fatigue', owner: '/guides/energy/', intent: 'commercial' },
  { headTerm: 'best supplements for focus', owner: '/guides/focus/', intent: 'commercial' },
  { headTerm: 'best supplements for gut health and mood', owner: '/guides/gut-brain/', intent: 'commercial' },
  // Distinct from the blog's informational 'vitamin d seasonal depression'
  // (owned by /blog/vitamin-d-winter-mood/) — this is the buy-intent variant.
  { headTerm: 'vitamin d supplement for seasonal depression', owner: '/guides/winter-mood/', intent: 'commercial' },

  // ─── Full per-post census, backfilled 2026-08-18 ─────────────────────────
  // One row per published post, derived from its slug. Grouped by cluster so
  // near-duplicate claims inside a cluster are visible by eye; seo-guard's
  // near-duplicate check reports the ones that overlap too far to coexist.

  // 5-htp
  { headTerm: '5-htp side effects', owner: '/blog/5-htp-side-effects/', intent: 'informational' },
  { headTerm: '5-htp vs 5-ht', owner: '/blog/5-htp-vs-5-ht/', intent: 'comparison' },
  { headTerm: '5-htp vs ashwagandha', owner: '/blog/5-htp-vs-ashwagandha/', intent: 'comparison' },
  { headTerm: 'can you take 5-htp with adderall', owner: '/blog/can-you-take-5-htp-with-adderall/', intent: 'informational' },
  { headTerm: 'can you take l-tryptophan and melatonin together', owner: '/blog/can-you-take-l-tryptophan-and-melatonin-together/', intent: 'informational' },
  { headTerm: 'is 5-htp safe to take every day', owner: '/blog/is-5-htp-safe-to-take-every-day/', intent: 'informational' },
  { headTerm: 'l-tryptophan and melatonin together', owner: '/blog/l-tryptophan-and-melatonin-together/', intent: 'informational' },
  { headTerm: 'l-tryptophan vs 5-htp for anxiety', owner: '/blog/l-tryptophan-vs-5-htp-for-anxiety/', intent: 'comparison' },

  // ashwagandha
  { headTerm: 'ashwagandha dosage', owner: '/blog/ashwagandha-dosage/', intent: 'informational' },
  { headTerm: 'ashwagandha for sleep', owner: '/blog/ashwagandha-for-sleep/', intent: 'informational' },
  { headTerm: 'ashwagandha vs ginseng', owner: '/blog/ashwagandha-vs-ginseng/', intent: 'comparison' },
  { headTerm: 'ashwagandha vs ksm-66', owner: '/blog/ashwagandha-vs-ksm-66/', intent: 'comparison' },
  { headTerm: 'can you take ashwagandha with lexapro', owner: '/blog/can-you-take-ashwagandha-with-lexapro/', intent: 'informational' },
  { headTerm: 'can you take ashwagandha with sertraline', owner: '/blog/can-you-take-ashwagandha-with-sertraline/', intent: 'informational' },
  { headTerm: 'can you take holy basil with prozac', owner: '/blog/can-you-take-holy-basil-with-prozac/', intent: 'informational' },
  { headTerm: 'dosage of holy basil for anxiety', owner: '/blog/dosage-of-holy-basil-for-anxiety/', intent: 'informational' },
  { headTerm: 'lemon balm vs ashwagandha', owner: '/blog/lemon-balm-vs-ashwagandha/', intent: 'comparison' },
  { headTerm: 'silexan lavender dosage', owner: '/blog/silexan-lavender-dosage/', intent: 'informational' },
  { headTerm: 'silexan vs lavender', owner: '/blog/silexan-vs-lavender/', intent: 'comparison' },
  { headTerm: 'valerian root vs ashwagandha for sleep', owner: '/blog/valerian-root-vs-ashwagandha-for-sleep/', intent: 'comparison' },

  // b-complex
  { headTerm: 'b-complex dosage', owner: '/blog/b-complex-dosage/', intent: 'informational' },
  { headTerm: 'b-complex vs b1', owner: '/blog/b-complex-vs-b1/', intent: 'comparison' },
  { headTerm: 'b-complex vs b100', owner: '/blog/b-complex-vs-b100/', intent: 'comparison' },
  { headTerm: 'b vitamins energy mood', owner: '/blog/b-vitamins-energy-mood/', intent: 'informational' },
  { headTerm: 'b vitamins stress adrenal', owner: '/blog/b-vitamins-stress-adrenal/', intent: 'informational' },
  { headTerm: 'glycine vs b12', owner: '/blog/glycine-vs-b12/', intent: 'comparison' },

  // l-theanine
  { headTerm: 'can you take l-theanine with lexapro', owner: '/blog/can-you-take-l-theanine-with-lexapro/', intent: 'informational' },
  { headTerm: 'high dose taurine for anxiety', owner: '/blog/high-dose-taurine-for-anxiety/', intent: 'informational' },
  { headTerm: 'how long does it take for l-theanine to work', owner: '/blog/how-long-does-it-take-for-l-theanine-to-work/', intent: 'informational' },
  { headTerm: 'l-theanine caffeine stack', owner: '/blog/l-theanine-caffeine-stack/', intent: 'informational' },
  { headTerm: 'l-theanine calm focus', owner: '/blog/l-theanine-calm-focus/', intent: 'informational' },
  { headTerm: 'l-theanine dosage anxiety', owner: '/blog/l-theanine-dosage-anxiety/', intent: 'informational' },
  { headTerm: 'l-theanine for sleep', owner: '/blog/l-theanine-for-sleep/', intent: 'informational' },
  { headTerm: 'l-theanine kids teens safety', owner: '/blog/l-theanine-kids-teens-safety/', intent: 'informational' },
  { headTerm: 'l-theanine vs ashwagandha', owner: '/blog/l-theanine-vs-ashwagandha/', intent: 'comparison' },
  { headTerm: 'l-theanine vs caffeine', owner: '/blog/l-theanine-vs-caffeine/', intent: 'comparison' },
  { headTerm: 'lemon balm vs bee balm', owner: '/blog/lemon-balm-vs-bee-balm/', intent: 'comparison' },
  { headTerm: 'passionflower vs chamomile', owner: '/blog/passionflower-vs-chamomile/', intent: 'comparison' },

  // l-tyrosine
  { headTerm: 'can you take l-tyrosine with adderall', owner: '/blog/can-you-take-l-tyrosine-with-adderall/', intent: 'informational' },

  // lifestyle-foundations
  { headTerm: 'natural mood support basics', owner: '/blog/natural-mood-support-basics/', intent: 'informational' },

  // magnesium-glycinate
  { headTerm: 'can you take lemon balm and melatonin together', owner: '/blog/can-you-take-lemon-balm-and-melatonin-together/', intent: 'informational' },
  { headTerm: 'can you take lemon balm with levothyroxine', owner: '/blog/can-you-take-lemon-balm-with-levothyroxine/', intent: 'informational' },
  { headTerm: 'can you take magnesium glycinate and melatonin together', owner: '/blog/can-you-take-magnesium-glycinate-and-melatonin-together/', intent: 'informational' },
  { headTerm: 'can you take valerian root and melatonin together', owner: '/blog/can-you-take-valerian-root-and-melatonin-together/', intent: 'informational' },
  { headTerm: 'glycine dosage', owner: '/blog/glycine-dosage/', intent: 'informational' },
  { headTerm: 'glycine vs collagen', owner: '/blog/glycine-vs-collagen/', intent: 'comparison' },
  { headTerm: 'how long does magnesium glycinate take to work', owner: '/blog/how-long-does-magnesium-glycinate-take-to-work/', intent: 'informational' },
  { headTerm: 'magnesium dosage for sleep', owner: '/blog/magnesium-dosage-for-sleep/', intent: 'informational' },
  { headTerm: 'magnesium glycinate dosage for anxiety', owner: '/blog/magnesium-glycinate-dosage-for-anxiety/', intent: 'informational' },
  { headTerm: 'magnesium glycinate morning or night', owner: '/blog/magnesium-glycinate-morning-or-night/', intent: 'informational' },
  { headTerm: 'magnesium glycinate vs bisglycinate', owner: '/blog/magnesium-glycinate-vs-bisglycinate/', intent: 'comparison' },
  { headTerm: 'magnesium glycinate vs chelate', owner: '/blog/magnesium-glycinate-vs-chelate/', intent: 'comparison' },
  { headTerm: 'valerian root vs catnip', owner: '/blog/valerian-root-vs-catnip/', intent: 'comparison' },

  // omega-3-fish-oil
  { headTerm: 'best time to take fish oil', owner: '/blog/best-time-to-take-fish-oil/', intent: 'informational' },
  { headTerm: 'can you take omega-3 fish oil with statins', owner: '/blog/can-you-take-omega-3-fish-oil-with-statins/', intent: 'informational' },
  { headTerm: 'omega-3 dosage for mood', owner: '/blog/omega-3-dosage-for-mood/', intent: 'informational' },
  { headTerm: 'omega-3 fish oil vs algae', owner: '/blog/omega-3-fish-oil-vs-algae/', intent: 'comparison' },
  { headTerm: 'omega-3 fish oil vs cod liver oil', owner: '/blog/omega-3-fish-oil-vs-cod-liver-oil/', intent: 'comparison' },

  // probiotic-gut-brain
  { headTerm: 'can you take probiotics and antibiotics at the same time', owner: '/blog/can-you-take-probiotics-and-antibiotics-at-the-same-time/', intent: 'informational' },
  { headTerm: 'gut brain axis probiotics', owner: '/blog/gut-brain-axis-probiotics/', intent: 'informational' },
  { headTerm: 'probiotic vs digestive enzymes', owner: '/blog/probiotic-vs-digestive-enzymes/', intent: 'comparison' },
  { headTerm: 'probiotic vs fiber', owner: '/blog/probiotic-vs-fiber/', intent: 'comparison' },

  // rhodiola-rosea
  { headTerm: 'can you take rhodiola rosea with levothyroxine', owner: '/blog/can-you-take-rhodiola-rosea-with-levothyroxine/', intent: 'informational' },
  { headTerm: 'can you take rhodiola rosea with sertraline', owner: '/blog/can-you-take-rhodiola-rosea-with-sertraline/', intent: 'informational' },
  { headTerm: 'how long does rhodiola rosea take to work', owner: '/blog/how-long-does-rhodiola-rosea-take-to-work/', intent: 'informational' },
  { headTerm: 'rhodiola dosage cycling', owner: '/blog/rhodiola-dosage-cycling/', intent: 'informational' },
  { headTerm: 'rhodiola rosea vs ashwagandha', owner: '/blog/rhodiola-rosea-vs-ashwagandha/', intent: 'comparison' },
  { headTerm: 'rhodiola rosea vs ashwagandha for anxiety', owner: '/blog/rhodiola-rosea-vs-ashwagandha-for-anxiety/', intent: 'comparison' },

  // saffron-extract
  { headTerm: 'can you take saffron extract with lexapro', owner: '/blog/can-you-take-saffron-extract-with-lexapro/', intent: 'informational' },
  { headTerm: 'can you take saffron extract with sertraline', owner: '/blog/can-you-take-saffron-extract-with-sertraline/', intent: 'informational' },
  { headTerm: 'how long does saffron extract take to work', owner: '/blog/how-long-does-saffron-extract-take-to-work/', intent: 'informational' },
  { headTerm: 'saffron extract side effects', owner: '/blog/saffron-extract-side-effects/', intent: 'informational' },
  { headTerm: 'saffron extract vs affron', owner: '/blog/saffron-extract-vs-affron/', intent: 'comparison' },
  { headTerm: 'saffron extract vs ashwagandha', owner: '/blog/saffron-extract-vs-ashwagandha/', intent: 'comparison' },
  { headTerm: 'saffron mood research', owner: '/blog/saffron-mood-research/', intent: 'informational' },
  { headTerm: 'saffron pms mood swings', owner: '/blog/saffron-pms-mood-swings/', intent: 'informational' },

  // vitamin-d3
  { headTerm: 'how long does vitamin-d3 60k take to work', owner: '/blog/how-long-does-vitamin-d3-60k-take-to-work/', intent: 'informational' },
  { headTerm: 'vitamin-d3 k2 combination', owner: '/blog/vitamin-d3-k2-combination/', intent: 'informational' },
  { headTerm: 'vitamin-d3 morning or night', owner: '/blog/vitamin-d3-morning-or-night/', intent: 'informational' },
  { headTerm: 'vitamin-d3 vs b12', owner: '/blog/vitamin-d3-vs-b12/', intent: 'comparison' },
  { headTerm: 'vitamin-d3 vs calcitriol', owner: '/blog/vitamin-d3-vs-calcitriol/', intent: 'comparison' },
];
