# MACROSENTINEL — REMAINING WORK

**Companion to:** `MACROSENTINEL_ARCHITECTURE.md` (the Phase 0 audit)
**Written:** 2026-08-28 · **Branch:** `claude/hello-5v6vjs`

---

## Where things stand

| | |
|---|---|
| Phase 0 audit | ✅ `MACROSENTINEL_ARCHITECTURE.md` |
| UI/UX review | ✅ `MACROSENTINEL_UX_REVIEW.md` |
| **P0 security** | ✅ **Shipped in v1.1** |
| **Tier 1 trust + Tier 2 accessibility + Tier 3 functionality** | ✅ **Shipped in v1.1** |
| P1 data quality | ◑ Partial — clustering, relevance-ranked briefs, parser and date handling shipped; source registry and novelty scoring not yet |
| P1.5 validation & honesty | ✅ Shipped in v1.1 |
| P2 intelligence engine | ⬜ Not started — currency strength, macro transmission, relative FX |
| P3 narratives | ⬜ Not started |
| P4 persistence & snapshots | ⬜ Not started |
| P5 UI redesign | ⬜ Not started (v1.1 fixed defects; it was not a redesign) |
| P6 cost & performance | ◑ Partial — in-flight dedup, `maxDuration`, right-sized token budgets shipped |
| P7 certification | ◑ 45 unit tests + build gate; no CI yet |

v1.1 verification: `npm test` 45/45, build passes, canary build shows no secret in `dist/`,
26 Playwright interaction checks and all four freshness states pass against a mocked API.

---

## Do these two things in Vercel now

1. **Add `ANTHROPIC_API_KEY`** with your key. The server still falls back to
   `VITE_ANTHROPIC_KEY`, so nothing breaks before you do — but the fallback should be
   removed once migrated.
2. **Add `ADMIN_SECRET`** (any long random string). Without it, `/admin` and forced
   refreshes fail closed and will refuse to run. Optionally add `CRON_SECRET` so the
   nightly cron can force a rebuild.

Then **rotate the Anthropic key.** The previous one was published in the bundle on a public
repo and must be treated as compromised. Order matters: deploy v1.1 first, then rotate, so
the replacement is never published.

---

## Why the key must be rotated after, not before

**Rotate the Anthropic API key.** It is inlined in the public bundle at
`https://macro-sentinel-lac.vercel.app`, and the repository is public, so anyone can read
`App.jsx:5` and know exactly what to look for. Rotating is your action, not mine — I have no
access to your Anthropic console.

Rotating alone is not enough: the new key leaks identically on the next build until P0.1
below is done. Sequence it as **fix, deploy, then rotate**, so the new key is never
published.

---

## P0 — Security. Nothing else should ship first.

Small, self-contained, no design decisions. Roughly half a day in total.

| # | Task | Why | Effort |
|---|---|---|---|
| 0.1 | Delete `var ENV_KEY` from `App.jsx:5` and the `apiKey` props threaded into `Dashboard` and `AdminPage`. Rename the server variable `VITE_ANTHROPIC_KEY` → `ANTHROPIC_API_KEY` in `api/refresh.js` and in Vercel project settings. | Stops the key reaching the bundle. The value is already unused — `AdminPage()` declares no props, and `scoreAssets`/`analyzeAsset` never read their `apiKey` parameter — so this is a pure deletion with no behaviour change. | 15 min |
| 0.2 | Delete `api/chat.js`. | Unauthenticated open proxy to your Anthropic account: CORS `*`, forwards `req.body` verbatim, caller picks model and `max_tokens`. Referenced by nothing. | 5 min |
| 0.3 | Validate `asset` in `handleAnalyze` against the 47 known ids; stop accepting a caller-supplied `news` array; derive the cache key only from validated values. | Today a caller authors the whole prompt *and* picks its cache key, so fabricated "analysis" can be written to `EUR/USD_buy` and served to real users for 2 hours. | 1–2 h |
| 0.4 | Stop honouring `force` from the query string. Require a shared secret header for `force: true` and `check_breaking`. Add `CRON_SECRET` and check it on the cron path. | `GET /api/refresh?force=true` currently triggers four paid model calls anonymously. | 2 h |
| 0.5 | Move the admin gate server-side. Remove `VITE_ADMIN_PIN` from the client. | The PIN is bundled, defaults to `9999`, is checked in the browser, and gates no server capability. | 2 h |
| 0.6 | Widen `.gitignore` to `.env*`. | `.env.production`, `.env.development` and their `.local` variants are currently not ignored. | 2 min |
| 0.7 | Add a financial-advice disclaimer to the dashboard footer. | The product emits buy/sell language on real instruments with none. | 30 min |

