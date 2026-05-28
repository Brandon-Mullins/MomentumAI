import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildAnalytics,
  buildDecisionScorecard,
  extractJobData,
  generateApplication,
  parseResumeText,
  scoreJob
} from "../shared/matching";
import { defaultProfile, seedJobs } from "../shared/seedData";
import type {
  ApplicationStatus,
  JobDecisionScorecard,
  JobNotes,
  JobPosting,
  ParsedResume,
  ProfileSuggestion,
  UserProfile
} from "../shared/types";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

let profile: UserProfile = defaultProfile;
let jobs: JobPosting[] = seedJobs.map((job, index) => ({
  id: `demo-${index + 1}`,
  createdAt: new Date(Date.now() - index * 1000 * 60 * 20).toISOString(),
  status: "Pending",
  ...scoreJob(defaultProfile, job)
}));

const parsedResumeSchema = z.object({
  name: z.string().default(""),
  contactInfo: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  workExperience: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  toolsTechnologies: z.array(z.string()).default([]),
  industryKeywords: z.array(z.string()).default([]),
  rawText: z.string().default("")
});

const suggestionSchema = z.object({
  category: z.string(),
  suggestion: z.string(),
  impact: z.enum(["High", "Medium", "Low"])
});

const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  location: z.string().min(1),
  commuteMiles: z.coerce.number().nonnegative(),
  desiredPayMin: z.coerce.number().nonnegative(),
  desiredPayMax: z.coerce.number().nonnegative(),
  preferredTitles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  experience: z.string().default(""),
  resume: z.string().default(""),
  coverLetterStyle: z.enum([
    "Direct and practical",
    "Warm and confident",
    "Technical and detailed",
    "Entry-level and eager"
  ]),
  parsedResume: parsedResumeSchema.optional(),
  profileStrength: z.number().optional(),
  profileSuggestions: z.array(suggestionSchema).optional()
});

const jobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  source: z.string().min(1),
  pay: z.string().optional(),
  description: z.string().min(20),
  preferredSkills: z.array(z.string()).optional(),
  yearsExperience: z.string().optional(),
  employmentType: z.string().optional(),
  applicationUrl: z.string().optional()
});

const statusSchema = z.object({
  status: z.enum(["Pending", "Saved", "Applied", "Interview", "Rejected", "Offer"])
});

const resumeUploadSchema = z.object({
  filename: z.string().default("resume.txt"),
  mimeType: z.string().default("text/plain"),
  contentBase64: z.string().optional(),
  text: z.string().optional()
});

const importSchema = z.object({
  text: z.string().optional(),
  url: z.string().optional(),
  recruiterEmail: z.string().optional(),
  source: z.string().optional()
});

const notesSchema = z.object({
  text: z.string().max(5000).default("")
});

const scorecardSchema = z.object({
  pay: z.coerce.number().min(0).max(100),
  commute: z.coerce.number().min(0).max(100),
  careerGrowth: z.coerce.number().min(0).max(100),
  workLifeBalance: z.coerce.number().min(0).max(100),
  companyConfidence: z.coerce.number().min(0).max(100),
  roleFit: z.coerce.number().min(0).max(100),
  recommendation: z.enum(["Apply now", "Save for later", "Skip", "Needs more research"]),
  rationale: z.array(z.string()).default([])
});

async function persistProfile(nextProfile: UserProfile) {
  if (!supabase) return;
  await supabase.from("profiles").upsert({
    id: "demo-user",
    payload: nextProfile,
    updated_at: new Date().toISOString()
  });
}

async function persistJob(job: JobPosting) {
  if (!supabase) return;
  await supabase.from("jobs").upsert({
    id: job.id,
    payload: job,
    status: job.status,
    updated_at: new Date().toISOString()
  });
}

function rescoreJobs() {
  jobs = jobs.map((job) => {
    const rescored = scoreJob(profile, job);
    return {
      ...job,
      ...rescored,
      id: job.id,
      status: job.status,
      notes: job.notes,
      scorecard: job.scorecard ?? rescored.scorecard,
      createdAt: job.createdAt
    };
  });
}

