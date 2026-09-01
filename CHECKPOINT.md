# CHECKPOINT — MacroSentinel

Append-only log of **important** changes. Newest first.

A change earns an entry if it would surprise someone returning to the repo after a month:
architecture or data-flow changes, security fixes, dependency or model changes, schema or
contract changes, deployment/config changes, deletions of whole files, or a decision that
closes an open question in `MEMORY.md`.

A change does **not** earn an entry if it is a copy tweak, a style adjustment, a rename with
no behavioural effect, or routine dependency patching.

**Entry template**

```markdown
## YYYY-MM-DD — Short title
**Type:** feature | fix | security | refactor | infra | decision
**Commit(s):** `abc1234`

What changed, and why. State the user-visible or operational effect.

**Watch out for:** anything a future reader could trip over.
**Memory updated:** yes/no — which sections of `MEMORY.md` changed.
```

---

## 2026-08-28 — v1.1: security, honesty, accessibility and pipeline hardening
**Type:** security / fix / feature
**Branch:** `claude/hello-5v6vjs`

First release that changes application code. Implements P0 security, Tier 1 trust,
Tier 2 accessibility and Tier 3 functionality from the reviews, plus the coupled
feed-reach + clustering fix that had to ship together.

**Security.** `import.meta.env` removed from `src/` entirely — a canary build now shows
zero `sk-ant` occurrences in `dist/`. `api/chat.js` (the open proxy) deleted. The admin
PIN is gone; `/admin` sends a secret compared against `ADMIN_SECRET` server-side.
`force: true` and `check_breaking` require `ADMIN_SECRET` or `CRON_SECRET` and fail closed.
`handleAnalyze` allowlists `asset` to the known 47 and derives news server-side, closing
the cache-poisoning path. News is fenced as data in both prompts.

**Honesty.** The header now reports the API's real `age_minutes` instead of the client
clock, with `LIVE` / `DELAYED` / `PARTIAL` / `STALE` states, feed health and degraded-group
counts. API errors and truncated responses are detected (`r.ok`, `stop_reason`) and never
cached as results. A failed group no longer overwrites live signals.

**Pipeline.** `check_breaking` writes `partialTime` instead of resetting `signalsTime`, so
the 24h rebuild can fire. Event clustering collapses syndicated coverage and counts
independent sources; `selectForAssets` ranks by relevance × tier × recency × independence
rather than array position. Word-boundary matching; all 47 instruments attributable via
compositional keywords. Parser handles RSS 1.0/2.0, namespaced, Atom and multi-line titles.

**Accessibility.** Palette re-derived against WCAG AA — `--text-muted` and all five signal
badges now pass on the backgrounds they actually appear on. Keyboard-operable rows,
`:focus-visible`, skip link, real anchors with `rel="noopener noreferrer"`,
`prefers-reduced-motion`, pausable ticker, 12px type floor.

**Functionality.** Sorting, filtering, search, watchlist, manual refresh, scroll-into-view
for the analysis panel, error boundary, disclaimer.

**Verified:** 45 pure-function tests (`npm test`), build passes, canary shows no secret in
`dist/`, and 26 Playwright interaction checks plus all four freshness states against a
mocked API.

**Watch out for:** the server reads `ANTHROPIC_API_KEY` but still falls back to
`VITE_ANTHROPIC_KEY`, so existing deployments keep working. Set the new name in Vercel,
then **rotate the key** — the old one was public. `ADMIN_SECRET` must be set or `/admin`
and forced refreshes will refuse to run. `global._appStore` is still per-instance memory.

**Memory updated:** yes — `MEMORY.md` rewritten, with a "Fixed" register so a future audit
does not re-report resolved issues.

---

## 2026-08-28 — UI/UX and functionality review
**Type:** infra
**Branch:** `claude/hello-5v6vjs`

Added `MACROSENTINEL_UX_REVIEW.md`. Read-only; no application code changed.

Measured rather than eyeballed: WCAG contrast ratios with alpha compositing, the
distribution of all 81 inline `fontSize` declarations, and keyboard/ARIA coverage.

Headline finding: **the header's "last updated" time is fabricated.** `api/refresh.js`
returns `cached`, `age_minutes` and `next_refresh_hours`; `scoreAssets()` discards all
three and `Dashboard` stamps `new Date()` unconditionally. Day-old cached signals display
the current time beside a pulsing `LIVE` dot.

