# MEMORY — MacroSentinel

**Purpose:** durable working memory for this repository. Facts here were expensive to
establish and must not be rediscovered from scratch each session. Read this before
changing code. Update it whenever something recorded here stops being true.

**Last verified:** 2026-08-28 · against commit `1034d07` on `main`

---

## Orientation

MacroSentinel is a news→Claude→sentiment dashboard covering 47 instruments (28 forex,
7 metals/energy, 12 crypto). React 18 + Vite 4 frontend, two Vercel serverless functions,
no database. Full description in `PROJECT.md`. There is **no price data anywhere in the
product** — this surprises people, and it is deliberate, not an oversight in the code.

Single source of truth for the asset universe is `src/lib/assets.js` on the client and the
group constants in `api/refresh.js` on the server. **These two lists are duplicated and
must be kept in sync manually** — 7 + 21 + 7 + 12 = 47 on both sides.

---

## Invariants — do not break these

1. **The browser must never hold an Anthropic key.** All Claude access goes through
   `api/refresh.js`. `claudeEngine.js` is only an HTTP wrapper; if you find yourself adding
   an `x-api-key` header in `src/`, stop.
2. **`api/refresh.js` dispatches on `req.body.action`** — `get`, `get_news`, `analyze`,
   `check_breaking`. Adding a fifth action means adding a branch before the final
   `return res.status(400)`.
3. **The scoring system prompt demands raw JSON.** If you edit `SYSTEM_PROMPT`, keep the
   "no markdown, no backticks" instruction and keep `parseJSON()`'s fence-stripping
   fallback. The model does still occasionally fence its output.
4. **Signal values are a closed enum:** `strong_buy | buy | neutral | sell | strong_sell`.
   They are referenced in the system prompt, in `SIGNAL_CONFIG` (`src/lib/assets.js`) and
   in `fallback()`. Adding a value means touching all three.
5. **Never widen `api/chat.js`.** It should be deleted, not extended — see below.

---

## Landmines

These are the things that have already bitten, or will.

### `VITE_` prefix leaks secrets into the public bundle

Vite inlines any build-time env var prefixed `VITE_` into client JavaScript. Confirmed
empirically: a canary build produced `var Zu="sk-ant-api03-CANARY-…"` in
`dist/assets/index-*.js`, and the admin PIN as `var ap="7371"`.

Both `VITE_ANTHROPIC_KEY` (read at `src/App.jsx:5`) and `VITE_ADMIN_PIN` (read at
`src/components/AdminPage.jsx:3`) are affected. The server needs the same variable name at
runtime, so it is necessarily present at build time — the leak is the default outcome of
deploying as-is.

**Key detail that makes the fix safe:** the leaked `ENV_KEY` is entirely unused. It is
passed as an `apiKey` prop into `Dashboard` and `AdminPage`, but `AdminPage()` declares no
props at all, and `scoreAssets()` / `analyzeAsset()` accept an `apiKey` parameter their
bodies never touch. Removing it is a pure deletion.

**Rule going forward:** never name a server-side secret with a `VITE_` prefix, and never
reference `import.meta.env` for anything that is not safe to publish.

### `global._appStore` is per-instance and ephemeral

`api/refresh.js` keeps signals, news and the analyze cache on the Node global. Vercel
serverless instances are ephemeral and horizontally scaled, so:

- the cache is **not shared** between concurrent instances — two users can see different signals;
- every cold start recomputes everything;
- the daily cron warms one container that will probably never serve a request.

Any reasoning of the form "the cron refreshes the cache each night so users get fresh
signals" is **wrong**. Real caching requires an external store (Vercel KV / Redis).

`seenHeadlines` inside that store is never pruned and grows unbounded within an instance's
lifetime.

### `check_breaking` starves the 24-hour full rebuild

The single sharpest bug in the repo. `handleBreakingCheck()` sets
`globalStore.signalsTime = now` (`api/refresh.js:210`) after merging a **partial** re-score
of a handful of assets. The `get` branch gates the full 47-asset rebuild on
`(now - globalStore.signalsTime) < SIGNAL_TTL` (`:88`).

