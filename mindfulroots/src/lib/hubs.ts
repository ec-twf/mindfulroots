// Reverse-lookup helpers from condition hubs (src/content/hubs) back to the
// blog posts and products they cite, so blog/[slug].astro and
// products/[slug].astro can link "up" to a hub without either collection
// needing to know about the other (no double maintenance — the hub's
// `products` / `supportingPosts` frontmatter is the single source of truth).
import { getCollection, type CollectionEntry } from 'astro:content';

type Hub = CollectionEntry<'hubs'>;

async function liveHubs(): Promise<Hub[]> {
  return (await getCollection('hubs')).filter((h) => !h.data.draft);
}

/** Non-draft hubs whose `products` list includes this product slug. */
export async function hubsForProduct(slug: string): Promise<Hub[]> {
  const hubs = await liveHubs();
  return hubs.filter((h) => h.data.products.includes(slug));
}

/** Non-draft hubs whose `supportingPosts` list includes this blog slug. */
export async function hubsForPost(slug: string): Promise<Hub[]> {
  const hubs = await liveHubs();
  return hubs.filter((h) => h.data.supportingPosts.includes(slug));
}
