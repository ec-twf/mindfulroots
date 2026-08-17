# GTM + GA4 setup for traffic-source attribution (one-time)

Needed so the `dataLayer` pushes in `mindfulroots/src/layouts/Base.astro` actually reach GA4.
Until this is done the pushes are **inert** — the code runs, values are computed, nothing is
recorded. This is done by you in the GTM and GA4 consoles; it can't be scripted from the repo.

Container: **GTM-M99Z4RML** (injected in `Base.astro`, head + noscript).

This guide assumes **nothing is configured yet** beyond the container existing and a GA4 property
being connected. If some pieces already exist, Step 0 tells you which, and you skip those.

## What the site pushes

| Push | When | Payload |
|---|---|---|
| `traffic_source` | Once per session, first pageview | `source_bucket`, `raw_referrer` |
| `affiliate_click` | Any `[data-affiliate]` click | `product`, `placement`, `variant` |
| `email_signup` | Any `[data-email-form]` submit | `source` |

`source_bucket` ∈ `operator`, `ai_assistant`, `search`, `social`, `social_inapp`, `internal`,
`referral`, `direct_unattributed`.

`raw_referrer` is the referrer **hostname only** (never a full URL), or `(none)` / `(in-app)`.

`variant` appears only on comparison-table clicks (the brand of the row clicked); absent
elsewhere, and GA4 drops absent parameters.

The bucket is also persisted to `sessionStorage.ms_src` for the session's lifetime. That is what
Step 3 reads, and it is the single most important detail in this document.

**Ordering guarantee.** Classification runs in an `is:inline` script in `<head>`, placed *above*
the GTM snippet, so `sessionStorage` is already written before GTM initialises. This matters
because the base Google Tag fires on **Initialization - All Pages** — the earliest trigger GTM
has. A deferred module would lose that race, and the entry pageview would report an empty bucket
on the session's first page. Verified in the built HTML: the classifier's `traffic_source` push
is the first entry in `dataLayer`, ahead of GTM's own `gtm.js` event.

Consequence: **every** GA4 event carries the bucket, including the landing `page_view`.

---

## Step 0 — Unblock, then audit what already exists

### 0a. Whitelist Google's tag domains on your own machine

As of this writing `www.googletagmanager.com` does **not resolve** on the dev machine — `dig`
returns nothing and Chrome reports `ERR_NAME_NOT_RESOLVED`. Something is blocking it at DNS
level: Pi-hole, NextDNS, AdGuard, a VPN filter, or an `/etc/hosts` entry.

Two consequences:

1. **GTM Preview cannot work from this machine** — not against the live site, not against
   `localhost`. Fix this before attempting Step 7 or you will debug a phantom.
2. **Your own desktop visits have never reached GA4.** GTM never loads, so no hit is sent. Your
   laptop browsing was never part of the 110 "direct" sessions. Worth knowing before you conclude
   anything about what that bucket contains.

Whitelist `www.googletagmanager.com` and `www.google-analytics.com`, then confirm:

```sh
dig +short www.googletagmanager.com          # must return an IP
curl -sS -o /dev/null -w '%{http_code}\n' \
  "https://www.googletagmanager.com/gtm.js?id=GTM-M99Z4RML"
```

Reading that status code:

| Code | Meaning |
|---|---|
| `200` | Container has a published version. Body is the container JS. |
| `503` | Container ID is valid but **has never been published**. Expected if this is a fresh container — Step 8 fixes it. |
| `400` / `404` | Wrong container ID. Stop and re-check it against GTM. |
| `000` / no resolve | Still blocked. Fix the blocker first. |

### 0b. Container state as audited 2026-08-17

Account **The Wise Fool Studio** → container **moodsupplement.net / GTM-M99Z4RML**, workspace 4.
**Workspace Changes: 14 — nothing published.**

**Tags**

| Name | Type | Trigger | Age | Status |
|---|---|---|---|---|
| `GA4` | Google Tag | Initialization - All Pages | 10 min | OK — this is the base tag Step 2 asks for |
| `GA4 - traffic_source` | GA4 Event | `CE - traffic_source` | 8 min | OK — verify its parameters per Step 6a |
| `GA4 - lead gen` | GA4 Event | `Click Element - data-placement` | 23 days | **Misfiring — see below** |

**Triggers**

| Name | Type | Detail |
|---|---|---|
| `CE - traffic_source` | Custom Event | OK |
| `Click Element - data-placement` | Just Links | CSS selector `[data-placement]` |

**User-defined variables**

| Name | Type | Verdict |
|---|---|---|
| `cjs - source bucket` | Custom JavaScript | Correct — use this one |
| `cjs - raw referrer` | Custom JavaScript | Correct — use this one |
| `source_bucket` | Data Layer Variable | **Redundant/harmful — do not reference** |
| `raw_referrer` | Data Layer Variable | **Redundant/harmful — do not reference** |
| `product`, `placement`, `variant` | Data Layer Variable | Correct |
| `data-placement` | Data Layer Variable | Leftover from the click-trigger approach |

