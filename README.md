# MacroSentinel

MacroSentinel is a React/Vite dashboard that generates macro-market commentary from RSS evidence.

## Secure configuration

All provider credentials must be configured as Vercel environment variables and must never use the `VITE_` prefix.

Required production variables:

- `ANTHROPIC_API_KEY` — server-only Anthropic credential.
- `CRON_SECRET` — long random value used to authenticate Vercel's scheduled refresh.

For a transition without downtime, the server accepts an existing `VITE_ANTHROPIC_KEY` only as a temporary server-side fallback. Add `ANTHROPIC_API_KEY`, deploy this branch, verify the browser bundle contains no provider key, then remove the legacy Vercel variable. Do not add it to client code again.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Use `npm test` for the P0 secret-boundary regression checks and `npm run build` before deployment.

## Operational behavior

- Browser requests never contain a provider key.
- `POST /api/refresh` supports public reads and controlled instrument analysis.
- Full refreshes run through Vercel Cron using `GET /api/refresh` with `CRON_SECRET`.
- Force refreshes and browser-side admin controls are intentionally disabled until a real server-side authentication layer exists.
- Provider failures return an explicit unavailable state; they are never saved as neutral market signals.

MacroSentinel provides informational market commentary only. It is not investment advice.
