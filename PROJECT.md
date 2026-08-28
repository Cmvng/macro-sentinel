# MacroSentinel — Project Overview

> **What it is in one sentence:** A read-only market-intelligence dashboard that pulls
> headlines from 15 financial RSS feeds, asks Claude to score them, and renders a
> buy/sell sentiment signal for each of 47 forex, metals/energy and crypto instruments.

**Live app:** https://macro-sentinel-lac.vercel.app (admin panel at `/admin`)
**Repository:** `Cmvng/macro-sentinel` — **public** · **Stack:** React 18 + Vite 4 on Vercel
serverless · **Size:** ~2,270 lines across 21 files · **Status:** working prototype, not
production-hardened

---

## 1. What the project does

MacroSentinel answers one question for a discretionary trader: *"what is the macro news
flow saying about my instrument right now?"*

It is a **fundamental/sentiment** tool, deliberately not a technical one. There are no
charts, no candlesticks, no indicators — and, notably, **no price data of any kind**. The
entire product is news → Claude → a directional opinion.

The user flow is:

1. The dashboard loads and fetches the current signal set plus the live news list.
2. A headline ticker scrolls across the top; a three-tab table (Forex / Metals / Crypto)
   lists every instrument with its signal, score and confidence.
3. Clicking an instrument opens an analysis panel where Claude writes a four-sentence
   fundamental brief for that instrument alone.
4. A news feed sidebar shows the underlying articles, filterable to the active tab.
5. Separately, `/admin` exposes a PIN-gated operator panel for forcing a refresh.

There are no user accounts, no persistence of user state, no trading integration and no
watchlists. Every visitor sees the same globally-computed signal set.

### The asset universe — 47 instruments

| Category | Count | Contents |
|---|---|---|
| Forex — majors | 7 | EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD |
| Forex — minors & crosses | 21 | EUR, GBP, AUD, NZD, CAD and CHF crosses |
| Metals & energy | 7 | Gold, Silver, Platinum, WTI, Brent, Nat Gas, Copper |
| Crypto | 12 | BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, LINK, DOT, MATIC, UNI |

Defined in `src/lib/assets.js`; the server mirrors the same 47 in its own group constants
in `api/refresh.js`. Note the `metals` category is a slight misnomer — it also carries the
three energy instruments and copper.

### What a "signal" is

Every instrument carries a record shaped like this:

```jsonc
{
  "signal": "buy",                    // strong_buy | buy | neutral | sell | strong_sell
  "score": 65,                        // 0–100
  "confidence": "medium",             // high | medium | low
  "primary_driver": "…",              // the single most important reason
  "supporting_factors": ["…", "…"],
  "risk_to_outlook": "…",             // what would invalidate this
  "conflicting": false,               // signals disagree across sources
  "breaking": true                    // only set by the breaking-news path
}
```

Alongside the per-asset map, each refresh produces a `market_summary` (two sentences) and
a `dominant_theme` (five words) shown in the header.

Presentation metadata — colours, short labels and a `rank` of 5 (strong buy) down to
1 (strong sell) — lives in `SIGNAL_CONFIG` in `src/lib/assets.js`.

---

## 2. Architecture

Three tiers, with all Claude access confined to the server.

```
┌─────────────────────── Browser (React SPA) ───────────────────────┐
│  App.jsx ── reads window.location.pathname once                   │
│    ├── /admin  → AdminPage.jsx      (client-side PIN gate)        │
│    └── /*      → Dashboard.jsx      (orchestrates all state)      │
│                    ├── Ticker · MarketHeader · SignalTable        │
│                    ├── AnalysisPanel · NewsFeed                   │
│                    └── lib/claudeEngine.js  ─┐  all four calls    │
│                        lib/newsFetcher.js   ─┤  POST /api/refresh │
└─────────────────────────────────────────────┼────────────────────┘
                                              │
┌──────────────── Vercel serverless ──────────▼────────────────────┐
│  api/refresh.js   one handler, four actions, in-memory store     │
│      get · get_news · analyze · check_breaking                   │
│  api/chat.js      ⚠ UNREFERENCED — open proxy, see §5            │
└──────────┬─────────────────────────────┬─────────────────────────┘
           │                             │
   15 RSS feeds                   api.anthropic.com
```

