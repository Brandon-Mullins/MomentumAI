import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createRequire } from "node:module";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import {
  buildAnalytics,
  buildCareerCoachReport,
  buildDecisionScorecard,
  buildInterviewSimulator,
  buildMissingSkillsMarketplace,
  extractJobData,
  generateApplication,
  htmlToJobText,
  parseResumeText,
  scoreJob
} from "../shared/matching";
import { defaultProfile, seedJobs } from "../shared/seedData";
import { applyEmailPipelineSuggestions, buildFollowUps, buildTimelineFromEmails, classifyEmail, providerFor, summarizeEmailActivity, type EmailMessage, type EmailProvider, type TimelineEvent } from "../shared/emailIntelligence";
import type {
  ApplicationStatus,
  JobDecisionScorecard,
  JobNotes,
  JobPosting,
  MomentumScore,
  UserProfile,
  UserSettings
} from "../shared/types";

const require = createRequire(import.meta.url);

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT ?? "5mb";
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
const allowDemoAuth = process.env.ALLOW_DEMO_AUTH !== "false";

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== "production" || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origin not allowed by CORS"));
  }
}));
app.use(express.json({ limit: requestBodyLimit }));

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

interface DemoUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  settings: UserSettings;
}

interface WorkspaceData {
  profile: UserProfile;
  jobs: JobPosting[];
  emailProviders: EmailProvider[];
  emailMessages: EmailMessage[];
  timeline: TimelineEvent[];
}

interface RequestWithUser extends express.Request {
  userId?: string;
}

const defaultSettings: UserSettings = {
  dailyAgentEnabled: true,
  targetJobSources: ["Greenhouse", "Lever", "Workday", "Company careers page"],
  emailDigest: true,
  subscriptionTier: "Free",
  analysesUsedThisMonth: 0,
  analysisLimit: 25
};

const users = new Map<string, DemoUser>();
const sessions = new Map<string, string>();
const resetTokens = new Map<string, string>();
const workspaces = new Map<string, WorkspaceData>();
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, passwordHash: scryptSync(password, salt, 64).toString("hex") };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sanitizeText(value = "", maxLength = 25000) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function rateLimit(options: { windowMs: number; max: number; scope: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${options.scope}:${req.ip ?? "unknown"}:${(req as RequestWithUser).userId ?? "anon"}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (bucket.count >= options.max) {
      return res.status(429).json({ error: "Rate limit exceeded", retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) });
    }
    bucket.count += 1;
    next();
  };
}

function enforceAnalysisLimit(req: RequestWithUser, res: express.Response, next: express.NextFunction) {
  const user = currentUser(req);
  if (user.settings.subscriptionTier === "Free" && user.settings.analysesUsedThisMonth >= user.settings.analysisLimit) {
    return res.status(402).json({ error: "Monthly analysis limit reached", upgradeRequired: true, limit: user.settings.analysisLimit });
  }
  user.settings.analysesUsedThisMonth += 1;
  next();
}

function publicUser(user: DemoUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    settings: user.settings
  };
}

function seedWorkspace(userId: string, profileSeed: UserProfile = defaultProfile) {
  if (workspaces.has(userId)) return workspaces.get(userId)!;
  const profile = { ...profileSeed, email: users.get(userId)?.email ?? profileSeed.email, name: users.get(userId)?.name ?? profileSeed.name };
  const jobs = seedJobs.map((job, index) => ({
    id: `${userId}-demo-${index + 1}`,
    createdAt: new Date(Date.now() - index * 1000 * 60 * 20).toISOString(),
    status: "Pending" as ApplicationStatus,
    ...scoreJob(profile, job)
  }));
  const messages = [
    classifyEmail({ provider: "mock", from: "recruiter@ford.com", subject: "Interview request for Automotive Validation Technician at Ford", body: "Your background looks aligned with our Automotive Validation Technician role. Are you available for a phone screen next week?" }),
    classifyEmail({ provider: "mock", from: "jobs@bosch.com", subject: "Thank you for applying to Bosch Quality Technician", body: "We received your application and our recruiting team will review it shortly." })
  ];
  const timeline = buildTimelineFromEmails(messages, jobs);
  applyEmailPipelineSuggestions(jobs, timeline);
  const workspace = { profile, jobs, emailProviders: ["mock" as EmailProvider], emailMessages: messages, timeline };
  workspaces.set(userId, workspace);
  return workspace;
}

