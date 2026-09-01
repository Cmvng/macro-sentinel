# MACROSENTINEL — ARCHITECTURE AUDIT (Phase 0)

> **Status note (2026-08-28).** Much of what follows was fixed in the v1.1 hardening
> release — see `CHECKPOINT.md` and the "Fixed" register in `MEMORY.md` before acting on
> any finding here. This document is kept as the record of the pre-v1.1 state.

**Status:** read-only audit. No application code has been changed.
**Audited at:** commit `1034d07` (main) · 2026-08-28
**Live:** https://macro-sentinel-lac.vercel.app · repo `Cmvng/macro-sentinel` (**public**)

Everything below was verified against the source, and the load-bearing claims were
reproduced by execution — a canary build, replayed API error bodies, and direct tests of
`parseItems`, `parseJSON`, `getRecencyWeight` and `getAffectedAssets`. Where something is
inferred rather than proven, it says so.

---

## 0. Headline finding

The brief describes the risk as *"Claude reads a pile of headlines and says BUY or SELL."*
The code is a narrower version of that:

> **Claude reads six Reuters Business headlines and four FXStreet headlines — titles only,
> no summaries — and emits a score for all 47 instruments in one shot. There is no scoring
> formula in the codebase at all.**

Two structural facts drive most of what follows:

1. **There is no deterministic scoring layer.** The model returns `score`, `signal` and
   `confidence` as literal JSON fields and the UI renders them unmodified. Nothing weights,
   aggregates, decays or combines anything. `trustScore` and `recencyWeight` are computed
   but never enter a calculation.
2. **Of 15 RSS feeds, 13 never reach the model.** The trust threshold admits only two
   sources, and the slices are positional rather than ranked.

The good news for the upgrade: because there is no scoring layer to unpick, Phases 1–8 are
largely **additive**. There is no entrenched formula to migrate off.

---

## 1. Current architecture

```
BROWSER (React 18 SPA, Vite 4)
  main.jsx → App.jsx
    │  reads window.location.pathname ONCE in a useEffect, no popstate listener
    ├── /admin → AdminPage.jsx      client-side PIN gate, operator panel
    └── /*     → Dashboard.jsx      owns all state
                  ├── Ticker.jsx          scrolling headline marquee (first 12)
                  ├── MarketHeader.jsx    theme, summary, bull/bear tiles, tabs
                  ├── SignalTable.jsx     the instrument table for the active tab
                  ├── AnalysisPanel.jsx   Sonnet prose for one instrument
                  └── NewsFeed.jsx        sidebar article list (max 25)
                  ↑
              lib/claudeEngine.js   4 thin fetch wrappers
              lib/newsFetcher.js    client-side enrichment + keyword tagging
              lib/assets.js         the 47 instruments + presentation config
                  │  every call is POST /api/refresh with a different `action`
                  ▼
VERCEL SERVERLESS
  api/refresh.js   ONE handler, four actions, module-global store
  api/chat.js      ⚠ DEAD CODE and an open proxy — see §12
                  │
        ┌─────────┴──────────┐
   15 RSS feeds        api.anthropic.com
                       Haiku 4.5 (scoring) · Sonnet 4.5 (prose)
```

No database. No router library. No state library. No TypeScript. No tests. No lockfile.
No CI. 2,270 lines across 21 files.

---

## 2. Data flow — the real path

```
15 RSS feeds
   │ Promise.allSettled, 6s AbortController each, failures → []
   ▼
parseItems()  regex /<item>…<\/item>/, extracts ONLY title, link, pubDate
   │          ↳ NO description is ever captured  ← see §5
   │          ↳ capped at 15 items per feed
   ▼
concatenate in SOURCE ORDER  (Reuters Business, Reuters Top, ForexLive, FXStreet,
                              Kitco, CoinDesk, CoinTelegraph, MarketWatch, 7× Google)
   ▼
dedupe on lowercased first 50 chars of title
   ▼
globalStore.news   (1h TTL, per-lambda-instance)
   │
   ├──────────────► get_news → browser → fetchAllNews() enriches:
   │                            recencyWeight (never used for ranking)
   │                            affectedAssets via keyword match on TITLE ONLY
   │                            drops anything with weight 0
   │                          → NewsFeed + Ticker
   │
   └──────────────► buildBrief()  ← THE BOTTLENECK
                      hi = trustScore >= 80   → slice(0,6)
                      lo = everything else    → slice(0,4)
                      line format: "[source|Nmin] title"
                      NOT filtered by asset — all 4 groups get an identical block
                      ▼
                    4 parallel Haiku calls (majors 7 / minors+crosses 21 / metals 7 / crypto 12)
                      ▼
                    parseJSON() → mergeResults() → globalStore.signals (24h TTL)
                      ▼
                    SignalTable
```

