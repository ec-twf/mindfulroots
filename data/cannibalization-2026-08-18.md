# Keyword cannibalization triage, 2026-08-18

Produced by arming `seo-guard`'s ownership check. Before this pass 82 of 90 posts
declared no `headTerm`, so the guard's uniqueness check could not see them and
they collided freely. All 90 now declare one, and a near-duplicate detector
(token overlap ≥ 50%, warn-level) reports 53 overlapping pairs.

**Nothing here has been merged or redirected.** 301s and deletions are not
reversible from Search Console's point of view, so they need sign-off.

## Act on these

| Pair | Overlap | Why it is real | Recommendation |
|---|---|---|---|
| `can-you-take-l-tryptophan-and-melatonin-together` vs `l-tryptophan-and-melatonin-together` | 100% | Same question, same intent, near-identical slug. This is one page published twice. | Merge into the `can-you-take-` version (matches how people phrase it), 301 the other. |
| `magnesium-glycinate-vs-bisglycinate` vs `magnesium-glycinate-vs-chelate` | 50% | Magnesium bisglycinate *is* a glycinate chelate. Both pages answer "is this the same thing", so Google has no basis to pick one. | Merge into one "glycinate vs bisglycinate vs chelate" page, 301 the other. |
| `rhodiola-rosea-vs-ashwagandha` vs `rhodiola-rosea-vs-ashwagandha-for-anxiety` | 75% | Same comparison, one with a condition qualifier that adds no distinct content. | Keep the `-for-anxiety` page (more specific intent), fold the general one into it, 301. |
| `adaptogens-ashwagandha-rhodiola` vs both of the above | 50-67% | Three pages on one comparison. The pillar owns `ashwagandha vs rhodiola` and the spokes restate it. | Retarget the pillar to the cluster-level question and let the spokes own the head-to-heads. |
| `silexan-lavender-dosage` vs `silexan-vs-lavender` | 67% | Silexan is a lavender oil preparation, so "Silexan vs lavender" is the same category error `saffron-extract-vs-affron` exists to correct. | Retarget `silexan-vs-lavender` to the branded-vs-generic framing that page already proves works, or merge. |
| `l-theanine-caffeine-stack` vs `l-theanine-vs-caffeine` | 67% | "Stack" and "vs" are genuinely different intents (combine vs choose), but the token overlap says Google may not agree. | Differentiate: tighten each headTerm and make the opening sentence state which question it answers. Lower risk than merging. |

## Known false positive, leave alone

`vitamin-d-winter-mood` vs `/guides/winter-mood/` at 80% is the deliberate
informational/commercial split already documented in `keyword-map.ts`. The layers
are supposed to overlap on entity and diverge on intent.

## The other ~40 pairs

Mostly two-token entity names shared across genuinely different intents:
`can-you-take-saffron-extract-with-lexapro` vs `saffron-extract-vs-affron` share
{saffron, extract} and nothing else. This is the detector's precision limit —
Jaccard cannot separate "same entity" from "same query". Treated as noise unless
the pair also shares intent, which is the judgement the table above encodes.

Raising the threshold would drop the magnesium pair, which is the one that
matters most, so the threshold stays at 50% and the noise is accepted.

---

## Outcome, 2026-08-19

Approved and executed. Survivors were chosen on position and impressions, not
word count.

| Retired (draft: true, 301'd) | Survivor | Before |
|---|---|---|
| `magnesium-glycinate-vs-chelate` | `magnesium-glycinate-vs-bisglycinate` | 98 imp @ pos 76 vs 106 imp @ **pos 60.8** |
| `l-tryptophan-and-melatonin-together` | `can-you-take-l-tryptophan-and-melatonin-together` | 2 imp @ pos 81 vs 0 imp |
| `rhodiola-rosea-vs-ashwagandha` | `rhodiola-rosea-vs-ashwagandha-for-anxiety` | 10 imp @ pos 78.1 vs 18 imp @ pos 80.3 |

The magnesium pair was the only one with real volume: 204 impressions split
across two URLs sitting 15 positions apart. Unique material was carried into
each survivor rather than discarded (the chelation explanation and its two
absorption citations, the melatonin sources block, the rhodiola SHR-5 and
Chandrasekhar evidence section), and each survivor claims the retired head term
via `ownsKeywords` so the registry still resolves after the redirect.

### Differentiated instead of merged

- `adaptogens-ashwagandha-rhodiola` retargeted from `ashwagandha vs rhodiola` to
  `adaptogens for stress`. It is a 2,870-word pillar with 82 impressions and hub
  links; a pillar does not get 301'd into a spoke.
- `silexan-lavender-dosage` retargeted to `silexan dosage`, which drops the
  overlap with `silexan vs lavender` below the threshold. The two answer "how
  much" and "is it the same thing", which are different questions.
- `l-theanine-caffeine-stack` and `l-theanine-vs-caffeine` left alone. The
  latter has 147 impressions, the most of any l-theanine page, and "what ratio"
  is not "which one".

### The remaining 47 pairs

Reviewed and recorded in `ACCEPTED_KEYWORD_OVERLAPS` in `src/lib/keyword-map.ts`
rather than left to warn on every build. A warning that cannot be cleared is one
people stop reading. Anything not on that list still fires, so a new post that
collides shows up on the next build.
