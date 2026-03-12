# Policy Pulse

A **health insurance lead-generation prelander**: the middle step between your Facebook ad and the client’s landing page. Visitors click your ad → land here (Policy Pulse) for a short “reality check” → click the CTA → go to the client’s page (e.g. enter ZIP, view plans, call). Full tracking so you can measure and optimize.

Built with vanilla HTML/CSS/JS and Netlify serverless functions. No framework—easy to read and deploy.

---

## What it does

1. **User clicks your Facebook ad** → Lands on **this prelander** (Policy Pulse): headline, benefits, and a main button (“Am I protected?” / “Take control now”).
2. **User clicks the button** → Your server looks up the client’s landing page URL, adds tracking info (so Meta can tie the visit to your ad), and sends the user there.
3. **User reaches the client’s landing page** (e.g. enter ZIP, view plans, or call) → Converts there. The affiliate network then notifies your server; your server tells Meta “this was a lead” so your ad stats stay accurate.

**Flow in one line:** Facebook ad → **this prelander** → **client’s landing page** → conversion, with tracking at every step.

---

## Leads and affiliate networks (context)

An **affiliate network** (e.g. MaxBounty) is a marketplace: companies list offers (“we’ll pay $X per lead” or “Y% of each sale”), and **affiliates** (you) promote those offers and get paid when someone does the action—e.g. fills out a form. A **lead** is that conversion: one person who completed the step the advertiser cares about. The network tracks clicks and conversions and pays you according to the offer’s terms.

| Network dashboard — browse offers and payouts | Earnings report — clicks, leads, conversion rate, earnings |
| --------------------------------------------- | --------------------------------------------------------- |
| ![MaxBounty dashboard](docs/screenshots/maxbounty-dashboard.png) | ![MaxBounty earnings](docs/screenshots/maxbounty-earnings.png) |

The left screenshot is the actual MaxBounty affiliate network dashboard. The right is a real earnings report from running the health insurance prelander offer (this type of funnel).

**Important:** Joining a network gives you access to offers and payouts; it does **not** run or fund your ads. You need your own **infrastructure** (landing pages, tracking, a prelander like this one) and your own **ad budget** (e.g. Facebook Ads). You drive the traffic; the network tracks conversions and pays you per lead or sale.

---

## Screenshots

What the prelander (this page) and the next step look like in practice.

**Prelander (Policy Pulse) — the page in this repo.** First three are the same page, different sections:

| Prelander: hero — headline, social proof, main button | Prelander: benefits — why it matters, urgency |
| ----------------------------------------------------- | --------------------------------------------- |
| ![Prelander hero](docs/screenshots/prelander-hero.png) | ![Prelander benefits](docs/screenshots/prelander-benefits.png) |

| Prelander: bottom — final button and disclaimers |
| ------------------------------------------------ |
| ![Prelander bottom](docs/screenshots/prelander-bottom.png) |

**Client’s landing page** (external site users go to after clicking the prelander button — e.g. enter ZIP, view plans, or call):

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
          (lower cost per lead, better return on ad spend over time)
```

**In plain terms:** User clicks your ad → lands on this prelander → clicks the main button → goes to the client’s page (e.g. enter ZIP, view plans, call) → converts. Your server records each step and tells Meta, so Meta can show your ad to more people who are likely to convert.

---

## Why Meta CAPI matters

**Conversions API (CAPI)** is Meta’s way to record what users do (page views, button clicks, leads) **from your server** instead of only from the browser. That matters because many people block or limit tracking in the browser—so browser-only tracking would miss a lot of conversions. This project sends events from your server to Meta: when someone lands on the page or clicks the button, and when they later convert, your server tells Meta. Meta uses that to see which ads actually drive leads and to show your ad to more people like those who convert. Result: better targeting and more leads for the same ad spend.

---

## Bot and fraud detection

Lead-gen pages get hit by bots and fake traffic, which wastes ad spend and messes up Meta’s data. This prelander fights that in two ways: (1) **detecting automated browsers** (e.g. FingerprintJS BotD), and (2) **checking human-like behavior**—e.g. time on page, scrolling, mouse movement. Hidden fields (“honeypots”) catch dumb bots that fill every box. If we decide a visitor is a bot or doesn’t behave like a human, we **don’t send** their visits or events to Meta, so fake traffic isn’t counted and your numbers stay useful.

---

## Server-side tracking (privacy-resilient)

Lots of people block cookies or use browsers that limit tracking. If we only tracked from the browser (pixels, cookies), we’d miss many conversions. Here, **your server** sends events to Meta’s Conversions API—using the request your server receives (IP, browser info, and Facebook IDs when available). So even when the browser blocks the pixel or cookies, we still record the action. That keeps your conversion data and ad optimization working despite blockers and privacy settings.

---

### Why this funnel is built this way

The prelander is built to get leads cheaply and convert well—minimize cost per lead and maximize return on ad spend without long forms. It’s designed to:

- **Make the button feel like a small step** — Copy uses identity, urgency, and relief (e.g. “60-second check, no obligation”) so clicking feels low-risk, not like a big commitment.
- **Keep the message consistent** — Same thread from ad → prelander → offer, so users don’t get a jarring change that kills interest.
- **Use conversions to train Meta** — Sending conversions back to Meta via CAPI lets the algorithm learn who converts and show your ad to more people like them, so traffic improves over time.
- **Filter by behavior, not long forms** — Bot checks, time on page, and scroll/click behavior act as light quality filters so the funnel stays fast but still catches real intent.

Copy uses identity, social proof, urgency, and risk reversal (no SSN, no obligation) so the opt-in feels like access or relief, not “fill out a quote form.” The goal is high intent and steady conversions at a sustainable cost per lead.

---

**Implementation details:** The prelander reads settings (pixel ID, etc.) from environment variables, shows the right headline/message variant, and on button click calls your server to get the client’s landing page URL with tracking attached. When the user converts on the client’s page, the affiliate network calls your postback URL and your server sends a “Lead” event to Meta. No API keys in the repo—everything is in env vars (see Setup).

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
| `FACEBOOK_PIXEL_ID`     | Your Meta Pixel ID (from Meta Events Manager).                                        |
| `FACEBOOK_ACCESS_TOKEN` | Token that lets your server send events to Meta (e.g. System User token).             |
| `OFFER_REDIRECT_URL`    | The affiliate/offer URL users are sent to when they click the main button.             |
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

Replace `YOUR-SITE-URL` with your deployed domain. Your server maps the network’s parameters (s3, s4, s5) to Facebook’s tracking IDs and user info so Meta can attribute the conversion to your ad.

---

## Tech stack

| Layer             | Choice                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| Frontend          | Vanilla HTML, CSS, JS (single page, no framework).                                    |
| Hosting / backend | Netlify (static site + serverless functions).                                       |
| Tracking          | Meta Pixel + Conversions API (browser and server); server helps match events when cookies are blocked. |
| Bot / quality     | FingerprintJS BotD + behavior checks (time on page, scroll, honeypot fields).        |

Code layout: `index.html`, `assets/css/main.css`, `assets/js/` (app and bot detection), and `netlify/functions/` (config, CAPI, redirect, postback, test endpoints). All config via env vars; no secrets in the repo.

---

## Testing

After deploy:

- **CAPI pipeline:** `GET https://your-site.netlify.app/.netlify/functions/test-capi`
- **Postback flow:** `GET https://your-site.netlify.app/.netlify/functions/test-postback`
- **Facebook Test Events:** `GET https://your-site.netlify.app/.netlify/functions/test-facebook-events` (events appear in Events Manager → Test Events)

---

## License

Use and adapt as needed. No warranty.
