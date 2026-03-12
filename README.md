# Policy Pulse

A **health insurance lead-generation prelander**: the middle step between your Facebook ad and the client’s landing page. Visitors click your ad → land here (Policy Pulse) for a short “reality check” → click the CTA → go to the client’s page (e.g. enter ZIP, view plans, call). Full tracking so you can measure and optimize.

Built with vanilla HTML/CSS/JS and Netlify serverless functions. No framework—easy to read and deploy.

---

## What it does

1. **User clicks your Facebook ad** → Lands on **this prelander** (Policy Pulse): headline, benefits, “Am I protected?” / “Take control now” CTA.
2. **User clicks the CTA** → Your server resolves the client’s landing page URL, attaches tracking (fbp, fbc, user agent), and redirects the user there.
3. **User reaches the client’s landing page** (e.g. enter ZIP, view plans, or call) → Converts there. The client’s/affiliate network calls your postback URL; your server sends a Lead event to Facebook Conversions API.

**Flow in one line:** Facebook ad → **this prelander** → **client’s landing page** → conversion, with tracking at every step.

---

## Leads and affiliate networks (context)

An **affiliate network** (e.g. MaxBounty) is a marketplace: companies list offers (“we’ll pay $X per lead” or “Y% of each sale”), and **affiliates** (you) promote those offers and get paid when someone does the action—e.g. fills out a form. A **lead** is that conversion: one person who completed the step the advertiser cares about. The network tracks clicks and conversions and pays you according to the offer’s terms.

| Network dashboard — browse offers and payouts | Earnings report — clicks, leads, conversion rate, earnings |
| --------------------------------------------- | --------------------------------------------------------- |
| ![MaxBounty dashboard](docs/screenshots/maxbounty-dashboard.png) | ![MaxBounty earnings](docs/screenshots/maxbounty-earnings.png) |

**Important:** Joining a network gives you access to offers and payouts; it does **not** run or fund your ads. You need your own **infrastructure** (landing pages, tracking, a prelander like this one) and your own **ad budget** (e.g. Facebook Ads). You drive the traffic; the network tracks conversions and pays you per lead or sale.

---

## Screenshots

| Hero — headline, social proof, primary CTA | Benefits — value propositions and urgency |
| ----------------------------------------- | ----------------------------------------- |
| ![Prelander hero](docs/screenshots/prelander-hero.png) | ![Prelander benefits](docs/screenshots/prelander-benefits.png) |

| Bottom CTA and disclaimers |
| ------------------------- |
| ![Prelander bottom](docs/screenshots/prelander-bottom.png) |

**Client’s landing page** (where users go after clicking the prelander CTA — e.g. enter ZIP, view plans, or call):

| |
|--|
| ![Client landing page](docs/screenshots/client-landing-page.png) |

For every submitted form (or qualified lead) on the client’s landing page, **$X** is generated from affiliate networks. Replace **$X** with your actual payout per lead; the exact amount depends on the offer and network.

---

## How the flow works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐     ┌──────────────┐
│  User      │     │  Prelander       │     │  Client's landing page   │     │  Conversion  │
│  clicks    │ ──► │  (this repo)    │ ──► │  (ZIP, view plans, call) │ ──► │  (e.g. lead) │
│  FB ad     │     │  Policy Pulse   │     │  external               │     │              │
└─────────────┘     └──────────────────┘     └─────────────────────────┘     └──────────────┘
        ▲                    │                          │                      │
        │                    ▼                          │                      │
        │            • Page view + CTA                  │                      │
        │              sent to Facebook                 │                      │
        │            • Bot checks, angle-based copy     │                      │
        │            • CTA → server gets client landing-page URL │                      │
        │              and appends fbp/fbc for tracking │                      │
        │                                              │                      │
        │                                              ▼                      ▼
        │            ┌─────────────────────────────────────────────────────────────┐
        │            │  Client's/affiliate network calls your postback URL            │
        │            │  → Netlify receives postback                                 │
        │            │  → Server sends converted Lead to Facebook CAPI               │
        │            │  → CAPI feeds Meta's algorithm (conversion signal)            │
        │            └─────────────────────────────────────────────────────────────┘
        │                                              │
        └──────────────────────────────────────────────┘
          Algorithm learns who converts → delivers ad to more users likely to convert
          (lower CPL, better ROAS over time)
