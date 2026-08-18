#!/usr/bin/env python3
"""Anti-cannibalization filter for raw keyword-harvest candidates.
Reads data/keyword-harvest-raw.csv, drops anything already owned
(keyword-map.ts headTerm), already queued (topic-queue/product-page-tasks),
or already in the curated universe. Writes a clean shortlist for the human
SERP-judgment pass. Zero-LLM-cost bridge between harvest and queue.

Usage:
  python3 scripts/filter-candidates.py [--in data/keyword-harvest-raw.csv] [--out data/discovery/YYYY-MM-DD-candidates.csv]
"""
import argparse
import csv
import datetime
import os
import re
import sys

KEYWORD_MAP_PATH = "mindfulroots/src/lib/keyword-map.ts"
QUEUE_PATHS = [
    "mindfulroots/mindfulroots-topic-queue.txt",
    "mindfulroots/product-page-tasks.txt",
]
UNIVERSE_PATH = "data/keyword-universe.csv"

BUY_INTENT_MARKERS = [
    "vs", "best ", "can you take", "dosage", "side effects",
    "for sleep", "for anxiety", "for stress", "interaction", "with ",
]

# Autocomplete returns the whole ambiguity of a seed word: lemon balm and holy
# basil are also garden plants, and people dose their pets. Neither can map to
# one of the 10 products, which the review gate requires, so they are noise the
# judgment pass should never have to read.
NOISE_MARKERS = [
    " for dogs", " for cats", " for pets", " for horses", "puppy", "kitten",
    "veterinary", "fertilizer", "how to grow", " grow ", " growing",
    " plant ", " plants", " seeds", "seedling", "propagate", "garden", "soil",
    "prune", " indoors", " outdoors",
    "essential oil recipe", "candle", "soap",
]


def norm(s: str) -> str:
    """lowercase, strip, collapse internal whitespace, strip surrounding quotes/trailing punctuation."""
    s = s.strip().strip("'\"").strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[.,;:!?]+$", "", s)
    return s.strip().lower()


def load_headterms(path: str) -> set[str]:
    if not os.path.isfile(path):
        print(f"WARN: {path} not found, skipping headTerm exclusions", file=sys.stderr)
        return set()
    with open(path) as f:
        text = f.read()
    return {norm(m) for m in re.findall(r"headTerm:\s*'([^']*)'", text)}


def load_queue_keywords(paths: list[str]) -> set[str]:
    out: set[str] = set()
    for path in paths:
        if not os.path.isfile(path):
            print(f"WARN: {path} not found, skipping", file=sys.stderr)
            continue
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                for part in line.split("|"):
                    part = part.strip()
                    if part.startswith("KEYWORD:"):
                        out.add(norm(part[len("KEYWORD:"):]))
    return out


def load_universe_keywords(path: str) -> set[str]:
    if not os.path.isfile(path):
        print(f"WARN: {path} not found, skipping", file=sys.stderr)
        return set()
    out: set[str] = set()
    with open(path) as f:
        for row in csv.DictReader(f):
            kw = row.get("keyword")
            if kw:
                out.add(norm(kw))
    return out


def is_owned_collision(n: str, headterms: set[str]) -> bool:
    """Exact match, substring-of-headterm, or superset-of-headterm."""
    for ht in headterms:
        if not ht:
            continue
        if n == ht or ht in n or n in ht:
            return True
    return False


def is_buy_intent(n: str) -> bool:
    return any(marker in n for marker in BUY_INTENT_MARKERS)


def is_noise(n: str) -> bool:
    """Off-topic sense of the seed word — pets, gardening, craft use."""
    padded = f" {n} "
    return any(marker in padded for marker in NOISE_MARKERS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_path", default="data/keyword-harvest-raw.csv")
    parser.add_argument("--out", dest="out_path", default=None)
    args = parser.parse_args()

    out_path = args.out_path or f"data/discovery/{datetime.date.today().isoformat()}-candidates.csv"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    if not os.path.isfile(args.in_path):
        print(f"ERROR: raw candidate file not found at {args.in_path}", file=sys.stderr)
        sys.exit(1)

    headterms = load_headterms(KEYWORD_MAP_PATH)
    queued = load_queue_keywords(QUEUE_PATHS)
    universe = load_universe_keywords(UNIVERSE_PATH)

    raw = 0
    dropped_owned = 0
    dropped_queued_universe = 0
    dropped_noise = 0
    seen: set[str] = set()
    kept = []

    with open(args.in_path) as f:
        for row in csv.DictReader(f):
            raw += 1
            phrase = row.get("candidate_phrase", "")
            seed = row.get("seed", "")
            n = norm(phrase)
            if not n or n in seen:
                continue
            seen.add(n)

            if is_owned_collision(n, headterms):
                dropped_owned += 1
                continue
            if n in queued or n in universe:
                dropped_queued_universe += 1
                continue
            if is_noise(n):
                dropped_noise += 1
                continue

            kept.append({
                "candidate_phrase": phrase.strip(),
                "seed": seed,
                "buy_intent": is_buy_intent(n),
                "reason_kept": "new (no collision with keyword-map/queue/universe)",
            })

    # Buy-intent first, then round-robin across seeds. Straight alphabetical
    # ordering buried every seed after the first: the consumer of this file
    # judges "the top buy-intent rows", and with ~1800 rows that meant it only
    # ever saw 5-htp. Interleaving makes the head of the file representative.
    kept.sort(key=lambda r: (not r["buy_intent"], r["candidate_phrase"].lower()))
    rank: dict[tuple[bool, str], int] = {}
    for r in kept:
        key = (r["buy_intent"], r["seed"])
        rank[key] = rank.get(key, -1) + 1
        r["_rank"] = rank[key]
    kept.sort(key=lambda r: (not r["buy_intent"], r["_rank"], r["seed"]))
    for r in kept:
        del r["_rank"]

    with open(out_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["candidate_phrase", "seed", "buy_intent", "reason_kept"])
        w.writeheader()
        w.writerows(kept)

    print(
        f"{raw} raw -> {len(kept)} kept "
        f"(dropped {dropped_owned} owned, {dropped_queued_universe} already-queued/universe, "
        f"{dropped_noise} off-topic) -> {out_path}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
