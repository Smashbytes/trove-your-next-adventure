# TROVE — Explainer / Showcase Video Brief (for Claude Design)

**Purpose:** Produce a 60–90s animated explainer + product-showcase video of TROVE, used as the
walkthrough for our Paystack activation review (and reusable for marketing). The reviewer needs to
clearly see (a) how a customer interacts with the product and (b) how money is handled (escrow +
buyer protection). This brief is the single source of truth — **follow it, don't improvise the brand.**

> ⚠️ **No lazy work. Battle-test every generation against ground truth.** You are connected to this
> git repo and can drive a browser (Playwright). Before you design a single frame, (1) read the
> real brand tokens and screens listed below, and (2) open the live demo and look at the actual UI.
> Every colour, font, and screen you render must match what's really there. If a generated frame
> doesn't match the real product, regenerate it.

---

## 1. Ground truth — inspect these BEFORE designing

### Demo environment (drive it with a browser / Playwright)
- **Guest app (customer-facing) demo:** https://trove-your-next-adventure.pages.dev
- Walk these real routes and screenshot them for reference and consistency:
  - `/` — home / discover feed
  - `/search` — browse + filters + map
  - `/spot/:id` — experience ("Spot") detail (gallery, host, slots, price, map)
  - `/checkout/:id` — checkout → **"Secure checkout by Paystack"** redirect panel (paid + live)
  - `/booking/:id` — booking confirmation
  - `/tickets` — QR ticket wallet
  - `/host/:slug` — host/Spot public profile
- Capture real screens at **390×844 (mobile, primary)**. The product is mobile-first; the desktop/web
  layout is a responsive `lg+` variant.

### Brand source files (read these in the repo)
- **Design tokens / theme:** `src/styles.css` (the `@theme` + `:root` block — authoritative colours,
  radii, gradients, shadows, fonts).
- **Logo:** `src/assets/trove-logo.png` — a hot-magenta gradient diamond/gem with a downward arrow
  (the "trove" mark). Use the real asset; do not redraw it.
- **Real UI to mirror:** the route files in `src/routes/` (`index.tsx`, `search.tsx`, `spot.$id.tsx`,
  `checkout.$id.tsx`, `booking.$id.tsx`, `tickets.tsx`, `host.$slug.tsx`) and components in
  `src/components/`.
- **Other apps (for the vendor + admin beats):** the host/vendor dashboard lives in the `trove-engine`
  repo; the admin platform in `trove-hq`. If those repos are available to you, mirror their real
  screens; if not, build faithful mockups using the SAME brand tokens below.

---

## 2. Brand system — EXACT tokens (from `src/styles.css`)

TROVE is **dark, premium, nightlife-energy** — pitch black with hot-magenta + electric-cyan neon,
glassmorphism, and soft glow. NOT soft/pastel/corporate. Think "after-dark experiences marketplace."

| Role | oklch (authoritative) | ~hex (approx for tools that need it) | Use |
|---|---|---|---|
| Background (base) | `oklch(0.04 0.003 300)` / literal `#0a0a0a` | **#0A0A0A** | App background, video canvas base |
| Surface | `oklch(0.09 0.006 300)` | ~#131217 | Cards/sheets |
| Surface elevated | `oklch(0.13 0.01 300)` | ~#1B1A21 | Raised cards |
| **Primary (hot magenta)** | `oklch(0.66 0.29 358)` | **~#FF1E8C** | CTAs, highlights, logo, accents |
| **Accent (electric cyan)** | `oklch(0.78 0.16 195)` | **~#2BE0E6** | Secondary pop, ticks, data |
| Foreground (text) | `oklch(0.98 0.003 300)` | ~#FAFAFA | Body text on dark |
| Muted text | `oklch(0.65 0.012 300)` | ~#9C99A3 | Secondary text |
| Success | `oklch(0.72 0.18 155)` | ~#1FCB7A | "Paid out", confirmations |
| Warning | `oklch(0.82 0.17 80)` | ~#F5B72E | Holds / pending |

**Gradients & effects (use literally):**
- Brand gradient (magenta → coral, NO purple): `linear-gradient(135deg, oklch(0.7 0.29 8) 0%,
  oklch(0.65 0.29 358) 55%, oklch(0.6 0.26 340) 100%)` (~`#FF4D63 → #FF1E8C → #F0379E`).
- Radial glow ambiance: magenta glow top-left, cyan glow bottom-right (see `--gradient-radial`).
- Glow shadow on hero elements: `0 10px 40px -12px rgba(magenta, .55)`.
- **Glassmorphism:** translucent dark panels, `backdrop-blur(20px) saturate(180%)`, 1px hairline
  white border at 6–8% opacity (`.glass` / `.glass-strong`).
- Corner radius: generous — base `1rem`, cards up to `1.5–2rem`. Everything rounded, soft.

