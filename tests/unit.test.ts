import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalytics,
  buildCareerCoachReport,
  buildMissingSkillsMarketplace,
  extractJobData,
  generateApplication,
  parseResumeText,
  scoreJob
} from "../shared/matching";
import { buildResumeStudio, escapeLatex } from "../shared/resumeStudio";
import { defaultProfile } from "../shared/seedData";
import { buildMomentumScore } from "../server/index";
import type { JobPosting } from "../shared/types";

test("parseResumeText extracts structured resume data", () => {
  const result = parseResumeText(
    "Jordan Test\\njordan@example.com 313-555-1212\\nValidation technician with manual testing, Jira, Python, diagnostics, automotive root cause troubleshooting. Associate degree. Six Sigma."
  );

  assert.equal(result.parsedResume.name, "Jordan Test");
  assert.ok(result.parsedResume.contactInfo.includes("jordan@example.com"));
  assert.ok(result.parsedResume.skills.includes("manual testing"));
  assert.ok(result.profileStrength > 60);
});

test("extractJobData handles recruiter-style job text safely", () => {
  const draft = extractJobData({
    text: "Validation Technician at Ford in Dearborn, MI. Pay $30-$38/hr. Requires CAN, diagnostics, Jira, test cases, and PPAP.",
    url: "https://jobs.lever.co/ford/example"
  });

  assert.equal(draft.title, "Validation Technician");
  assert.equal(draft.company, "Ford");
  assert.equal(draft.sourceProvider, "Lever");
  assert.ok(draft.requiredSkills.includes("diagnostics"));
});

test("scoreJob produces advanced fit labels and breakdowns", () => {
  const scored = scoreJob(defaultProfile, {
    title: "Automotive Validation Technician",
    company: "Ford",
    location: "Detroit, MI",
    source: "Unit test",
    pay: "$32-$42/hr",
    description: "Create test cases, run automotive validation, document Jira defects, diagnostics, troubleshooting, Python helpful, training provided."
  });

  assert.ok(scored.matchScore >= 70);
  assert.ok(scored.scoreBreakdown);
  assert.ok(["Strong fit", "Possible fit", "Stretch role"].includes(scored.fitLabel ?? ""));
});

test("Momentum Score combines resume, market, match, and interview readiness", () => {
  const job: JobPosting = {
    id: "job-1",
    createdAt: new Date().toISOString(),
    status: "Applied",
    ...scoreJob(defaultProfile, {
      title: "QA Test Analyst",
      company: "Northstar",
      location: "Remote",
      source: "Unit test",
      pay: "$75,000",
      description: "Manual testing, test cases, Jira, Python, QA reports, validation."
    })
  };
  const score = buildMomentumScore(defaultProfile, [job]);

  assert.ok(score.overall > 0);
  assert.ok(score.resumeStrength > 0);
  assert.equal(score.nextActions.length, 3);
});

test("analytics and marketplace remain stable with demo jobs", () => {
  const job: JobPosting = {
    id: "job-2",
    createdAt: new Date().toISOString(),
    status: "Pending",
    ...scoreJob(defaultProfile, {
      title: "SDET",
      company: "Test Co",
      location: "Remote",
      source: "Unit test",
      description: "Selenium, Python, SQL, automated testing, regression testing."
    })
  };
  const analytics = buildAnalytics([job]);
  const marketplace = buildMissingSkillsMarketplace(defaultProfile, job);
  const coach = buildCareerCoachReport(defaultProfile, [job]);
  const generated = generateApplication(defaultProfile, job);

  assert.equal(analytics.applicationsByStatus.Pending, 1);
  assert.ok(marketplace.projectedScore >= marketplace.currentScore);
  assert.ok(coach.interviewDiagnosis.length > 0);
  assert.ok(generated.checklist.some((item) => item.includes("Do not claim")));
});


test("escapeLatex escapes Overleaf special characters", () => {
  assert.equal(
    escapeLatex("CAN & LIN_100% #1 $value {test}"),
    "CAN \\& LIN\\_100\\% \\#1 \\$value \\{test\\}"
  );
});

test("buildResumeStudio creates professional editable resume assets", () => {
  const job: JobPosting = {
    id: "job-3",
    createdAt: new Date().toISOString(),
    status: "Pending",
    ...scoreJob(defaultProfile, {
      title: "Automotive Validation Engineer",
      company: "Ford",
      location: "Dearborn, MI",
      source: "Unit test",
      pay: "$38/hr",
      description: "Automotive validation role requiring CAN, Jira, diagnostics, test cases, root cause, PPAP, and documentation."
    })
  };
  const generated = generateApplication(defaultProfile, job);
  const studio = buildResumeStudio(defaultProfile, job, generated, {
    template: "Automotive Test Engineer",
    coverLetterStyle: "Automotive",
    pageLength: "one-page"
  });

  assert.ok(studio.resumeTex.includes("\\documentclass"));
  assert.ok(studio.resumeTex.includes("EDITABLE EXPERIENCE"));
  assert.ok(studio.coverLetterTex.includes("\\begin{letter}"));
  assert.ok(studio.score.atsScore > 0);
  assert.ok(studio.warnings.some((warning) => warning.includes("Do not claim")));
  assert.ok(studio.includedSections.some((section) => section.section === "Core Skills"));
});