**The browser never holds an API key and never calls Anthropic directly.** Every
`claudeEngine.js` function is a thin wrapper over `POST /api/refresh` with a different
`action`. This is the right shape — but see §5, because the key leaks by a different route.

### The four backend actions

All four are handled by the single `handler()` in `api/refresh.js`, dispatched on
`req.body.action`:

| Action | Purpose | Cache TTL | Model |
|---|---|---|---|
| `get` | Return the full 47-asset signal set | 24 h (`force: true` bypasses) | Haiku 4.5 |
| `get_news` | Return the deduplicated RSS article list | 1 h | — |
| `analyze` | Four-sentence brief for one instrument | 2 h, keyed `asset_signal` | Sonnet 4.5 |
| `check_breaking` | Scan for market-moving headlines, partially re-score | throttled to 1 h | Haiku 4.5 |

### Where state lives — three independent cache tiers

1. **Server memory** — `global._appStore` in `api/refresh.js`, holding `signals` (24 h),
   `news` (1 h), `analyzeCache` (2 h), `lastBreakingCheck` and `seenHeadlines`.
2. **Browser localStorage** — key `appsentinel_analyze_cache`, 2 h TTL, mirrors the
   server's analyze cache so re-opening a panel is instant.
3. **Browser module memory** — a `cache` object in `newsFetcher.js`. Largely vestigial;
   most of its accessors are never called.

The server tier is the one that matters, and it is also the fragile one — see §6.

---

## 3. The Claude pipeline

### Scoring — `claude-haiku-4-5-20251001`

The 47 assets are split into four groups and scored by **four parallel API calls**
(`Promise.allSettled` in `buildAllSignals`):

| Group | Size |
|---|---|
| `FOREX_MAJORS` | 7 |
| `FOREX_MINORS_AND_CROSSES` | 21 |
| `METALS` | 7 |
| `CRYPTO` | 12 |

Batching keeps each response inside the 3,000 `max_tokens` budget and means one group
failing does not take down the others.

The system prompt is strict about format — it demands raw JSON with no markdown fences,
pins the enum of valid signal values, and specifies the exact object shape. Because models
still sometimes wrap output in fences, `parseJSON()` defends in two stages: strip
` ```json ` fences and retry, then fall back to slicing between the first `{` and last `}`.

If a group throws or returns unparseable JSON, `fallback()` synthesises an all-neutral
result for that group (score 50, confidence low, `primary_driver: "Awaiting scheduled
analysis"`). **This is silent** — the UI shows neutral signals with no indication that the
model call failed.

`mergeResults()` then flattens the four results into one asset map, taking the *first*
non-empty `market_summary` and `dominant_theme` it encounters. In practice that is almost
always the majors group.

### The news brief — and why it is the weakest link

`buildBrief()` converts articles into the prompt. It splits on trust score — articles at
80 or above become "Top news" (max 6), everything else becomes "Other" (max 4) — stamps
each headline with its age in minutes, and appends the current UTC time. So at most **ten
headlines** inform any scoring run, regardless of how many were fetched.

Two consequences of this design deserve to be stated plainly, because they cap the
product's ceiling more than anything else in the codebase:

**The brief is not filtered by asset.** `buildBrief(news, assets, now)` uses `assets` only
to write the `Score: …` line. The headline block is identical for all four groups, so the
crypto call and the forex-majors call see exactly the same ten headlines.

**Only two feeds clear the trust threshold, and the slices are positional.** `getTrust()`
awards 80 or above to Reuters (95) and ForexLive (80) only — FXStreet and Kitco sit at 78,
CoinDesk 75, CoinTelegraph 72, MarketWatch 70, Google News 75. Articles are concatenated in
source order and each feed contributes up to 15, so `hi.slice(0, 6)` and `lo.slice(0, 4)`
take the *first* items positionally rather than the best ones.

