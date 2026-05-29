# MomentumAI Job Copilot

MomentumAI is an AI-powered job copilot and career intelligence platform for test engineers, engineering technicians, validation specialists, quality professionals, and automotive testing candidates. It helps users import real jobs, analyze role fit, tailor truthful application packets, prepare interviews, close missing skill gaps, and improve their proprietary Momentum Score™ without relying solely on LinkedIn. Built with React, TypeScript, Node.js, Express, and Supabase.

The first version supports manual job intake: paste a job description from a company site, job board, recruiter email, or saved posting. The app scores the match against the user's profile, puts roles into a pending review queue, and generates resume and cover letter drafts only after the user chooses to review a job.

## MVP features

### AI Job Intelligence Engine

- Resume parsing for TXT/MD and backend support for PDF/DOCX extraction when readable in the local environment
- Structured resume intelligence: contact info, skills, experience signals, education, certifications, tools, and industry keywords
- Advanced job extraction from pasted descriptions, URLs, or recruiter email text with a manual review fallback
- Multi-factor job scoring with fit labels, score breakdowns, missing qualifications, red flags, growth signals, notes, and decision scorecards
- Application packet builder with tailored resume summary, skills, bullet suggestions, cover letter, recruiter message, LinkedIn message, and interview talking points
- Analytics for status mix, response rate, companies applied to, matched skills, missing skills, and sources
- Safety-first review flow: generated content is draft-only and must be reviewed before submission

### Core app

- React + TypeScript front end
- Node/Express API
- Supabase-ready persistence with in-memory demo fallback
- User profile for experience, skills, preferred titles, location, pay range, commute distance, base resume, and cover letter style
- Job search/preferences page for manually pasted postings
- Pending jobs dashboard with match score, required skills, fit reasons, and red flags
- Saved jobs page
- Resume and cover letter generator
- Application tracker with `Pending`, `Saved`, `Applied`, `Interview`, `Rejected`, and `Offer`
- Review-before-apply flow: the app never auto-submits an application

## Getting started

```bash
npm install
npm run dev
```

The React app runs on Vite and proxies `/api` calls to the Express server.

## Optional Supabase setup

The app runs with demo in-memory data when Supabase credentials are not configured. To persist profiles and jobs:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env`.
4. Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Restart `npm run dev`.

## Mobile and store-readiness path

The current product is a responsive web app. The fastest path toward Apple/Samsung distribution is to make the web app installable first, then wrap the same app with Capacitor or React Native once authentication, payments, and backend persistence are production-ready.

Near-term priorities:

- PWA installability and offline-friendly loading
- Authentication and per-user data isolation
- Subscription/paywall experiments
- Resume/job import reliability
- Mobile-first onboarding and notification strategy
- Privacy, accuracy, and generated-content safety reviews

## Future integrations

The MVP intentionally starts with manually pasted job descriptions. Later versions can add:

- Job API integrations
- Company career-page importing
- Browser extension support for clipping job descriptions
- Resume export to PDF/DOCX
- Real authentication and per-user row-level security
- More advanced AI matching and fraud/scam detection

## Phase 5+ product expansion

This branch now includes foundations for the next paid-SaaS layers:

- Smart URL import with server-side fetch attempts and provider detection for Greenhouse, Lever, Workday, generic company career pages, recruiter emails, and manual paste fallback
- AI Career Coach endpoint and dashboard section for interview diagnosis, career gaps, salary guidance, resume improvements, and interview prep focus
- Missing Skills Marketplace for saved jobs with projected score lift and curated learning resources
- AI Interview Simulator for saved jobs with technical, behavioral, role-specific questions, and STAR answer guidance
- Chrome extension starter in `extension/chrome` with popup, content script, and context menu to capture job pages and open MomentumAI's importer

The extension currently targets the local MVP URL (`http://localhost:5173`). For production, update the extension app URL to the hosted MomentumAI domain and package it through the Chrome Web Store workflow.

## SaaS foundation

MomentumAI now includes the foundation for production SaaS usage:

- Account registration, login, logout, and demo password reset endpoint
- Demo-memory multi-user workspaces for local development
- User-scoped profiles, jobs, notes, scorecards, packets, analytics, settings, and Momentum Score™
- Subscription-ready settings model with Free/Pro/Premium/Recruiter tiers and monthly analysis limits
- Supabase Auth/RLS schema for production row ownership across profiles, jobs, resume intelligence, intelligence events, settings, and subscriptions

Local demo credentials:

- Email: `demo@momentumai.local`
- Password: `demo1234`

The in-memory auth fallback is for local development. Production should use Supabase Auth, hosted secrets, email delivery, and server-side subscription webhooks.

## Production readiness

- Deployment guide: `docs/DEPLOYMENT.md`
- API guide: `docs/API.md`
- Architecture overview: `docs/ARCHITECTURE.md`
- First-time user launch QA: `docs/LAUNCH_QA.md`
- Supabase migration: `supabase/migrations/20260529022100_initial_saas_schema.sql`

Run verification before deployment:

```bash
npm test
npm run build
```

Known limitations are documented in `docs/ARCHITECTURE.md`.

## Public marketing and conversion

The app now includes a public-facing SaaS landing experience before authentication:

- Hero with Start free and View demo CTAs
- Product preview and feature sections
- Pricing page for Free, Pro, Premium, and Recruiter tiers
- Trust page covering review-before-apply, no fake experience, user control, and data ownership
- FAQ and social proof placeholders
- Post-registration onboarding flow for resume import, target roles, salary/location preferences, first job import, and first Momentum Score™
- SEO/OpenGraph metadata for a production marketing launch

## Email Intelligence Center

MomentumAI now includes a user-scoped email intelligence layer:

- Gmail and Outlook OAuth architecture with mock/demo fallback
- Recruiter outreach, interview request, confirmation, rejection, and offer detection
- Timeline events and suggested application status updates
- Follow-up, thank-you, and recruiter message drafts
- Dashboard widgets for recruiter activity, email activity, and follow-up reminders

The system follows review-before-action: it never sends emails automatically.