async function extractTextFromUpload(input: z.infer<typeof resumeUploadSchema>) {
  if (input.text?.trim()) return input.text;
  if (!input.contentBase64) return "";

  const buffer = Buffer.from(input.contentBase64, "base64");
  const fileName = input.filename.toLowerCase();
  const mime = input.mimeType.toLowerCase();

  if (fileName.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileName.endsWith(".pdf") || mime.includes("pdf")) {
    const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text;
  }

  return buffer.toString("utf8");
}

function findJob(id: string) {
  return jobs.find((candidate) => candidate.id === id);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: supabase ? "supabase" : "demo-memory",
    message: supabase
      ? "Connected to Supabase client"
      : "Running with in-memory demo data until Supabase env vars are configured"
  });
});

app.get("/api/dashboard", (_req, res) => {
  const sortedJobs = [...jobs].sort((a, b) => b.matchScore - a.matchScore);
  res.json({
    profile,
    jobs: sortedJobs,
    applications: sortedJobs.filter((job) => ["Saved", "Applied", "Interview", "Rejected", "Offer"].includes(job.status)),
    analytics: buildAnalytics(sortedJobs)
  });
});

app.get("/api/analytics", (_req, res) => {
  res.json(buildAnalytics(jobs));
});

app.put("/api/profile", async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  profile = parsed.data;
  rescoreJobs();
  await persistProfile(profile);
  res.json(profile);
});

app.post("/api/resume/parse", async (req, res) => {
  const parsed = resumeUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const text = await extractTextFromUpload(parsed.data);
    if (!text.trim()) {
      return res.status(400).json({ error: "No readable resume text found" });
    }

    const result = parseResumeText(text);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: "Could not parse this resume. Try TXT/MD, or paste the text manually.",
      detail: error instanceof Error ? error.message : "Unknown parsing error"
    });
  }
});

app.post("/api/jobs/import", (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const hasContent = [parsed.data.text, parsed.data.url, parsed.data.recruiterEmail].some((value) => value?.trim());
  if (!hasContent) {
    return res.status(400).json({ error: "Paste a job description, URL, or recruiter email first" });
  }

  res.json(extractJobData(parsed.data));
});

app.post("/api/jobs/manual", async (req, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const job: JobPosting = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "Pending",
    ...scoreJob(profile, parsed.data)
  };

  jobs = [job, ...jobs];
  await persistJob(job);
  res.status(201).json(job);
});

app.post("/api/jobs/score", (req, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  res.json(scoreJob(profile, parsed.data));
});

app.patch("/api/jobs/:id/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const job = findJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  job.status = parsed.data.status as ApplicationStatus;
  await persistJob(job);
  res.json(job);
});

app.patch("/api/jobs/:id/notes", async (req, res) => {
  const parsed = notesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const job = findJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const notes: JobNotes = { text: parsed.data.text, updatedAt: new Date().toISOString() };
  job.notes = notes;
  await persistJob(job);
  res.json(job);
});

app.patch("/api/jobs/:id/scorecard", async (req, res) => {
  const parsed = scorecardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const job = findJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  job.scorecard = parsed.data as JobDecisionScorecard;
  await persistJob(job);
  res.json(job);
});

app.post("/api/jobs/:id/scorecard", (req, res) => {
  const job = findJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json(buildDecisionScorecard(profile, job, job.matchScore, job.scoreBreakdown, job.redFlags));
});

app.post("/api/jobs/:id/generate", (req, res) => {
  const job = findJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(generateApplication(profile, job));
});

app.post("/api/jobs/:id/packet", (req, res) => {
  const job = findJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(generateApplication(profile, job).packet);
});

app.listen(port, () => {
  console.log(`MomentumAI job copilot API running on http://localhost:${port}`);
});
