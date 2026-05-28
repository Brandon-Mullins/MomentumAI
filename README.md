# MomentumAI Job Copilot

MomentumAI Job Copilot is an MVP web app for people trying to break into test engineering, engineering technician, quality, validation, and automotive testing roles without relying only on LinkedIn.

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

## Future integrations

The MVP intentionally starts with manually pasted job descriptions. Later versions can add:

- Job API integrations
- Company career-page importing
- Browser extension support for clipping job descriptions
- Resume export to PDF/DOCX
- Real authentication and per-user row-level security
- More advanced AI matching and fraud/scam detection