**The critical narrowing.** `getTrust()` awards ≥80 to Reuters (95) and ForexLive (80)
only. FXStreet and Kitco are 78, CoinDesk 75, CoinTelegraph 72, MarketWatch 70, Google News
75. Because articles are concatenated in source order and each feed yields up to 15, the
positional slices resolve to:

| Slot | Source |
|---|---|
| Top news ×6 | Reuters Business |
| Other ×4 | FXStreet |

Simulated against the real ordering. **Reuters Top News, ForexLive, Kitco, CoinDesk,
CoinTelegraph, MarketWatch and all seven Google News topic queries contribute nothing to any
signal.** They still populate the news sidebar, which is precisely why the gap is invisible
— the UI shows crypto headlines beside crypto signals never computed from them.

---

## 3. Intelligence flow — what actually exists

The brief asks for `EVIDENCE → NORMALIZATION → DEDUPLICATION → EVENT CLASSIFICATION →
MACRO TRANSMISSION → ASSET IMPACT → CONVICTION → THESIS`. Current state:

| Stage | Exists? | Reality |
|---|---|---|
| Evidence | Partial | Title strings only. No summary, no body, no entity extraction. |
| Normalization | Minimal | `{title, link, publishedAt, source, trustScore}`. Nothing canonical. |
| Deduplication | Weak | Exact 50-char title-prefix match. No clustering, no similarity. |
| Event classification | **None** | No event types. No taxonomy anywhere in the codebase. |
| Macro transmission | **None** | No macro variables, no causal chain, no mechanism modelling. |
| Asset impact | Implicit | The model is asked directly for a per-instrument signal. |
| Conviction | Nominal | `confidence` is a model-authored string, uncorrelated with evidence. |
| Thesis | Partial | Sonnet writes 4 sentences on demand, ungrounded in the scoring inputs. |
| Narrative | **None** | No grouping, no persistence, no momentum, no status. |
| Regime | **None** | `dominant_theme` is a five-word model string, nothing more. |

There is currently no separation between interpretation and aggregation. The model does
both in a single call.

**FX is not treated as relative.** The 47 instruments are scored as 47 independent
symbols. There is no currency-level representation anywhere — no USD score, no EUR score.
`FOREX_MAJORS` and `FOREX_MINORS_AND_CROSSES` are just string arrays of pair names handed
to the model. So `EUR/USD` and `EUR/GBP` can be scored inconsistently with no mechanism to
detect it, and nothing derives a pair from its two legs.

---

## 4. Scoring flow

```
SYSTEM_PROMPT  (one string, api/refresh.js:58)
  demands raw JSON, pins the signal enum, specifies the object shape
       ▼
Haiku 4.5, max_tokens 3000, no temperature set, no stop_reason check
       ▼
parseJSON()   strip ```json fences → JSON.parse
              on failure: slice between first { and last } → JSON.parse
              on failure: return null
       ▼
null or missing .assets  →  fallback()  = every asset neutral / 50 / low
       ▼
mergeResults()  shallow-merge the four asset maps
                market_summary + dominant_theme from the FIRST group only
       ▼