function createDemoUser(name: string, email: string, password: string) {
  const normalized = email.toLowerCase();
  const existing = Array.from(users.values()).find((user) => user.email === normalized);
  if (existing) return existing;
  const { salt, passwordHash } = hashPassword(password);
  const user: DemoUser = {
    id: randomUUID(),
    name,
    email: normalized,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    settings: { ...defaultSettings }
  };
  users.set(user.id, user);
  seedWorkspace(user.id, { ...defaultProfile, name, email: normalized });
  return user;
}

const demoUser = createDemoUser("Demo Candidate", "demo@momentumai.local", "demo1234");
sessions.set("demo-token", demoUser.id);

function issueSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, userId);
  return token;
}

function authMiddleware(req: RequestWithUser, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token && !sessions.has(token)) return res.status(401).json({ error: "Invalid or expired session" });
  if (!token && !allowDemoAuth && !req.path.startsWith("/api/auth/") && req.path !== "/api/health") {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.userId = token && sessions.has(token) ? sessions.get(token) : demoUser.id;
  next();
}

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 20, scope: "auth" }));
app.use(authMiddleware);
app.use(["/api/resume/parse", "/api/jobs/import", "/api/jobs/score", /\/api\/jobs\/[^/]+\/(generate|packet|interview|skills-marketplace)$/], rateLimit({ windowMs: 15 * 60 * 1000, max: 80, scope: "analysis" }));

function currentUser(req: RequestWithUser) {
  return users.get(req.userId ?? demoUser.id) ?? demoUser;
}

function currentWorkspace(req: RequestWithUser) {
  return seedWorkspace(currentUser(req).id);
}

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
  coverLetterStyle: z.enum(["Direct and practical", "Warm and confident", "Technical and detailed", "Entry-level and eager"]),
  parsedResume: parsedResumeSchema.optional(),
  profileStrength: z.number().optional(),
  profileSuggestions: z.array(suggestionSchema).optional()
});

const jobSchema = z.object({
  title: z.string().min(1).max(160).transform((value) => sanitizeText(value, 160)),
  company: z.string().min(1).max(160).transform((value) => sanitizeText(value, 160)),
  location: z.string().min(1).max(160).transform((value) => sanitizeText(value, 160)),
  source: z.string().min(1).max(160).transform((value) => sanitizeText(value, 160)),
  pay: z.string().max(120).optional().transform((value) => value ? sanitizeText(value, 120) : value),
  description: z.string().min(20).max(25000).transform((value) => sanitizeText(value, 25000)),
  preferredSkills: z.array(z.string()).optional(),
  yearsExperience: z.string().optional(),
  employmentType: z.string().optional(),
  applicationUrl: z.string().optional()
});