Simulating the real ordering with healthy feeds, the ten headlines that reach the model are
**six from Reuters Business and four from FXStreet**. The other thirteen feeds — including
both crypto sources, the metals source, and all seven Google News topic queries — never
influence a signal at all. They still populate the news feed in the UI, which makes the gap
invisible: the interface shows crypto headlines beside crypto signals that were never
computed from them.

The composition shifts if a feed is slow or empty (the next source fills the slots), but
under normal conditions Bitcoin, gold and oil are all being scored from forex-desk wire
copy. Fixing this — filtering the brief per group and selecting by recency and relevance
rather than array position — is the highest-value change available to signal quality.

### Per-asset analysis — `claude-sonnet-4-5`

A different, stronger model for the narrative. The prompt is explicitly structured: four
sentences, one each for current bias, most impactful driver, biggest reversal risk, and
what to watch next — with repeated instructions to discuss only the named instrument.
Capped at 400 `max_tokens`. Up to six asset-relevant articles are passed as context.

---

## 4. News ingestion

`getNews()` fans out to **15 RSS feeds** with `Promise.allSettled` and a 6-second
`AbortController` timeout each, so one slow feed cannot stall a request.

- **Wire services:** Reuters Business, Reuters Top News
- **FX/commodities specialists:** ForexLive, FXStreet, Kitco
- **Crypto:** CoinDesk, CoinTelegraph
- **General markets:** MarketWatch
- **Seven Google News topic queries:** Fed rates, geopolitics/sanctions, Trump tariffs,
  OPEC/crude, bitcoin/ethereum, gold/silver, and ECB/BOJ/RBA/RBNZ

Each feed is parsed with a regex over `<item>` blocks (handling both CDATA and plain
`<title>`), capped at 15 items, and assigned a hardcoded trust score by URL substring:

| Source | Trust |
|---|---|
| Reuters | 95 |
| ForexLive | 80 |
| FXStreet, Kitco | 78 |
| CoinDesk | 75 |
| CoinTelegraph | 72 |
| MarketWatch | 70 |

Articles are deduplicated on the lowercased first 50 characters of the title.

**Recency weighting** happens client-side in `newsFetcher.js`: under 30 min → 1.0,
under 2 h → 0.75, under 6 h → 0.5, under 24 h → 0.25, under 72 h → 0.1, older → 0
(dropped). The weight is attached to each article but **never used for ranking** — it only
gates the drop at zero. Nothing sorts by it.

**Asset attribution** is keyword matching — `ASSET_IMPACT_MAP` maps all 47 instruments to
keyword lists, so "ECB" correctly tags every EUR pair. But matching uses bare `indexOf`
with no word boundaries, and some keywords are common English substrings. Run against the
real map:

| Headline | Assets tagged |
|---|---|
| `ECB official downplays euro strength` | 7 — all EUR pairs ✅ |
| `Powell warns markets on rate path` | 1 — **XAU/USD only** ❌ |
| `Toward a new trade framework, officials say` | 1 — **XAU/USD** ❌ |
| `Fed warns of persistent inflation risk` | 15, including gold ❌ |

Gold's keyword list contains `'war'`, which matches inside "warns" and "Toward". A Fed
headline is therefore attributed to gold and to nothing else. Word-boundary matching would
fix this.

### Breaking-news detection

`check_breaking` runs at most once an hour (client polls hourly, server enforces its own
`BREAKING_CHECK_INTERVAL`). It diffs incoming headlines against `seenHeadlines`, matches
new ones against **34 breaking keywords** across five families — central-bank decisions,
economic data releases, geopolitics, trade/tariffs and OPEC, plus market-structure and
crypto events — then re-scores only the affected assets and merges the result into the
existing signal set with a `breaking: true` flag.

Asset attribution here uses a **different, much smaller map**: `ASSET_KEYWORDS` covers only
16 of the 47 instruments. When nothing matches it defaults to the seven forex majors.

---

## 5. Security posture — read this before deploying

Three issues are serious. The first two were confirmed empirically, not inferred.

### 🔴 Critical — the Anthropic API key ships to the browser

`src/App.jsx:5` reads `import.meta.env.VITE_ANTHROPIC_KEY`. Vite's default `envPrefix` is
`VITE_`, so any variable with that prefix present at build time is **inlined as a string
literal into the public JavaScript bundle**.

