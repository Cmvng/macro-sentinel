# CLAUDE.md — working agreement for this repository

## Read first

1. **`MEMORY.md`** — invariants, landmines, reference values, and what was already fixed.
   Read it before changing code. It exists so expensive discoveries are made once.
2. **`CHECKPOINT.md`** — what changed recently and why, newest first.
3. **`PROJECT.md`** and the `MACROSENTINEL_*.md` documents describe the **pre-hardening**
   state of the app. Trust them for history and intent, not for current behaviour; where
   they disagree with `MEMORY.md` or the source, the source wins.

## Standing obligations

**Update `MEMORY.md` whenever something recorded in it stops being true.** If you fix a
landmine, remove it and note the fix. If you change a TTL, model ID, cache key or rule,
update the reference table. Stale memory is worse than none, because it is trusted. Refresh
the "Last verified" line when you revise it substantively.

**Append to `CHECKPOINT.md` for any important change**, newest first, using the template at
the top of that file. Important means: architecture or data flow, security, dependencies or
model versions, schema or API contract, deployment and configuration, whole-file deletions,
or a decision that closes an open question in `MEMORY.md`. Copy tweaks and behaviour-
preserving renames do not need an entry.

Do both in the same commit as the code change, not afterwards.

## Before you change anything

- **Never introduce a `VITE_`-prefixed variable for a secret**, and never read
  `import.meta.env` for anything not safe to publish. Vite inlines those into the public
  bundle. This already leaked the Anthropic key once. CI runs a canary build that fails if
  `sk-ant` appears in `dist/`.
- **`global._macroSentinelStore` is not a real cache.** It is per-instance memory on
  ephemeral serverless containers.
- **Everything in `api/` becomes a Vercel function.** Put client-only logic in `src/lib/`.
- **Model output and feed text are untrusted.** Validate model JSON; render feed text only
  as React text; keep news inside the `<news>` fence in prompts.
- **Economic-release interpretation is deterministic** (`src/lib/releaseModel.js`). Do not
  put a model between a number and the bias shown for it. The schedule feed has **no actual
  results**; they come from a second, unofficial source merged in `api/calendar.js` under strict
  matching rules (see `MEMORY.md`). Never show a result the app did not actually receive, and
  never loosen the matching to get more coverage: a missing result is fine, a wrong one is not.
- The client and server each keep a copy of the 47-asset universe (`src/lib/assets.js` and
  the group constants in `api/refresh.js`). Change one, change the other.

## House style

ES5-flavoured JavaScript (`var`, `function` expressions, indexed loops). Class-based styling
in `src/index.css` using the CSS custom properties, with local inline styles for one-off
layout. Type sizes come from the existing scale; **12px is the floor**. Colours come from
tokens; never hard-code a colour, and never put white text on a themed fill — use
`var(--on-solid)`. No TypeScript, no state library.

## Verifying work

```bash
npm ci
npm run lint      # includes no-undef, which catches components that use undeclared props
npm test          # pure-function tests, no network, no model calls
npm run build
npm run e2e       # drives the built app in Chromium: keyboard, both themes, releases, axe
```

**A green build does not prove the app runs.** A component that read an undeclared prop once
shipped a blank page through a passing build, and only a real browser caught it. For any UI
change, run `npm run e2e` (or open the app) before claiming it works. `e2e` needs Chromium
and is not part of CI.

When you touch a pure function with real edge cases, exercise it directly before claiming it
works, and prove new tests are not vacuous by breaking the code and watching them fail.
