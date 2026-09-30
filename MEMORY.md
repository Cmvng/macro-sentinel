# MEMORY — MacroSentinel

**Purpose:** durable working memory. Facts here were expensive to establish and must not be
rediscovered. Read before changing code; update whenever something here stops being true.

**Last verified:** 2026-09-30, after the depth/motion design layer (`src/design.css`).

> This file was rewritten on 2026-08-29. An earlier version described a codebase that no
> longer exists (`api/chat.js`, an admin PIN, `global._appStore`). If you find a claim here
> contradicting the source, trust the source and fix this file.

---

## Orientation

- **Live:** https://macro-sentinel-lac.vercel.app
- **Repo:** `Cmvng/macro-sentinel` — **public**. Nothing secret may reach the client bundle.
- **There is no admin page.** It was deliberately removed. Forced refresh is reserved for
  the scheduled cron; a browser POST with `force: true` gets a 403.
- **No price data anywhere.** Deliberate, not an oversight.

News → Claude → macro pressure across 47 instruments (28 forex, 7 metals/energy, 12 crypto).
React 18 + Vite 4, one serverless function, no database.

```
api/refresh.js        HTTP handler, scoring orchestration, analyze
api/feedPipeline.js   SOURCE_REGISTRY, collectNews, parseFeed, clusterArticles, rankForAssets
api/assetKeywords.js  leg-composed keywords for all 47, word-boundary matching
api/currencyModel.js  relative FX: currency scores -> derived pairs (flagged, off)
api/calendar.js       economic calendar feed adapter + parser (no model, no key needed)
src/lib/releaseModel.js  indicator rulebook, surprise -> currency -> instrument, aggregation
src/lib/releaseView.js   which releases to show / alert on (pure)
src/lib/releaseStore.js  actuals the user typed, localStorage only
```

---

## Invariants — do not break these

1. **No secret may be read in `src/`.** Never reference `import.meta.env` for anything not
   safe to publish, and never give a server secret a `VITE_` prefix — Vite inlines `VITE_*`
   into the public bundle. CI runs a canary build and fails if `sk-ant` appears in `dist/`.
2. **Privileged actions are cron-only.** `CRON_SECRET` via `Authorization: Bearer`. There is
   no `ADMIN_SECRET` and no admin UI.
3. **Model output is never trusted.** `validateSignalPayload` clamps and enum-checks
   everything. Never render a raw model value into a style property.
4. **News is data, never instruction.** Headlines go into prompts inside a `<news>` fence
   with an explicit directive not to follow instructions inside them. Keep that.
5. **Signal enum is closed:** `strong_buy | buy | neutral | sell | strong_sell`.
6. **Colour tokens are contrast-verified.** Do not lighten light-theme tokens without
   re-running the check; a test asserts they clear AA.
7. **Every prop passed by `Dashboard` must be destructured by the child.** A test enforces
   this — see the landmine below.

8. **Release interpretation stays deterministic and inspectable.** No model sits between a
   number the user typed and the bias shown for it. Rulebook changes need tests.
9. **Nothing interactive may sit inside a `role="button"` row.** The asset name is the real
   button; the row click is a mouse convenience. axe fails the build of trust otherwise.

---

## Landmines

### Vercel turns every file in `api/` into a function
`feedPipeline.js`, `assetKeywords.js`, `currencyModel.js` and `calendar.js` are helpers, not
endpoints, but each counts toward the plan's function limit (12 on Hobby). Client-only logic
therefore lives in `src/lib/` (release model), not `api/`.

### Signal colours are CSS variables, not hex
`SIGNAL_CONFIG` colours are `var(--sig-*)` so they follow the theme. Never concatenate an
alpha onto them (`color + '44'`); use the `border`/`bg` fields. Every value clears AA on its
own tint over each background in both themes; `--on-solid` is the text colour that sits on a
solid accent fill (white in light, near-black in dark — white on the dark accent was 2.16:1).

### The visual depth lives in `src/design.css`, loaded after `index.css`
It deliberately overrides surfaces (glass at >=82% opacity, elevation tokens, ambient mesh
and grid floor, pointer tilt, entrance motion). Rules that keep it safe: animate only
`transform`/`opacity`; keep data panels solid (blur only on small cards); every effect has a
`prefers-reduced-motion` / `hover: none` / `forced-colors` fallback; tilt uses CSS variables
written in a rAF (`src/lib/motion.js`, `Tilt.jsx`), never React state per mouse move.
`:focus-within` cancels tilt so a focused control never moves under the cursor. Changing a
colour token here means re-running `npm run e2e` (axe, both themes).

### Async content must not push the page down
A banner that rendered in the flow once the calendar loaded moved the whole board by ~130px
(CLS 0.26). Release alerts now **float** (`position: fixed`, dismissible, one alert on a
phone). Do not put late-arriving content above existing content; e2e asserts CLS < 0.1
(measured 0.015).