Verified by building with a canary value. The output `dist/assets/index-*.js` contained:

```js
var Zu="sk-ant-api03-CANARY-LEAK-TEST-123456789";
```

Because `api/refresh.js` reads `process.env.VITE_ANTHROPIC_KEY` at runtime, the variable
*must* be configured in the Vercel project — and Vercel exposes project env vars to the
build step. The leak is therefore not hypothetical; it is the default outcome of deploying
this repo as written. Anyone who opens DevTools on the deployed site can extract the key.

**Verify it on the live deployment yourself** — this counts occurrences without printing the
key:

```bash
curl -s https://macro-sentinel-lac.vercel.app/ \
  | grep -o '/assets/index-[^"]*\.js' | head -1 \
  | xargs -I{} curl -s "https://macro-sentinel-lac.vercel.app{}" \
  | grep -c 'sk-ant-'
```

Any result above `0` means the key is being served to every visitor. Because the repository
is **public**, an attacker does not even need to search the bundle blindly — the source
tells them exactly which variable to look for.

**The fix is one line and carries zero functional risk.** `ENV_KEY` is threaded from
`App.jsx` into `Dashboard` and `AdminPage` as an `apiKey` prop, but nothing consumes it:
`AdminPage`'s signature takes no props at all, and `scoreAssets()` / `analyzeAsset()` in
`claudeEngine.js` accept an `apiKey` parameter that their bodies never reference. Deleting
line 5 and the `apiKey` props removes the leak and changes no behaviour. The server-side
variable should also be renamed to drop the `VITE_` prefix so it can never be re-inlined.

### 🔴 Critical — `api/chat.js` is an unauthenticated open proxy

The handler sets `Access-Control-Allow-Origin: *`, performs no authentication, and forwards
`req.body` **verbatim** to `api.anthropic.com` using the server's key. A caller controls the
model, the `max_tokens` and the full message array. Anyone who finds the endpoint can run
unlimited inference billed to the project owner.

`api/chat.js` is **not referenced anywhere in the frontend** — confirmed by grep. It is dead
code that exists purely as liability. It also duplicates roughly 110 lines of the RSS
pipeline from `api/refresh.js`, already drifting (its default trust score is 60 where
`refresh.js` uses 75). **It should be deleted.**

### 🟠 High — the admin PIN protects nothing

`VITE_ADMIN_PIN` is inlined into the bundle by the same mechanism as the API key (the
canary build showed `var ap="7371"`), and it falls back to a hardcoded `'9999'`. More
fundamentally the check is client-side only: `AdminPage` gates *rendering*, while the
endpoints it calls — `force: true` refresh, `check_breaking` — accept unauthenticated
requests from anyone. A `curl` skips the PIN entirely.

### 🟠 High — anyone can poison the analysis other users read

`handleAnalyze()` takes `asset`, `signal` and `news` straight off `req.body` with nothing but
a truthiness check on `asset` — no allowlist against the 47 known instruments, no length
limit. All three are interpolated directly into the prompt, so an anonymous caller authors
the entire instruction.

The result is then written to `globalStore.analyzeCache` under
`cacheKey = asset + '_' + signal` — **also caller-controlled**. An attacker can therefore
submit a crafted prompt under a legitimate key such as `EUR/USD_buy`, and the fabricated
"professional fundamental trading analysis" is served to every real user who opens that
instrument for the next two hours.

There is no authentication on this path, and CORS is `*`.

### 🟠 High — `/api/refresh` is an unauthenticated cost amplifier

`force` is read from the query string as well as the POST body (`api/refresh.js:87`), so a
bare `GET /api/refresh?force=true` bypasses the 24-hour cache and triggers four concurrent
Claude scoring calls. No auth, no throttle, no origin check. The only rate limit anywhere in
the file is the one-hour gate on `check_breaking`.

Note that `api/refresh.js:63` advertises `Access-Control-Allow-Headers: 'Content-Type,
Authorization'` — but no `Authorization` header is ever read. The header is aspirational.

### 🟢 Low — prompt injection is contained

