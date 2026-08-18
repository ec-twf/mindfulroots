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
