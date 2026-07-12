#!/usr/bin/env python3
"""Weekly KPI digest for moodsupplement.net, delivered to Telegram.

The dashboard comes to you: one message every Monday, ~15 lines, each with a
week-over-week arrow. Designed for the pre-traffic phase — leading indicators
(impressions slope, non-navigational query count, tracked-keyword positions,
indexation) sit above lagging ones (clicks, affiliate clicks, email subs).

Stateless by design: pulls two 7-day GSC windows (this week vs prior week) in
one run, so it needs no snapshot files and can run on a fresh CI runner.

Env (required):
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
Env (optional — section prints "n/a" when unset):
  GSC_KEY_PATH        service-account key path (default ~/.config/moodsupplement/gsc-key.json)
  GSC_PROPERTY        default sc-domain:moodsupplement.net
  NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID   -> /go/ click counts from Netlify Blobs
  BUTTONDOWN_API_KEY                    -> email subscriber count

Usage:
  pip install google-api-python-client google-auth requests
  python3 scripts/kpi-digest.py [--dry-run]   (--dry-run prints instead of sending)
"""
import argparse
import datetime
import json
import os
import re
import sys
import urllib.request

KEY_PATH = os.path.expanduser(os.environ.get("GSC_KEY_PATH", "~/.config/moodsupplement/gsc-key.json"))
SITE_URL = os.environ.get("GSC_PROPERTY", "sc-domain:moodsupplement.net")
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
KEYWORD_MAP_TS = os.path.join(os.path.dirname(__file__), "..", "mindfulroots", "src", "lib", "keyword-map.ts")

# Queries that are the site's own citation strings, not demand ("nih office of
# dietary supplements omega-3 fact sheet"). They inflate impression counts and
# say nothing about the niche, so every query-level KPI excludes them.
JUNK_QUERY = re.compile(r"\b(nih|nccih|mskcc|ods)\b|office of dietary|fact sheet", re.I)


def arrow(cur, prev):
    if prev is None:
        return "—"
    return "▲" if cur > prev else ("▼" if cur < prev else "—")


def gsc_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)
    return build("searchconsole", "v1", credentials=creds)


def gsc_window(service, start, end):
    """All query/page rows for [start, end]."""
    rows, start_row = [], 0
    while True:
        body = {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query", "page"],
            "rowLimit": 25000,
            "startRow": start_row,
        }
        resp = service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
        page = resp.get("rows", [])
        rows += page
        if len(page) < 25000:
            break
        start_row += 25000
    return rows


def window_stats(rows):
    demand = [r for r in rows if not JUNK_QUERY.search(r["keys"][0])]
    return {
        "impressions": sum(r.get("impressions", 0) for r in rows),
        "clicks": sum(r.get("clicks", 0) for r in rows),
        "demand_queries": len({r["keys"][0] for r in demand}),
        "demand_top20": len({r["keys"][0] for r in demand if r.get("position", 99) < 20}),
        "demand_top50": len({r["keys"][0] for r in demand if r.get("position", 99) < 50}),
    }


def tracked_keywords():
    """headTerm values from keyword-map.ts — the queries we deliberately target."""
    try:
        src = open(KEYWORD_MAP_TS).read()
        return re.findall(r"headTerm:\s*['\"]([^'\"]+)['\"]", src)
    except OSError:
        return []


def tracked_positions(rows, terms):
    best = {}
    for r in rows:
        q = r["keys"][0].strip().lower()
        if q in terms:
            best[q] = min(best.get(q, 999), r.get("position", 999))
    return best


def indexation(service):
    """Submitted vs indexed summed over all registered sitemaps (proxy for index
    coverage; GSC's `indexed` count lags reality, so treat it as a trend, not truth)."""
    try:
        sitemaps = service.sitemaps().list(siteUrl=SITE_URL).execute().get("sitemap", [])
        submitted = indexed = 0
        for sm in sitemaps:
            for c in sm.get("contents", []):
                submitted += int(c.get("submitted", 0))
                indexed += int(c.get("indexed", 0))
        return (submitted, indexed) if sitemaps else (None, None)
    except Exception:
        return None, None