### 0c. Three things to fix before continuing

**1. `GA4 - lead gen` is not a lead-gen tag.** Its trigger is a *Just Links* click trigger
matching CSS `[data-placement]`. `data-placement` is the attribute on affiliate CTA buttons — so
this tag fires on **affiliate clicks**, not email signups. It has been mislabelled for 23 days.

Two separate things are needed instead, and neither is this tag as configured:

- affiliate clicks → rebuild as `GA4 - affiliate_click` on the `affiliate_click` custom event
  (Step 6b). The custom event carries `product`, `placement` and `variant` as real parameters;
  the CSS click trigger carries none of them and can't distinguish a comparison row from a buy
  box. Repoint the trigger and rename the tag, or delete it and build 6b fresh.
- email signups → build `GA4 - generate_lead` on the `email_signup` custom event (Step 6c).

**2. `source_bucket` and `raw_referrer` exist twice** — once as Data Layer Variables (created
first) and once as Custom JavaScript (`cjs - …`). Open `GA4 - traffic_source` and confirm its
parameters reference **`{{cjs - source bucket}}`** and **`{{cjs - raw referrer}}`**, not the
bare-named Data Layer versions. The DLV versions return `undefined` on every pageview after the
first in a session — this is exactly the failure mode Step 3a exists to prevent. Delete the two
DLVs once nothing references them.

**3. Nothing has ever been published.** 14 workspace changes with objects dating back 23 days
means no version has gone live. Confirm in **Versions** — if the list is empty, GTM has been
serving 503 to the live site since the snippet was installed, and **zero data has ever been
collected through this container**. In that case the GA4 session figures you have came from
somewhere else (an older `gtag.js`, a different property, or a stale date range) and should be
re-checked before being trusted. There is no `gtag.js` anywhere in this repo.

### 0d. One piece of good news

Affiliate clicks have been logged **server-side** this whole time, independent of GTM state, in
Netlify Blobs (`affiliate-clicks/clicks/<date>/`). That data is intact and is what
`scripts/kpi-digest.py` reads. Whatever GTM has or hasn't been doing, the click record survived.

---

## Step 1 — Register the GA4 custom dimensions FIRST

**GA4 custom dimensions are not retroactive.** Events arriving before the dimension exists keep
the parameter in the payload but it never appears in reports. Register first, publish GTM second.

GA4 → **Admin** → *Data display* → **Custom definitions** → **Create custom dimension**. Create
five, all **Scope: Event**:

| Dimension name | Scope | Event parameter |
|---|---|---|
| Source bucket | Event | `source_bucket` |
| Raw referrer | Event | `raw_referrer` |
| CTA product | Event | `product` |
| CTA placement | Event | `placement` |
| CTA variant | Event | `variant` |

- "Dimension name" is only the report label. **Event parameter** must match exactly — lowercase,
  underscores.
- Cap is 50 event-scoped dimensions per property. Five is nothing.
- Do **not** use User scope for `source_bucket`. User scope is last-write-wins across the
  visitor's entire lifetime, so a returning visitor's original channel gets silently overwritten.

### Why not session scope?

GA4 has no session-scoped custom dimensions — only event, user, and item. That is exactly why
Step 5 attaches `source_bucket` to *every* event instead of letting one `traffic_source` event
colour the session. Without Step 5 you can count sessions per bucket but you cannot ask "how many
affiliate clicks came from `ai_assistant`", which is the entire point of the exercise.

---

## Step 2 — Confirm the base Google tag exists

GTM → **Tags**. You need one tag of type **Google Tag** with your `G-XXXXXXXXXX` measurement ID,
triggered on **Initialization - All Pages** (or All Pages). This is what sends pageviews and what
every GA4 Event tag inherits its destination from.

If it isn't there: **New** → Tag Configuration → **Google Tag** → paste the measurement ID from
GA4 (Admin → Data streams → your web stream → Measurement ID) → Triggering → **Initialization -
All Pages** → Save. Name it `Google Tag - GA4`.

---

## Step 3 — Create the variables

GTM → **Variables** → *User-Defined Variables* → **New**.

### 3a. `cjs - source bucket` (Custom JavaScript) — the critical one

Read the bucket from `sessionStorage`, **not** from the data layer.

The classifier pushes `source_bucket` into the data layer only on the session's *first* pageview.
On page 2 of the same session there is no push, so a Data Layer Variable returns `undefined` for
every event on that page — meaning every `affiliate_click` past the landing page would carry no
channel. Reading `sessionStorage` resolves correctly on every page of the session.