Also measured: every signal badge fails WCAG AA (BUY is worst at 2.76:1), `--text-muted`
fails on all four backgrounds it is used on, there are zero `tabIndex`/`role`/`aria-*`
attributes in the codebase, no `:focus` styles at all, and no `prefers-reduced-motion`
despite five looping animations. The analysis panel renders below the entire table, so
clicking a top row puts the result off-screen.

**Watch out for:** `--text-muted: #7a9a7a` is a single token behind most of the contrast
failures. Darkening it to roughly `#4a6a4a` fixes the majority in one edit — do that rather
than patching call sites individually.

**Memory updated:** no — no invariant or reference value changed.

---

## 2026-08-28 — Audit and roadmap merged to `main` and deployed
**Type:** infra
**Commit:** `ee016f8` (merge) · **Branch:** `claude/hello-5v6vjs` → `main`

Merged the Phase 0 audit (`MACROSENTINEL_ARCHITECTURE.md`) and the remaining-work plan
(`MACROSENTINEL_ROADMAP.md`) into `main`, which triggers a Vercel rebuild.

**Documentation only — no application code changed.** The rebuilt site is functionally
identical to the previous deploy. Build verified beforehand: 41 modules, 180.98 kB JS
(55.07 kB gzip), 1.37s.

**Watch out for:** this deploy fixes nothing. Every weakness in the audit is still live,
including the Anthropic API key inlined in the public client bundle. The correct sequence
is P0.1 (remove the `VITE_` read) → deploy → *then* rotate the key, so the replacement is
never published. Rotating first would leak the new key on the next build.

The deploy itself could not be verified from the authoring session: no Vercel CLI or token
was available, and the `vercel.app` host is blocked by that session's egress policy.
Confirm in the Vercel dashboard.

**Memory updated:** no — no invariant, landmine or reference value changed.

---

## 2026-08-28 — Project documented; memory and checkpoint convention established
**Type:** infra
**Branch:** `claude/hello-5v6vjs`

Audited the repository end to end and added three companion documents: `PROJECT.md`
(what the project is, architecture, security posture, roadmap), `MEMORY.md` (durable
working memory — invariants, landmines, reference values), and this checkpoint log.
`CLAUDE.md` was added to bind future sessions to keeping both current.

No application code was changed.

Findings worth carrying forward, all verified rather than inferred:

- **The Anthropic API key ships to the browser.** `VITE_ANTHROPIC_KEY` is read via
  `import.meta.env` at `src/App.jsx:5`; Vite inlines `VITE_`-prefixed build-time variables
  into the client bundle. A canary build produced
  `var Zu="sk-ant-api03-CANARY-LEAK-TEST-123456789"` in `dist/assets/index-*.js`. The
  admin PIN leaks the same way. The value is entirely unused downstream, so the fix is a
  pure deletion.
- **`api/chat.js` is an unauthenticated open proxy** to `api.anthropic.com` with
  `Access-Control-Allow-Origin: *`, forwarding `req.body` verbatim with the server key. It
  is referenced by no frontend code. It should be deleted.
- **`global._appStore` caching does not work as intended** — per-instance memory on
  ephemeral serverless containers, so the nightly cron warms a container that likely never
  serves a request.
- **Malformed RSS dates silently drop articles** via a `NaN` fall-through in
  `getRecencyWeight()`.
- No secrets have ever been committed; `.gitignore` has covered `.env*` from the start.

**Watch out for:** the P0 security items in `PROJECT.md` §7 are not yet fixed — this
checkpoint records them, it does not resolve them.
**Memory updated:** yes — `MEMORY.md` created in full.

---

## 2026-04-14 → 2026-04-15 — Baseline (pre-documentation history)
**Type:** feature
**Commits:** 50, from repository creation through `1034d07`

Reconstructed from git history for context; not an authored checkpoint.

The application was built over two days, almost entirely through the GitHub web UI
(commit titles are overwhelmingly `Update <File>.jsx`). The arc of the history:

- Initial Vite + React scaffold, asset universe and design system.
- RSS ingestion and the Claude scoring pipeline in `api/chat.js`.
- Extraction of the signal pipeline into `api/refresh.js` with a four-action handler,
  in-memory caching and grouped scoring — `api/chat.js` was left behind rather than
  removed, which is why it is now dead code.
- Breaking-news detection and partial re-scoring.
- `AdminPage.jsx` added last, introducing the PIN gate and the operator panel.

**Watch out for:** there is no tagged release and no lockfile, so "the state at commit
`1034d07`" is the only meaningful baseline.
**Memory updated:** n/a — predates `MEMORY.md`.
