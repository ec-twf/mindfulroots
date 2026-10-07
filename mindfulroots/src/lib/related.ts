// Sibling-post selection for internal linking.
//
// Why this exists: GSC's 2026-10-07 coverage export showed 74 posts stuck in
// "Discovered - currently not indexed", every one of them never fetched. The
// measured cause was link starvation, not a sitemap fault — every post had
// exactly ONE inbound internal link, and for 144 of 164 posts that link was
// /blog, a single page carrying 165 of them. Nothing told Google which posts
// mattered, so it stopped crawling new ones (100% of September output skipped).
//
// The selection below is a *ring*, not a "newest N" list, and that is the whole
// point. Sorting siblings by recency would hand every inbound link to the
// newest few posts and leave the back catalogue exactly as orphaned as it is
// now. Walking a slug-sorted ring instead gives every post in a cluster the
// same out-degree AND the same in-degree, so link equity spreads evenly and the
// graph stays stable between builds (a link that moves every build is a link
// Google re-crawls and re-discounts).
import { type CollectionEntry } from 'astro:content';
import { normalizeCluster } from './taxonomy';

type Post = CollectionEntry<'blog'>;

/** Links rendered per post. Six keeps the block scannable and still lifts every
 *  post from one inbound link to roughly six. */
export const RELATED_LIMIT = 6;

/** Stable, non-cryptographic offset so posts that sit outside a given pool still
 *  enter the ring at different points instead of all picking the same head. */
function offsetFor(id: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return modulo > 0 ? h % modulo : 0;
}

/** Walks `pool` as a ring starting just past `currentId`, skipping anything in
 *  `taken` and the post itself, until `count` posts are collected. */
function ringPick(pool: Post[], currentId: string, count: number, taken: Set<string>): Post[] {
  if (count <= 0 || pool.length === 0) return [];
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const self = sorted.findIndex((p) => p.id === currentId);
  const start = self === -1 ? offsetFor(currentId, sorted.length) : self;

  const out: Post[] = [];
  for (let step = 1; step <= sorted.length && out.length < count; step++) {
    const candidate = sorted[(start + step) % sorted.length];
    if (candidate.id === currentId || taken.has(candidate.id)) continue;
    taken.add(candidate.id);
    out.push(candidate);
  }
  return out;
}

/** Every non-draft post sharing a supplement cluster, normalized so the
 *  "magnesium" / "magnesium-glycinate" spelling split resolves to one group. */
export function postsInCluster(posts: Post[], cluster: string): Post[] {
  const key = normalizeCluster(cluster);
  return posts
    .filter((p) => !p.data.draft && normalizeCluster(p.data.cluster) === key)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/**
 * Picks sibling posts for `post`, in three widening tiers:
 *   1. same supplement cluster — the strongest topical signal we have;
 *   2. same `postType` across clusters — keeps thin clusters (l-tryptophan has
 *      one post, passionflower two) from falling back to noise;
 *   3. anything else, so no post ever renders fewer than `limit` links.
 */
export function relatedPosts(post: Post, all: Post[], limit = RELATED_LIMIT): Post[] {
  const live = all.filter((p) => !p.data.draft);
  const taken = new Set<string>([post.id]);
  const picked: Post[] = [];

  // One slot is always held back for the site-wide ring. Topical tiers alone
  // leave posts in clusters with no product page (l-tryptophan has one post,
  // passionflower two) sitting at a single inbound link, because almost no post
  // ever falls through far enough to reach them. Reserving a slot makes all 164
  // posts contribute one link walked over the whole corpus in slug order, which
  // floors every post's in-degree instead of leaving a long tail at zero.
  const topicalSlots = Math.max(1, limit - 1);

  const cluster = normalizeCluster(post.data.cluster);
  const siblings = live.filter((p) => normalizeCluster(p.data.cluster) === cluster);
  picked.push(...ringPick(siblings, post.id, topicalSlots, taken));

  if (picked.length < topicalSlots && post.data.postType) {
    const sameType = live.filter((p) => p.data.postType === post.data.postType);
    picked.push(...ringPick(sameType, post.id, topicalSlots - picked.length, taken));
  }

  if (picked.length < limit) {
    picked.push(...ringPick(live, post.id, limit - picked.length, taken));
  }

  return picked;
}