RSS headlines flow into prompts, so a compromised feed could bias signal output. But there
is **no `dangerouslySetInnerHTML` anywhere in the codebase** — all model and news text
renders as React text nodes and is escaped. Injection can mislead, not execute.

Two genuine minor issues remain. `NewsFeed` opens articles with
`window.open(link, '_blank')` without `'noopener'`, so third-party RSS links receive a
`window.opener` handle — and the `<link>` value is taken from feed XML by regex with **no
scheme validation**, so a compromised feed could supply a `javascript:` URL.

### 🟡 Medium — `.gitignore` misses the mode-specific env files

It lists `.env` and `.env.local` only. Vite also loads `.env.production`,
`.env.development` and their `.local` variants — none of which are ignored:

```
.env                    IGNORED
.env.local              IGNORED
.env.production         ** NOT IGNORED **
.env.production.local   ** NOT IGNORED **
.env.development        ** NOT IGNORED **
.env.development.local  ** NOT IGNORED **
```

Given that this project's secrets live in `VITE_`-prefixed variables, a `.env.production`
created locally would be committed by a routine `git add .`.

### ✅ Clean so far

**No secrets have ever been committed.** A history scan across all 50 commits found no key
material, and the existing `.gitignore` has covered `.env` and `.env.local` from the first
commit. The gap above is a latent risk, not a realised one.

Also worth noting: the dead `ApiKeySetup.jsx` tells users "your key is stored locally" — a
privacy guarantee for an architecture the app does not implement. Another reason to delete
it rather than leave it lying around.

---

## 6. Known correctness and operational issues

Each of the following was reproduced or traced against the source, not inferred.

### The caching layer is the weak point

**The nightly full rebuild can never fire.** This is the sharpest bug in the codebase.
`handleBreakingCheck()` sets `globalStore.signalsTime = now` (`api/refresh.js:210`) after
merging a *partial* re-score. The `get` branch then gates the full 47-asset rebuild on
`(now - globalStore.signalsTime) < SIGNAL_TTL` (`:88`). So every breaking-news check
refreshes the 24-hour clock while only re-scoring a handful of assets. Simulated over 72
hours with an hourly breaking hit: **zero full rebuilds**. On an active news week most of
the 47 instruments can sit on their original scores indefinitely, while the UI reports the
set as fresh. Only a cold start or a manual `force: true` escapes it.

**`global._appStore` is per-instance and ephemeral.** Vercel serverless instances are
horizontally scaled and reclaimed, so the cache is not shared: two concurrent visitors can
see different signals, and every cold start recomputes from scratch. The daily cron
(`0 20 * * *` UTC = 9pm WAT, matching the admin panel copy) issues a bodiless GET, which
means `force` is false — so it warms **one** container that will likely never serve a user
request. The admin panel's "cache updated for all users" is not accurate. Moving to Vercel
KV or Redis is the single highest-leverage structural change available.

**A transient API error poisons the analyze cache for two hours.** `handleAnalyze()` never
checks `r.ok` (`api/refresh.js:125-146`). On a 429 or overload the response has no
`content` array, `text` stays `''`, and that empty string is written to the cache with a
fresh timestamp. Verified by replay: the user sees "Analysis unavailable." and keeps seeing
it for two hours on both the server and browser tiers, with no retry.

**A failed breaking re-score actively destroys good signals.** `scoreGroup()` swallows all
errors and returns `fallback()`. `handleBreakingCheck()` cannot tell that apart from a real
result, so it writes the neutral placeholders straight into `globalStore.signals.assets` and
stamps each with `breaking: true`. One failed API call during a breaking check therefore
replaces genuine signals with neutral ones **and flags them as breaking news**.

**The `breaking: true` flag is never cleared.** Only a full `buildAllSignals()` rebuilds the
map from scratch — and per the starvation bug above, that rebuild may never run. Assets can
stay badged BREAKING indefinitely.

**The headline that triggers an alert usually is not in the prompt used to re-score.**
Breaking detection scans every cached article, but the re-score goes through `buildBrief()`,
which takes the same positional slices described in §3. A breaking headline from Google News,
CoinDesk or Kitco fires the alert and then never reaches the model that is supposed to react
to it.

