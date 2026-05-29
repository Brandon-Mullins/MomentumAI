# MomentumAI Launch QA Checklist

Use this checklist before sharing MomentumAI with a first-time user.

## 1. Public landing and conversion

- Open the public URL on desktop and mobile.
- Confirm the landing page loads without signing in.
- Click **Start free** and confirm the signup card scrolls into view.
- Click **View demo** and confirm the dashboard loads.
- Visit Pricing and Trust sections from the landing header.
- Confirm FAQ, social proof placeholders, and final CTA are visible.

## 2. Demo experience

- Click **View demo** from the landing page.
- Confirm the dashboard shows a **This is demo data** badge.
- Confirm demo jobs look realistic for test engineering / automotive validation.
- Open a job card and confirm match score, missing skills, notes, decision helper, and red flags render.
- Generate an application packet from a demo job.
- Open Career Coach and run missing-skills / interview simulator analysis.
- Confirm demo users can explore without entering personal data.

## 3. Authentication

- Register a new account with name, email, and password.
- Confirm onboarding modal appears after signup.
- Log out.
- Log back in.
- Try password reset and confirm a safe demo reset response is shown.
- Confirm invalid tokens are rejected by API tests.

## 4. Onboarding

- On first login, confirm onboarding steps are visible:
  - Upload or paste resume
  - Choose target roles
  - Set salary/location preferences
  - Add first job
  - Generate Momentum Score
- Click each onboarding card and confirm it routes to the right workspace section.
- Confirm onboarding progress card appears until complete.
- Confirm progress is saved across reloads.

## 5. Resume/profile

- Upload or paste a text resume.
- Confirm parsed skills/profile suggestions appear.
- Edit extracted fields before saving.
- Save profile and confirm dashboard refreshes.
- Confirm trust copy says not to invent experience.

## 6. Job import and analysis

- Paste a plain job description.
- Paste a recruiter email-style job.
- Paste a Greenhouse/Lever/Workday-looking URL with content fallback.
- Confirm extracted title, company, location, pay, skills, and URL can be reviewed before saving.
- Save the job and confirm it appears in Pending Review.

## 7. Application packet

- Generate application packet from a job.
- Confirm tabs render:
  - Resume
  - Summary
  - Skills
  - Bullets
  - Cover letter
  - Recruiter
  - LinkedIn
  - Interview
- Copy each document type.
- Export resume or cover letter to PDF.
- Confirm safety checklist appears.
- Confirm the app does not auto-apply.

## 8. Application tracker and settings

- Save a job.
- Mark a job Applied.
- Move a job to Interview.
- Try Skip/Rejected and confirm a confirmation dialog appears.
- Open settings.
- Toggle Daily AI Job Agent and Email Digest.
- Save settings and confirm values persist in the session.

## 9. API reliability

- Confirm `/api/health` returns `ok: true`.
- Confirm `/api/ready` returns readiness checks.
- Stop the API locally and reload with cached dashboard data available.
- Confirm the app shows a friendly service status panel or cached-data banner, not a scary crash message.
- Confirm retry button attempts to reconnect.

## 10. Mobile and tablet

- Test at 390px width.
- Test at tablet width.
- Confirm landing page CTAs are reachable.
- Confirm sidebar navigation scrolls/collapses cleanly.
- Confirm modals fit inside the viewport and scroll internally.
- Confirm job cards do not overflow horizontally.
- Confirm pricing cards stack cleanly.

## 11. Browser extension

- Load `extension/chrome` as an unpacked Chrome extension.
- Open a job page.
- Click the extension popup's **Analyze in MomentumAI** button.
- Confirm MomentumAI opens with the job import payload preloaded.
- Test context menu **Analyze in MomentumAI**.

## Release blockers

- Any first-load API error on a healthy deployment.
- Demo mode fails.
- Signup/login fails.
- Job import crashes on malformed text.
- Application packet generation fails silently.
- Mobile modal is unusable.
- Generated document lacks review/no-fake-experience warning.