**Acceptance:** a canary build contains no `sk-ant-` string; `GET /api/refresh?force=true`
returns 401; `POST` with `asset: "<script>"` returns 400.

---

## P1 — Data quality

**Ship 1.1 and 1.2 together.** Duplication is currently masked by the feed-reach bug — most
feeds never arrive, so syndication rarely does either. Fix reach alone and duplication goes
live immediately, inflating confidence. They are coupled.

| # | Task | Notes |
|---|---|---|
| 1.1 | Rewrite `buildBrief`: filter per asset group, rank by recency × source tier × relevance instead of array position, and raise the headline budget well above 10. | Today 13 of 15 feeds never reach the model and all four groups get an identical block. This is the single biggest constraint on signal quality. |
| 1.2 | Event clustering. Normalise titles, compare with a cheap similarity measure plus published-time proximity, emit `{event_id, primary_story, related_stories[], independent_source_count, first_seen, last_seen}`. | Replaces the 50-char prefix dedup, which is simultaneously too loose across feeds and too tight within one. Must preserve genuine developments — "Fed holds rates" and "Powell says progress has stalled" are related but not duplicates. |
| 1.3 | Source registry: `{name, domain, tier, weight, specialization}` in one editable config. | Replaces `getTrust()`'s hardcoded substring ladder. Tier drives weighting, not a binary ≥80 cut. |
| 1.4 | Capture `<description>` in `parseItems`. | Never captured today, so `a.description` on the client is permanently `undefined` and asset tagging runs on titles alone. |
| 1.5 | Broaden the RSS parser: RSS 1.0 (`<item rdf:about>`), `<rss:item>`, Atom `<entry>`, multi-line `<title>`, and `<dc:date>`/`<updated>` dates. Decode HTML entities. | Verified: all four shapes currently parse to **0 items**. |
| 1.6 | Fix date handling. Guard `NaN` in `getRecencyWeight`; stop stamping a missing `pubDate` as `now`; stop emitting `NaNmin` into prompts. Make client and server agree on which articles exist. | |
| 1.7 | Word-boundary keyword matching; merge `ASSET_KEYWORDS` (16) and `ASSET_IMPACT_MAP` (47) into one shared map. | `'war'` ⊂ "warns" currently tags Fed headlines as gold. |
| 1.8 | Novelty scoring: `NEW_INFORMATION` / `CONTINUING_STORY` / `COMMENTARY` / `BACKGROUND`. | Feeds the decay profiles in 1.9 and the weighting in P2. |
| 1.9 | Per-event-type recency decay profiles, configurable. | Central bank decisions should outlive market commentary. |
| 1.10 | Feed health tracking: per-feed last-success, error counts. | Prerequisite for the health surface in P1.5. |

**Flag:** `MACROSENTINEL_V2_PIPELINE`. Off ⇒ current behaviour byte-for-byte.

---

## P1.5 — Validation and honesty *(added; not in the original brief)*

Phases 2–8 all assume you can distinguish working from broken. Today you cannot: an expired
API key renders as a calm all-neutral market. Do this before building on top.