globalStore.signals  →  rendered verbatim
```

**This is the entire scoring system.** `score`, `signal`, `confidence`, `primary_driver`,
`supporting_factors`, `risk_to_outlook` and `conflicting` are all model-authored fields
passed straight through. No validation of any kind — `score` goes directly into a CSS
`width: score + '%'`.

**Answer to audit question 20 — the current instrument scoring formula:** there isn't one.

---

## 5. What the model actually sees

Per headline, exactly this:

```
[Reuters|42min] Fed holds rates steady as inflation cools
```

| Input | Present? | Notes |
|---|---|---|
| Publication timestamp | Relative only | Age in minutes, not an absolute time. Unparseable dates emit `NaNmin`. |
| Source name | ✅ | Coarse label. No tier, no independence signal. |
| Article summary | ❌ | `parseItems` never captures `<description>`. |
| Full article text | ❌ | Never fetched. |
| Duplicate versions | Possible | Dedup is a 50-char prefix; syndicated variants survive it. |
| Historical context | ❌ | No prior state is ever passed to the model. |
| Current UTC time | ✅ | Appended once at the end of the brief. |

**A latent bug worth naming:** `newsFetcher.js` reads `a.description` in two places, but
the server never emits that field. So client-side asset tagging runs on the title alone,
and the news feed's description is permanently empty. The code reads as though summaries
exist; they never have.

---

## 6. API flow

`api/refresh.js` is a single `handler()` dispatching on `req.body.action`:

| Action | Called from | Does |
|---|---|---|
| `get` | `scoreAssets`, `scoreAssetsForce`, AdminPage | Cached signals, or a full 4-call rebuild |
| `get_news` | `fetchAllNews` | Cached RSS list |
| `analyze` | `analyzeAsset` | One Sonnet call, 4-sentence prose |
| `check_breaking` | hourly interval, AdminPage | Keyword scan + partial re-score |

Unknown action → `400`. Missing API key → `500`.

**Cron:** `vercel.json` declares `0 20 * * *` (20:00 UTC = 21:00 WAT = the "9pm WAT" the
admin panel advertises) hitting `/api/refresh`. It issues a **bodiless GET**, so `body` is
`{}`, `force` is false, and it takes the same TTL gate as any user request.

**No `maxDuration` or `functions` block is configured**, so the platform default applies. A
cold full build does up to 6s of RSS fetching plus four Haiku calls at `max_tokens: 3000`
— plausibly 11–21s. If the applicable default is 10s the build is killed mid-flight and
nothing is cached, so the next request repeats it. *This one is inferred from the config
plus a latency estimate; confirm against your actual Vercel plan before acting.*

**No `CRON_SECRET`, no `Authorization` check, no origin restriction anywhere.** The cron
endpoint is publicly triggerable. `api/refresh.js:63` advertises
`Access-Control-Allow-Headers: 'Content-Type, Authorization'` but no handler ever reads an
`Authorization` header.

---

## 7. Cache flow

Three tiers, none shared.

| Tier | Location | Key | TTL | Problem |
|---|---|---|---|---|
| Server | `global._appStore` | — | signals 24h, news 1h, analyze 2h | Per-instance, ephemeral |
| Browser | `localStorage` | `appsentinel_analyze_cache` | 2h | Caches failures too |
| Browser | module `cache` object in `newsFetcher.js` | — | — | Write-only; accessors never called |

**`global._appStore` is process memory on ephemeral, horizontally-scaled instances.** Two
concurrent visitors can land on different instances and see different signals. Every cold
start recomputes. The nightly cron warms one container that will probably never serve a
user request. The admin panel's "cache updated for all users" is not true.

**There is no in-flight deduplication.** No promise cache, no lock. N concurrent cold
requests each run their own four-call build and each pay for it.

**The 24-hour rebuild can never fire.** `handleBreakingCheck` sets
`globalStore.signalsTime = now` (`api/refresh.js:210`) after merging a *partial* re-score,
and the `get` branch gates the full rebuild on `(now - signalsTime) < SIGNAL_TTL` (`:88`).
Simulated over 72 hours with an hourly breaking hit: **zero full rebuilds.** Only a cold
start or a manual `force: true` escapes it.

---

## 8. Failure behaviour (audit question 15)

| Failure | Current behaviour | Verdict |
|---|---|---|
| One RSS feed fails | `fetchOne` returns `[]`, others continue | ✅ Reasonable |
| **All feeds fail** | `[]` is truthy → cached and served for a full hour | ❌ |
| Claude call fails | No `r.ok` check; body has no `content`; `text = ''` | ❌ Silent |
| Malformed JSON | `parseJSON` → `null` → `fallback()` all-neutral | ❌ Silent |
| Truncated response | Indistinguishable from malformed → same fallback | ❌ Silent |
| One batch fails | Merged in as neutral, no UI distinction | ❌ Silent |
| Breaking re-score fails | Neutral placeholders **overwrite live signals**, flagged `breaking: true` | ❌ Actively harmful |
| Stale feeds | No staleness concept exists | ❌ |
| Analyze call errors | `''` cached for 2h on **both** tiers, no retry | ❌ |

**An expired API key renders as a calm, plausible, all-neutral market.** That is the single
most dangerous property of the current system: it cannot distinguish "no opinion" from
"broken", and it presents the latter as the former.

---

## 9. Environment, rate limiting, UI states

**Environment variables** — both are misnamed:

| Variable | Read by | Problem |
|---|---|---|
| `VITE_ANTHROPIC_KEY` | `api/refresh.js:66`, `api/chat.js:9`, **`src/App.jsx:5`** | `VITE_` prefix ⇒ inlined into the public bundle |
| `VITE_ADMIN_PIN` | `AdminPage.jsx:3` | Same leak; defaults to `'9999'` |

**Rate limiting:** one throttle exists in the entire codebase — the 1-hour
`BREAKING_CHECK_INTERVAL`. Nothing else is limited.

**Loading states:** a `LIVE / ANALYZING / FETCHING` pill, a pulsing dot, skeleton rows in
`SignalTable`, an italic line in `AnalysisPanel`. Reasonable as far as they go.

**Error states:** a single red banner bound to `error`, set only by `loadSignals`.
`loadNews` failures go to `console.error` and are invisible. No error boundary — one
malformed model field can blank the page.

**Mobile:** breakpoints at 768px and 480px collapse the grid to one column, shrink the
table and hide `.hide-mobile` columns. Functional, but the table is dense and row
interaction is `onClick` with no keyboard or ARIA affordance.

**Also:** `loadNews()` is called only in the mount effect. The hourly interval calls
`checkBreaking`, not `loadNews`. A tab left open shows indefinitely stale news labelled
`LIVE`.

---

## 10. Audit questions 21–23 — the ones that matter most

### Q21 — Are volume / news quality / source quality / recency / narrative consistency distinguished?

| Dimension | Represented? | Used in scoring? |
|---|---|---|
| News volume | ❌ | — |
| News quality | ❌ | — |
| Source quality | Partial (`trustScore`) | Only to pick which 10 headlines are sent |
| Recency | Partial (`recencyWeight`, `age` in the prompt) | **No** — never multiplies anything |
| Narrative consistency | ❌ | — |

They are not separated because there is nothing to separate them *into*. Since the model
emits the final score directly, every one of these would have to be re-derived by the model
from ten headline strings.

### Q22 — Can one story in five feeds influence the score five times?

**Structurally yes; currently masked.** Dedup keys on the first 50 lowercased characters of
the title. Google News rewrites titles as `Headline - Publisher`, so a syndicated copy of a
Reuters story produces a different key and survives. Verified: two genuinely distinct Fed
stories sharing an opening clause *also* collide, so the mechanism is simultaneously too
loose across feeds and too tight within one.

In practice the effect is currently hidden by the more severe defect — only Reuters Business
and FXStreet reach the model, so cross-feed syndication rarely arrives. **This matters for
sequencing: the moment you fix feed reach (P1), the duplication problem becomes live and
will inflate confidence unless clustering lands in the same phase.**

### Q23 — Is NEW distinguished from REPUBLISHED from COMMENTARY?

**No.** There is no novelty concept anywhere. A CPI release and a column about yesterday's
CPI are identical inputs, distinguished only by their age stamp — which nothing weights.

---

## 11. Weaknesses — full register

### Critical (security)

1. **The Anthropic API key ships in the public bundle.** `App.jsx:5` reads
   `import.meta.env.VITE_ANTHROPIC_KEY`; Vite inlines `VITE_`-prefixed build variables.
   Proven by canary build: `var Zu="sk-ant-api03-CANARY-LEAK-TEST-123456789"` in
   `dist/assets/index-*.js`. Independently reproduced by a second agent. The repo is
   public, so an attacker knows exactly what to look for. **The value is unused
   downstream** — `AdminPage` declares no props and `scoreAssets`/`analyzeAsset` never read
   their `apiKey` parameter — so the fix is a pure deletion. Rotate the key regardless.
2. **`api/chat.js` is an unauthenticated open proxy.** CORS `*`, forwards `req.body`
   verbatim to `api.anthropic.com` with the server key. The caller picks the model,
   `max_tokens`, `system` and `messages`. Unreferenced by any frontend code. Delete it.
3. **Every `/api/refresh` action is anonymous.** `force` is honoured from the query string,
   so `GET /api/refresh?force=true` triggers four paid calls. `handleAnalyze` lets a caller
   author the whole prompt *and* choose its cache key (`asset + '_' + signal`), so
   fabricated "analysis" can be written to `EUR/USD_buy` and served to real users for two
   hours.
4. **The admin PIN is decorative** — bundled, defaulting to `9999`, checked client-side,
   and gating no server capability.
5. **RSS content is not fenced as data.** Headlines are concatenated straight into prompts
   with no delimiter or instruction that they are untrusted. No XSS today (React escapes,
   no `dangerouslySetInnerHTML`), but the injection surface into scoring is open.
6. **`.gitignore` misses `.env.production`, `.env.development` and their `.local`
   variants.** No secret has been committed yet — verified across all 50 commits.

### Critical (intelligence)

7. **13 of 15 feeds never reach the model** (§2).
8. **No scoring formula exists** (§4). Nothing is deterministic or inspectable.
9. **FX pairs are scored as independent symbols** (§3). No currency layer.
10. **No novelty, no clustering, no narrative, no regime, no contradiction modelling.**
11. **Confidence is a model-authored string** with no relationship to evidence quality.
12. **Model output is never validated** — `score` flows straight into a CSS width.

### High (correctness)

13. **The 24h full rebuild is starved** by `check_breaking` resetting `signalsTime` (§7).
14. **A failed breaking re-score overwrites good signals** with neutral placeholders badged
    `breaking: true`; nothing ever clears that flag.
15. **API errors are cached as valid results** — 24h for scoring, 2h for analysis.
16. **No in-flight dedup**; concurrent cold requests each pay for a full build.
17. **No `maxDuration`**; the cold build may exceed the platform default and cache nothing.
18. **Cold instances fire false BREAKING alerts** — empty `seenHeadlines` makes every
    article new, and `getNews` applies no recency filter.
19. **`handleBreakingCheck` burns the hour window and marks headlines seen *before* the
    work that can fail.**
20. **Opening `/admin` pays for a full Dashboard signal build** before the PIN prompt
    renders (child effects flush before parent effects).
21. **`mergeResults` takes summaries from the majors group only**, so one failed majors
    call blanks the header while three good summaries are discarded.

### Medium

22. **Keyword matching has no word boundaries.** `'war'` ⊂ "warns" ⇒ *"Powell warns markets
    on rate path"* tags **gold and nothing else**. Verified against the real map.
23. **`ASSET_KEYWORDS` (16) vs `ASSET_IMPACT_MAP` (47)** — 31 instruments can never be
    attributed to a breaking headline; attribution defaults to the forex majors.
24. **The RSS parser handles one dialect.** Tested: RSS 1.0 (`<item rdf:about>`),
    `<rss:item>`, Atom `<entry>` and any multi-line `<title>` all yield **0** items.
25. **Unparseable `pubDate` deletes articles client-side** (`NaN` fall-through in
    `getRecencyWeight`) while the server still scores them, and emits `NaNmin` into the
    prompt. Client and server disagree about which articles exist.
26. **A missing `pubDate` is stamped `now`**, making stale items look maximally fresh.
27. **A total feed outage caches `[]` for an hour** (empty array is truthy).
28. **The 21-asset group shares `max_tokens: 3000`** with the 7-asset groups and is the
    likeliest to truncate into an all-neutral fallback.
29. **News never refreshes after mount**; a long-lived tab shows stale news as `LIVE`.
30. **No staleness/health surface at all** — the four states the brief asks for don't exist.
31. **HTML entities are never decoded**; `&amp;` reaches both the prompt and the UI.
32. **`parseJSON` strips backticks globally**, corrupting payload strings that contain them.

### Low / housekeeping

33. **Dead code ≈12%:** `api/chat.js` (149 lines), `ApiKeySetup.jsx` (131),
    `scoreAssetsForce`, `estimateTokens`, `getCachedScore`/`setCachedScore`/
    `clearScoreCache`/`getCacheAge`. `ApiKeySetup` also promises "your key is stored
    locally" — a guarantee the architecture does not implement.
34. **`risk_to_outlook` is generated for all 47 assets every refresh and rendered nowhere.**
35. **`estimateTokens` hardcodes $3/$1.50 per-MTok**, matching neither model in use.
36. **Four brand names ship simultaneously** — "MacroSentinel", "CMVNG APPSENTINEL",
    "MACROSENTINEL", "CMVNG ADMIN" — plus the `appsentinel_` localStorage key.
37. **BULLISH/BEARISH tiles count all 47** while sitting above a tab-filtered table.
38. **Routing has no `popstate` listener**; navigation works only via full page reload.
39. **`get_news` always reports `cached: true`.**
40. **`npm run dev` yields a broken app** — no `/api/*` handler exists outside `vercel dev`.
41. **No lockfile, no Node pin, no tests, no lint, no CI, no error boundary.**
42. **No financial disclaimer** on a product emitting buy/sell language.

---

## 12. Cost path (Phase 25 pre-read)

Per full rebuild: **4 Haiku calls**. Per instrument analysis: **1 Sonnet call**, cached 2h
by `asset + '_' + signal`.

The current design is not obviously wasteful in call *count* — batching by group is sound,
and analysis is on-demand rather than 47-up-front. The waste is elsewhere:

- **Cache misses dominate.** Per-instance memory plus no in-flight dedup means the same
  build is paid for repeatedly across instances and concurrent requests.
- **`risk_to_outlook` is bought for 47 assets per refresh and never displayed.**
- **`/admin` pays for a dashboard build nobody sees.**
- **`check_breaking` can pay for a `scoreGroup` and discard it** when `globalStore.signals`
  is null on a cold instance.
- **Errors are cached as successes**, so a transient failure is paid for once and then
  serves garbage for 24h rather than being retried.

Any real cost figure needs the deployment's actual traffic and cold-start rate; the
repository alone cannot give a per-day number, and I will not invent one.

---

## 13. Scope corrections to the brief

The brief matches the code closely. Three refinements:

- **"Two serverless functions"** — true, but one is dead code and a live security hole.
- **"Pulls headlines from ~15 RSS feeds"** — 15 exactly, but only 2 reach the model.
- **"Claude Haiku 4.5 for parallel scoring"** — correct: `claude-haiku-4-5-20251001`,
  four parallel calls. Sonnet is `claude-sonnet-4-5`, on-demand, not parallel.

Also worth stating plainly, because the brief's framing assumes otherwise: **there is no
existing intelligence pipeline to preserve or migrate.** Phases 1–8 are green-field behind
a flag, not a refactor.

---

## 14. Companion documents

| File | Purpose |
|---|---|
| `PROJECT.md` | Product-level overview, security posture, roadmap |
| `MEMORY.md` | Durable invariants, landmines and reference values |
| `CHECKPOINT.md` | Append-only log of important changes |
| `CLAUDE.md` | Working agreement binding future sessions to keep those current |

`MACROSENTINEL_SCORING.md`, `MACROSENTINEL_DATA_FLOW.md` and `MACROSENTINEL_ROADMAP.md` are
deliberately **not** written yet — there is no scoring specification to document until one
exists, and writing aspirational docs would violate the brief's own rule.