Type: **Custom JavaScript**. Name: `cjs - source bucket`.

```js
function() {
  try {
    return sessionStorage.getItem('ms_src') || 'unknown';
  } catch (e) {
    // private mode / storage blocked
    return 'unavailable';
  }
}
```

### 3b. `cjs - raw referrer` (Custom JavaScript)

Same reasoning.

```js
function() {
  try {
    return sessionStorage.getItem('ms_ref') || '(none)';
  } catch (e) {
    return 'unavailable';
  }
}
```

### 3c. Data Layer Variables

These are pushed as part of their own event, so they are present in the data layer when the tag
fires. Type **Data Layer Variable**, Version 2, no default value.

| Variable name | Data Layer Variable Name |
|---|---|
| `dlv - product` | `product` |
| `dlv - placement` | `placement` |
| `dlv - variant` | `variant` |
| `dlv - form source` | `source` |

---

## Step 4 — Create the triggers

GTM → **Triggers** → **New** → Trigger Configuration → **Custom Event**. Leave "Use regex
matching" unchecked on all three; fires on **All Custom Events**.

| Trigger name | Event name |
|---|---|
| `CE - traffic_source` | `traffic_source` |
| `CE - affiliate_click` | `affiliate_click` |
| `CE - email_signup` | `email_signup` |

---

## Step 5 — Attach the bucket to every event

Open the **Google Tag - GA4** tag from Step 2 → **Configuration settings** → **Shared event
parameters** → add two rows:

| Parameter name | Value |
|---|---|
| `source_bucket` | `{{cjs - source bucket}}` |
| `raw_referrer` | `{{cjs - raw referrer}}` |

Shared event parameters are appended to every GA4 event sent through that tag — pageviews,
`affiliate_click`, `email_signup`, everything. One edit, total coverage.

*Older containers:* if you have a legacy **GA4 Configuration** tag instead of a Google Tag, add
the same two rows under its **Fields to Set** / **Event Parameters**, or add them individually to
each event tag in Step 6. The `affiliate_click` tag needs them at minimum.

---

## Step 6 — Create the three event tags

All three: **Tags** → **New** → Tag Configuration → **Google Analytics: GA4 Event**. For
*Measurement ID*, select the Google Tag from Step 2 so they inherit it.

### 6a. `GA4 - traffic_source`

- Event Name: `traffic_source`
- Event Parameters:

| Parameter | Value |
|---|---|
| `source_bucket` | `{{cjs - source bucket}}` |
| `raw_referrer` | `{{cjs - raw referrer}}` |

- Triggering: `CE - traffic_source`

(Redundant with Step 5's shared parameters, but keeping them here makes the tag self-documenting
and survives someone later removing the shared params.)

### 6b. `GA4 - affiliate_click`

- Event Name: `affiliate_click`
- Event Parameters:

| Parameter | Value |
|---|---|
| `product` | `{{dlv - product}}` |
| `placement` | `{{dlv - placement}}` |
| `variant` | `{{dlv - variant}}` |

- Triggering: `CE - affiliate_click`

On non-comparison placements `variant` resolves to `undefined` and GA4 drops it — no empty rows.

### 6c. `GA4 - generate_lead`

- Event Name: **`generate_lead`** — not `email_signup`
- Event Parameters:

| Parameter | Value |
|---|---|
| `form_source` | `{{dlv - form source}}` |

- Triggering: `CE - email_signup`

Two deliberate renames here. `generate_lead` is a GA4 *recommended* event name, so GA4 wires it
into lead reporting automatically; the `dataLayer` event stays `email_signup` because that's what
the site code pushes — only the GA4-facing name changes. And the parameter is renamed to
`form_source` because "Source" is already a built-in GA4 traffic dimension and having a custom
one beside it makes reports genuinely ambiguous to read.

If you use `form_source`, add it as a sixth custom dimension in Step 1.

### 6d. Mark the key events

GA4 → **Admin** → *Data display* → **Events** → toggle **Mark as key event** for
`affiliate_click` and `generate_lead`. The toggle only appears once GA4 has seen the event at
least once, so come back after Step 7.

---

## Step 7 — Preview before publishing

Requires Step 0a done, or nothing will load.

GTM → **Preview** → enter `https://www.moodsupplement.net/` → Connect. The site code must already
be deployed (see "Deploy order" below).

Walk this exact sequence in Tag Assistant and check each assertion:

1. **Land on the homepage.** A `traffic_source` event appears in the left rail and `GA4 -
   traffic_source` is under *Tags Fired*. Click the event → **Variables** tab → `cjs - source
   bucket` has a real value, not `unknown`.