### A prop referenced but not destructured crashes the whole app

`MarketHeader` read `sourceCoverage` in two places and never destructured it, so every
render threw and the dashboard never mounted — a blank page for every visitor, because
there was no error boundary. **The build passed the entire time.**

Two guards now exist: an `ErrorBoundary`, and a test asserting every prop `Dashboard` passes
is destructured by the child. `npm run lint` (`no-undef`) catches the general case.

**A clean build says nothing about whether the app runs.** Open it in a browser.

### `Number(null)` is `0`, not `NaN`

In `currencyModel.js` a missing currency normalised to score 0 — maximally bearish — and
manufactured a confident `strong_buy` for the other side of every pair containing it. Guard
on presence, not on `isFinite` alone. Absence must read as unknown, never as an extreme.

### `generated_at` was only sent on a fresh build

The cached branch omitted it, so in the normal steady state the dashboard had no timestamp
and reported "Pending / No completed run" for data that was minutes old. Both branches send
it now, and the client falls back to `age_minutes`. If you add a response branch, send both.

### `global._macroSentinelStore` is per-instance and ephemeral

Still the largest architectural weakness. Vercel instances are ephemeral and horizontally
scaled, so the cache is not shared and every cold start recomputes. Do not reason as though
it were a shared cache. Real durability needs Upstash Redis — not yet adopted.

### `parseFeed` drops any article whose date will not parse

Deliberate: better to lose the item than stamp it with the current time and have it rank as
maximally fresh. A test pins this so nobody "fixes" it into a back-dating bug.

### `npm test` is `node --test` with no argument

It auto-discovers `tests/*.test.mjs`. Passing a directory (`node --test tests/`) fails to
resolve on Node 22.

---

## Economic releases — how it works and where it stops

The user reads Forex Factory and wants to know what a print (PPI, GDP, NFP…) *means* and
what to do about it. `ReleasesPanel` answers that in three states:

- **Coming up** — the forecast is known, so `scenarioFor` shows what each outcome would mean
  ("if above 1.9%: USD bullish → EUR/USD sell, gold sell…") *before* it happens.
- **Just released** — the user types the actual result. `interpretRelease` returns the
  surprise, a plain-English meaning, and a signal for each affected instrument.
- **Interpreted** — `aggregateBias` combines every entered result, fading with a six-hour
  half-life, and reports opposing releases as `MIXED` rather than averaging them to calm.

**The feed has no actuals.** Verified live: `nfs.faireconomy.media/ff_calendar_thisweek.json`
returns `title, country, date, impact, forecast, previous` and never `actual` (0 of 142
events). So the app **cannot** notice by itself that PPI printed hot; the user must enter the
number, and the alert banner says exactly that ("enter the actual result"). Genuinely
automatic actuals need another source: FRED (official, free key, US only, no forecasts),
Trading Economics or Finnhub. **Do not build that blind** — it needs a key and a decision.

Rules encoded and tested (`tests/release.test.mjs`):
- judged on **surprise vs forecast**, sized against a typical miss (`sigma`, see below);
  `|z| < 0.25` is in line and produces no call
- polarity: unemployment rate and jobless claims are **lower-is-better** and inverted
- rate-driven releases (inflation, labour, rates) → USD spillovers to gold (−0.8), silver
  (−0.6), crypto (−0.5/−0.6); growth releases → copper/oil (+), gold weakly (−0.4), and
  **no call on crypto** (ambiguous)
- non-USD releases touch only pairs containing that currency
- spillovers are confidence-capped (gold ≤ medium, crypto = low): the link is looser
- **"Final"/"Revised" releases are dampened ×0.6** and capped at medium — Final GDP restates
  numbers the market already saw
- no forecast → compare with previous, confidence forced low, and it says so
- speeches, statements and auctions get **no numeric verdict** (shown, not judged)

**`sigma` values are rounded estimates of a typical consensus miss, not statistically
fitted.** Same for the transmission weights. They are tunable in one place
(`INDICATORS`, `transmit`) and the UI says "a rough estimate". Treat every signal as a
short-term reaction guide, never a price forecast.

The calendar action (`get_calendar`) is dispatched **before** the API-key check, because it
never calls a model and must keep working when the provider key is missing or exhausted.
It is cached 30 minutes (the upstream is rate-limited) and serves a stale copy on failure.

## Relative FX — flagged, off by default

`MACROSENTINEL_RELATIVE_FX=1` switches forex from 28 independently-scored pairs to eight
currency scores with every pair derived from the differential (`api/currencyModel.js`).

Why: independently-scored pairs can assert things that cannot all be true at once —
`EUR/USD`, `GBP/USD` and `EUR/GBP` had no obligation to agree. Derivation makes them
transitive by construction, and expresses the case the old model could not: **two strong
legs mean the pair is uncertain**, not that one wins.

