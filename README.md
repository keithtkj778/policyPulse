# Policy Pulse

A **health insurance lead-generation prelander**: a single landing page that qualifies visitors and sends them to an offer, with full tracking so advertisers can measure and optimize campaigns.

Built with vanilla HTML/CSS/JS and Netlify serverless functions. No framework—easy to read and deploy.

---

## What it does

1. **User clicks an ad** → Lands on a short “reality check” page about health coverage.
2. **User clicks the CTA** (“Am I protected?”, “Take control now”) → The server resolves the final offer URL, attaches tracking (fbp, fbc, user agent), and redirects the user.
3. **User converts** (e.g. completes a quote) → The offer network calls the postback URL; the server sends a Lead event to Facebook Conversions API for attribution and optimization.

End-to-end: **ad → prelander → offer → conversion**, with tracking at every step.

---

## Screenshots

| Hero — headline, social proof, primary CTA | Benefits — value propositions and urgency |
| ----------------------------------------- | ----------------------------------------- |
| ![Prelander hero](docs/screenshots/prelander-hero.png) | ![Prelander benefits](docs/screenshots/prelander-benefits.png) |

| Bottom CTA and disclaimers |
| ------------------------- |
| ![Prelander bottom](docs/screenshots/prelander-bottom.png) |

---

## How the flow works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  User sees  │     │  Prelander       │     │  Offer / quote   │     │  Conversion  │
│  your ad    │ ──► │  (this repo)     │ ──► │  (external)     │ ──► │  (e.g. lead) │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────────────┘
                            │                          │                      │
                            ▼                          │                      │
                    • Page view + CTA                  │                      │
                      sent to Facebook                 │                      │
                    • Bot checks, angle-based copy     │                      │
                    • Button → server gets final URL   │                      │
                      and adds fbp/fbc for tracking    │                      │
                                                       │                      │
                                                       └──────────────────────┘
                                                         Affiliate network
                                                         calls your postback URL
                                                         → you send “Lead” to Facebook
```

- **Prelander:** Single page. Loads config (pixel ID, etc.) from environment variables, renders angle-based copy, and on CTA click calls the server to get the offer URL with tracking params.
- **Server (Netlify functions):** Resolves the offer redirect and attaches tracking (fbp, fbc, user agent). On conversion callback from the network, sends a Lead event to Facebook Conversions API.

No secrets or API keys are stored in the repo; everything is driven by environment variables (see Setup).

---

## Setup

### 1. Get the code

```bash
git clone https://github.com/peakvantagelabs-png/policyPulse.git
cd policyPulse
npm install
```

### 2. Environment variables

In **Netlify** (Site settings → Environment variables), add:

| Variable                | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `FACEBOOK_PIXEL_ID`     | Meta Pixel ID (from Events Manager).                                                  |
| `FACEBOOK_ACCESS_TOKEN` | Access token for the Conversions API (e.g. System User token with `ads_management`).  |
| `OFFER_REDIRECT_URL`    | Full affiliate/offer URL users are sent to when they click the CTA.                   |
| `SITE_URL`              | Site base URL (e.g. `https://your-site.netlify.app`). Optional but recommended.       |
| `OFFER_FALLBACK_URL`    | (Optional) URL to use if the redirect fails.                                          |

For local development, copy `.env.example` to `.env` and set the same values. Do not commit `.env`.

### 3. Deploy

```bash
npx netlify deploy --prod
```

Set or confirm the variables in the Netlify dashboard after deploy.

### 4. Affiliate / offer network (e.g. MaxBounty)

In the campaign’s callback/postback settings, set the callback URL to:

`https://YOUR-SITE-URL/.netlify/functions/postback?s1=#S1#&s2=#S2#&s3=#S3#&s4=#S4#&s5=#S5#&OFFID=#OFFID#&IP=#IP#&RATE=#RATE#&SALE=#SALE#&CONVERSION_ID=#CONVERSION_ID#`

Replace `YOUR-SITE-URL` with your deployed domain. The server maps `s3` → fbp, `s4` → fbc, `s5` → user agent so Facebook can attribute the conversion.

---

## Tech stack

| Layer             | Choice                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| Frontend          | Vanilla HTML, CSS, JS (single page, no framework).                                    |
| Hosting / backend | Netlify (static site + serverless functions).                                       |
| Tracking          | Meta Pixel + Conversions API; client- and server-side Parameter Builder for fbp/fbc. |
| Bot / quality     | FingerprintJS BotD + behavioral checks (dwell time, scroll, honeypot fields).        |

Code layout: `index.html`, `assets/css/main.css`, `assets/js/` (app and bot detection), and `netlify/functions/` (config, CAPI, redirect, postback, test endpoints). Config is env-driven; no secrets in the repo.

---

## Testing

After deploy:

- **CAPI pipeline:** `GET https://your-site.netlify.app/.netlify/functions/test-capi`
- **Postback flow:** `GET https://your-site.netlify.app/.netlify/functions/test-postback`
- **Facebook Test Events:** `GET https://your-site.netlify.app/.netlify/functions/test-facebook-events` (events appear in Events Manager → Test Events)

---

## License

Use and adapt as needed. No warranty.
