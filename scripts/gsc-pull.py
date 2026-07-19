#!/usr/bin/env python3
"""Pull Search Console query/page performance for moodsupplement.net.
Zero-LLM-cost data feed for the biweekly optimize-content loop.

One-time setup (see scripts/GSC-SETUP.md):
  1. Google Cloud project + Search Console API enabled.
  2. Service account + downloaded JSON key.
  3. Service account email added as a restricted (read-only) user on the
     Search Console property for moodsupplement.net.
  4. Key saved OUTSIDE the repo at ~/.config/moodsupplement/gsc-key.json.

Usage:
  pip install google-api-python-client google-auth
  python3 scripts/gsc-pull.py [--days 28] [--out data/gsc/YYYY-MM-DD.csv] \
      [--property sc-domain:moodsupplement.net]

  The property queried must exactly match a property string the service
  account is granted on in Search Console (see GSC-SETUP.md). Override via
  --property or the GSC_PROPERTY env var; defaults to the Domain property
  sc-domain:moodsupplement.net.
"""
import argparse
import csv
import datetime
import os
import re
import sys

KEY_PATH = os.path.expanduser("~/.config/moodsupplement/gsc-key.json")
# Must exactly match a property string the service account is granted on in
# Search Console (Settings -> Users and permissions). URL-prefix properties
# ("https://www.example.com") and Domain properties ("sc-domain:example.com")
# are different properties even for the same site -- see GSC-SETUP.md.
DEFAULT_SITE_URL = "sc-domain:moodsupplement.net"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


# ─── Pattern rollups ────────────────────────────────────────────────────────
# The queue is an experiment: each post is tagged with a cluster and a longtail
# TYPE (interaction / dosage / timing / safety / duration / comparison). Rolling
# GSC up by those tags is what turns publishing into a measurable test — it
# answers "which longtail pattern earns impressions at our authority level",
# which per-URL rows alone cannot.
BLOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "mindfulroots", "src", "content", "blog")


def _frontmatter_field(raw, key):
    m = re.search(rf'^{key}:\s*"?(.*?)"?\s*$', raw, re.M)
    return m.group(1) if m else ""


def post_metadata():
    """Map site path ('/blog/<slug>/') -> {cluster, postType, buyIntentTerm, pubDate}."""
    meta = {}
    if not os.path.isdir(BLOG_DIR):
        return meta
    for fname in os.listdir(BLOG_DIR):
        if not fname.endswith((".md", ".mdx")):
            continue
        raw = open(os.path.join(BLOG_DIR, fname), encoding="utf-8").read()
        slug = re.sub(r"\.mdx?$", "", fname)
        meta[f"/blog/{slug}/"] = {
            "cluster": _frontmatter_field(raw, "cluster") or "unclassified",
            "postType": _frontmatter_field(raw, "postType") or "untyped",
            "buyIntentTerm": _frontmatter_field(raw, "buyIntentTerm"),
            "pubDate": _frontmatter_field(raw, "pubDate"),
        }
    return meta


def write_patterns(rows, out_path):
    """Aggregate page-level rows by cluster and by postType."""
    meta = post_metadata()
    buckets = {}
    for r in rows:
        path = re.sub(r"^https?://[^/]+", "", r["page"])
        m = meta.get(path)
        if not m:
            continue  # non-blog URL (product, guide, static page) — not part of the test
        for dim, value in (("cluster", m["cluster"]), ("type", m["postType"])):
            key = (dim, value)
            b = buckets.setdefault(key, {"pages": set(), "impressions": 0, "clicks": 0,
                                         "pos_weighted": 0.0, "has_buy_intent": 0})
            if path not in b["pages"]:
                b["pages"].add(path)
                if m["buyIntentTerm"]:
                    b["has_buy_intent"] += 1
            b["impressions"] += r["impressions"]
            b["clicks"] += r["clicks"]
            b["pos_weighted"] += r["position"] * r["impressions"]

    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["dimension", "value", "pages", "pages_with_buy_intent",
                    "impressions", "clicks", "impressions_per_page", "avg_position"])
        for (dim, value), b in sorted(buckets.items(), key=lambda kv: -kv[1]["impressions"]):
            pages = len(b["pages"])
            w.writerow([
                dim, value, pages, b["has_buy_intent"], b["impressions"], b["clicks"],
                round(b["impressions"] / pages, 1) if pages else 0,
                round(b["pos_weighted"] / b["impressions"], 1) if b["impressions"] else "",
            ])
    return len(buckets)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=28)
    parser.add_argument("--out", default=None)
    parser.add_argument(
        "--property",
        default=os.environ.get("GSC_PROPERTY", DEFAULT_SITE_URL),
        help=(
            "GSC property string to query, e.g. 'sc-domain:moodsupplement.net' "
            "or 'https://www.moodsupplement.net'. Defaults to $GSC_PROPERTY "
            f"or {DEFAULT_SITE_URL!r}."
        ),
    )
    args = parser.parse_args()
    SITE_URL = args.property

    if not os.path.isfile(KEY_PATH):
        print(f"ERROR: service account key not found at {KEY_PATH}", file=sys.stderr)
        print("Run through scripts/GSC-SETUP.md first.", file=sys.stderr)
        sys.exit(1)

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        print("ERROR: missing deps. Run: pip install google-api-python-client google-auth", file=sys.stderr)
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)
    service = build("searchconsole", "v1", credentials=creds)

    end = datetime.date.today() - datetime.timedelta(days=3)  # GSC data lags ~2-3 days
    start = end - datetime.timedelta(days=args.days)

    out_path = args.out or f"data/gsc/{end.isoformat()}.csv"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    rows = []
    start_row = 0
    while True:
        body = {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query", "page"],
            "rowLimit": 25000,
            "startRow": start_row,
        }
        resp = service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
        page_rows = resp.get("rows", [])
        if not page_rows:
            break
        for r in page_rows:
            query, page = r["keys"]
            rows.append({
                "query": query,
                "page": page,
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
                "ctr": round(r.get("ctr", 0.0), 4),
                "position": round(r.get("position", 0.0), 2),
            })
        if len(page_rows) < 25000:
            break
        start_row += 25000

    with open(out_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["query", "page", "clicks", "impressions", "ctr", "position"])
        w.writeheader()
        w.writerows(rows)

    print(f"Wrote {len(rows)} query/page rows ({start} to {end}) to {out_path}")

    # Daily series. The impression dip that prompted this loop was only legible
    # as a per-day curve — 28-day totals hid a 45% drop because they average the
    # pre-drop peak back in. Always write it alongside the query/page pull.
    daily_path = out_path.replace(".csv", "-daily.csv")
    daily = service.searchanalytics().query(siteUrl=SITE_URL, body={
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["date"],
        "rowLimit": 1000,
    }).execute().get("rows", [])
    with open(daily_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "impressions", "clicks", "ctr", "position"])
        for r in daily:
            w.writerow([r["keys"][0], int(r.get("impressions", 0)), int(r.get("clicks", 0)),
                        round(r.get("ctr", 0.0), 4), round(r.get("position", 0.0), 2)])
    print(f"Wrote {len(daily)} daily rows to {daily_path}")

    # Per-cluster / per-longtail-type rollup — the experiment scoreboard.
    patterns_path = out_path.replace(".csv", "-patterns.csv")
    n = write_patterns(rows, patterns_path)
    print(f"Wrote {n} cluster/type buckets to {patterns_path}")


if __name__ == "__main__":
    main()