**A cold instance can emit a false BREAKING alert.** `seenHeadlines` starts empty, so on
the first `check_breaking` after a cold start *every* headline is "new" — and `getNews()`
applies no recency filter, so articles days old are eligible. Any that matches one of the 34
keywords fires an alert for stale news.

**`seenHeadlines` and `analyzeCache` grow without bound** — neither is ever pruned within
an instance's lifetime.

### Wasted work and wasted tokens

**`risk_to_outlook` is generated for all 47 assets on every refresh and rendered nowhere.**
It is in the system prompt schema and in `fallback()`, but `grep` finds no reference
anywhere under `src/`. `primary_driver`, `supporting_factors` and `conflicting` *are*
rendered by `SignalTable`; this one field is pure waste on every scoring call.

**`check_breaking` can pay for a scoring call and discard it.** Line 200 awaits
`scoreGroup()`, then line 202 guards the merge on `globalStore.signals` being populated.
On a cold instance that guard fails and the freshly-purchased result is dropped.

**Opening `/admin` triggers a full signal load first.** `App.jsx` initialises `page` to
`'dashboard'` and only switches inside a `useEffect`. React flushes child effects before
parent effects, so `Dashboard` mounts and fires `loadNews()` + `loadSignals()` before `App`
switches the page and unmounts it. Every admin visit pays for a dashboard load.

### Data quality

**Thirteen of fifteen feeds never reach the scoring model.** See §3 — the brief is not
filtered by asset, and the trust threshold plus positional slicing means crypto, metals and
all topical Google News queries are excluded from every scoring run. This is the largest
constraint on signal quality in the codebase.

**Anthropic API errors are treated as successful empty responses.** Neither `scoreGroup()`
nor `handleAnalyze()` checks `r.ok` or inspects the response for an `error` field. On a 401
(bad key), 429 or 5xx the body has no `content` array, so `text` stays `''` — which
`parseJSON` turns into `null`, which becomes an all-neutral `fallback()` cached for 24
hours. A wrong API key therefore produces a plausible-looking neutral dashboard rather than
an error.

**Nothing checks `stop_reason`.** Combined with the 21-asset group's fixed `max_tokens:
3000`, a truncated response is indistinguishable from a malformed one and degrades to the
same silent all-neutral fallback.

**`mergeResults` can blank the header even when scoring succeeded.** It takes
`market_summary` and `dominant_theme` from the first group that has them, and
`Promise.allSettled` preserves order, so that is always forex-majors. Because `fallback()`
also populates those fields, a single failed majors call replaces the whole dashboard
header with "Analysis pending." while the other three groups' real summaries are discarded.

**`parseJSON` strips backticks globally**, not just leading and trailing fences, so a
model response quoting a backtick inside `primary_driver` or `market_summary` has those
characters silently removed.

**Keyword attribution matches on bare substrings**, so `'war'` inside "warns" and "Toward"
misattributes Fed headlines to gold — see the table in §4.

**Malformed RSS dates silently drop articles.** `getRecencyWeight()` computes age from
`new Date(publishedAt)`. A missing or unparseable `pubDate` yields `NaN`, every comparison
against `NaN` is false, the function falls through to `return 0`, and `fetchAllNews()` drops
anything weighted 0. Confirmed by direct test: `'not-a-date'`, `''` and `undefined` all
produce 0. A feed that changes its date format vanishes with no error — and note the server
has no such guard, so the article still reaches the scoring prompt. Client and server
disagree about which articles exist.

**A missing `pubDate` is stamped as "now",** which is the opposite failure: `parseItems()`
falls back to `new Date().toISOString()`, so feeds using Atom `<updated>` or Dublin Core
`<dc:date>` have every article treated as brand new and maximally recent.

**The RSS parser only handles one narrow feed dialect.** Tested against the real regexes:

| Feed shape | Items parsed |
|---|---|
| RSS 2.0, plain `<title>` | 1 ✅ |
| RSS 2.0, CDATA `<title>` | 1 ✅ |
| RSS 1.0 — `<item rdf:about="…">` | **0** |
| Namespaced — `<rss:item>` | **0** |
| Atom — `<entry>` | **0** |
| RSS 2.0 with a multi-line `<title>` | **0** |

The item regex requires a bare `<item>` open tag and the title alternation has no `s` flag,
so even a well-formed RSS 2.0 feed that pretty-prints its XML across lines yields nothing.
A source that changes format goes silently to zero — there is no error, the feed simply
stops contributing.

**A total feed outage is cached for an hour.** `getNews()` guards its cache with
`if (globalStore.news && …)`, and an empty array is truthy — so if all fifteen fetches fail,
`[]` is cached and served for the full hour.

**Deduplication collapses distinct stories.** The dedup key is the first 50 lowercased
characters of the title, and `seenHeadlines` uses the first 40. Two different Fed stories
that share an opening clause are treated as the same article.

**HTML entities are never decoded.** Titles reach both the prompt and the UI as raw
`&amp;`, `&quot;` and `&#39;`.