2. **Navigate to a product page.** `traffic_source` must **not** fire again — once per session by
   design. Open any event on this page and confirm `cjs - source bucket` still resolves. **If it
   returns `unknown` here, you used a Data Layer Variable instead of the Custom JavaScript
   variable in Step 3a.** Go back and fix it. This is the most common way to get this wrong.
3. **Click a comparison-table row link.** `GA4 - affiliate_click` fires with `placement:
   comparison` and `variant` equal to that row's brand.
4. **Click the sidebar buy box.** `GA4 - affiliate_click` fires with `placement: buybox` and no
   `variant`.
5. **Submit the email form.** `GA4 - generate_lead` fires with `form_source` populated.

Then GA4 → **Admin** → *DebugView* (Tag Assistant puts you in debug mode automatically) → open
the `traffic_source` event → confirm both parameters are attached with the expected values.

---

## Step 8 — Publish

GTM → **Submit** → name the version (e.g. "traffic-source attribution + CTA events") → **Publish**.

Nothing is collected until this happens. An unpublished container serves 503 to the live site.

---

## Step 9 — Tag your own devices

Visit `https://www.moodsupplement.net/?ms_op=1` once **on every browser and device you browse the
site from — laptop, phone, second browser.** It writes a permanent `localStorage` flag; every
later session from that browser classifies as `operator`.

Not optional. With Threads blocked and IG dormant, your own visits are the main remaining
confound inside `direct_unattributed`. Note the DNS blocker from Step 0a already excludes your
desktop from GA4 entirely — but your phone is probably on different DNS, so tag it.

The flag survives until you clear site data. If you clear it, re-tag.

---

## Step 10 — Build the reports

GA4 → **Explore** → **Blank** → Free-form.

**Report 1 — sessions per channel.** This is the direct answer to the original question.

- Dimensions: `Source bucket`
- Metrics: `Event count`
- Filter: `Event name` exactly matches `traffic_source`

`traffic_source` fires exactly once per session, so its event count *is* sessions per bucket.

**Report 2 — conversion per channel.** The money question.

- Dimensions: `Source bucket`, `CTA placement` (add `CTA variant` for comparison-row detail)
- Metrics: `Event count`
- Filter: `Event name` exactly matches `affiliate_click`

Cross-check totals against the server-side log in Netlify Blobs
(`affiliate-clicks/clicks/<date>/`, fields `source` and `referer`). The Blob count should be
**higher** — it survives ad blockers, DNS filters, and consent refusal. The gap between the two
is itself a useful number: it measures how much of your audience blocks analytics.

---

## Reading the buckets

| Bucket | Means |
|---|---|
| `ai_assistant` | Positively identified — referrer or `utm_source` named an AI product. |
| `direct_unattributed` | Empty referrer, ordinary UA, not you. **Inferred by elimination.** After `operator` and `social_inapp` are split out this is where LLM desktop/mobile app traffic lands — but it also catches bookmarks, typed URLs, QR scans, and email clients. |
| `operator` | You. Exclude from all analysis. |
| `social_inapp` | Empty referrer, UA names a host app (Instagram, Threads, TikTok…). |
| `internal` | Session began mid-site with an on-site referrer. Rare; a spike means sessions are expiring mid-visit. |
| `search`, `social`, `referral` | Ordinary referrer matches. |
| `unknown` / `unavailable` | The GTM variable couldn't read `sessionStorage` — private mode or blocked storage. |

There is no positive fingerprint for the ChatGPT or Claude desktop apps — they send an empty
referrer with a stock Chromium UA. `direct_unattributed` is a residual, not a detection. Its
credibility rests on Step 9 being done properly.

---

## Deploy order

The site code and the GTM container are published independently, and Preview tests the **live**
site. Correct order:

1. Whitelist the DNS-blocked domains (Step 0a) — nothing works before this
2. Commit + push the classifier, let Netlify build (one deploy)
3. GA4 custom dimensions (Step 1)
4. Build variables / triggers / tags in GTM (Steps 2–6) — safe, unpublished work
5. Preview against the live site (Step 7)
6. Publish the GTM container (Step 8)
7. Tag your devices (Step 9)

Previewing before step 2 shows no `traffic_source` event, because the code that pushes it isn't
on the live site yet.

## Gotchas

- **Register dimensions before publishing GTM.** Not retroactive.
- **Custom JavaScript variable, not Data Layer Variable, for `source_bucket`.** The data layer
  only holds it on the session's first pageview.
- **Don't create two tags with the same GA4 event name.** They double-count.
- **`raw_referrer` cardinality is fine** — hostnames only. GA4 collapses a dimension into
  `(other)` past ~500 distinct daily values; expect a dozen.
- **Consent mode**: if you add a consent banner later, GA4 tags get gated by it while the
  server-side `/go/` Blob log keeps recording. Expect the gap to widen.
- **Give it ~7 days.** At ~164 sessions/month the daily numbers are too small to read.
