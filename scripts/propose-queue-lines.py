#!/usr/bin/env python3
"""Turn the discovery shortlist into queue-format lines. Deterministic, no LLM.

The headless optimizer Routine has only Bash/Read/Write — no WebSearch — so it
cannot do the SERP-winnability check the runbook's review gate asks for. That
makes it the wrong place to decide which candidates deserve a page. What it CAN
do safely is the mechanical half: infer the longtail TYPE, map the seed to a
cluster and product, build a slug, and drop anything that collides with an
existing post, queue line, or owned headTerm.

So this script writes PROPOSALS to data/discovery/<date>-proposed-queue-lines.txt
by default and touches no queue. Pass --append-to-queue N to promote the first N
proposals into mindfulroots/mindfulroots-topic-queue.txt — which the Routine only
does when the queue is genuinely low, since the lines are SERP-unvalidated.

Usage:
  python3 scripts/propose-queue-lines.py [--in <candidates.csv>] [--out <path>]
                                         [--append-to-queue N] [--limit N]
"""
import argparse
import csv
import datetime
import glob
import os
import re
import sys

QUEUE_PATH = "mindfulroots/mindfulroots-topic-queue.txt"
PRODUCT_TASKS_PATH = "mindfulroots/product-page-tasks.txt"
KEYWORD_MAP_PATH = "mindfulroots/src/lib/keyword-map.ts"
BLOG_DIR = "mindfulroots/src/content/blog"
DISCOVERY_GLOB = "data/discovery/*-candidates.csv"

# The 10 canonical product ids. A candidate whose seed maps here gets a PRODUCTS
# value; gap supplements (lemon balm, glycine, ...) legitimately leave it empty,
# matching the lines already in the queue.
CANONICAL_PRODUCTS = [
    "5-htp", "ashwagandha", "b-complex", "l-theanine", "magnesium-glycinate",
    "omega-3-fish-oil", "probiotic-gut-brain", "rhodiola-rosea",
    "saffron-extract", "vitamin-d3",
]

SEED_TO_CLUSTER = {
    "5-htp": "5-htp",
    "ashwagandha": "ashwagandha",
    "b complex": "b-complex",
    "l-theanine": "l-theanine",
    "magnesium glycinate": "magnesium-glycinate",
    "omega-3 fish oil": "omega-3-fish-oil",
    "probiotic": "probiotic-gut-brain",
    "rhodiola rosea": "rhodiola-rosea",
    "saffron extract": "saffron-extract",
    "vitamin d3": "vitamin-d3",
    "lemon balm": "lemon-balm",
    "glycine": "glycine",
    "valerian root": "valerian-root",
    "passionflower": "passionflower",
    "lavender silexan": "lavender-silexan",
    "l-tryptophan": "l-tryptophan",
    "taurine": "taurine",
    "holy basil": "holy-basil",
    "l-tyrosine": "l-tyrosine",
}

# The six longtail patterns the publishing experiment runs on. Order matters:
# "can you take x with y" is an interaction, not a comparison, so comparison's
# narrower markers are tested first and each phrase takes the first match.
TYPE_MARKERS = [
    ("comparison", [" vs ", " vs. ", "versus", "difference between", "compared to"]),
    # Not a bare "with ": "does lavender help with anxiety" is not an
    # interaction query. Only the take-it-alongside-something senses count.
    ("interaction", ["can you take", "take with", "taken with", "safe with",
                     " and ", "together", "interaction", "mix ", "combine",
                     "stack"]),
    ("duration", ["how long", "take to work", "kick in", "how many weeks",
                  "how many days", "long term"]),
    ("timing", ["when to take", "what time", "morning or night", "before bed",
                "empty stomach", "with food", "at night", "in the morning"]),
    ("dosage", ["dosage", "dose", "how much", "mg ", " mg", "per day"]),
    ("safety", ["side effect", "safe", "risk", "danger", "overdose", "withdraw",
                "toxicity", "liver", "kidney", "pregnan"]),
]


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)


def infer_type(phrase: str) -> str | None:
    p = f" {phrase.lower()} "
    for type_name, markers in TYPE_MARKERS:
        if any(m in p for m in markers):
            return type_name
    return None


