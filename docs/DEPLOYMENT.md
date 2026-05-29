# Deployment Guide

## Required environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Express API port. Defaults to `3001`. |
| `REQUEST_BODY_LIMIT` | No | JSON body limit. Defaults to `5mb`. |
| `ALLOWED_ORIGINS` | Production | Comma-separated allowed frontend origins for CORS. |
| `ALLOW_DEMO_AUTH` | Production | Set to `false` to require real sessions instead of demo fallback. |
| `SUPABASE_URL` | Production | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production server only | Service role key for trusted backend persistence. Never expose in client code. |

## Supabase

1. Create a Supabase project.
2. Enable Supabase Auth email/password.
3. Run `supabase/migrations/20260529022100_initial_saas_schema.sql`.
4. Confirm RLS is enabled on all user-owned tables.
5. Store `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the backend hosting provider only.

## Render or Railway

Use this as a single-service deployment for the Express API plus static Vite build:

```bash
npm install
npm run build
npm start
```

Set:

```bash
NODE_ENV=production
ALLOW_DEMO_AUTH=false
ALLOWED_ORIGINS=https://your-frontend-domain.com
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Vercel

Recommended production split:

- Vercel: Vite frontend
- Render/Railway/Fly.io: Express API
- Supabase: Auth and database

Frontend build:

```bash
npm install
npm run build
```

Deploy `dist/` as static output. Configure API base URL before productionizing; the MVP currently uses Vite's dev proxy for `/api`.

## Demo account

Local development includes an in-memory demo account:

- Email: `demo@momentumai.local`
- Password: `demo1234`

Set `ALLOW_DEMO_AUTH=false` in production.

## Production checklist

- Use HTTPS-only domains.
- Set `ALLOWED_ORIGINS`.
- Disable demo auth.
- Use Supabase Auth for sessions.
- Keep service-role keys server-side only.
- Run `npm test` and `npm run build`.
- Confirm Chrome extension production URL points to the hosted app.
