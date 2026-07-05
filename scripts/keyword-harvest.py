#!/usr/bin/env python3
"""Autocomplete keyword harvest for moodsupplement.net (Google + Amazon suggest).
Zero-LLM-cost demand discovery: seed x modifier matrix -> dedupe -> raw candidate CSV.
Run manually during a queue-rebuild session; output feeds the SERP-validation pass.
"""
import csv
import json
import sys
import time
import urllib.parse
import urllib.request

SEEDS = [
    # live products
    "l-theanine", "ashwagandha", "magnesium glycinate", "rhodiola rosea",
    "5-htp", "saffron extract", "vitamin d3", "b complex",
    "omega-3 fish oil", "probiotic",
    # gap supplements (xlsx-flagged, low competition)
    "lemon balm", "glycine", "valerian root", "passionflower",
    "lavender silexan", "l-tryptophan", "taurine", "holy basil",
    "l-tyrosine",
]

MODIFIER_TEMPLATES = [
    "{s} vs",
    "best {s} for",
    "{s} dosage",
    "{s} side effects",
    "{s} for sleep",
    "{s} for anxiety",
    "{s} for stress",
    "{s} and",
    "can you take {s}",
    "how long does {s} take to work",
    "does {s} work",
]

UA = "Mozilla/5.0 (compatible; keyword-harvest/1.0)"


def google_suggest(query: str) -> list[str]:
    url = "https://suggestqueries.google.com/complete/search?client=firefox&q=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data[1] if len(data) > 1 else []
    except Exception as e:
        print(f"  WARN google_suggest({query!r}): {e}", file=sys.stderr)
        return []


def amazon_suggest(query: str) -> list[str]:
    url = ("https://completion.amazon.com/api/2017/suggestions?"
           "session-id=1&mid=ATVPDKIKX0DER&alias=aps&prefix=" + urllib.parse.quote(query))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            sugs = data.get("suggestions", [])
            return [s.get("value", "") for s in sugs if s.get("value")]
    except Exception as e:
        print(f"  WARN amazon_suggest({query!r}): {e}", file=sys.stderr)
        return []


def harvest() -> dict[str, set[str]]:
    """Returns {seed: set(candidate phrases)}."""
    results: dict[str, set[str]] = {}
    for seed in SEEDS:
        bucket: set[str] = set()
        for tmpl in MODIFIER_TEMPLATES:
            q = tmpl.format(s=seed)
            g = google_suggest(q)
            bucket.update(p.lower().strip() for p in g)
            time.sleep(0.3)  # be polite to the endpoint
        # one Amazon pass on the bare seed — buyer-intent phrasing differs from Google
        a = amazon_suggest(seed)
        bucket.update(p.lower().strip() for p in a)
        time.sleep(0.3)
        results[seed] = bucket
        print(f"{seed}: {len(bucket)} candidates", file=sys.stderr)
    return results


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "data/keyword-harvest-raw.csv"
    results = harvest()
    seen: set[str] = set()
    rows = []
    for seed, phrases in results.items():
        for p in sorted(phrases):
            if p in seen or len(p) < 3:
                continue
            seen.add(p)
            rows.append((seed, p))
    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["seed", "candidate_phrase"])
        w.writerows(rows)
    print(f"\nWrote {len(rows)} deduped candidates to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
