# Search Console API setup (one-time)

Needed so `scripts/gsc-pull.py` can pull query/page performance without any manual export. This
is a one-time setup done by you in the Google Cloud + Search Console consoles — not something I
can do on your behalf.

## 1. Confirm the site is verified in Search Console

Go to [search.google.com/search-console](https://search.google.com/search-console) and confirm
`https://www.moodsupplement.net` (or the matching domain property) is verified. If it isn't yet,
verify it first (DNS TXT record or HTML file upload) — everything below depends on this.

## 2. Create a Google Cloud project + service account

1. [console.cloud.google.com](https://console.cloud.google.com) → create a new project (any name,
   e.g. "moodsupplement-gsc").
2. **APIs & Services → Library** → search "Search Console API" → **Enable**.
3. **APIs & Services → Credentials** → **Create Credentials → Service account**.
   - Name: `gsc-reader` (or similar). No project-level role needed — access is granted inside
     Search Console instead (step 3).
4. Open the new service account → **Keys** tab → **Add key → Create new key → JSON**. This
   downloads a `.json` file — treat it like a password.

## 3. Grant the service account read access in Search Console

1. In Search Console, open the `moodsupplement.net` property → **Settings → Users and
   permissions → Add user**.
2. Enter the service account's email (looks like
   `gsc-reader@your-project.iam.gserviceaccount.com` — find it in the Cloud Console credentials
   page or inside the downloaded JSON under `client_email`).
3. Permission level: **Restricted** (read-only) is sufficient.

## 4. Store the key outside the repo

```bash
mkdir -p ~/.config/moodsupplement
mv ~/Downloads/<downloaded-key-file>.json ~/.config/moodsupplement/gsc-key.json
chmod 600 ~/.config/moodsupplement/gsc-key.json
```

Never commit this file. It lives outside the repo specifically so it can't be pushed by accident.

## 5. Install dependencies and test

```bash
pip install google-api-python-client google-auth
python3 scripts/gsc-pull.py --days 28
```

Expect a CSV at `data/gsc/<date>.csv` with `query,page,clicks,impressions,ctr,position` columns.
If it's empty, the property likely has too little traffic yet in the requested window — try a
longer `--days` value once more data has accrued.