So every breaking-news hit resets the 24-hour clock without doing 24-hour work. Simulated
over 72 hours with an hourly breaking hit: **zero full rebuilds.** Most instruments can sit
on stale scores forever while the API reports the set as fresh. Only a cold start or a
manual `force: true` escapes it.

The fix is to track partial-update time in a separate field. Do not "fix" it by shortening
`SIGNAL_TTL` — that treats the symptom.

Related: the nightly cron issues a **bodiless GET**, so `body` is `{}`, `force` is false,
and it hits the same TTL gate. Even without the starvation bug it only ever warms one
ephemeral container.

### A transient API error poisons the analyze cache for two hours

`handleAnalyze()` never checks `r.ok` (`api/refresh.js:125-146`). On a 429 or an overload
the response body has no `content` array, so `text` stays `''` — and that empty string is
written into `globalStore.analyzeCache` with a **fresh timestamp**. The client then caches
its own `'Analysis unavailable.'` in localStorage for the same two hours.

One rate-limit blip therefore blanks an instrument's analysis for two hours on both tiers,
with no retry. Verified by replaying error bodies through the exact handler logic.

### A cold instance can fire a false BREAKING alert

`seenHeadlines` starts empty, so on the first `check_breaking` after a cold start *every*
headline counts as new. Any that matches one of the 34 keywords triggers a breaking alert
for news that may be a day old.

### Failures are silent by design

`scoreGroup()` catches its own errors and returns `fallback()` — all-neutral, score 50,
confidence low. `mergeResults()` then blends that in indistinguishably. **A total Claude
outage renders as a calm neutral market.** When debugging "why is everything neutral",
suspect a failed API call before suspecting the model's judgement.

### `NaN` dates silently delete articles

`getRecencyWeight()` (`src/lib/newsFetcher.js`) computes age via `new Date(publishedAt)`.
A missing or unparseable `pubDate` gives `NaN`; every `<` comparison against `NaN` is
false; the function falls through to `return 0`; and `fetchAllNews()` filters out anything
weighted 0. Verified: `'not-a-date'`, `''` and `undefined` all yield 0.

So a feed that changes its date format does not error — it just quietly stops contributing.

### `risk_to_outlook` is bought and thrown away

The scoring schema requests `risk_to_outlook` for all 47 assets on every refresh, and
nothing under `src/` ever reads it — confirmed by grep. `primary_driver`,
`supporting_factors` and `conflicting` *are* rendered by `SignalTable`; this one field is
pure token waste. Either render it or remove it from `SYSTEM_PROMPT` and `fallback()`.

### Keyword matching has no word boundaries

Both `getAffectedAssets()` and the `handleBreakingCheck()` attribution loop use bare
`indexOf`. Several keywords are common English substrings — gold's list contains `'war'`.
Run against the real `ASSET_IMPACT_MAP`:

| Headline | Tagged |
|---|---|
| `ECB official downplays euro strength` | 7 EUR pairs ✅ |
| `Powell warns markets on rate path` | **XAU/USD only** — `'war'` ⊂ "warns" |
| `Toward a new trade framework, officials say` | **XAU/USD** — `'war'` ⊂ "Toward" |
| `Fed warns of persistent inflation risk` | 15 assets, gold among them |

So Fed headlines get attributed to gold. Fix with word-boundary matching, not by deleting
keywords.

### A failed breaking re-score destroys good signals

`scoreGroup()` swallows every error and returns `fallback()`. `handleBreakingCheck()` cannot
distinguish that from a real result — it writes the neutral placeholders directly into
`globalStore.signals.assets` and sets `breaking: true` on each.

One failed API call during a breaking check therefore **downgrades real signals to neutral
and badges them as breaking news.** And nothing ever clears `breaking: true`; only a full
`buildAllSignals()` rebuilds the map, which the starvation bug above can prevent forever.

