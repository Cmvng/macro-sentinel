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

## 2026-08-29 — Linting, a secret gate in CI, and dead-code removal
**Type:** infra
**Branch:** `claude/port-v11`

Added ESLint (with `eslint-plugin-react` so JSX-used identifiers are not reported as
unused) and a `npm run lint` script. This exists because the `sourceCoverage` crash was
exactly the class of bug `no-undef` catches, and it was found only by opening the built
app in a browser. A clean `npm run build` says nothing about whether the app runs.

A repo-wide `no-undef` sweep found **no other undefined identifiers**, so that crash was
the only one of its kind.

**CI now gates on more than the build.** `.github/workflows/ci.yml` runs `npm ci`, then
lint, tests, build, and finally a canary build that fails if `sk-ant` appears anywhere in
`dist/`. That last step turns the manual check into an automatic one. `package-lock.json`
is now committed — `npm ci` needs it, and builds were not reproducible without it.

**Dead code removed.** `api/refresh.js` still carried the entire pre-extraction RSS
pipeline: `fetchOne`, `parseItems`, `sourceName`, `trustScore` and `decodeXml`, all
orphaned when the pipeline moved to `api/feedPipeline.js`, plus an unused `escapeRegExp`
there. 68 lines, verified unreachable by reference count before deletion. Also cleared
five useless backtick escapes in `parseJSON`.

**Verified:** lint clean, 26/26 tests, build passes, the CI canary gate passes locally,
and browser checks still green in both themes and all freshness states.

**Memory updated:** no — no invariant or reference value changed.

---

## 2026-08-29 — Data freshness now reports the real age
**Type:** fix
**Branch:** `claude/port-v11`

The "Data freshness" card read **Pending / No completed run** for data that was only
minutes old, and the footer said "Awaiting first analysis" indefinitely.

`generated_at` was returned only by the fresh-build branch of `api/refresh.js`. Every
cache hit — the normal steady state — omitted it, so `Dashboard` set `lastUpdate` to
`null` and the card fell to its "Pending" arm. The card was also binary: `Current` if a
timestamp existed, `Pending` otherwise, so a day-old cache would have read `Current`.

Fixed on three levels:
- the cached response now carries `generated_at`, derived from `signalsTime`;
- `claudeEngine` passes `age_minutes` through, and `Dashboard` derives a timestamp from
  it when the server omits one, so the display degrades gracefully;
- the card is graded — `Current` under 90 minutes, `Delayed` beyond that, `Stale` past a
  day — and shows the real age beside the clock time.

**Verified:** 26/26 tests, and browser checks at 12 min, 2h20, and 2000 min, plus the
original failure mode (a cache hit with no `generated_at`), which now reports `Current ·
30 min old` instead of `Pending`.

**Memory updated:** no — no invariant or reference value changed.

---

## 2026-08-29 — Reconciled parallel work; fixed a crash on `main`
**Type:** fix / security / feature
**Branch:** `claude/port-v11` (based on `origin/main` @ `845ecea`)

Two implementations of the same roadmap existed in parallel. `main` (the P0 / UI / P1
commits) was kept as the base because it is deployed and carries dark mode, CI, a README
and the extracted `api/feedPipeline.js`. The competing branch `claude/hello-5v6vjs` is
preserved but not merged; its distinct work was ported here instead.

**`main` was crashing.** `MarketHeader` read `sourceCoverage` in two places but never
destructured it from props, so every render threw `sourceCoverage is not defined`. With no
error boundary that is a blank page for every visitor. Fixed, and a regression test now
asserts that every prop `Dashboard` passes is destructured by the child — verified by
mutation (reintroducing the bug fails the suite).

**Ported from the parallel branch**
- Light-theme palette re-derived for WCAG AA. Measured before: `text-muted` 3.37:1,
  `accent` 3.19, `amber` 3.01, and every tinted badge failing. All now clear 4.5 on the
  four backgrounds they appear on. The dark theme already passed and is untouched.
- `api/assetKeywords.js` — leg-composed keywords covering all 47 instruments (was 16) with
  word-boundary matching, so `'war'` inside "warns" no longer attributes Fed news to gold.
  Used by both `relevantNews` and `feedPipeline.assetTerms`.
- Analysis failures are no longer cached; `'Analysis unavailable.'` used to persist for two
  hours after one transient provider error.
- Keyboard-operable signal rows, `:focus-visible` beyond buttons, a skip link,
  `prefers-reduced-motion`, and real `<a rel="noopener noreferrer">` news links with scheme
  validation, so a `javascript:` URL from a feed can no longer become a link.
- Sorting, signal filtering, search, watchlist, `scrollIntoView` for the analysis panel, an
  error boundary, and a footer stating that scores are pressure, not probability.
- 12px type floor on the table and news feed.
- 18 new tests beside the existing 6 — 24 total, all passing.

**Verified:** 24/24 tests, passing build, and 14 Playwright interaction checks covering both
themes against a mocked API.

**Watch out for:** `ADMIN_SECRET` is not part of this base — `main` removed the admin page
and reserves forced refresh for the cron via `CRON_SECRET`. That decision was kept.
`global._macroSentinelStore` is still per-instance memory on ephemeral containers.

**Memory updated:** yes.

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
