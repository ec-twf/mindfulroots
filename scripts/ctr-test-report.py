#!/usr/bin/env python3
"""Measure the 2026-10-11 title/consolidation change against its frozen baseline.

Two things shipped the same day, which is the whole difficulty: 52 URLs were
retired AND 15 titles changed. Raw CTR will therefore move for reasons that have
nothing to do with the titles, so this report separates them:

  - indexation       pages Search Console shows at all. Driven by the URL cut.
                     This is the question with real sample size behind it.
  - position         per-page average. Guards against the retitles doing harm.
  - CTR in-band      clicks/impressions inside a fixed position band, which is
                     the only CTR figure the title change can claim credit for.

It also prints the sample size a CTR verdict would actually need, because at
current volume the answer is months, not weeks, and a two-week reading that
looks decisive would be misleading. See POWER below.

Deliberately deterministic: no judgment, no model in the loop. It shells out to
gsc-pull.py so authentication, the agent-query filter and the human/bot split
are the same code the weekly scoreboard uses, rather than a second
implementation that can drift.

  python3 scripts/ctr-test-report.py [--days 14] [--out data/ctr-test-<end>.md]
"""
import argparse
import collections
import csv
import json
import math
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BASELINE = os.path.join(ROOT, 'data', 'ctr-test-baseline-2026-10-11.json')

# A click rate is only comparable against the same band, because a page that
# moved from position 60 to 20 would show a "CTR win" that the title did not earn.
BANDS = (('1-10', 10.0), ('11-20', 20.0), ('21-50', 50.0), ('51+', float('inf')))


def band_of(pos):
    for name, hi in BANDS:
        if pos <= hi:
            return name
    return '51+'


