# MEMORY — MacroSentinel

**Purpose:** durable working memory. Facts here were expensive to establish and must not be
rediscovered. Read before changing code; update whenever something here stops being true.

**Last verified:** 2026-08-29, against `main` after the reconciliation and relative-FX work.

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

---

## Landmines

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
npm test          # 44 tests
npm run build

# proves no secret reaches the bundle (CI runs this too)
VITE_ANTHROPIC_KEY=sk-ant-CANARY npm run build && grep -rc 'sk-ant' dist/   # expect 0
```

Browser-level checks (freshness states, keyboard, sorting, both themes) were run with
Playwright against a mocked API from the session scratchpad. Worth committing as a real e2e
suite if this grows — the crash above is exactly what it would have caught.

---

## Open decisions

- **Shared cache store.** Upstash Redis recommended; not adopted. Needs credentials.
- **Relative FX default.** Off until shadow-compared against the legacy path with a live key.
- **Legacy env fallback.** `VITE_ANTHROPIC_KEY` still works; remove once migrated.
- **Price data.** Still the most conspicuous product gap.
- **Signal accuracy tracking.** Nothing stores historical signals, so the product still
  cannot say whether it has ever been right.
