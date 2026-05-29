# Architecture Overview

MomentumAI is currently a TypeScript full-stack MVP with a production-oriented SaaS foundation.

## Runtime

- Frontend: React, Vite, TailwindCSS, Framer Motion, shadcn-style primitives.
- Backend: Node.js, Express, Zod validation.
- Database target: Supabase Auth + Postgres + RLS.
- Local development: in-memory users, sessions, profiles, jobs, and settings.

## Data ownership

Every production table in `supabase/schema.sql` is owned by `user_id` and protected by RLS policies based on `auth.uid()`.

User-created data:

- settings
- profile
- jobs
- resume intelligence
- job intelligence events
- subscription record

## Security boundaries

- Passwords in local demo auth are hashed with `scrypt` and salted.
- Invalid tokens are rejected.
- Demo auth can be disabled with `ALLOW_DEMO_AUTH=false`.
- CORS is configurable with `ALLOWED_ORIGINS`.
- Request body size is capped with `REQUEST_BODY_LIMIT`.
- Imported job text and notes are sanitized before analysis.
- AI-style analysis endpoints are rate-limited and subject to subscription analysis limits.

## Known limitations

- Local auth is an MVP fallback, not a replacement for Supabase Auth.
- Rate limiting is in-memory and should be replaced with Redis/Upstash for multi-instance deployments.
- URL scraping depends on target-site availability and may require browser-extension capture.
- PDF/DOCX parsing can fail on scanned or protected documents.
- Billing fields are architecture-ready but not connected to Stripe/RevenueCat yet.

## Chrome extension

The starter extension lives in `extension/chrome`. It captures the active page and opens MomentumAI with an encoded `importJob` payload. Update the target app URL before packaging for the Chrome Web Store.