**Typography:**
- **Display / headings:** `Archivo Black` (heavy, tight letter-spacing −0.02em). Big, confident.
- **Body / UI:** `Poppins` (400 regular, 500/600 for emphasis).
- Gradient text (`.text-gradient`) on key headline words using the brand gradient.

**Money & locale:** currency is **ZAR**, shown as `R` (e.g. `R450`, `R1 200`). **South Africa only** —
use Cape Town, Johannesburg, Durban, Pretoria, Gqeberha. **NEVER** show Lagos/Abuja/Naira/₦ or any
non-SA city. Diverse South African people and real SA settings (rooftop bars, markets, live music,
outdoor adventures, Table Mountain/city skylines as accents).

---

## 3. Voice & tone
Confident, warm, South African English. Short punchy sentences. Tagline: **"Discover. Book.
Experience."** Energetic but every text card legible for 2.5s+.

---

## 4. Storyboard (60–90s) — the customer journey is the spine; trust + vendor are the payoff

Render UI mockups floating on the **#0A0A0A** canvas with magenta/cyan radial glow, glass panels,
and smooth spring transitions. Phone frames for app screens.

1. **HOOK (0–6s).** Black screen, a single magenta glow ignites; phone lights up. On-screen:
   "Joburg this weekend — what's actually worth it?" Logo mark animates in (diamond + arrow). VO:
   *"Finding something to do shouldn't be a guessing game."*
2. **DISCOVER (6–18s).** Real `/` + `/search` UI animates in: category chips (Food, Nightlife,
   Tours, Events, Classes), experience cards with photos, ratings, `R`-prices, SA locations, map
   pins on SA cities. VO: *"TROVE brings South Africa's best experiences into one place."*
3. **EXPERIENCE DETAIL (18–28s).** Tap a card → `/spot/:id`: gallery, host name, date/time slots,
   price tiers, map. VO: *"See exactly what you're booking — who's hosting, when, and how much."*
4. **BOOK & PAY (28–40s).** Select slot + party size → `/checkout/:id` showing the real **"Secure
   checkout by Paystack"** panel → success → an animated **QR ticket** (cyan/magenta) drops into
   `/tickets`. VO: *"Book and pay securely in seconds. Your ticket arrives instantly."* (Stress:
   secure, instant, real ticket.)
5. **TRUST / ESCROW (40–52s) — critical for the reviewer.** Clean animated diagram on glass:
   **Customer → [TROVE secure escrow] → Vendor**, one-directional arrows only. A small clock badge:
   "Released to the vendor only AFTER your experience." VO: *"Your money is held safely until your
   experience actually happens — so you're always protected."*
6. **FOR VENDORS / SPOTS (52–66s).** Switch to the Engine dashboard (trove-engine): a host creates
   a listing, sets price + capacity, watches bookings roll in, sees earnings, a **"Verified"** badge,
   and **"Paid out to your bank."** VO: *"For hosts, TROVE handles listings, bookings, payments and
   payouts — so you just show up and deliver."*
7. **TRUST & SUPPORT (66–78s).** Quick montage with glass chips: "Verified hosts • Secure payments •
   Easy refunds." VO: *"Verified hosts, secure payments, and real support if plans change."*
8. **CLOSE (78–90s).** Logo + gradient tagline **"Discover. Book. Experience."** + URL
   `trove-your-next-adventure.pages.dev` + "South Africa's experiences marketplace." CTA: "Start
   exploring." End on a magenta glow pulse.

**Must-include for compliance:** the browse→book→pay(ZAR)→ticket flow; the escrow/buyer-protection
beat (Scene 5); the vendor verification + payout-to-bank beat (Scene 6); keep the money diagram
**one-directional — no wallets, no peer-to-peer transfers.**

---

## 5. Deliverables from you (Claude Design)
1. **Storyboard table:** Scene | Duration | On-screen copy | VO line | Motion/transition notes.
2. **Shot list** of UI screens to mock, each mapped to its real route/file above.
3. **The rendered video** (16:9 primary) + a note on a **9:16 vertical 30s cutdown** (keep Scenes
   1, 2, 4, 5, 8).
4. **Brand-conformance check:** confirm the palette (#0A0A0A base, #FF1E8C magenta, #2BE0E6 cyan),
   fonts (Archivo Black + Poppins), logo asset, and ZAR/SA-only rules were applied. List any frame
   you regenerated to match ground truth.

## 6. Battle-test / QA checklist (do not skip)
- [ ] Opened the live demo and screenshotted the real screens; mockups match them.
- [ ] Colours sampled match `src/styles.css` tokens (not invented).
- [ ] Archivo Black on headings, Poppins on body — no substitute fonts.
- [ ] Real logo asset used (not a redraw).
- [ ] All prices in `R` / ZAR; only SA cities; zero Nigerian references.
- [ ] Money diagram is one-directional; no wallet/peer-transfer implied.
- [ ] Escrow beat (Scene 5) and vendor-verification beat (Scene 6) are present and clear.
- [ ] Text legible ≥2.5s; transitions smooth; dark-neon mood consistent throughout.
