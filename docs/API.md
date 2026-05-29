# API Overview

All endpoints return JSON. Authenticated requests use:

```http
Authorization: Bearer <token>
```

When `ALLOW_DEMO_AUTH` is not `false`, unauthenticated local requests use the demo workspace.

## Health

- `GET /api/health` - basic liveness.
- `GET /api/ready` - deployment readiness checks for CORS/demo auth/configuration.

## Auth

- `POST /api/auth/register` - create an account.
- `POST /api/auth/login` - sign in.
- `POST /api/auth/logout` - invalidate a session.
- `POST /api/auth/reset-password` - demo reset-token flow.
- `GET /api/auth/me` - current user.

## Dashboard and settings

- `GET /api/dashboard` - profile, jobs, applications, analytics, Momentum Score.
- `PATCH /api/settings` - daily agent, job source preferences, email digest, subscription settings.
- `PUT /api/profile` - save reviewed user profile.
- `GET /api/analytics` - application analytics.

## Resume and job intelligence

- `POST /api/resume/parse` - parse TXT/MD/PDF/DOCX payloads when readable.
- `POST /api/jobs/import` - extract structured job data from URL/text/recruiter email.
- `POST /api/jobs/score` - score a job without saving.
- `POST /api/jobs/manual` - save a reviewed job.

## Job workflow

- `PATCH /api/jobs/:id/status` - update status.
- `PATCH /api/jobs/:id/notes` - save private notes.
- `POST /api/jobs/:id/scorecard` - generate decision scorecard.
- `PATCH /api/jobs/:id/scorecard` - save scorecard.
- `POST /api/jobs/:id/generate` - generate application packet.
- `POST /api/jobs/:id/packet` - packet only.
- `GET /api/jobs/:id/skills-marketplace` - missing-skill learning plan.
- `POST /api/jobs/:id/interview` - interview simulator.

## Career coach

- `GET /api/career/coach` - interview diagnosis, missing skills, salary guidance, resume suggestions.

## Safety rules

- The API never auto-submits applications.
- Generated materials must be reviewed by the user.
- Imported text is sanitized and capped before scoring.
- Invalid session tokens return `401`.
- Auth and analysis endpoints are rate-limited in memory for the MVP.
