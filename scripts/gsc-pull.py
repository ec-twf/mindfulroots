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
  python3 scripts/gsc-pull.py [--days 28] [--out data/gsc/YYYY-MM-DD.csv]
"""
import argparse
import csv
import datetime
import os
import sys

KEY_PATH = os.path.expanduser("~/.config/moodsupplement/gsc-key.json")
SITE_URL = "https://www.moodsupplement.net"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=28)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

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


if __name__ == "__main__":
    main()
