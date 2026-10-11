// Netlify Scheduled Function: enforces the click-log retention period that
// /privacy/ promises. Without this the blob store in go.mjs grows forever and
// the stated 13 months is a claim nothing backs up.
//
// Keys are `clicks/<YYYY-MM-DD>/<epoch-ms>-<rand>`, so the retention cutoff is
// a string comparison on the date segment — no need to read any blob to decide
// whether it has aged out.
//
// 13 months, not 12: the KPI digest compares a month against the same month a
// year earlier, and a 12-month window would delete the comparison the moment
// it was needed.
import { getStore } from '@netlify/blobs';

const RETENTION_MONTHS = 13;

function cutoffDate(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - RETENTION_MONTHS, 1));
  return d.toISOString().slice(0, 10);
}

export default async () => {
  const store = getStore('affiliate-clicks');
  const cutoff = cutoffDate();
  let deleted = 0;

  const { blobs } = await store.list({ prefix: 'clicks/' });
  for (const { key } of blobs) {
    const day = key.split('/')[1];
    // Anything that does not look like a dated key is left alone: an unparsable
    // key is a bug to investigate, not data to destroy.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) continue;
    if (day >= cutoff) continue;
    await store.delete(key);
    deleted += 1;
  }

  console.log(`[prune-clicks] cutoff ${cutoff}, deleted ${deleted} click records`);
  return new Response(null, { status: 202 });
};

export const config = {
  schedule: '@monthly',
};