```

**In plain terms:** Click Facebook ad → land on **this prelander** (Policy Pulse) → click CTA → go to **client’s landing page** (e.g. enter ZIP, view plans, call) → convert. Your server tracks each step and sends conversions to Meta so the algorithm can improve who sees the ad.

---

## Why Meta CAPI matters

**Conversions API (CAPI)** is Meta’s server-side way to record what users do—page views, button clicks, leads—so your ads can be measured and improved even when the browser blocks or limits normal tracking. This project sends those events from your own server to Meta: when someone lands on the page or clicks the CTA, and when they later convert, your backend tells Meta. Meta uses that information to see which ads actually drive leads and to learn what kind of people convert, so over time it shows your ad to more people who are likely to take action. The result is better targeting, fewer wasted impressions, and more leads for the same spend.

---

## Bot and fraud detection

Lead-gen pages attract bots and fake traffic, which wastes ad spend and skews Meta's algorithm. This prelander reduces that by (1) **detecting automated browsers** (FingerprintJS BotD) and (2) **checking behavior**: e.g. time on page, scroll/pointer movement, and motion patterns. Hidden "honeypot" fields catch simple bots that fill every field. If a visitor is classified as a bot or fails the behavior checks, we **don't send** their page views or events to Meta—so fake traffic doesn't get counted as conversions and the campaign data stays cleaner for optimization.

---

## Server-side tracking (privacy-resilient)

Many users block cookies or use browsers (e.g. Safari, Firefox) that limit tracking. If we relied only on the browser (pixels, cookies), we'd lose a lot of conversion data. Here, **events are sent from our server** to Meta's Conversions API: the server receives the request (with IP, user agent, and fbp/fbc when available), then forwards the event to Meta. So even when the browser blocks the pixel or cookies, we still record the action server-side. That keeps attribution and optimization working despite ad blockers and privacy restrictions.

---

### Why this funnel is built this way

The prelander is built for **conversion-efficient lead gen**: minimize cost per lead (CPL) and maximize return on ad spend (ROAS) while keeping lead quality high. It’s not built to slow traffic with heavy forms; it’s built to:

- **Create an emotional path to the CTA** — Identity-based tension (“Smart families act first”), urgency, and relief (e.g. “60-second check, no obligation”) so the click feels like a small, low-risk step rather than a big commitment.
- **Keep message-match tight** — The same psychological thread runs from ad → prelander → offer, so users don’t get a jarring shift that kills intent.
- **Let every dollar do two jobs** — Generate the lead and **train the platform**. By sending conversions back to Meta via CAPI, the algorithm learns which users convert and can optimize delivery toward similar people, so you get better traffic over time without manually chasing volume.
- **Filter by behavior, not by long forms** — Bot detection, dwell time, and scroll/click behavior act as light quality filters so the funnel stays fast but still surfaces intent. The prelander doesn’t over-qualify; it routes and segments.

Copy uses **identity-relevant tension**, **social proof**, **scarcity/urgency**, and **risk reversal** (no SSN, no obligation) so the opt-in feels like access or relief, not “submit a quote request.” The result is a funnel that aims for high intent and conversion velocity at a sustainable CPL.

---

**Implementation details:** The prelander loads config (pixel ID, etc.) from environment variables, renders angle-based copy, and on CTA click calls the server to get the client’s landing page URL with tracking (fbp, fbc, user agent). The server resolves the redirect and appends those params; when the user converts on the client’s page, the postback fires and your server sends a Lead event to Facebook CAPI. No secrets or API keys are stored in the repo; everything is driven by environment variables (see Setup).

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
