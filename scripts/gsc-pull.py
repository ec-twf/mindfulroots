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


# ─── Agent-query filter ─────────────────────────────────────────────────────
# GSC counts an impression whoever issued the query, and a meaningful share of
# ours are not people. /blog/5-htp-serotonin-safety/ pulled 210 impressions
# across 75 queries that are combinatorial permutations of one intent with an
# authority name bolted on: "memorial sloan kettering 5-htp serotonin syndrome",
# "... nccih ...", "... serotonin syndrome review pmc", "5-htp interactions
# antidepressants serotonin syndrome official medical source". Nobody types 75
# of those. It is an LLM agent hunting a citable source, and appending an
# organisation name or "authoritative source" is exactly what a model does when
# told to find one.
#
# Left unfiltered it poisons the scoreboard the optimizer Routine reads: that
# single page made postType=safety look like the site's best pattern at avg
# position 9.4, so the queue would chase a demand curve that has no humans on
# it. Everything downstream of here selects on human impressions.
#
# The rows are kept, not dropped — being retrieved at position ~9 by an agent
# and never cited is a GEO signal worth tracking. They go to a separate
# -agents.csv.

# Decisive on their own (score 3): the query names an authority this site is
# not, or explicitly asks for a source document.
AGENT_TIER1 = [
    r"memorial sloan kettering", r"\bmskcc\b", r"\bnccih\b", r"\bnih\b",
    r"\bpmc\b", r"\bpubmed\b", r"\bcochrane\b", r"poison control",
    r"\bfda\b", r"mayo clinic", r"\bwebmd\b", r"drugs\.com",
    r"examine\.com", r"office of dietary supplements", r"\bods\b",
    r"authoritative source", r"official medical source", r"official health source",
    r"official source", r"prescribing information", r"package insert",
    r"\bmonograph\b", r"fact sheet",
]

# Suggestive, needs corroboration (score 2). A human really might search
# "ashwagandha meta-analysis", so these never fire alone.
AGENT_TIER2 = [
    r"systematic review", r"meta.analysis", r"case report", r"clinical trial",
    r"peer.reviewed", r"evidence.based", r"\bofficial\b", r"\breview\b",
]

AGENT_THRESHOLD = 3


def _norm(q):
    return q.lower().strip('"').replace("\u2019", "'")


def _burst_pages(rows):
    """Pages whose query set looks machine-generated rather than paraphrased.

    Deliberately anchored to pages that already show Tier-1 hits. Volume of
    near-identical queries is NOT sufficient on its own:
    /blog/vitamin-d3-morning-or-night/ has 94 queries averaging 5 impressions
    that are all human rewordings of "best time to take d3". The thing that
    separates permutation from paraphrase is the authority token, so a page
    only counts as a burst once a large share of its queries carry one.
    """
    by_page = {}
    for r in rows:
        b = by_page.setdefault(r["page"], {"n": 0, "imps": 0, "tier1": 0})
        b["n"] += 1
        b["imps"] += r["impressions"]
        if any(re.search(p, _norm(r["query"])) for p in AGENT_TIER1):
            b["tier1"] += 1
    return {
        page for page, b in by_page.items()
        if b["n"] >= 15 and b["imps"] / b["n"] < 4 and b["tier1"] / b["n"] >= 0.4
    }


def classify_rows(rows):
    """Split query/page rows into (human, agent). Annotates each row in place."""
    bursts = _burst_pages(rows)
    human, agent = [], []
    for r in rows:
        q = _norm(r["query"])
        score, why = 0, []
        for p in AGENT_TIER1:
            if re.search(p, q):
                score += 3
                why.append(f"authority:{p.strip(chr(92) + 'b')}")
                break
        for p in AGENT_TIER2:
            if re.search(p, q):
                score += 2
                why.append(f"research-jargon:{p}")
                break
        if '"' in r["query"]:
            # Quoted phrase search — a paper title pasted verbatim, not a person.
            score += 2
            why.append("quoted-phrase")
        if len(q.split()) >= 8:
            score += 1
            why.append("long-query")
        if r["page"] in bursts:
            score += 1
            why.append("permutation-burst")

        r["agent_score"] = score
        r["agent_reasons"] = "|".join(why)
        (agent if score >= AGENT_THRESHOLD else human).append(r)
    return human, agent