def load_existing():
    """Slugs, keywords and headTerms already spoken for."""
    slugs, keywords = set(), set()

    for path in (QUEUE_PATH, PRODUCT_TASKS_PATH):
        if not os.path.isfile(path):
            continue
        with open(path) as f:
            for line in f:
                for part in line.split("|"):
                    part = part.strip()
                    if part.startswith("SLUG:"):
                        slugs.add(part[5:].strip().lower())
                    elif part.startswith("KEYWORD:"):
                        keywords.add(part[8:].strip().lower())

    if os.path.isdir(BLOG_DIR):
        for fname in os.listdir(BLOG_DIR):
            if fname.endswith((".md", ".mdx")):
                slugs.add(re.sub(r"\.mdx?$", "", fname).lower())

    headterms = set()
    if os.path.isfile(KEYWORD_MAP_PATH):
        text = open(KEYWORD_MAP_PATH).read()
        headterms = {m.strip().lower() for m in re.findall(r"headTerm:\s*'([^']*)'", text)}

    return slugs, keywords, headterms


def newest_candidates_file() -> str | None:
    files = sorted(glob.glob(DISCOVERY_GLOB))
    return files[-1] if files else None


def build_proposals(in_path: str, limit: int) -> list[str]:
    slugs, keywords, headterms = load_existing()
    proposals, seen_slugs = [], set()

    with open(in_path) as f:
        for row in csv.DictReader(f):
            if len(proposals) >= limit:
                break
            phrase = (row.get("candidate_phrase") or "").strip()
            seed = (row.get("seed") or "").strip()
            # The shortlist is already buy-intent-first; keep that ordering and
            # take only the buy-intent block.
            if (row.get("buy_intent") or "").lower() != "true":
                continue

            type_name = infer_type(phrase)
            if not type_name:
                continue

            cluster = SEED_TO_CLUSTER.get(seed)
            if not cluster:
                continue

            slug = slugify(phrase)
            kw = phrase.lower()
            if slug in slugs or slug in seen_slugs or kw in keywords:
                continue
            if any(ht and (ht in kw or kw in ht) for ht in headterms):
                continue
            seen_slugs.add(slug)

            products = cluster if cluster in CANONICAL_PRODUCTS else ""
            angle = (
                f"Autocomplete-discovered {type_name} longtail, SERP NOT validated "
                f"(headless discovery has no WebSearch). Confirm the SERP is winnable "
                f"before writing. Keyword: '{phrase}'."
            )
            proposals.append(
                f"CLUSTER:{cluster} | KEYWORD:{phrase} | ANGLE:{angle} | "
                f"SLUG:{slug} | PRODUCTS: {products} | TYPE:{type_name} | PRIORITY:P3"
            )

    return proposals


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="in_path", default=None)
    parser.add_argument("--out", dest="out_path", default=None)
    parser.add_argument("--limit", type=int, default=40)
    parser.add_argument("--append-to-queue", type=int, default=0,
                        help="promote the first N proposals into the topic queue")
    args = parser.parse_args()

    in_path = args.in_path or newest_candidates_file()
    if not in_path or not os.path.isfile(in_path):
        print("NO_DISCOVERY_DATA: no data/discovery/*-candidates.csv found", file=sys.stderr)
        sys.exit(1)

    proposals = build_proposals(in_path, args.limit)
    out_path = args.out_path or (
        f"data/discovery/{datetime.date.today().isoformat()}-proposed-queue-lines.txt"
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        f.write("\n".join(proposals) + ("\n" if proposals else ""))

    print(f"PROPOSED {len(proposals)} lines from {in_path} -> {out_path}")

    n = args.append_to_queue
    if n > 0 and proposals:
        promoted = proposals[:n]
        before = sum(1 for _ in open(QUEUE_PATH)) if os.path.isfile(QUEUE_PATH) else 0
        with open(QUEUE_PATH, "a") as f:
            for line in promoted:
                f.write(line + "\n")
        after = sum(1 for _ in open(QUEUE_PATH))
        print(f"QUEUE_APPENDED {len(promoted)} lines ({before} -> {after})")
        for line in promoted:
            slug = re.search(r"SLUG:([^|]+)", line).group(1).strip()
            print(f"  APPENDED {slug}")


if __name__ == "__main__":
    main()
