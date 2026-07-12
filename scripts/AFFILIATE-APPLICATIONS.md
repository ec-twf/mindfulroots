# Affiliate program applications — do this week (Phase 1.3)

Approvals take 1–6 weeks and some programs want to see the live site, so apply
now even though links stay on Amazon until Phase 2.5. Activation later is a
one-line edit per product in `mindfulroots/src/data/affiliate-links.json`
(set the program URL + flip `active`) — no content changes.

## Copy-paste answers (consistent across every application)

- Site: https://www.moodsupplement.net — evidence-aware mood/stress/sleep
  supplement reviews. 45+ pages: 10 product reviews, 8 condition guides,
  28 research articles, printable interaction cheat sheet.
- Monetization: content/reviews with affiliate links, FTC-compliant disclosure
  on every page (https://www.moodsupplement.net/disclosure/).
- Traffic: early-stage SEO site, publishing 2x/week + Pinterest launching;
  organic impressions growing week-over-week. (Don't inflate — niche programs
  approve small evidence-quality sites routinely.)
- Promotion methods: SEO content, Pinterest, email newsletter. No paid search
  bidding on brand terms, no coupon-site behavior.
- Audience: US adults researching non-prescription mood/stress/sleep support.

## Apply, in priority order

1. **iHerb Rewards/Affiliate** — https://www.iherb.com/info/affiliate — ~5–10%,
   global. On approval: put the code in `IHERB_AFFILIATE_CODE`
   (mindfulroots/src/config.ts) AND per-product URLs in affiliate-links.json.
2. **Impact marketplace** — https://impact.com (publisher signup) — hosts many
   supplement DTC brands; one account, many programs. Search after approval:
   Thorne, Ritual, Moon Juice, OLLY.
3. **ShareASale** — https://www.shareasale.com/newsignup.cfm — the other big
   supplement-brand network. Search: Pure Encapsulations resellers, Gaia Herbs,
   NOW Foods retail partners.
4. **Direct brand programs** (15–30%, 30–90d cookies) matching current picks:
   - Sports Research (current ashwagandha + omega-3 picks) — has its own
     program via Impact. High priority: two hero products already point at
     their ASINs.
   - Doctor's Best (magnesium pick) — program via commission networks.
   - Nordic Naturals (omega-3 alternative) — 15%, via ShareASale/Impact.
   - Thorne (practitioner-grade halo, high AOV) — via Impact.
5. **Amazon Associates** — already active (moodsupplemen-20). ⚠ 180-day clock:
   3 qualifying sales or the account closes. The ASIN + /go/ work just shipped
   is what fights this.

## When an approval lands

1. Add the tracked product URL to `affiliate-links.json` under `iherb` or
   `direct` for the matching slug.
2. Don't flip `active` yet — Phase 2.5 flips per-product only where the
   commission delta beats Amazon's conversion advantage, using /go/ click data
   from the KPI digest.
3. Update /disclosure/ to name the new program (FTC).

Target from the audit: ≥2 non-Amazon programs approved by 2026-10-01.