def write_agents(rows, out_path):
    """Agent-attributed queries, kept as their own GEO signal."""
    with open(out_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["query", "page", "clicks", "impressions",
                                          "ctr", "position", "agent_score", "agent_reasons"])
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: -r["impressions"]))
    return len(rows)


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


def write_pages(rows, agent_rows, out_path):
    """One row per URL — the committed artifact the headless optimizer reads.

    The full query/page pull is tens of thousands of rows and stays gitignored,
    but the optimizer's indexation proxy only needs the SET of URLs Search
    Console has seen at all: a published post older than 14 days that appears
    in no row here is probably not indexed. Collapsing queries away makes that
    answerable from a ~120-row file small enough to keep in git.
    """
    excluded = {}
    for r in agent_rows:
        path = re.sub(r"^https?://[^/]+", "", r["page"])
        excluded[path] = excluded.get(path, 0) + r["impressions"]

    buckets = {}
    for r in rows:
        path = re.sub(r"^https?://[^/]+", "", r["page"])
        b = buckets.setdefault(path, {"impressions": 0, "clicks": 0,
                                      "pos_weighted": 0.0, "queries": 0})
        b["impressions"] += r["impressions"]
        b["clicks"] += r["clicks"]
        b["pos_weighted"] += r["position"] * r["impressions"]
        b["queries"] += 1
    # A page whose impressions were ENTIRELY agent-driven still has to appear
    # here, or the optimizer's indexation proxy reads it as never-crawled and
    # queues a rewrite for a page Search Console knows perfectly well.
    for path in excluded:
        buckets.setdefault(path, {"impressions": 0, "clicks": 0,
                                  "pos_weighted": 0.0, "queries": 0})

    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["page", "impressions", "clicks", "avg_position", "queries",
                    "excluded_impressions"])
        for path, b in sorted(buckets.items(), key=lambda kv: -kv[1]["impressions"]):
            w.writerow([
                path, b["impressions"], b["clicks"],
                round(b["pos_weighted"] / b["impressions"], 1) if b["impressions"] else "",
                b["queries"], excluded.get(path, 0),
            ])
    return len(buckets)


def emit_outputs(rows, out_path):
    """Classify, then write every derived artifact. Shared by the live pull and
    by --reclassify so a re-run over an archived CSV produces identical files."""
    human, agent = classify_rows(rows)

    agents_path = out_path.replace(".csv", "-agents.csv")
    write_agents(agent, agents_path)
    print(f"Wrote {len(agent)} agent-attributed rows "
          f"({sum(r['impressions'] for r in agent)} impressions) to {agents_path}")

    # Per-cluster / per-longtail-type rollup — the experiment scoreboard.
    # Human rows only: this is what the optimizer Routine reprioritises from.
    patterns_path = out_path.replace(".csv", "-patterns.csv")
    n = write_patterns(human, patterns_path)
    print(f"Wrote {n} cluster/type buckets to {patterns_path}")

    # Per-URL rollup — feeds the optimizer's indexation proxy. Committed, unlike
    # the query-level pull.
    pages_path = out_path.replace(".csv", "-pages.csv")
    n = write_pages(human, agent, pages_path)
    print(f"Wrote {n} page rows to {pages_path}")


def reclassify(path):
    """Re-derive the rollups from an already-pulled query CSV. No API call.

    Used to backfill the agent filter across archived snapshots so week-on-week
    comparisons are like-for-like instead of comparing filtered to unfiltered.
    """
    with open(path, newline="") as f:
        rows = [{
            "query": r["query"],
            "page": r["page"],
            "clicks": int(float(r["clicks"])),
            "impressions": int(float(r["impressions"])),
            "ctr": float(r["ctr"]),
            "position": float(r["position"]),
        } for r in csv.DictReader(f)]
    print(f"Reclassifying {len(rows)} rows from {path}")
    emit_outputs(rows, path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=28)
    parser.add_argument("--out", default=None)
    parser.add_argument(
        "--reclassify", default=None,
        help="Re-run the rollups over an existing data/gsc/<date>.csv without "
             "calling the API. Use to backfill archived snapshots.",
    )
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

    if args.reclassify:
        reclassify(args.reclassify)
        return

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

    # Daily series. NOTE: dimensioned by date only, so the agent filter cannot
    # apply here — these totals still include agent impressions. Read the curve
    # for shape, and -pages.csv / -agents.csv for attribution.
    #
    # The impression dip that prompted this loop was only legible
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

    emit_outputs(rows, out_path)


if __name__ == "__main__":
    main()