const statusSchema = z.object({ status: z.enum(["Pending", "Saved", "Applied", "Interview", "Rejected", "Offer"]) });
const resumeUploadSchema = z.object({ filename: z.string().max(240).default("resume.txt").transform((value) => sanitizeText(value, 240)), mimeType: z.string().max(120).default("text/plain"), contentBase64: z.string().max(8_000_000).optional(), text: z.string().max(25000).optional().transform((value) => value ? sanitizeText(value, 25000) : value) });
const importSchema = z.object({ text: z.string().max(25000).optional().transform((value) => value ? sanitizeText(value, 25000) : value), url: z.string().optional().transform((value) => sanitizeUrl(value)), recruiterEmail: z.string().max(10000).optional().transform((value) => value ? sanitizeText(value, 10000) : value), source: z.string().max(160).optional().transform((value) => value ? sanitizeText(value, 160) : value) });
const notesSchema = z.object({ text: z.string().max(5000).default("").transform((value) => sanitizeText(value, 5000)) });
const authSchema = z.object({ name: z.string().min(1).optional(), email: z.string().email(), password: z.string().min(8) });
const resetSchema = z.object({ email: z.string().email() });
const settingsSchema = z.object({
  dailyAgentEnabled: z.boolean().optional(),
  targetJobSources: z.array(z.string()).optional(),
  emailDigest: z.boolean().optional(),
  subscriptionTier: z.enum(["Free", "Pro", "Premium", "Recruiter"]).optional(),
  analysesUsedThisMonth: z.number().optional(),
  analysisLimit: z.number().optional()
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

async function persistProfile(userId: string, nextProfile: UserProfile) {
  if (!supabase) return;
  await supabase.from("profiles").upsert({ user_id: userId, payload: nextProfile, updated_at: new Date().toISOString() });
}

async function persistJob(userId: string, job: JobPosting) {
  if (!supabase) return;
  await supabase.from("jobs").upsert({ id: job.id, user_id: userId, payload: job, status: job.status, updated_at: new Date().toISOString() });
}

function rescoreJobs(workspace: WorkspaceData) {
  workspace.jobs = workspace.jobs.map((job) => {
    const rescored = scoreJob(workspace.profile, job);
    return { ...job, ...rescored, id: job.id, status: job.status, notes: job.notes, scorecard: job.scorecard ?? rescored.scorecard, createdAt: job.createdAt };
  });
}

function findJob(workspace: WorkspaceData, id: string) {
  return workspace.jobs.find((candidate) => candidate.id === id);
}

function buildMomentumScore(profile: UserProfile, jobs: JobPosting[]): MomentumScore {
  const resumeStrength = profile.profileStrength ?? Math.min(100, 40 + profile.skills.length * 4 + Math.floor(profile.resume.length / 120));
  const averageMatch = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + job.matchScore, 0) / jobs.length) : 0;
  const strongMatches = jobs.filter((job) => job.fitLabel === "Strong fit").length;
  const marketCompetitiveness = Math.min(100, Math.round(averageMatch * 0.65 + strongMatches * 8 + Math.min(profile.skills.length, 14) * 2));
  const jobMatch = averageMatch;
  const submitted = jobs.filter((job) => ["Applied", "Interview", "Offer", "Rejected"].includes(job.status));
  const interviews = jobs.filter((job) => ["Interview", "Offer"].includes(job.status));
  const interviewReadiness = Math.min(100, Math.round(45 + (profile.experience.length > 180 ? 18 : 0) + (profile.parsedResume?.toolsTechnologies?.length ?? 0) * 4 + (submitted.length ? (interviews.length / submitted.length) * 25 : 5)));
  const overall = Math.round(resumeStrength * 0.28 + marketCompetitiveness * 0.22 + jobMatch * 0.3 + interviewReadiness * 0.2);
  const nextActions = [
    resumeStrength < 80 ? "Strengthen resume bullets with measurable test/quality outcomes." : "Keep resume tuned to top job requirements.",
    marketCompetitiveness < 75 ? "Close recurring missing skills from the marketplace." : "Prioritize strong-fit jobs before stretch roles.",
    interviewReadiness < 75 ? "Practice one simulator session before applying to top roles." : "Use interview prep to sharpen company-specific stories."
  ];
  return { overall, resumeStrength, marketCompetitiveness, jobMatch, interviewReadiness, nextActions };
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

app.post("/api/auth/register", (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = Array.from(users.values()).find((user) => user.email === parsed.data.email.toLowerCase());
  if (existing) return res.status(409).json({ error: "An account already exists for this email" });
  const user = createDemoUser(parsed.data.name || parsed.data.email.split("@")[0], parsed.data.email, parsed.data.password);
  const token = issueSession(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const parsed = authSchema.omit({ name: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = Array.from(users.values()).find((candidate) => candidate.email === parsed.data.email.toLowerCase());
  if (!user || !verifyPassword(parsed.data.password, user.salt, user.passwordHash)) return res.status(401).json({ error: "Invalid email or password" });
  const token = issueSession(user.id);
  res.json({ token, user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.post("/api/auth/reset-password", (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const token = randomBytes(16).toString("hex");
  resetTokens.set(parsed.data.email.toLowerCase(), token);
  res.json({ ok: true, message: "Demo reset token generated. In production this sends an email.", resetToken: token });
});

app.get("/api/auth/me", (req: RequestWithUser, res) => {
  const user = currentUser(req);
  res.json({ user: publicUser(user), tokenMode: user.id === demoUser.id ? "demo" : "session" });
});

app.patch("/api/settings", (req: RequestWithUser, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = currentUser(req);
  user.settings = { ...user.settings, ...parsed.data };
  res.json(publicUser(user));
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: supabase ? "supabase" : "demo-memory", message: supabase ? "Connected to Supabase client" : "Running with in-memory demo data until Supabase env vars are configured" });
});

app.get("/api/ready", (_req, res) => {
  const production = process.env.NODE_ENV === "production";
  const checks = {
    server: true,
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    corsConfigured: !production || allowedOrigins.length > 0,
    demoAuthDisabledInProduction: !production || !allowDemoAuth,
    requestBodyLimit
  };
  const ready = checks.server && checks.corsConfigured && checks.demoAuthDisabledInProduction;
  res.status(ready ? 200 : 503).json({ ready, checks, timestamp: new Date().toISOString() });
});

app.get("/api/dashboard", (req: RequestWithUser, res) => {
  const user = currentUser(req);
  const workspace = currentWorkspace(req);
  const sortedJobs = [...workspace.jobs].sort((a, b) => b.matchScore - a.matchScore);
  res.json({ user: publicUser(user), settings: user.settings, profile: workspace.profile, jobs: sortedJobs, applications: sortedJobs.filter((job) => ["Saved", "Applied", "Interview", "Rejected", "Offer"].includes(job.status)), analytics: buildAnalytics(sortedJobs), momentumScore: buildMomentumScore(workspace.profile, sortedJobs), emailActivity: summarizeEmailActivity(workspace.emailProviders, workspace.emailMessages, workspace.timeline, buildFollowUps(workspace.profile, workspace.emailMessages, sortedJobs)), emailMessages: workspace.emailMessages, timeline: workspace.timeline });
});

app.get("/api/analytics", (req: RequestWithUser, res) => res.json(buildAnalytics(currentWorkspace(req).jobs)));

app.put("/api/profile", async (req: RequestWithUser, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const workspace = currentWorkspace(req);
  workspace.profile = parsed.data;
  rescoreJobs(workspace);
  await persistProfile(currentUser(req).id, workspace.profile);
  res.json(workspace.profile);
});

app.post("/api/resume/parse", enforceAnalysisLimit, async (req, res) => {
  const parsed = resumeUploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const text = await extractTextFromUpload(parsed.data);
    if (!text.trim()) return res.status(400).json({ error: "No readable resume text found" });
    res.json(parseResumeText(text));
  } catch (error) {
    res.status(400).json({ error: "Could not parse this resume. Try TXT/MD, or paste the text manually.", detail: error instanceof Error ? error.message : "Unknown parsing error" });
  }
});

app.post("/api/jobs/import", enforceAnalysisLimit, async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const hasContent = [parsed.data.text, parsed.data.url, parsed.data.recruiterEmail].some((value) => value?.trim());
  if (!hasContent) return res.status(400).json({ error: "Paste a job description, URL, or recruiter email first" });
  let importPayload = parsed.data;
  const extractionNotes: string[] = [];
  if (parsed.data.url && !parsed.data.text?.trim()) {
    try {
      const response = await fetch(parsed.data.url, { headers: { "User-Agent": "MomentumAIJobCopilot/0.1", Accept: "text/html,application/json;q=0.9,*/*;q=0.8" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) extractionNotes.push(`URL returned HTTP ${response.status}. Paste the posting content if extraction looks incomplete.`);
      else {
        const contentType = response.headers.get("content-type") ?? "";
        const body = await response.text();
        const extractedText = sanitizeText(contentType.includes("json") ? JSON.stringify(JSON.parse(body), null, 2) : htmlToJobText(body), 25000);
        importPayload = { ...parsed.data, text: extractedText.slice(0, 25000) };
        extractionNotes.push("Fetched the URL server-side and extracted readable posting text.");
      }
    } catch {
      extractionNotes.push("Could not fetch this URL locally. Paste the job page content for the clean fallback flow.");
    }
  }
  const draft = extractJobData(importPayload);
  draft.extractionNotes = [...extractionNotes, ...draft.extractionNotes];
  res.json(draft);
});

app.post("/api/jobs/manual", async (req: RequestWithUser, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const workspace = currentWorkspace(req);
  const job: JobPosting = { id: randomUUID(), createdAt: new Date().toISOString(), status: "Pending", ...scoreJob(workspace.profile, parsed.data) };
  workspace.jobs = [job, ...workspace.jobs];
  await persistJob(currentUser(req).id, job);
  res.status(201).json(job);
});

app.post("/api/jobs/score", enforceAnalysisLimit, (req: RequestWithUser, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.json(scoreJob(currentWorkspace(req).profile, parsed.data));
});

app.patch("/api/jobs/:id/status", async (req: RequestWithUser, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  job.status = parsed.data.status as ApplicationStatus;
  await persistJob(currentUser(req).id, job);
  res.json(job);
});

app.patch("/api/jobs/:id/notes", async (req: RequestWithUser, res) => {
  const parsed = notesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  const notes: JobNotes = { text: parsed.data.text, updatedAt: new Date().toISOString() };
  job.notes = notes;
  await persistJob(currentUser(req).id, job);
  res.json(job);
});

app.patch("/api/jobs/:id/scorecard", async (req: RequestWithUser, res) => {
  const parsed = scorecardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  job.scorecard = parsed.data as JobDecisionScorecard;
  await persistJob(currentUser(req).id, job);
  res.json(job);
});

app.post("/api/jobs/:id/scorecard", (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(buildDecisionScorecard(workspace.profile, job, job.matchScore, job.scoreBreakdown, job.redFlags));
});

app.post("/api/jobs/:id/generate", enforceAnalysisLimit, (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(generateApplication(workspace.profile, job));
});

app.post("/api/jobs/:id/packet", enforceAnalysisLimit, (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(generateApplication(workspace.profile, job).packet);
});

app.get("/api/career/coach", (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  res.json(buildCareerCoachReport(workspace.profile, workspace.jobs));
});

app.post("/api/jobs/:id/interview", enforceAnalysisLimit, (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(buildInterviewSimulator(workspace.profile, job));
});

app.get("/api/jobs/:id/skills-marketplace", enforceAnalysisLimit, (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const job = findJob(workspace, String(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(buildMissingSkillsMarketplace(workspace.profile, job));
});

app.get("/api/email/providers", (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const providers: EmailProvider[] = ["gmail", "outlook", "mock"];
  res.json({
    connectedProviders: workspace.emailProviders,
    providers: providers.map((provider) => ({ provider, authorizationUrl: providerFor(provider).getAuthorizationUrl(currentUser(req).id), connected: workspace.emailProviders.includes(provider) }))
  });
});

app.post("/api/email/connect/:provider", async (req: RequestWithUser, res) => {
  const provider = String(req.params.provider) as EmailProvider;
  if (!["gmail", "outlook", "mock"].includes(provider)) return res.status(400).json({ error: "Unsupported email provider" });
  const workspace = currentWorkspace(req);
  if (!workspace.emailProviders.includes(provider)) workspace.emailProviders.push(provider);
  res.json({ connectedProviders: workspace.emailProviders, authorizationUrl: providerFor(provider).getAuthorizationUrl(currentUser(req).id), mockMode: provider === "mock" || !process.env[provider === "gmail" ? "GMAIL_CLIENT_ID" : "OUTLOOK_CLIENT_ID"] });
});

app.post("/api/email/sync", async (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const providers = workspace.emailProviders.length ? workspace.emailProviders : (["mock"] as EmailProvider[]);
  const messages = (await Promise.all(providers.map((provider) => providerFor(provider).fetchRecentMessages(currentUser(req).id)))).flat().map(classifyEmail);
  const existingIds = new Set(workspace.emailMessages.map((message) => message.id));
  workspace.emailMessages = [...messages.filter((message) => !existingIds.has(message.id)), ...workspace.emailMessages].slice(0, 100);
  workspace.timeline = buildTimelineFromEmails(workspace.emailMessages, workspace.jobs);
  applyEmailPipelineSuggestions(workspace.jobs, workspace.timeline);
  const followUps = buildFollowUps(workspace.profile, workspace.emailMessages, workspace.jobs);
  res.json({ activity: summarizeEmailActivity(providers, workspace.emailMessages, workspace.timeline, followUps), messages: workspace.emailMessages, timeline: workspace.timeline, followUps });
});

app.get("/api/email/activity", (req: RequestWithUser, res) => {
  const workspace = currentWorkspace(req);
  const followUps = buildFollowUps(workspace.profile, workspace.emailMessages, workspace.jobs);
  res.json({ activity: summarizeEmailActivity(workspace.emailProviders, workspace.emailMessages, workspace.timeline, followUps), messages: workspace.emailMessages, timeline: workspace.timeline, followUps });
});


app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

if (process.env.NODE_ENV !== "test") {
  
app.listen(port, () => console.log(`MomentumAI job copilot API running on http://localhost:${port}`));
}

export { app, buildMomentumScore };