| # | Task |
|---|---|
| 1.5.1 | Check `r.ok` and `stop_reason` on both Claude calls. Never cache an error as a result. |
| 1.5.2 | Schema-validate model JSON before use. Reject out-of-enum signals, clamp `score` to 0–100, never pass an unvalidated value into a CSS width. |
| 1.5.3 | Data status states — `LIVE` / `DELAYED` / `STALE` / `PARTIAL_OUTAGE` — with feed counts and last-full-update time. |
| 1.5.4 | Distinguish "no opinion" from "outage" in the UI. Stop rendering `fallback()` as if it were analysis. |
| 1.5.5 | Add an error boundary. |

**Acceptance:** revoke the API key in staging; the dashboard must say it is broken.

---

## P2 — Intelligence engine

| # | Task |
|---|---|
| 2.1 | Event classification into the macro taxonomy, allowing `UNKNOWN` and `MIXED`. Haiku, batched. |
| 2.2 | Macro transmission layer: `event → macro variable → country/currency → differential → instrument`, carrying an explicit `mechanism` string. |
| 2.3 | **Currency strength map** — score USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD individually with `{macro_score, momentum, confidence, evidence_count, top_drivers, contradictions}`. |
| 2.4 | **Derive FX pairs from relative currency pressure.** Stop scoring 47 independent symbols. Represent relative uncertainty rather than inventing a direction when both legs are strong. |
| 2.5 | Separate bullish and bearish evidence; compute `net_pressure` and `conflict_score` without averaging disagreement into a fake neutral. |
| 2.6 | Deterministic aggregation: `importance × recency × source_quality × novelty × independence`, in inspectable code rather than model output. Document in `MACROSENTINEL_SCORING.md`. |
| 2.7 | Split direction from confidence. Confidence measures **evidence quality**, label it `EVIDENCE CONFIDENCE`, and never present it as probability. |
| 2.8 | Asset-family templates — FX, metals, energy, crypto — over shared infrastructure. Not 47 separate systems. |

**Flag:** `MACROSENTINEL_V2_ENGINE`. Shadow-compare old and new for at least a week before
switching the default.

---

## P3 — Narratives

Grouping and status need no database. **Momentum does.** Split accordingly.

| # | Task |
|---|---|
| 3.1 | Narrative grouping with `{title, direction, strength, event_count, independent_source_count}`. |
| 3.2 | Status: `EMERGING` / `BUILDING` / `DOMINANT` / `WEAKENING` / `REVERSING`. Needs at least two snapshots — depends on P4. |
| 3.3 | Global macro regime block — risk sentiment, inflation, growth, liquidity, each independently scored. |

---

## P4 — Persistence and snapshots

**Recommendation: Upstash Redis** via the Vercel Marketplace (what Vercel KV became).

Justification: the access pattern is key-value with TTL, which is exactly Redis. Snapshots
fit sorted sets keyed by instrument with timestamp scores, trimmed to retention. No schema,
no migrations. Volume is trivial — 47 instruments hourly at ~500 bytes is roughly 17 MB over
30 days, comfortably inside a free tier. *Verify current pricing yourself; I am not going to
assert commercial terms.*

Postgres is overkill for v1. Vercel Blob cannot query by time range.

**Persistence is needed earlier than the feature roadmap implies.** `global._appStore` is
already broken as a cache — per-instance, ephemeral, no in-flight dedup, and the 24-hour
rebuild is starved by `check_breaking` resetting `signalsTime`. You need shared storage to
fix bugs you already have, independent of any new feature.

| # | Task | Retention |
|---|---|---|
| 4.1 | Move `globalStore` to Redis. Add in-flight dedup so concurrent cold requests share one build. | signals 24 h, news 1 h, analyze 2 h |
| 4.2 | Fix the `signalsTime` starvation — track partial-update time separately. | — |
| 4.3 | `INSTRUMENT_SNAPSHOT` + `GLOBAL_SNAPSHOT` records. | 30–90 days |
| 4.4 | Event and cluster registry, for cross-run novelty detection. | 7–30 days |
| 4.5 | "What changed since last update" — only when real snapshots exist. Never fabricate a comparison. | — |
| 4.6 | Per-instrument event timeline. | — |
| 4.7 | Record `model_version` on every snapshot for later evaluation. **No accuracy claims and no backtests** until outcome data exists. | — |