def pull(days, workdir):
    """Reuse gsc-pull.py so auth + the agent filter stay single-sourced."""
    out = os.path.join(workdir, 'ctr-test-pull.csv')
    cmd = [sys.executable, os.path.join(HERE, 'gsc-pull.py'), '--days', str(days), '--out', out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        sys.exit('ctr-test-report: gsc-pull.py failed (missing GSC key?)')
    # gsc-pull prints the resolved window on its first line; keep just the dates,
    # not the temp path it wrote to.
    first = (r.stdout.splitlines() or [''])[0]
    m = re.search(r'\((\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})\)', first)
    return out, (f'{m.group(1)} to {m.group(2)}' if m else 'window unknown')


def slice_page(rows, slug):
    return [r for r in rows if r['page'].rstrip('/').endswith('/blog/' + slug)]


def agg(rows):
    imp = sum(int(r['impressions']) for r in rows)
    clk = sum(int(r['clicks']) for r in rows)
    pos = (sum(float(r['position']) * int(r['impressions']) for r in rows) / imp) if imp else None
    bands = collections.defaultdict(lambda: {'imp': 0, 'clicks': 0})
    for r in rows:
        b = bands[band_of(float(r['position']))]
        b['imp'] += int(r['impressions'])
        b['clicks'] += int(r['clicks'])
    return imp, clk, pos, bands


def needed_impressions(p0, p1):
    """Two-proportion sample size, 80% power, alpha 0.05, per arm."""
    if p0 <= 0:
        p0 = 0.001
    if p1 <= p0:
        return None
    za, zb = 1.96, 0.84
    pbar = (p0 + p1) / 2
    num = (za * math.sqrt(2 * pbar * (1 - pbar)) + zb * math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2
    return int(num / ((p1 - p0) ** 2))


def fmt(v, suffix='', dash='-'):
    return dash if v is None else f'{v}{suffix}'


def delta(now, then, suffix=''):
    if now is None or then is None:
        return '-'
    d = now - then
    return f'{d:+.2f}{suffix}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=14,
                    help='follow-up window; must start after 2026-10-11 to be clean')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()

    if not os.path.isfile(BASELINE):
        sys.exit(f'ctr-test-report: baseline missing at {BASELINE}')
    base = json.load(open(BASELINE))

    with tempfile.TemporaryDirectory() as tmp:
        path, window_line = pull(args.days, tmp)
        rows = list(csv.DictReader(open(path)))
        pages_path = path[:-4] + '-pages.csv'
        indexed = 0
        if os.path.isfile(pages_path):
            indexed = sum(1 for r in csv.DictReader(open(pages_path))
                          if '#' not in r['page'] and r['page'].startswith('/blog/'))

        bw = base['window']
        L = []
        L.append('# Title + consolidation impact report')
        L.append('')
        L.append(f"Change shipped **{base['change_shipped']}**: 52 URLs retired into 5 hubs, 15 titles rewritten.")
        L.append('')
        L.append(f"- baseline window: {bw['start']} to {bw['end']} ({bw['days']}d, fully pre-change)")
        L.append(f"- this window: {args.days}d, {window_line}")
        base_idx = base.get('indexed_blog_pages')
        idx_delta = ('' if base_idx is None
                     else f" (baseline {base_idx} at the same window length, "
                          f"{indexed - base_idx:+d})")
        L.append(f"- unique /blog/ pages Search Console reported: **{indexed}**{idx_delta}")
        L.append('')
        L.append('## Read this first')
        L.append('')
        L.append('Two changes shipped the same day, so **raw CTR movement cannot be attributed to the')
        L.append('titles**. The in-band CTR column is the only one that can. Treat the indexation count')
        L.append('as the headline number: it has real sample size, and it is what the URL cut was for.')
        L.append('')

        L.append('## Per-page')
        L.append('')
        L.append('| page | arm | imp | d imp | clicks | CTR | d CTR | avg pos | d pos |')
        L.append('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
        harm, movers = [], []
        for slug, b in base['arms'].items():
            imp, clk, pos, bands = agg(slice_page(rows, slug))
            ctr = (100 * clk / imp) if imp else None
            b_ctr = b['ctr_pct']
            b_pos = None
            if b['top_queries']:
                tq = b['top_queries']
                ti = sum(q['imp'] for q in tq)
                b_pos = sum(q['pos'] * q['imp'] for q in tq) / ti if ti else None
            L.append(f"| `{slug}` | {b['arm']} | {imp} | {imp - b['impressions']:+d} | {clk} "
                     f"| {fmt(None if ctr is None else round(ctr, 2), '%')} | {delta(ctr, b_ctr, '%')} "
                     f"| {fmt(None if pos is None else round(pos, 1))} | {delta(pos, b_pos)} |")
            if pos is not None and b_pos is not None and pos - b_pos > 10:
                harm.append((slug, b_pos, pos))
            if imp >= 200:
                movers.append((slug, b['arm'], imp, clk, ctr, b_ctr, bands, b.get('bands', {})))
        L.append('')
        L.append('d pos is positive = worse. Baseline avg pos is impression-weighted over the')
        L.append("baseline's recorded top queries, so treat it as indicative, not exact.")
        L.append('')

        L.append('## Harm check')
        L.append('')
        if harm:
            for slug, was, now in harm:
                L.append(f'- **{slug}** fell from position {was:.1f} to {now:.1f}. Investigate before extending the frame.')
        else:
            L.append('- No retitled page lost more than 10 positions. Nothing to roll back.')
        L.append('')

        L.append('## In-band CTR (the only title-attributable figure)')
        L.append('')
        if not movers:
            L.append('No page reached 200 impressions this window, so there is nothing to read yet.')
        for slug, arm, imp, clk, ctr, b_ctr, bands, bbands in movers:
            L.append(f'### `{slug}` ({arm})')
            L.append('')
            L.append('| band | imp | clicks | CTR | baseline CTR |')
            L.append('| --- | --- | --- | --- | --- |')
            for name, _ in BANDS:
                cur = bands.get(name)
                bb = bbands.get(name) or {}
                if not cur and not bb:
                    continue
                cc = (100 * cur['clicks'] / cur['imp']) if cur and cur['imp'] else None
                L.append(f"| {name} | {cur['imp'] if cur else 0} | {cur['clicks'] if cur else 0} "
                         f"| {fmt(None if cc is None else round(cc, 2), '%')} "
                         f"| {fmt(bb.get('ctr_pct'), '%')} |")
            L.append('')

        L.append('## POWER: what this report can and cannot conclude')
        L.append('')
        aff = base['arms'].get('saffron-extract-vs-affron', {})
        p0 = (aff.get('ctr_pct') or 0) / 100
        per_window = aff.get('impressions') or 0
        L.append(f'The only page with usable volume is `saffron-extract-vs-affron` at about '
                 f'{per_window} impressions per {bw["days"]} days, baseline CTR {aff.get("ctr_pct")}%.')
        L.append('To call a CTR change real rather than noise, at 80% power:')
        L.append('')
        L.append('| if true CTR became | impressions needed | days at current volume |')
        L.append('| --- | --- | --- |')
        for target in (0.02, 0.024, 0.03, 0.05):
            n = needed_impressions(p0, target)
            if not n:
                continue
            days = n / per_window * bw['days'] if per_window else 0
            L.append(f'| {target * 100:.1f}% | ~{n:,} | ~{days:.0f} |')
        L.append('')
        L.append('So a two-week reading can only detect a very large effect. Anything subtler needs')
        L.append('two to eight months. Use the early reports as a **safety check and indexation read**,')
        L.append('and leave the CTR verdict until the impression column says it is earned.')
        L.append('')
        L.append('Control arm is `quatrefolic-vs-metafolin`, deliberately not retitled. If the control')
        L.append('moves as much as the test pages, the cause is the URL cut, not the titles.')
        L.append('')

        end = window_line.split(' to ')[-1].strip() if ' to ' in window_line else 'latest'
        out = args.out or os.path.join(ROOT, 'data', f'ctr-test-{end}.md')
        with open(out, 'w') as f:
            f.write('\n'.join(L) + '\n')
        print(f'ctr-test-report: wrote {out}')
        print(f'ctr-test-report: indexed /blog/ pages = {indexed}')
        if harm:
            print(f'ctr-test-report: HARM FLAGGED on {len(harm)} page(s)')


if __name__ == '__main__':
    main()