Related: the headline that fires the alert usually never reaches the re-scoring prompt,
because `buildBrief()` applies the positional slices described above. Breaking detection
scans all articles; the re-score sees only Reuters Business and FXStreet.

### The two keyword maps are not the same map

- `ASSET_IMPACT_MAP` — `src/lib/newsFetcher.js`, **47 entries**, client-side, tags articles
  for display and for the analyze context.
- `ASSET_KEYWORDS` — `api/refresh.js`, **16 entries**, server-side, used only for
  breaking-news attribution; falls back to the seven forex majors when nothing matches.

31 instruments can never be individually attributed to a breaking headline. Do not assume
editing one map affects the other.

### Thirteen of the fifteen RSS feeds never reach the scoring model

The biggest constraint on signal quality, and completely invisible from the UI.

`buildBrief()` takes `hi.slice(0, 6)` (trust ≥ 80) and `lo.slice(0, 4)`. Three facts
compound:

1. **`getTrust()` awards ≥ 80 to Reuters (95) and ForexLive (80) only.** FXStreet and Kitco
   are 78, CoinDesk 75, CoinTelegraph 72, MarketWatch 70, Google News 75.
2. **Articles are concatenated in source order** and each feed contributes up to 15 items,
   so the slices take the first items *positionally*, not the best ones.
3. **`buildBrief` never filters by asset** — `assets` is used only for the `Score: …` line,
   so all four groups receive an identical headline block.

Simulating the real ordering with healthy feeds: the ten headlines reaching the model are
**six from Reuters Business and four from FXStreet**. Reuters Top News, ForexLive, Kitco,
CoinDesk, CoinTelegraph, MarketWatch and all seven Google News topic queries contribute
**nothing** to any signal.

So Bitcoin, gold and oil are scored from forex-desk wire copy. The feeds still populate the
news feed component, which is exactly why nobody notices: the UI shows crypto headlines
next to crypto signals that were never computed from them.

**Adding more RSS sources does not help.** It changes which ten headlines win, and usually
not even that, since the winners are positional. Fixing signal quality means filtering the
brief per asset group and selecting by recency and relevance instead of array order.

### Anthropic errors look like successful empty responses

Neither `scoreGroup()` nor `handleAnalyze()` checks `r.ok`, inspects the body for an
`error` field, or looks at `stop_reason`. On a 401, 429 or 5xx the body has no `content`
array, `text` stays `''`, `parseJSON('')` returns `null`, and the group degrades to
`fallback()` — cached for 24 hours.

**An expired or wrong API key therefore renders as a calm, plausible, all-neutral market.**
When signals look suspiciously flat, check the key and the API response before questioning
the model.

The same blindness means a response truncated by `max_tokens` is indistinguishable from a
malformed one. The 21-asset `FOREX_MINORS_AND_CROSSES` group shares the same
`max_tokens: 3000` as the 7-asset groups and is the likeliest to truncate.

### `mergeResults` can blank the header even when scoring worked

It assigns `market_summary` / `dominant_theme` only while they are still empty, and
`Promise.allSettled` preserves input order — so they always come from FOREX_MAJORS. Since
`fallback()` also populates those fields ("Analysis pending."), one failed majors call
replaces the entire dashboard header while three successful groups' summaries are discarded.

---

## Dead code — confirmed unreachable

Verified by grep, not assumed. Safe to delete; kept listed here so nobody "fixes" them.

| Item | Location | Status |
|---|---|---|
| `api/chat.js` | whole file | Unreferenced by any frontend code. Also an unauthenticated open proxy to the Anthropic API. **Delete it.** |
| `ApiKeySetup.jsx` | whole file, 131 lines | Never imported |
| `scoreAssetsForce` | `claudeEngine.js` | Exported, never called |
| `estimateTokens` | `claudeEngine.js` | Never called; also hardcodes $3/$1.50 per-MTok pricing that does not match the Haiku model in use |
| `getCachedScore`, `setCachedScore`, `clearScoreCache`, `getCacheAge` | `newsFetcher.js` | Exported, never called |
| `onChangeKey` prop | `App.jsx` → `Dashboard` | Passed as a no-op |
| `apiKey` prop | `App.jsx` → `Dashboard`, `AdminPage` | Threaded but never read — see the `VITE_` landmine |