**Flag:** `MACROSENTINEL_SNAPSHOTS`.

---

## P5 — UI

Do not start before P2 lands — redesigning around data that does not exist yet wastes the work.

Hierarchy: **global regime → market map → top narratives → biggest changes → instrument
intelligence.** Instrument cards carry direction, confidence, change, top driver, conflict
and freshness — no AI paragraph on the card; the thesis opens on click.

Also fold in: structured thesis sections (thesis / why / what changed / contrary evidence /
invalidation / confidence / freshness), the event-impact explainer, a "how this signal is
built" panel, watchlist in `localStorage`, filtering, and a fix for the `BULLISH`/`BEARISH`
tiles that currently count all 47 while sitting above a tab-filtered table. Give table rows
keyboard access.

**Flag:** `MACROSENTINEL_NEW_UI`.

---

## P6 — Cost and performance

| # | Task |
|---|---|
| 6.1 | Set `maxDuration` in `vercel.json`. A cold build is plausibly 11–21 s against a possible 10 s default, which would kill it mid-flight and cache nothing. **Measure this first.** |
| 6.2 | In-flight dedup (also 4.1). |
| 6.3 | Stop `/admin` paying for a Dashboard build before the PIN prompt renders. |
| 6.4 | Drop `risk_to_outlook` from the schema or render it — it is bought for 47 assets every refresh and shown to nobody. |
| 6.5 | Batch Sonnet theses in one structured call rather than 47. |
| 6.6 | Cache theses against a signal fingerprint; regenerate only on material change. |
| 6.7 | Refresh news on an interval — currently fetched once at mount and shown as `LIVE` forever. |
| 6.8 | Give the cron `force: true` and a secret. |

---

## P7 — Certification

Tests (Vitest; mock all feeds and model calls — never hit production APIs), then build, lint,
typecheck, and a canary build proving no `sk-ant-` in `dist/`.

The 15 test cases in the brief are the right set. The five that matter most, because they
encode the intelligence rules rather than mechanics:

- duplicate stories do not count as independent evidence
- a genuinely new development inside an existing narrative survives clustering
- conflicting evidence lowers confidence without forcing neutral
- two strong currencies produce relative *uncertainty* for their pair, not a random direction
- prompt-injection text inside an RSS article is treated as data

Add: **feature flags OFF reproduce the old output exactly.**

---

## Reporting checklist — when each answer becomes available

Your brief asks for 17 measurements. Most cannot be answered yet, and I will not estimate
them from the repository alone.

| # | Metric | Available after |
|---|---|---|
| 1 | Architecture before changes | ✅ Now — the audit |
| 2 | What was wrong with the old flow | ✅ Now — the audit |
| 3–5 | Duplicates removed / independent events / active narratives | P1 + P3, from real runs |
| 6–8 | AI calls, cost, latency before vs after | Needs instrumentation in P1; **requires production traffic data the repo cannot provide** |
| 9 | Feed failure behaviour | P1.5 |
| 10–13 | Scoring, confidence, contradiction, FX relative logic | P2 + `MACROSENTINEL_SCORING.md` |
| 14 | Persistence added and why | P4 |
| 15 | Feature flags | Each phase |
| 16 | Tests run and results | P7 |
| 17 | Remaining limitations | Ongoing |

---

## Documents still to write

Deliberately not written yet, because the brief's own rule forbids aspirational
documentation:

- `MACROSENTINEL_SCORING.md` — after P2, when a scoring specification exists
- `MACROSENTINEL_DATA_FLOW.md` — after P1, when the pipeline is real

---

## Standing constraints

1. Macro pressure and evidence confidence — **never** market prediction.
2. Volume ≠ evidence. Ten syndicated articles are not ten confirmations.
3. Contradiction is information. Expose it.
4. FX is relative. Never analyse a pair as two isolated headlines.
5. The model interprets; deterministic code aggregates.
6. Never fabricate missing data. Always show freshness.
7. The system must be able to say **"I don't know."**
8. Numbers are scores, not probabilities. Say so in the UI.