**The 21-asset group may not fit in its token budget.** `FOREX_MINORS_AND_CROSSES` asks for
21 fully-populated asset objects inside `max_tokens: 3000`. If the response truncates,
`parseJSON()` fails and the entire group silently degrades to all-neutral via `fallback()`.
This is the most likely explanation if minors and crosses ever appear permanently neutral.

**Breaking-news coverage is uneven.** `ASSET_KEYWORDS` (16 entries) versus
`ASSET_IMPACT_MAP` (47) means 31 instruments can never be individually attributed to a
breaking headline; attribution silently defaults to the seven forex majors.

**Failure is invisible.** A failed scoring group becomes neutral signals with no UI
distinction, so a total Claude outage looks like a genuinely neutral market.

### UI defects

**The BULLISH/BEARISH tiles are market-wide but read as tab-scoped.** They count
`Object.values(signals)` — all 47 assets — while sitting directly above the tab bar and the
tab-filtered table. Nothing labels the difference.

**The score bar trusts model output.** `ScoreBar` renders `width: score + '%'` and prints
`{score}` raw, so an omitted `score` field renders the literal text `undefined` and a score
above 100 overflows its track.

**The analysis panel persists across tab switches**, so a EUR/USD brief can stay open while
the crypto table is displayed.

**Routing is one-shot.** `App.jsx` reads `window.location.pathname` inside a `useEffect`
with an empty dependency array and registers no `popstate` listener. Navigation works only
because `AdminPage` uses `window.location.href` for a full page reload.

**The `get_news` `cached` flag is always `true`** on both branches, since `getNews()` sets
`newsTime = now` immediately before the handler compares against it. Harmless today only
because no caller reads it.

### Housekeeping

**Dead code.** `ApiKeySetup.jsx` (131 lines) is never imported; `api/chat.js` is
unreachable; and `scoreAssetsForce`, `estimateTokens`, `getCachedScore`, `setCachedScore`,
`clearScoreCache` and `getCacheAge` are all exported but never called. `estimateTokens`
also hardcodes $3/$1.50 per-MTok pricing that does not correspond to the Haiku model
actually in use.

**Four different product names ship simultaneously:** "MacroSentinel" (`index.html`,
`Ticker`), "CMVNG APPSENTINEL" (`MarketHeader`), "MACROSENTINEL" (`ApiKeySetup`) and
"CMVNG ADMIN" (`AdminPage`) — plus the `appsentinel_analyze_cache` localStorage key. The
residue of an incomplete rename.

**No engineering safety net.** No lockfile, no tests, no CI, no linter, no error boundary,
no Node version pin. `package.json` omits `"type": "module"` while `api/` uses ESM syntax;
this currently works via Node 22's ESM auto-detection and Vercel's esbuild bundling, but it
is implicit rather than declared.

**No financial disclaimer.** The product emits buy/sell language on real instruments with
no risk warning.

---

## 7. Roadmap

**P0 — before this is exposed to real users**

1. Remove `VITE_ANTHROPIC_KEY` from `App.jsx` and rename the server variable to drop the
   `VITE_` prefix. Rotate the existing key — assume it is compromised. *(minutes)*