`api/chat.js` additionally duplicates ~110 lines of the RSS pipeline from `api/refresh.js`,
and the copies have already drifted: default trust score 60 there versus 75 in
`refresh.js`.

---

## Reference values

| Thing | Value | Where |
|---|---|---|
| Scoring model | `claude-haiku-4-5-20251001` | `SCORING_MODEL`, `api/refresh.js` |
| Analysis model | `claude-sonnet-4-5` | `ANALYSIS_MODEL`, `api/refresh.js` |
| Scoring `max_tokens` | 3000 | `scoreGroup()` |
| Analysis `max_tokens` | 400 | `handleAnalyze()` |
| Signals TTL | 24 h | `SIGNAL_TTL` |
| News TTL | 1 h | `NEWS_TTL` |
| Analyze TTL | 2 h | `ANALYZE_TTL` (server **and** client) |
| Breaking-check throttle | 1 h | `BREAKING_CHECK_INTERVAL` (server) / `BREAKING_CHECK_MS` (client) |
| Cron schedule | `0 20 * * *` UTC = **9pm WAT** | `vercel.json` — matches the admin panel copy |
| RSS feeds | 15 | `getNews()` |
| Per-feed item cap | 15 | `parseItems()` |
| Per-feed timeout | 6 s | `fetchOne()` |
| Breaking keywords | 34 | `BREAKING_KEYWORDS` |
| Dedup key | lowercased first 50 chars of title | `getNews()` |
| localStorage key | `appsentinel_analyze_cache` | `claudeEngine.js` |

---

## Conventions

Match the surrounding style rather than modernising opportunistically:

- ES5-flavoured JavaScript — `var`, `function` expressions, indexed `for` loops — even
  though the build targets ES2020.
- Inline style objects, not CSS classes. The design system is CSS custom properties in
  `src/index.css`; use the tokens (`var(--accent-cyan)`, `var(--font-mono)`) rather than
  literal colours.
- No TypeScript, no state library, no component library.
- Fonts: Syne (display), Space Mono (numeric/labels), DM Sans (body). Light mint-green theme.

**Branding is inconsistent and this is a known defect, not a distinction to preserve:**
the header says "CMVNG APPSENTINEL", while `index.html`, `Ticker` and `ApiKeySetup` say
"MacroSentinel", and the localStorage key says `appsentinel`. Residue of an incomplete
rename. Pick one before adding more surfaces.

---

## Environment and tooling

```bash
npm install
npm run dev       # frontend only — /api/* will 404
vercel dev        # needed to exercise the serverless functions locally
npm run build
```

`npm run dev` alone cannot exercise any signal path; every fetch to `/api/refresh` fails.
This catches people out.

There is **no lockfile, no tests, no CI and no linter.** `package.json` omits
`"type": "module"` while `api/` uses ESM syntax — this works via Node 22's ESM
auto-detection and Vercel's esbuild bundling, but it is implicit. Declaring it would be
safer; note that adding `"type": "module"` also affects how the rest of the repo is parsed,
so verify the build after.

---

## Open decisions

Recorded so they are not silently re-litigated:

- **Shared cache store.** Everyone agrees `global._appStore` is inadequate; no backing
  store has been chosen. Vercel KV is the path of least resistance.
- **One brand name.** "MacroSentinel" vs "CMVNG AppSentinel" — unresolved.
- **Price data.** The most conspicuous product gap. No decision on whether to add a market
  data provider or stay news-only.
- **Signal accuracy tracking.** Nothing stores historical signals, so the product cannot
  yet say whether it has ever been right.
