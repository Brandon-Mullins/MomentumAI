import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateApplication, scoreJob } from "../shared/matching";
import { defaultProfile, seedJobs } from "../shared/seedData";
import type { ApplicationStatus, JobPosting, UserProfile } from "../shared/types";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

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
  ])
});

const jobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  source: z.string().min(1),
  pay: z.string().optional(),
  description: z.string().min(20)
});

const statusSchema = z.object({
  status: z.enum(["Pending", "Saved", "Applied", "Interview", "Rejected", "Offer"])
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
  jobs = jobs.map((job) => ({
    ...job,
    ...scoreJob(profile, job)
  }));
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
  res.json({
    profile,
    jobs: jobs.sort((a, b) => b.matchScore - a.matchScore),
    applications: jobs.filter((job) => ["Saved", "Applied", "Interview", "Rejected", "Offer"].includes(job.status))
  });
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

app.patch("/api/jobs/:id/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const job = jobs.find((candidate) => candidate.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  job.status = parsed.data.status as ApplicationStatus;
  await persistJob(job);
  res.json(job);
});

app.post("/api/jobs/:id/generate", (req, res) => {
  const job = jobs.find((candidate) => candidate.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(generateApplication(profile, job));
});

app.listen(port, () => {
  console.log(`MomentumAI job copilot API running on http://localhost:${port}`);
});
