# CLAUDE.md — working agreement for this repository

## Read first

1. **`MEMORY.md`** — invariants, landmines and reference values. Read it before changing
   code. It exists so that expensive discoveries are made once.
2. **`PROJECT.md`** — what MacroSentinel is, how it is wired, its security posture and
   roadmap. Read it when you need orientation rather than specifics.
3. **`CHECKPOINT.md`** — what has changed recently and why.

## Standing obligations

These are the point of this file. Keep both documents alive.

**Update `MEMORY.md` whenever something recorded in it stops being true.** If you fix a
landmine, remove it from the landmine list and note the fix. If you delete code listed
under "Dead code", strike the row. If you change a TTL, a model ID or a cache key, update
the reference table. Stale memory is worse than no memory, because it is trusted.
Refresh the "Last verified" line whenever you revise it substantively.

**Append to `CHECKPOINT.md` for any important change**, newest first, using the template at
the top of that file. Important means: architecture or data flow, security, dependencies or
model versions, schema or API contract, deployment and configuration, whole-file deletions,
or a decision that closes an open question in `MEMORY.md`. Copy tweaks, restyling and
behaviour-preserving renames do not need an entry.

When a change is significant enough to checkpoint, it is usually significant enough to
touch memory too. Do both in the same commit as the code change, not afterwards.

## Before you change anything

- **Never introduce a `VITE_`-prefixed environment variable for a secret**, and never read
  `import.meta.env` for anything that is not safe to publish. Vite inlines those into the
  public bundle — this has already leaked the Anthropic API key and the admin PIN. See the
  landmine section of `MEMORY.md`.
- **Do not reason as though `global._appStore` were a real cache.** It is per-instance
  memory on ephemeral serverless containers.
- **Do not extend `api/chat.js`.** It is dead code and an unauthenticated open proxy; the
  intended action is deletion.
- The client and server each keep their own copy of the 47-asset universe
  (`src/lib/assets.js` and the group constants in `api/refresh.js`). Change one, change the
  other.

## House style

Match the surrounding code rather than modernising it opportunistically: ES5-flavoured
JavaScript (`var`, `function` expressions, indexed loops), inline style objects using the
CSS custom properties from `src/index.css`, no TypeScript, no state library. New colours
and fonts come from the existing design tokens.

## Verifying work

There are no tests, no linter and no CI, so verification is manual:

```bash
npm install
npm run build     # must succeed — this is the only automated gate that exists
vercel dev        # required to exercise /api/*; plain `npm run dev` serves the frontend only
```

If you touch a pure function with real edge cases — `parseJSON`, `getRecencyWeight`,
`getAffectedAssets` — exercise it directly with `node -e` before claiming it works. Several
of the bugs recorded in `MEMORY.md` were found exactly that way.
