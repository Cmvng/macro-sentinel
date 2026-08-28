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