Encoded and tested:
- `pairScore = 50 + (baseScore − quoteScore) / 2`
- never more confident than the weaker leg, nor than the separation allows
  (≥30 points high, ≥15 medium, else low)
- both legs strong or both weak within 20 points ⇒ `conflicting`, confidence forced low
- a currency the model omitted ⇒ `unavailable: true`, not a derived number

Enabling it also drops a model call per rebuild and removes the 21-asset group most prone
to truncation. **The live model half is unverified** — there is no provider key in the dev
environment. Shadow-compare before making it the default.

---

## Reference values

| Thing | Value | Where |
|---|---|---|
| Scoring model | `claude-haiku-4-5-20251001` | `SCORING_MODEL` |
| Analysis model | `claude-sonnet-4-5` | `ANALYSIS_MODEL` |
| Signals TTL | 24 h | `SIGNAL_TTL` |
| News TTL | 1 h | `NEWS_TTL` |
| Analyze TTL | 2 h | `ANALYZE_TTL` |
| Analyze rate limit | 3 per 15 min per IP | `ANALYZE_LIMIT` / `ANALYZE_WINDOW` |
| Max request body | 16 KiB | `MAX_BODY_BYTES` |
| Freshness bands | Current <90 min · Delayed <24 h · Stale beyond | `MarketHeader.freshnessFor` |
| Cron | `0 20 * * *` UTC = 9pm WAT | `vercel.json` |
| localStorage | `macro-sentinel-theme`, `macrosentinel_watchlist`, `macrosentinel_analyze_cache` | |

**Environment:** `ANTHROPIC_API_KEY` (required; falls back to `VITE_ANTHROPIC_KEY` for
compatibility — remove that fallback once Vercel is migrated), `CRON_SECRET`,
`MACROSENTINEL_RELATIVE_FX`. See `.env.example`.

---

## Conventions

ES5-flavoured JavaScript (`var`, `function` expressions, indexed loops). Styling is
class-based in `src/index.css` with CSS custom properties and a `data-theme` dark mode;
components still use inline style objects for local layout. `ErrorBoundary.jsx` is the one
class component, because React requires it.

Article tagging is server-side (`getNews` attaches `affectedAssets`), so the client keeps no
duplicate keyword map. Do not reintroduce one.

The asset universe is still duplicated between `src/lib/assets.js` and the group constants
in `api/refresh.js`. Change one, change the other.

---

## Verifying

```bash
npm run lint      # no-undef catches the crash class above
npm test          # 81 tests
npm run build
npm run e2e       # real browser: needs Chromium; not in CI (49 checks)

# proves no secret reaches the bundle (CI runs this too)
VITE_ANTHROPIC_KEY=sk-ant-CANARY npm run build && grep -rc 'sk-ant' dist/   # expect 0
```

`npm run e2e` (in `e2e/`) drives the built app in Chromium against a mock API: keyboard
access, both themes, the release flow, the calendar-down state, overflow at 320–768px, and an
axe WCAG 2.1 A/AA audit, tilt and reduced-motion behaviour, and layout shift. It used to live in a scratch directory and was lost once. The
`sourceCoverage` crash above is exactly what it would have caught.

---

## Open decisions

- **Automatic actuals — FRED measured 2026-09-30, too slow to be the live path.** The public
  `fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES>` needs no key. Its `Last-Modified` header
  against the official 12:30 UTC release (one sample each, so indicative only): jobless claims
  `ICSA` ~4 min; GDP `A191RL1Q225SBEA` ~30 min; payrolls `PAYEMS` ~57 min; CPI `CPIAUCSL`
  ~67 min; `PPIFIS` ~4h 20m. Also FRED serves index **levels**, not the calendar's m/m %, so
  each release would need a conversion (and revisions can shift the last decimal). Verdict:
  fine as a slow backfill, useless for "react at the print". Real live actuals need a paid
  feed; not chosen. Manual entry remains the primary path. Don't build FRED as an alert source.
- **Push alerts — decided 2026-09-30: in-app only.** The user prefers to check the site and see
  alerts on the homepage. Alerts float over the page, the clock ticks every 30s, the calendar
  reloads every 10 min, and the tab title carries a `(n)` count for background tabs. No
  Telegram/email/push. Reopen only if the user asks for alerts while the site is closed
  (that needs a scheduler off Vercel Hobby, whose cron is daily-only).
- **Tuning the rulebook.** `sigma` and the spillover weights are estimates. Validating them
  needs historical releases with subsequent moves; nothing in the repo stores either.
- **Shared cache store.** Upstash Redis recommended; not adopted. Needs credentials.
- **Relative FX default.** Off until shadow-compared against the legacy path with a live key.
- **Legacy env fallback.** `VITE_ANTHROPIC_KEY` still works; remove once migrated.
- **Price data.** Still the most conspicuous product gap.
- **Signal accuracy tracking.** Nothing stores historical signals, so the product still
  cannot say whether it has ever been right.