def go_clicks(days=7):
    """Count /go/ click blobs for the last `days` days via the Netlify API."""
    token, site = os.environ.get("NETLIFY_AUTH_TOKEN"), os.environ.get("NETLIFY_SITE_ID")
    if not token or not site:
        return None
    total = 0
    today = datetime.date.today()
    for d in range(days):
        day = (today - datetime.timedelta(days=d)).isoformat()
        url = f"https://api.netlify.com/api/v1/blobs/{site}/affiliate-clicks?prefix=clicks/{day}/"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                total += len(json.load(resp).get("blobs", []))
        except Exception:
            return None
    return total


def email_subs():
    key = os.environ.get("BUTTONDOWN_API_KEY")
    if not key:
        return None
    req = urllib.request.Request(
        "https://api.buttondown.email/v1/subscribers?page_size=1",
        headers={"Authorization": f"Token {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.load(resp).get("count")
    except Exception:
        return None


def fmt(n):
    return "n/a" if n is None else str(n)


def build_digest():
    end = datetime.date.today() - datetime.timedelta(days=3)  # GSC lag
    cur_start = end - datetime.timedelta(days=6)
    prev_end = cur_start - datetime.timedelta(days=1)
    prev_start = prev_end - datetime.timedelta(days=6)

    service = gsc_service()
    cur = window_stats(gsc_window(service, cur_start, end))
    prev = window_stats(gsc_window(service, prev_start, prev_end))
    submitted, indexed = indexation(service)

    terms = [t.strip().lower() for t in tracked_keywords()]
    pos = tracked_positions(gsc_window(service, cur_start, end), set(terms))

    clicks7 = go_clicks(7)
    subs = email_subs()

    lines = [
        f"📊 MoodSupplement KPI — week to {end.isoformat()}",
        "",
        f"{arrow(cur['impressions'], prev['impressions'])} Impressions: {cur['impressions']} (prev {prev['impressions']})",
        f"{arrow(cur['clicks'], prev['clicks'])} GSC clicks: {cur['clicks']} (prev {prev['clicks']})",
        f"{arrow(cur['demand_queries'], prev['demand_queries'])} Demand queries (junk-filtered): {cur['demand_queries']} (prev {prev['demand_queries']})",
        f"{arrow(cur['demand_top50'], prev['demand_top50'])} …in top 50: {cur['demand_top50']} (prev {prev['demand_top50']})",
        f"{arrow(cur['demand_top20'], prev['demand_top20'])} …in top 20: {cur['demand_top20']} (prev {prev['demand_top20']})",
    ]

    if submitted is not None:
        rate = f"{indexed}/{submitted}" + (f" ({indexed / submitted:.0%})" if submitted else "")
        lines.append(f"• Sitemap indexed: {rate}")
        if submitted and indexed / submitted < 0.5:
            lines.append("  ⚠ indexation <50% — run URL-inspection batch before writing anything new")

    ranked = sorted(pos.items(), key=lambda kv: kv[1])[:3]
    if ranked:
        best = ", ".join(f"{q} @{p:.0f}" for q, p in ranked)
        lines.append(f"• Tracked keywords seen: {len(pos)}/{len(terms)} — best: {best}")
    else:
        lines.append(f"• Tracked keywords seen: 0/{len(terms)}")

    lines += [
        f"• /go/ affiliate clicks (7d): {fmt(clicks7)}",
        f"• Email subscribers: {fmt(subs)}",
        "",
        "Rule: every content/pin decision this week cites a line above.",
    ]

    strikers = [q for q, p in pos.items() if 8 <= p <= 20]
    if strikers:
        lines.append("🎯 Striking distance (optimize these first): " + ", ".join(strikers[:5]))

    return "\n".join(lines)


def send_telegram(text):
    token, chat = os.environ["TELEGRAM_BOT_TOKEN"], os.environ["TELEGRAM_CHAT_ID"]
    data = json.dumps({"chat_id": chat, "text": text, "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        ok = json.load(resp).get("ok")
    if not ok:
        raise RuntimeError("Telegram sendMessage returned ok=false")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="print the digest instead of sending it")
    args = parser.parse_args()

    if not os.path.isfile(KEY_PATH):
        print(f"ERROR: service account key not found at {KEY_PATH} (see scripts/GSC-SETUP.md)", file=sys.stderr)
        sys.exit(1)

    digest = build_digest()
    if args.dry_run:
        print(digest)
    else:
        send_telegram(digest)
        print("Digest sent.")


if __name__ == "__main__":
    main()