2. Delete `api/chat.js`. *(minutes)*
3. Validate `asset` against the known 47 in `handleAnalyze()`, stop accepting a
   caller-supplied `news` array, and derive the cache key from validated values only.
   Without this, anyone can poison the analysis other users read. *(hours)*
4. Add rate limiting to `/api/refresh`, and stop honouring `force` from the query string.
   *(hours)*
5. Move the admin gate server-side — a shared secret header on the privileged actions —
   and stop shipping the PIN to the client. *(hours)*
6. Extend `.gitignore` to `.env*` so mode-specific env files cannot be committed.
   *(minutes)*
7. Add a financial-advice disclaimer. *(minutes)*

**P1 — to make the signals trustworthy**

8. **Filter the news brief per asset group and select by relevance, not array position.**
   Today crypto and metals are scored on forex wire copy and thirteen of fifteen feeds are
   inert. Nothing else on this list moves signal quality as much.
9. **Stop `check_breaking` from resetting `signalsTime`** (`api/refresh.js:210`). Track the
   partial-update time separately so the 24-hour full rebuild can actually fire. One line,
   and it is the difference between signals that refresh and signals that quietly ossify.
10. **Check `r.ok` and `stop_reason` on both Claude calls.** Right now an expired API key
   renders as a calm neutral market, and a truncated response is cached for 24 hours as if
   it were real.
11. Replace `global._appStore` with Vercel KV or Redis so caching and the cron actually work.
12. Give the cron `force: true`, or it will keep warming containers to no effect.
13. Surface degraded state in the UI instead of silently emitting neutral signals.
14. Split the 21-asset scoring group, or raise its `max_tokens`, so it cannot truncate into
    an all-neutral fallback.
15. Fix the RSS date fallback so malformed dates do not silently drop articles.
16. Commit a lockfile, pin the Node version, add an error boundary.
17. Expand `ASSET_KEYWORDS` to all 47 instruments, or share one map between client and server.

**P2 — to make it a product**

18. Add price data. A sentiment signal with no price context is hard to act on, and it is
    the most conspicuous gap in the product.
19. Track signal accuracy over time — store past signals and score them against realised
    moves. This is what would separate the tool from a news aggregator.
20. Tests around `parseJSON`, `getRecencyWeight` and `getAffectedAssets` — pure functions
    with real edge cases, cheap to cover.
21. Either render `risk_to_outlook` or drop it from the schema; today it is paid for on
    every asset and shown to nobody.
22. Delete dead code; unify the duplicated RSS pipeline; settle on one brand name.
23. Consider TypeScript for the signal contract between model output and UI.

---

## 8. Working with this repository

```bash
npm install
npm run dev          # Vite dev server on :3000
npm run build        # → dist/
npm run preview
```

Note that `npm run dev` serves the frontend only — `/api/*` routes need `vercel dev` to run
locally, otherwise every signal fetch fails.

**Required environment variables**

| Variable | Used by | Notes |
|---|---|---|
| `VITE_ANTHROPIC_KEY` | `api/refresh.js`, `api/chat.js` | ⚠ the `VITE_` prefix leaks it — see §5 |
| `VITE_ADMIN_PIN` | `AdminPage.jsx` | ⚠ also leaked; defaults to `9999` |

**House style, as observed.** ES5-flavoured JavaScript (`var`, `function` expressions,
index loops) even though the build targets ES2020; inline style objects rather than CSS
classes, with a CSS-custom-property design system in `src/index.css`; no TypeScript and no
state management library. The design language is a light mint-green financial theme using
Syne (display), Space Mono (numerics) and DM Sans (body). Commit history is 50 commits over
two days, almost all titled `Update <File>.jsx` — the signature of editing through the
GitHub web UI.

---

## 9. Companion documents

| File | Purpose |
|---|---|
| `MEMORY.md` | Durable working memory — invariants, gotchas and decisions that must survive between sessions |
| `CHECKPOINT.md` | Append-only log of important changes, newest first |
| `CLAUDE.md` | Instructions binding future Claude Code sessions to keep both files current |
