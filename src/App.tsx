import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Command,
  Download,
  FileText,
  Gauge,
  Keyboard,
  LayoutDashboard,
  Loader2,
  MapPin,
  Moon,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  Target,
  TrendingUp,
  UploadCloud,
  UserRound,
  Wand2,
  XCircle
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { buildAnalytics, buildCareerCoachReport, buildInterviewSimulator, buildMissingSkillsMarketplace, generateApplication as generateLocalApplication, scoreJob } from "../shared/matching";
import { buildResumeStudio, type CoverLetterStudioStyle, type ResumePageLength, type ResumeTemplate } from "../shared/resumeStudio";
import { defaultProfile, seedJobs } from "../shared/seedData";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Input, Label, Select, Textarea } from "./components/ui/form";
import { Skeleton } from "./components/ui/skeleton";
import type { AnalyticsData, ApplicationStatus, AuthResponse, AuthUser, CareerCoachReport, DashboardData, GeneratedApplication, ImportedJobDraft, InterviewSimulator, JobDecisionScorecard, JobPosting, MissingSkillsMarketplace, MomentumScore, ResumeParseResult, UserProfile, UserSettings } from "../shared/types";

type View = "pending" | "saved" | "profile" | "search" | "tracker" | "coach";
type Theme = "light" | "dark";
type IconComponent = typeof LayoutDashboard;

const statusOrder: ApplicationStatus[] = ["Pending", "Saved", "Applied", "Interview", "Offer", "Rejected"];

const navItems: Array<{ id: View; label: string; icon: IconComponent; helper: string; shortcut: string }> = [
  { id: "pending", label: "Review queue", icon: LayoutDashboard, helper: "Matched jobs", shortcut: "1" },
  { id: "saved", label: "Saved roles", icon: Star, helper: "Shortlist", shortcut: "2" },
  { id: "search", label: "Add jobs", icon: Search, helper: "Manual intake", shortcut: "3" },
  { id: "profile", label: "Profile", icon: UserRound, helper: "Preferences", shortcut: "4" },
  { id: "tracker", label: "Pipeline", icon: ClipboardCheck, helper: "Applications", shortcut: "5" },
  { id: "coach", label: "Career coach", icon: Target, helper: "Skills + interviews", shortcut: "6" }
];

function buildLocalDemoDashboard(): DashboardData {
  const profile = {
    ...defaultProfile,
    name: "Jordan Demo",
    email: "demo@momentumai.local",
    location: "Detroit, MI",
    preferredTitles: ["Automotive Validation Technician", "Test Engineer", "Quality Technician", "Engineering Technician"],
    skills: ["manual testing", "test cases", "Jira", "diagnostics", "automotive", "root cause", "Python", "validation", "inspection", "CAN"]
  };
  const jobs = seedJobs.map((job, index) => ({
    id: `local-demo-${index + 1}`,
    createdAt: new Date(Date.now() - index * 1000 * 60 * 30).toISOString(),
    status: index === 1 ? "Saved" as ApplicationStatus : "Pending" as ApplicationStatus,
    notes: index === 0 ? { text: "Ask about test equipment, overtime, and training path.", updatedAt: new Date().toISOString() } : undefined,
    ...scoreJob(profile, job)
  }));
  const averageMatch = Math.round(jobs.reduce((sum, job) => sum + job.matchScore, 0) / jobs.length);
  return {
    user: {
      id: "local-demo",
      name: "Jordan Demo",
      email: "demo@momentumai.local",
      createdAt: new Date().toISOString(),
      settings: {
        dailyAgentEnabled: true,
        targetJobSources: ["Greenhouse", "Lever", "Workday", "Company careers page"],
        emailDigest: true,
        subscriptionTier: "Free",
        analysesUsedThisMonth: 4,
        analysisLimit: 25
      }
    },
    settings: {
      dailyAgentEnabled: true,
      targetJobSources: ["Greenhouse", "Lever", "Workday", "Company careers page"],
      emailDigest: true,
      subscriptionTier: "Free",
      analysesUsedThisMonth: 4,
      analysisLimit: 25
    },
    profile,
    jobs,
    applications: jobs.filter((job) => job.status !== "Pending"),
    analytics: buildAnalytics(jobs),
    momentumScore: {
      overall: 79,
      resumeStrength: 82,
      marketCompetitiveness: 74,
      jobMatch: averageMatch,
      interviewReadiness: 68,
      nextActions: [
        "Import one real job posting to replace demo data.",
        "Close CAN, PPAP, or Minitab gaps for automotive validation roles.",
        "Practice one interview simulator before applying to a strong match."
      ]
    }
  };
}

const blankJob = {
  title: "",
  company: "",
  location: "",
  source: "Manual paste",
  pay: "",
  description: "",
  preferredSkills: [] as string[],
  yearsExperience: "",
  employmentType: "",
  applicationUrl: ""
};

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const joinLines = (value: string[]) => value.join("\n");

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const DASHBOARD_CACHE_PREFIX = "momentumai-dashboard-cache";

class ApiError extends Error {
  status?: number;
  retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

function authToken() {
  return localStorage.getItem("momentumai-token") || "";
}

function dashboardCacheKey() {
  return `${DASHBOARD_CACHE_PREFIX}:${authToken() || "demo"}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function request<T>(path: string, options: RequestInit & { retries?: number; timeoutMs?: number } = {}): Promise<T> {
  const token = authToken();
  const method = options.method ?? "GET";
  const retries = options.retries ?? (method === "GET" ? 2 : 0);
  const timeoutMs = options.timeoutMs ?? 10000;
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        },
        ...options,
        signal: controller.signal
      });
      window.clearTimeout(timeout);

      if (!response.ok) {
        let message = `Request failed: ${response.status}`;
        try {
          const body = await response.json();
          message = body.error || body.message || message;
        } catch {
          // Keep the status-based message when the response is not JSON.
        }
        throw new ApiError(message, { status: response.status, retryable: response.status >= 500 || response.status === 429 });
      }

      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    } catch (error) {
      window.clearTimeout(timeout);
      lastError = error;
      const retryable = error instanceof ApiError ? error.retryable : true;
      if (!retryable || attempt === retries) break;
      await sleep(350 * 2 ** attempt);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new ApiError("MomentumAI service is temporarily unavailable. Please try again.", { retryable: true });
}

function App() {
  const prefersReducedMotion = useReducedMotion();
  const [view, setView] = useState<View>("pending");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [needsAuth, setNeedsAuth] = useState(() => !localStorage.getItem("momentumai-token"));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfile | null>(null);
  const [titlesDraft, setTitlesDraft] = useState("");
  const [skillsDraft, setSkillsDraft] = useState("");
  const [jobDraft, setJobDraft] = useState(blankJob);
  const [generated, setGenerated] = useState<GeneratedApplication | null>(null);
  const [resumeParseResult, setResumeParseResult] = useState<ResumeParseResult | null>(null);
  const [activeJob, setActiveJob] = useState<JobPosting | null>(null);
  const [query, setQuery] = useState("");
  const [commandQuery, setCommandQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [usingCachedDashboard, setUsingCachedDashboard] = useState(false);
  const [localDemoMode, setLocalDemoMode] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState(() => Number(localStorage.getItem("momentumai-onboarding-progress") ?? "0"));
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "dark");
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem("job-copilot-onboarded") !== "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const applyDashboard = (data: DashboardData, options: { cached?: boolean } = {}) => {
    setDashboard(data);
    setAuthUser(data.user ?? null);
    setNeedsAuth(false);
    setProfileDraft(data.profile);
    setTitlesDraft(joinLines(data.profile.preferredTitles));
    setSkillsDraft(joinLines(data.profile.skills));
    setUsingCachedDashboard(Boolean(options.cached));
  };

  const loadDashboard = async (options: { allowCache?: boolean } = {}) => {
    try {
      const data = await request<DashboardData>("/api/dashboard");
      applyDashboard(data);
      setWorkspaceError(null);
      localStorage.setItem(dashboardCacheKey(), JSON.stringify({ data, cachedAt: new Date().toISOString() }));
    } catch (error) {
      const cached = options.allowCache !== false ? localStorage.getItem(dashboardCacheKey()) : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { data: DashboardData; cachedAt: string };
          applyDashboard(parsed.data, { cached: true });
          setWorkspaceError(`Using cached workspace from ${new Date(parsed.cachedAt).toLocaleString()}. Live updates will resume when the API reconnects.`);
          return;
        } catch {
          localStorage.removeItem(dashboardCacheKey());
        }
      }
      const message = error instanceof Error ? error.message : "MomentumAI could not reach the workspace service.";
      setWorkspaceError(message);
      throw error;
    }
  };


  useEffect(() => {
    if (needsAuth) {
      setIsLoading(false);
      return;
    }
    loadDashboard()
      .catch(() => toast.error("MomentumAI is having trouble reaching your workspace. Retrying and cached mode are available."))
      .finally(() => setIsLoading(false));
  }, [needsAuth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedImport = params.get("importJob");
    if (!encodedImport) return;

    try {
      const payload = JSON.parse(decodeURIComponent(encodedImport)) as { title?: string; url?: string; text?: string; recruiterEmail?: string };
      setJobDraft({
        ...blankJob,
        title: payload.title?.replace(/[-|].*$/, "").trim() || "Imported browser job",
        company: "Company to verify",
        location: "Location to verify",
        source: "Browser extension",
        description: [payload.text, payload.recruiterEmail].filter(Boolean).join("\n\n"),
        applicationUrl: payload.url || ""
      });
      setView("search");
      toast.success("Job page captured from browser extension. Review extracted details before saving.");
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      toast.error("Could not read the browser extension import payload.");
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      if (!isTyping && navItems.some((item) => item.shortcut === key)) {
        const item = navItems.find((candidate) => candidate.shortcut === key);
        if (item) setView(item.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleAuthSuccess = (response: AuthResponse) => {
    localStorage.setItem("momentumai-token", response.token);
    setAuthUser(response.user);
    setNeedsAuth(false);
    setLocalDemoMode(false);
    setIsLoading(true);
    loadDashboard().finally(() => setIsLoading(false));
  };

  const continueDemo = async () => {
    localStorage.setItem("momentumai-token", "demo-token");
    setNeedsAuth(false);
    setIsLoading(true);
    try {
      await loadDashboard({ allowCache: false });
      setLocalDemoMode(false);
      toast.success("Demo workspace loaded with realistic automotive validation data.");
    } catch {
      const demo = buildLocalDemoDashboard();
      applyDashboard(demo, { cached: true });
      setAuthUser(demo.user ?? null);
      setLocalDemoMode(true);
      setWorkspaceError("Demo is running locally because the live API is not reachable. You can still explore the dashboard, job cards, packets, coach, and interview prep.");
      toast.success("Local demo workspace loaded. No backend required.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("momentumai-token");
    setDashboard(null);
    setAuthUser(null);
    setLocalDemoMode(false);
    setNeedsAuth(true);
  };

  const saveSettings = async (settings: Partial<UserSettings>) => {
    await runAction("Settings saved.", async () => {
      const user = await request<AuthUser>("/api/settings", { method: "PATCH", body: JSON.stringify(settings) });
      setAuthUser(user);
      await loadDashboard();
    });
  };

  const jobs = dashboard?.jobs ?? [];
  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) =>
      [job.title, job.company, job.location, job.source, job.description, ...job.requiredSkills]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [jobs, query]);

  const pendingJobs = filteredJobs.filter((job) => job.status === "Pending");
  const savedJobs = filteredJobs.filter((job) => job.status === "Saved");
  const trackerJobs = jobs.filter((job) => job.status !== "Pending");
  const appliedCount = jobs.filter((job) => ["Applied", "Interview", "Offer"].includes(job.status)).length;
  const avgMatch = jobs.length ? Math.round(jobs.reduce((total, job) => total + job.matchScore, 0) / jobs.length) : 0;
  const progressPercent = jobs.length ? Math.round((trackerJobs.length / jobs.length) * 100) : 0;
  const profileCompletion = useMemo(() => calculateProfileCompletion(dashboard?.profile), [dashboard?.profile]);

  const analytics = [
    { label: "Pending review", value: pendingJobs.length, helper: "Jobs waiting for your decision", icon: LayoutDashboard, gradient: "from-indigo-500 to-cyan-400" },
    { label: "Average match", value: `${avgMatch}%`, helper: "Profile alignment across roles", icon: Gauge, gradient: "from-violet-500 to-fuchsia-500" },
    { label: "Applications sent", value: appliedCount, helper: "Applied, interview, or offer stage", icon: Send, gradient: "from-emerald-500 to-teal-400" },
    { label: "Saved roles", value: savedJobs.length, helper: "Worth a closer look", icon: Star, gradient: "from-amber-400 to-orange-500" }
  ];

  const runAction = async (success: string, action: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsBusy(false);
    }
  };

  const updateStatus = async (job: JobPosting, status: ApplicationStatus) => {
    if (status === "Rejected" && !window.confirm(`Skip ${job.title} at ${job.company}? You can still find it in the tracker as Rejected.`)) return;
    await runAction(`${job.title} moved to ${status}.`, async () => {
      await request<JobPosting>(`/api/jobs/${job.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadDashboard();
    });
  };

  const generateForJob = async (job: JobPosting) => {
    await runAction(`Generated application package for ${job.company}.`, async () => {
      let result: GeneratedApplication;
      try {
        result = await request<GeneratedApplication>(`/api/jobs/${job.id}/generate`, { method: "POST" });
      } catch (error) {
        if (!localDemoMode || !dashboard?.profile) throw error;
        result = generateLocalApplication(dashboard.profile, job);
        toast.info("Using local demo packet generation because the API is unavailable.");
      }
      setActiveJob(job);
      setGenerated(result);
    });
  };

  const saveProfile = async () => {
    if (!profileDraft) return;
    await runAction("Profile saved and matches refreshed.", async () => {
      const updatedProfile = {
        ...profileDraft,
        preferredTitles: splitLines(titlesDraft),
        skills: splitLines(skillsDraft)
      };
      await request<UserProfile>("/api/profile", {
        method: "PUT",
        body: JSON.stringify(updatedProfile)
      });
      await loadDashboard();
    });
  };

  const addManualJob = async () => {
    if (!jobDraft.title || !jobDraft.company || !jobDraft.location || jobDraft.description.length < 20) {
      toast.error("Add a title, company, location, and at least 20 characters of job description.");
      return;
    }

    await runAction("Job scored and added to pending review.", async () => {
      await request<JobPosting>("/api/jobs/manual", {
        method: "POST",
        body: JSON.stringify(jobDraft)
      });
      setJobDraft(blankJob);
      setView("pending");
      await loadDashboard();
    });
  };

  const completeOnboarding = () => {
    localStorage.setItem("job-copilot-onboarded", "true");
    localStorage.setItem("momentumai-onboarding-progress", "100");
    setOnboardingProgress(100);
    setShowOnboarding(false);
    toast.success("Workspace ready. Start by reviewing matches or adding a job.");
  };

  const updateOnboardingProgress = (value: number) => {
    const next = Math.max(onboardingProgress, value);
    setOnboardingProgress(next);
    localStorage.setItem("momentumai-onboarding-progress", String(next));
  };

  const handleResumeFile = async (file: File) => {
    if (!profileDraft) return;

    if (file.size > 6_000_000) {
      toast.error("Resume file is too large for this MVP parser. Try a smaller PDF, DOCX, TXT, or MD file.");
      return;
    }

    await runAction(`Parsed ${file.name}. Review the extracted profile before saving.`, async () => {
      const contentBase64 = await fileToBase64(file);
      const result = await request<ResumeParseResult>("/api/resume/parse", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, mimeType: file.type || "application/octet-stream", contentBase64 })
      });
      setResumeParseResult(result);
      setProfileDraft({
        ...profileDraft,
        ...result.profileDraft,
        name: result.profileDraft.name || profileDraft.name,
        email: result.profileDraft.email || profileDraft.email,
        location: profileDraft.location,
        commuteMiles: profileDraft.commuteMiles,
        desiredPayMin: profileDraft.desiredPayMin,
        desiredPayMax: profileDraft.desiredPayMax,
        preferredTitles: profileDraft.preferredTitles,
        coverLetterStyle: profileDraft.coverLetterStyle
      });
      setSkillsDraft(joinLines(result.profileDraft.skills?.length ? result.profileDraft.skills : profileDraft.skills));
    });
  };

  const saveJobNotes = async (job: JobPosting, text: string) => {
    await runAction("Private job notes saved.", async () => {
      await request<JobPosting>(`/api/jobs/${job.id}/notes`, { method: "PATCH", body: JSON.stringify({ text }) });
      await loadDashboard();
    });
  };

  const saveJobScorecard = async (job: JobPosting, scorecard: JobDecisionScorecard) => {
    await runAction("Decision scorecard saved.", async () => {
      await request<JobPosting>(`/api/jobs/${job.id}/scorecard`, { method: "PATCH", body: JSON.stringify(scorecard) });
      await loadDashboard();
    });
  };

  if (needsAuth) {
    return <AuthGate theme={theme} setTheme={setTheme} onAuthSuccess={handleAuthSuccess} onDemo={continueDemo} />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.25),_transparent_34rem),linear-gradient(135deg,#f8fafc,#eef2ff_45%,#f8fafc)] text-slate-950 transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_34rem),linear-gradient(135deg,#020617,#0f172a_45%,#111827)] dark:text-white">
      <Toaster richColors position="top-right" theme={theme} />
      <AmbientBackground reducedMotion={Boolean(prefersReducedMotion)} />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)]" />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950">Skip to dashboard</a>

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:p-5">
        <Sidebar view={view} setView={setView} profile={dashboard?.profile} jobs={jobs} profileCompletion={profileCompletion} />
        <main id="main-content" className="flex min-w-0 flex-1 flex-col gap-4">
          <TopBar query={query} setQuery={setQuery} theme={theme} setTheme={setTheme} onAddJob={() => setView("search")} onCommand={() => setCommandOpen(true)} onSettings={() => setSettingsOpen(true)} onLogout={logout} profile={dashboard?.profile} user={authUser} />

          {workspaceError && dashboard && <ServiceStatusBanner message={workspaceError} cached={usingCachedDashboard} onRetry={() => loadDashboard({ allowCache: false })} />}

          {isLoading ? (
            <DashboardSkeleton />
          ) : !dashboard || !profileDraft ? (
            <WorkspaceServiceStatus error={workspaceError} onRetry={() => loadDashboard({ allowCache: false })} onSignOut={logout} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: "blur(8px)" }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="grid gap-4"
              >
                {(localDemoMode || authToken() === "demo-token") && <DemoDataBanner local={localDemoMode} onImport={() => setView("search")} />}
                {onboardingProgress < 100 && <OnboardingProgressCard progress={onboardingProgress} setView={setView} />}
                <HeroPanel profile={dashboard.profile} pendingCount={pendingJobs.length} avgMatch={avgMatch} profileCompletion={profileCompletion} />
                {dashboard.momentumScore && <MomentumScorePanel score={dashboard.momentumScore} />}
                <AnalyticsGrid analytics={analytics} />
                {dashboard.analytics && <IntelligenceAnalyticsPanel analytics={dashboard.analytics} jobs={jobs} />}

                {view === "pending" && <JobBoard title="Pending review" description="Review each match before saving, skipping, tailoring documents, or applying. Nothing is submitted automatically." jobs={pendingJobs} empty="No pending jobs match your current search. Paste a job description from any source to create a new match." onStatus={updateStatus} onGenerate={generateForJob} onSaveNotes={saveJobNotes} onSaveScorecard={saveJobScorecard} isBusy={isBusy} emptyAction={<Button variant="gradient" onClick={() => setView("search")}>Import your first job</Button>} />}
                {view === "saved" && <JobBoard title="Saved roles" description="Your shortlist for deeper company research and resume tailoring." jobs={savedJobs} empty="No saved jobs yet. Save a strong match from the review queue." onStatus={updateStatus} onGenerate={generateForJob} onSaveNotes={saveJobNotes} onSaveScorecard={saveJobScorecard} isBusy={isBusy} emptyAction={<Button variant="gradient" onClick={() => setView("pending")}>Review pending jobs</Button>} />}
                {view === "search" && <ManualJobIntake jobDraft={jobDraft} setJobDraft={setJobDraft} addManualJob={async () => { await addManualJob(); updateOnboardingProgress(75); }} isBusy={isBusy} />}
                {view === "profile" && <ProfileEditor profileDraft={profileDraft} setProfileDraft={setProfileDraft} titlesDraft={titlesDraft} setTitlesDraft={setTitlesDraft} skillsDraft={skillsDraft} setSkillsDraft={setSkillsDraft} saveProfile={async () => { await saveProfile(); updateOnboardingProgress(50); }} isBusy={isBusy} completion={calculateProfileCompletion({ ...profileDraft, preferredTitles: splitLines(titlesDraft), skills: splitLines(skillsDraft) })} onResumeFile={handleResumeFile} resumeParseResult={resumeParseResult} />}
                {view === "tracker" && <ApplicationTracker jobs={trackerJobs} onGenerate={generateForJob} onStatus={updateStatus} progressPercent={progressPercent} />}
                {view === "coach" && <CareerCoachPage jobs={jobs} profile={dashboard.profile} localDemoMode={localDemoMode} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <CommandPalette open={commandOpen} setOpen={setCommandOpen} commandQuery={commandQuery} setCommandQuery={setCommandQuery} setView={setView} setTheme={setTheme} theme={theme} jobs={jobs} generateForJob={generateForJob} />
      <ApplicationDialog generated={generated} activeJob={activeJob} profile={dashboard?.profile ?? null} setGenerated={setGenerated} onApplied={(job) => updateStatus(job, "Applied")} />
      <SettingsDialog open={settingsOpen} setOpen={setSettingsOpen} user={authUser} onSave={saveSettings} isBusy={isBusy} />
      <OnboardingDialog open={showOnboarding && !localDemoMode} onComplete={completeOnboarding} setView={setView} setProgress={updateOnboardingProgress} />
    </div>
  );
}

function AuthGate({ theme, setTheme, onAuthSuccess, onDemo }: { theme: Theme; setTheme: (theme: Theme) => void; onAuthSuccess: (response: AuthResponse) => void; onDemo: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "reset">("register");
  const [page, setPage] = useState<"home" | "pricing" | "trust">("home");
  const [name, setName] = useState("Test Engineer");
  const [email, setEmail] = useState("demo@momentumai.local");
  const [password, setPassword] = useState("demo1234");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "reset") {
        const result = await request<{ message: string; resetToken: string }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) });
        toast.success(`${result.message} Token: ${result.resetToken}`);
        setMode("login");
        return;
      }
      const response = await request<AuthResponse>(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password })
      });
      if (mode === "register") localStorage.removeItem("job-copilot-onboarded");
      toast.success(mode === "login" ? "Welcome back." : "Account created. Let's build your first Momentum Score.");
      onAuthSuccess(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const startFree = () => {
    setMode("register");
    document.getElementById("signup-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_34rem),linear-gradient(135deg,#020617,#0f172a_45%,#111827)] text-white"><Toaster richColors position="top-right" theme={theme} /><AmbientBackground reducedMotion={false} /><header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4"><button onClick={() => setPage("home")} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30"><Sparkles className="h-5 w-5" /></span><span className="text-left"><span className="block font-semibold">MomentumAI</span><span className="block text-xs text-slate-400">Job Copilot</span></span></button><nav className="hidden items-center gap-2 md:flex"><button onClick={() => setPage("home")} className="rounded-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Product</button><button onClick={() => setPage("pricing")} className="rounded-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Pricing</button><button onClick={() => setPage("trust")} className="rounded-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Trust</button></nav><div className="flex items-center gap-2"><Button variant="secondary" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button><Button variant="secondary" onClick={onDemo}>View demo</Button><Button variant="gradient" onClick={startFree}>Start free</Button></div></div></header><main>{page === "home" && <MarketingHome startFree={startFree} viewDemo={onDemo} goPricing={() => setPage("pricing")} goTrust={() => setPage("trust")} />} {page === "pricing" && <PricingPage startFree={startFree} viewDemo={onDemo} />} {page === "trust" && <TrustPage startFree={startFree} />}</main><section id="signup-card" className="relative mx-auto max-w-7xl px-4 pb-20"><Card className="mx-auto max-w-5xl overflow-hidden border-white/10 bg-white/[0.06]"><CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_420px]"><div className="relative overflow-hidden bg-slate-950 p-8 text-white lg:p-12"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.55),transparent_24rem),radial-gradient(circle_at_85%_0%,rgba(236,72,153,0.35),transparent_22rem)]" /><div className="relative"><Badge className="border-white/20 bg-white/10 text-white">Start free</Badge><h2 className="mt-6 text-4xl font-semibold tracking-[-0.06em]">Build your first Momentum Score in minutes.</h2><p className="mt-4 text-lg leading-8 text-white/70">Create a workspace, upload your resume, import a real job, and see what to improve before you apply.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><AuthFeature title="No auto-apply" text="You control every generated resume, letter, and message." /><AuthFeature title="Demo friendly" text="Explore preloaded data before creating a real account." /></div></div></div><div className="bg-white/95 p-6 text-slate-950 dark:bg-slate-950/95 dark:text-white lg:p-8"><div className="mb-6"><p className="text-sm font-semibold text-indigo-500">Account access</p><h2 className="text-2xl font-semibold tracking-[-0.04em]">{mode === "login" ? "Sign in" : mode === "reset" ? "Reset password" : "Create account"}</h2></div><div className="grid gap-4">{mode === "register" && <Label>Name<Input value={name} onChange={(event) => setName(event.target.value)} /></Label>}<Label>Email<Input value={email} onChange={(event) => setEmail(event.target.value)} /></Label>{mode !== "reset" && <Label>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Label>}<Button variant="gradient" size="lg" onClick={submit} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{mode === "login" ? "Sign in" : mode === "reset" ? "Send reset" : "Create free workspace"}</Button><Button variant="secondary" onClick={onDemo}>View interactive demo</Button></div><div className="mt-5 flex flex-wrap gap-3 text-sm"><button className="font-semibold text-indigo-500" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Already have an account?"}</button><button className="font-semibold text-slate-500" onClick={() => setMode("reset")}>Password reset</button></div><p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Demo credentials: demo@momentumai.local / demo1234. Billing is coming soon; Free starts with 25 analyses/month.</p></div></CardContent></Card></section></div>;
}

function MarketingHome({ startFree, viewDemo, goPricing, goTrust }: { startFree: () => void; viewDemo: () => void; goPricing: () => void; goTrust: () => void }) {
  const features = [
    [Gauge, "Job matching", "Score real jobs by title, skills, pay, location, missing qualifications, red flags, and growth potential."],
    [FileText, "Resume tailoring", "Generate truthful resume summaries, skills sections, bullets, cover letters, and recruiter messages."],
    [Target, "Interview prep", "Practice technical, behavioral, and role-specific questions with STAR answer guidance."],
    [Sparkles, "Career coach", "Understand why interviews are not happening and what to improve next."],
    [Command, "Browser extension", "Capture jobs from Greenhouse, Lever, Workday, or company careers pages."],
    [TrendingUp, "Momentum Score™", "Track resume strength, market competitiveness, job match, and interview readiness."]
  ] as const;
  return <><section className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24"><div><Badge className="border-white/20 bg-white/10 text-white">Built for test engineers, technicians, validation, quality, and automotive professionals</Badge><h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.08em] md:text-7xl">Turn every job posting into a smarter career move.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">MomentumAI analyzes jobs from anywhere, compares them to your real experience, builds truthful application packets, and shows the skills that raise your odds.</p><div className="mt-8 flex flex-wrap gap-3"><Button variant="gradient" size="lg" onClick={startFree}>Start free <ArrowRight className="h-4 w-4" /></Button><Button variant="secondary" size="lg" onClick={viewDemo}>View demo</Button><Button variant="ghost" size="lg" onClick={goPricing}>See pricing</Button></div><div className="mt-10 grid gap-3 text-sm text-slate-400 sm:grid-cols-3"><span>25 free analyses/month</span><span>Review-before-apply</span><span>No fake experience</span></div></div><MarketingDashboardPreview /></section><section className="mx-auto max-w-7xl px-4 py-10"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{features.map(([Icon, title, text]) => <Card key={title} className="border-white/10 bg-white/[0.06]"><CardContent className="p-6"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></CardContent></Card>)}</div></section><SocialProof /><FAQ /><section className="mx-auto max-w-7xl px-4 py-16"><Card className="overflow-hidden border-white/10 bg-white/[0.06]"><CardContent className="relative p-8 text-center md:p-12"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.28),transparent_30rem)]" /><div className="relative"><h2 className="text-4xl font-semibold tracking-[-0.06em] text-white">Ready to stop guessing?</h2><p className="mx-auto mt-3 max-w-2xl text-slate-400">Import a job, see your Momentum Score, and generate a reviewed application packet before your next submission.</p><div className="mt-6 flex justify-center gap-3"><Button variant="gradient" onClick={startFree}>Start free</Button><Button variant="secondary" onClick={goTrust}>Trust & safety</Button></div></div></CardContent></Card></section></>;
}

function MarketingDashboardPreview() {
  return <Card className="overflow-hidden border-white/10 bg-white/[0.07] shadow-2xl shadow-indigo-950/30"><CardContent className="p-4"><div className="rounded-[1.5rem] bg-slate-950 p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">Momentum Score™</p><p className="text-5xl font-semibold tracking-[-0.08em] text-white">79</p></div><MatchRing score={91} inverse /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><PreviewMetric label="Resume Strength" value="82" /><PreviewMetric label="Market Competitiveness" value="74" /><PreviewMetric label="Job Match" value="91" /><PreviewMetric label="Interview Readiness" value="68" /></div><div className="mt-5 rounded-2xl bg-white/10 p-4"><div className="flex items-center justify-between"><p className="font-semibold text-white">Ford Product Development Technician</p><Badge className="bg-emerald-400/10 text-emerald-200">Strong fit</Badge></div><p className="mt-2 text-sm text-slate-400">Missing skills: CAN bus, PPAP, Minitab. Projected lift: 78% to 92%.</p></div></div></CardContent></Card>;
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{value}</p></div>;
}

function SocialProof() {
  return <section className="mx-auto max-w-7xl px-4 py-10"><div className="grid gap-4 md:grid-cols-3"><TrustQuote quote="Finally a job search tool that understands test and validation roles." role="Beta tester · Automotive technician" /><TrustQuote quote="The missing skills view makes every rejection feel actionable." role="QA analyst" /><TrustQuote quote="This is the kind of workflow I wish I had before applying." role="Engineering technician" /></div></section>;
}

function TrustQuote({ quote, role }: { quote: string; role: string }) {
  return <Card className="border-white/10 bg-white/[0.06]"><CardContent className="p-5"><p className="text-slate-200">“{quote}”</p><p className="mt-4 text-sm text-slate-500">{role}</p></CardContent></Card>;
}

function FAQ() {
  const items = [["Does MomentumAI apply for me?", "No. It never auto-submits applications. You review and control every document."], ["Does it invent experience?", "No. Generated content is based on your saved profile and job description, with reminders to keep everything truthful."], ["Can I use it before billing launches?", "Yes. Free and demo modes are available while paid billing is marked coming soon."], ["What jobs is it built for?", "Test engineer, QA, validation, quality, engineering technician, and automotive testing roles."]];
  return <section className="mx-auto max-w-4xl px-4 py-12"><h2 className="text-center text-3xl font-semibold tracking-[-0.05em]">FAQ</h2><div className="mt-8 grid gap-3">{items.map(([q, a]) => <Card key={q} className="border-white/10 bg-white/[0.06]"><CardContent className="p-5"><p className="font-semibold text-white">{q}</p><p className="mt-2 text-sm leading-6 text-slate-400">{a}</p></CardContent></Card>)}</div></section>;
}

function PricingPage({ startFree, viewDemo }: { startFree: () => void; viewDemo: () => void }) {
  const tiers = [
    ["Free", "$0", "25 analyses/month", ["Job imports", "Momentum Score", "Basic application packets"]],
    ["Pro", "$12/mo", "Unlimited analyses", ["Unlimited job analyses", "Interview simulator", "Career coach", "PDF exports"]],
    ["Premium", "$29/mo", "Daily AI Job Agent", ["Daily opportunities", "Advanced analytics", "Recruiter insights", "Missing skills marketplace"]],
    ["Recruiter", "Custom", "Candidate pipelines", ["Candidate search", "Candidate scoring", "Notes", "Team pipeline management"]]
  ];
  return <section className="mx-auto max-w-7xl px-4 py-16"><div className="text-center"><Badge className="border-white/20 bg-white/10 text-white">Billing coming soon</Badge><h1 className="mt-5 text-5xl font-semibold tracking-[-0.07em]">Pricing that grows with your search.</h1><p className="mx-auto mt-4 max-w-2xl text-slate-400">Stripe is not wired yet. These tiers are subscription-ready in the data model and shown for conversion testing.</p></div><div className="mt-10 grid gap-4 lg:grid-cols-4">{tiers.map(([name, price, limit, features]) => <Card key={name as string} className="border-white/10 bg-white/[0.06]"><CardContent className="p-6"><p className="text-lg font-semibold text-white">{name as string}</p><p className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white">{price as string}</p><p className="mt-2 text-sm text-indigo-300">{limit as string}</p><ul className="mt-5 space-y-2 text-sm text-slate-300">{(features as string[]).map((feature) => <li key={feature} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />{feature}</li>)}</ul><Button className="mt-6 w-full" variant={name === "Premium" ? "gradient" : "secondary"} onClick={name === "Recruiter" ? viewDemo : startFree}>{name === "Recruiter" ? "View demo" : "Start free"}</Button></CardContent></Card>)}</div></section>;
}

function TrustPage({ startFree }: { startFree: () => void }) {
  const principles = [[ShieldAlert, "Review-before-apply", "MomentumAI drafts documents and messages, but you decide what gets submitted."], [CheckCircle2, "No fake experience", "The product repeatedly warns users to keep tools, certifications, and experience truthful."], [UserRound, "User-owned data", "Profiles, jobs, notes, and analytics are scoped by user_id in the production Supabase schema."], [FileText, "Transparent AI outputs", "Application packets include safety checklists and editable drafts."]];
  return <section className="mx-auto max-w-6xl px-4 py-16"><Badge className="border-white/20 bg-white/10 text-white">Trust center</Badge><h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.07em]">Built to help users apply smarter, not less honestly.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">MomentumAI is designed around user control, data ownership, and truthful career storytelling.</p><div className="mt-10 grid gap-4 md:grid-cols-2">{principles.map(([Icon, title, text]) => <Card key={title as string} className="border-white/10 bg-white/[0.06]"><CardContent className="p-6"><Icon className="h-6 w-6 text-indigo-300" /><h3 className="mt-4 text-xl font-semibold text-white">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text as string}</p></CardContent></Card>)}</div><Button className="mt-8" variant="gradient" onClick={startFree}>Start free</Button></section>;
}
function AuthFeature({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-white/65">{text}</p></div>;
}

function MomentumScorePanel({ score }: { score: MomentumScore }) {
  const metrics = [
    { label: "Resume Strength", value: score.resumeStrength },
    { label: "Market Competitiveness", value: score.marketCompetitiveness },
    { label: "Job Match", value: score.jobMatch },
    { label: "Interview Readiness", value: score.interviewReadiness }
  ];
  return <Card className="overflow-hidden"><CardContent className="grid gap-5 p-5 lg:grid-cols-[260px_1fr]"><div className="rounded-[1.5rem] bg-slate-950 p-5 text-white dark:bg-white/[0.06]"><p className="text-sm text-white/60">Momentum Score™</p><div className="mt-4 flex items-center justify-between"><div><p className="text-6xl font-semibold tracking-[-0.08em]">{score.overall}</p><p className="text-sm text-white/60">combined SaaS health score</p></div><MatchRing score={score.overall} inverse /></div></div><div className="grid gap-4 md:grid-cols-2"><div className="grid gap-3">{metrics.map((metric) => <MiniBar key={metric.label} label={metric.label} value={metric.value} max={100} suffix="%" />)}</div><div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="font-semibold">Next best actions</p><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{score.nextActions.map((action) => <li key={action} className="flex gap-2"><Target className="mt-1 h-4 w-4 shrink-0 text-indigo-500" />{action}</li>)}</ul></div></div></CardContent></Card>;
}

function SettingsDialog({ open, setOpen, user, onSave, isBusy }: { open: boolean; setOpen: (open: boolean) => void; user: AuthUser | null; onSave: (settings: Partial<UserSettings>) => void; isBusy: boolean }) {
  const [dailyAgentEnabled, setDailyAgentEnabled] = useState(user?.settings.dailyAgentEnabled ?? true);
  const [emailDigest, setEmailDigest] = useState(user?.settings.emailDigest ?? true);
  const [targetJobSources, setTargetJobSources] = useState((user?.settings.targetJobSources ?? []).join("\n"));

  useEffect(() => {
    setDailyAgentEnabled(user?.settings.dailyAgentEnabled ?? true);
    setEmailDigest(user?.settings.emailDigest ?? true);
    setTargetJobSources((user?.settings.targetJobSources ?? []).join("\n"));
  }, [user?.id, open]);

  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><div className="p-6 md:p-8"><DialogHeader><Badge className="w-fit bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">User settings</Badge><DialogTitle>Workspace and subscription settings</DialogTitle><DialogDescription>Production-ready account settings for the daily job agent, source preferences, and monetization limits.</DialogDescription></DialogHeader><div className="mt-6 grid gap-4"><div className="rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="font-semibold">{user?.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p><div className="mt-3 flex flex-wrap gap-2"><Badge>{user?.settings.subscriptionTier ?? "Free"}</Badge><Badge>{user?.settings.analysesUsedThisMonth ?? 0}/{user?.settings.analysisLimit ?? 25} analyses</Badge></div></div><label className="flex items-center justify-between rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><span><strong>Daily AI Job Agent</strong><span className="block text-sm text-slate-500 dark:text-slate-400">Find and score new jobs every morning.</span></span><input type="checkbox" checked={dailyAgentEnabled} onChange={(event) => setDailyAgentEnabled(event.target.checked)} /></label><label className="flex items-center justify-between rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><span><strong>Email digest</strong><span className="block text-sm text-slate-500 dark:text-slate-400">Send summaries for strong matches and premium insights.</span></span><input type="checkbox" checked={emailDigest} onChange={(event) => setEmailDigest(event.target.checked)} /></label><Label>Target job sources<Textarea rows={5} value={targetJobSources} onChange={(event) => setTargetJobSources(event.target.value)} /></Label><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"><strong>Billing architecture:</strong> Free accounts are capped at 25 analyses/month. Pro, Premium, and Recruiter tiers are represented in the data model and ready for Stripe or RevenueCat wiring.</div><Button variant="gradient" onClick={() => onSave({ dailyAgentEnabled, emailDigest, targetJobSources: splitLines(targetJobSources) })} disabled={isBusy}>{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save settings</Button></div></div></DialogContent></Dialog>;
}

function AmbientBackground({ reducedMotion }: { reducedMotion: boolean }) {
  const particles = [
    "left-[12%] top-[18%] h-2 w-2 bg-indigo-400/60",
    "left-[78%] top-[12%] h-1.5 w-1.5 bg-fuchsia-400/60",
    "left-[88%] top-[58%] h-2.5 w-2.5 bg-cyan-300/50",
    "left-[18%] top-[82%] h-1.5 w-1.5 bg-emerald-300/50",
    "left-[48%] top-[35%] h-1 w-1 bg-white/50"
  ];

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      {particles.map((className, index) => (
        <motion.span
          key={className}
          className={`absolute rounded-full shadow-[0_0_22px_currentColor] ${className}`}
          animate={reducedMotion ? undefined : { y: [0, -18, 0], opacity: [0.25, 0.75, 0.25] }}
          transition={{ duration: 6 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.45 }}
        />
      ))}
    </div>
  );
}

function Sidebar({ view, setView, profile, jobs, profileCompletion }: { view: View; setView: (view: View) => void; profile?: UserProfile; jobs: JobPosting[]; profileCompletion: number }) {
  return (
    <motion.aside initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="sticky top-5 z-20 flex h-fit flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-2xl shadow-slate-950/[0.08] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/25 lg:h-[calc(100vh-2.5rem)] lg:w-80">
      <div className="flex items-center gap-3 rounded-[1.5rem] bg-slate-950 p-4 text-white ring-1 ring-white/10 dark:bg-white dark:text-slate-950">
        <motion.div whileHover={{ rotate: -8, scale: 1.04 }} className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-white shadow-lg shadow-indigo-500/30"><Sparkles className="h-5 w-5" /></motion.div>
        <div><p className="text-sm font-semibold">MomentumAI</p><p className="text-xs opacity-70">Job Copilot</p></div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)} aria-current={active ? "page" : undefined} className="group relative flex min-w-[180px] items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-950/5 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:hover:bg-white/10 lg:min-w-0">
              {active && <motion.span layoutId="active-nav" className="absolute inset-0 rounded-2xl bg-white shadow-lg shadow-slate-950/10 dark:bg-white/10 dark:shadow-black/20" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-slate-950/5 text-slate-600 transition group-hover:scale-105 group-hover:text-indigo-500 dark:bg-white/10 dark:text-slate-300"><Icon className="h-4 w-4" /></span>
              <span className="relative min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{item.label}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.helper}</span></span>
              <kbd className="relative hidden rounded-md bg-slate-950/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-white/10 lg:block">{item.shortcut}</kbd>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden rounded-[1.5rem] border border-white/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.06] lg:block">
        <div className="flex items-center gap-3"><Avatar name={profile?.name ?? "Candidate"} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{profile?.name ?? "Candidate"}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile?.location ?? "Set location"}</p></div></div>
        <div className="mt-4"><ProgressLabel label="Profile completion" value={profileCompletion} /></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center"><MetricTile value={jobs.length} label="Total roles" /><MetricTile value={jobs.filter((job) => job.redFlags.length === 0).length} label="Clean fits" /></div>
      </div>
    </motion.aside>
  );
}

function TopBar({ query, setQuery, theme, setTheme, onAddJob, onCommand, onSettings, onLogout, profile, user }: { query: string; setQuery: (query: string) => void; theme: Theme; setTheme: (theme: Theme) => void; onAddJob: () => void; onCommand: () => void; onSettings: () => void; onLogout: () => void; profile?: UserProfile; user?: AuthUser | null }) {
  return (
    <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="sticky top-3 z-10 flex flex-col gap-3 rounded-[2rem] border border-white/70 bg-white/75 p-3 shadow-xl shadow-slate-950/[0.06] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, skills, companies, locations..." className="h-12 rounded-full border-transparent bg-slate-950/[0.04] pl-11 pr-20 shadow-none dark:bg-white/[0.08]" />
        <button type="button" onClick={onCommand} className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-slate-900 md:flex" aria-label="Open command palette"><Command className="h-3 w-3" /> K</button>
      </div>
      <div className="flex items-center gap-2"><Button variant="secondary" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button><Button variant="secondary" size="icon" onClick={onCommand} aria-label="Open command palette"><Command className="h-4 w-4" /></Button><Button variant="secondary" size="icon" onClick={onSettings} aria-label="User settings"><UserRound className="h-4 w-4" /></Button><Button variant="secondary" size="icon" onClick={onLogout} aria-label="Log out"><XCircle className="h-4 w-4" /></Button><Button variant="gradient" onClick={onAddJob}><Plus className="h-4 w-4" /> Add job</Button><button onClick={onSettings} className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/70 py-1 pl-1 pr-3 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 sm:flex"><Avatar name={profile?.name ?? user?.name ?? "Candidate"} small /><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name?.split(" ")[0] ?? profile?.name?.split(" ")[0] ?? "You"}</span></button></div>
    </motion.header>
  );
}

function HeroPanel({ profile, pendingCount, avgMatch, profileCompletion }: { profile: UserProfile; pendingCount: number; avgMatch: number; profileCompletion: number }) {
  return (
    <Card className="relative overflow-hidden border-white/80 bg-slate-950 text-white dark:bg-white/[0.06]"><motion.div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.65),transparent_28rem),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.4),transparent_24rem)]" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} /><div className="absolute right-8 top-8 hidden h-56 w-56 rounded-full border border-white/10 bg-white/10 blur-3xl md:block" /><CardContent className="relative grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8"><div><Badge className="border-white/20 bg-white/10 text-white">AI SaaS-style job command center</Badge><h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.07em] text-white md:text-6xl">Find test engineering roles with a sharper, calmer workflow.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/70 md:text-lg">Built for test engineer, technician, quality, validation, and automotive testing searches. Paste roles from anywhere, review the evidence, and generate documents only when you approve.</p><div className="mt-6 flex flex-wrap gap-3"><Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-100"><CheckCircle2 className="mr-1 h-3 w-3" /> Review before apply</Badge><Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-100"><Target className="mr-1 h-3 w-3" /> {avgMatch}% avg match</Badge><Badge className="border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-100"><Sparkles className="mr-1 h-3 w-3" /> Tailored docs</Badge></div></div><div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl"><p className="text-sm text-white/60">Today&apos;s focus</p><div className="mt-4 flex items-center justify-between"><div><p className="text-5xl font-semibold tracking-[-0.08em]">{pendingCount}</p><p className="text-sm text-white/60">roles in review</p></div><MatchRing score={avgMatch} inverse /></div><div className="mt-6 rounded-2xl bg-white/10 p-4"><p className="text-sm font-semibold">{profile.preferredTitles[0] ?? "Test Engineer"}</p><p className="mt-1 text-xs leading-5 text-white/60">Targeting {profile.location} within {profile.commuteMiles} miles and ${profile.desiredPayMin}-${profile.desiredPayMax}/hr.</p><div className="mt-4"><ProgressLabel label="Profile strength" value={profileCompletion} inverse /></div></div></div></CardContent></Card>
  );
}

function AnalyticsGrid({ analytics }: { analytics: Array<{ label: string; value: string | number; helper: string; icon: IconComponent; gradient: string }> }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{analytics.map((item, index) => { const Icon = item.icon; return <motion.div key={item.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -4 }}><Card className="group overflow-hidden"><CardContent className="p-5"><div className="flex items-center justify-between"><div className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg shadow-indigo-500/15 transition group-hover:scale-105`}><Icon className="h-5 w-5" /></div><TrendingUp className="h-4 w-4 text-emerald-500 opacity-70 transition group-hover:scale-110" /></div><p className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-slate-950 dark:text-white">{item.value}</p><p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{item.label}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-500">{item.helper}</p></CardContent></Card></motion.div>; })}</div>;
}

function IntelligenceAnalyticsPanel({ analytics, jobs }: { analytics: AnalyticsData; jobs: JobPosting[] }) {
  const maxSkill = Math.max(1, ...analytics.topMatchedSkills.map((item) => item.count), ...analytics.commonMissingSkills.map((item) => item.count));
  return <Card><CardHeader className="flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-2xl">Job intelligence analytics</CardTitle><CardDescription>Demo analytics are structured so real persisted data can replace them later.</CardDescription></div><Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">{analytics.responseRate}% response rate</Badge></CardHeader><CardContent className="grid gap-4 lg:grid-cols-3"><div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="font-semibold">Applications by status</p><div className="mt-4 flex h-32 items-end gap-2">{Object.entries(analytics.applicationsByStatus).map(([status, count]) => <div key={status} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-24 w-full items-end rounded-full bg-white/70 p-1 dark:bg-slate-950/40"><motion.div className="w-full rounded-full bg-gradient-to-t from-indigo-500 to-fuchsia-400" initial={{ height: 0 }} animate={{ height: `${Math.max(8, Number(count) * 18)}%` }} /></div><span className="text-[10px] text-slate-500 dark:text-slate-400">{status.slice(0, 3)}</span></div>)}</div></div><div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="font-semibold">Top matched skills</p><div className="mt-3 space-y-2">{analytics.topMatchedSkills.length ? analytics.topMatchedSkills.map((item) => <MiniBar key={item.skill} label={item.skill} value={item.count} max={maxSkill} />) : <p className="text-sm text-slate-500 dark:text-slate-400">No matched skill data yet.</p>}</div></div><div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="font-semibold">Missing skills and sources</p><div className="mt-3 space-y-2">{analytics.commonMissingSkills.slice(0, 4).map((item) => <MiniBar key={item.skill} label={item.skill} value={item.count} max={maxSkill} />)}{analytics.bestJobSources.slice(0, 3).map((source) => <div key={source.source} className="rounded-xl bg-white/60 p-2 text-sm dark:bg-slate-950/30"><span className="font-semibold">{source.source}</span><span className="ml-2 text-slate-500">{source.count} roles · {source.averageMatch}% avg</span></div>)}</div></div></CardContent></Card>;
}

function ScoreBreakdown({ breakdown }: { breakdown: JobPosting["scoreBreakdown"] }) {
  if (!breakdown) return null;
  const items = Object.entries(breakdown).map(([key, value]) => ({ key, value }));
  return <div className="mt-4 rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="text-sm font-semibold text-slate-900 dark:text-white">Advanced score breakdown</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{items.map((item) => <MiniBar key={item.key} label={item.key.replace(/([A-Z])/g, " $1")} value={Number(item.value)} max={100} suffix="%" />)}</div></div>;
}

function MiniBar({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  const width = Math.max(4, Math.min(100, (value / max) * 100));
  return <div><div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400"><span className="capitalize">{label}</span><span>{value}{suffix}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.55, ease: "easeOut" }} /></div></div>;
}

function JobBoard({ title, description, jobs, empty, onStatus, onGenerate, onSaveNotes, onSaveScorecard, isBusy, emptyAction }: { title: string; description: string; jobs: JobPosting[]; empty: string; onStatus: (job: JobPosting, status: ApplicationStatus) => void; onGenerate: (job: JobPosting) => void; onSaveNotes: (job: JobPosting, text: string) => void; onSaveScorecard: (job: JobPosting, scorecard: JobDecisionScorecard) => void; isBusy: boolean; emptyAction?: React.ReactNode }) {
  return <Card><CardHeader className="flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><CardTitle className="text-2xl">{title}</CardTitle><CardDescription>{description}</CardDescription></div><Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{jobs.length} visible</Badge></CardHeader><CardContent>{jobs.length === 0 ? <EmptyState icon={Briefcase} title="Nothing here yet" description={empty} action={emptyAction} /> : <div className="grid gap-4 xl:grid-cols-2">{jobs.map((job, index) => <motion.div key={job.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}><JobCard job={job} onStatus={onStatus} onGenerate={onGenerate} onSaveNotes={onSaveNotes} onSaveScorecard={onSaveScorecard} isBusy={isBusy} /></motion.div>)}</div>}</CardContent></Card>;
}

function JobCard({ job, onStatus, onGenerate, onSaveNotes, onSaveScorecard, isBusy }: { job: JobPosting; onStatus: (job: JobPosting, status: ApplicationStatus) => void; onGenerate: (job: JobPosting) => void; onSaveNotes: (job: JobPosting, text: string) => void; onSaveScorecard: (job: JobPosting, scorecard: JobDecisionScorecard) => void; isBusy: boolean }) {
  const [noteDraft, setNoteDraft] = useState(job.notes?.text ?? "");
  const scorecard = job.scorecard;
  const fitTone = job.fitLabel === "Strong fit" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : job.fitLabel === "Possible fit" ? "bg-amber-500/10 text-amber-600 dark:text-amber-300" : "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300";
  const bumpScore = (field: keyof Omit<JobDecisionScorecard, "recommendation" | "rationale">, delta: number) => {
    if (!scorecard) return;
    const next = { ...scorecard, [field]: Math.max(0, Math.min(100, Number(scorecard[field]) + delta)) };
    const average = Math.round((next.pay + next.commute + next.careerGrowth + next.workLifeBalance + next.companyConfidence + next.roleFit) / 6);
    next.recommendation = average >= 82 ? "Apply now" : average >= 65 ? "Save for later" : average >= 48 ? "Needs more research" : "Skip";
    onSaveScorecard(job, next);
  };

  return <article className="group rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 shadow-lg shadow-slate-950/[0.04] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-indigo-400/30"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge className="bg-slate-950 text-white dark:bg-white dark:text-slate-950">{job.status}</Badge><Badge className={fitTone}>{job.fitLabel ?? "Possible fit"}</Badge>{job.redFlags.length === 0 ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">Clean</Badge> : <Badge className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">{job.redFlags.length} flags</Badge>}</div><h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{job.title}</h3><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{job.company}</p></div><MatchRing score={job.matchScore} /></div><div className="mt-4 grid gap-2 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-3"><InfoPill icon={MapPin} text={job.location} /><InfoPill icon={CircleDollarSign} text={job.pay ?? "Pay not listed"} /><InfoPill icon={FileText} text={job.source} /></div><div className="mt-4 flex flex-wrap gap-2">{(job.requiredSkills.length ? job.requiredSkills : ["More detail needed"]).slice(0, 7).map((skill) => <Badge key={skill} className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{skill}</Badge>)}</div>{job.scoreBreakdown && <ScoreBreakdown breakdown={job.scoreBreakdown} />}{job.missingQualifications?.length ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"><p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Missing or stretch qualifications</p><div className="mt-2 flex flex-wrap gap-2">{job.missingQualifications.slice(0, 6).map((skill) => <Badge key={skill} className="border-amber-200 bg-white/70 text-amber-700 dark:border-amber-400/20 dark:bg-white/10 dark:text-amber-200">{skill}</Badge>)}</div></div> : null}<div className="mt-5 grid gap-3 lg:grid-cols-2"><div className="rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="text-sm font-semibold text-slate-900 dark:text-white">Why it matches</p><ul className="mt-2 space-y-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{job.whyMatches.slice(0, 3).map((reason) => <li className="flex gap-2" key={reason}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {reason}</li>)}</ul></div><div className="rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><ShieldAlert className="h-4 w-4 text-amber-500" /> Red flags</p>{job.redFlags.length ? <ul className="mt-2 space-y-2 text-sm leading-5 text-rose-600 dark:text-rose-300">{job.redFlags.slice(0, 3).map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">No obvious red flags found.</p>}</div></div>{scorecard && <div className="mt-4 rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900 dark:text-white">Decision helper</p><Badge className="bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300">{scorecard.recommendation}</Badge></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{(["pay", "commute", "careerGrowth", "workLifeBalance", "companyConfidence", "roleFit"] as const).map((field) => <div key={field} className="rounded-xl bg-white/60 p-2 dark:bg-slate-950/30"><div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400"><span>{field.replace(/([A-Z])/g, " $1")}</span><span>{scorecard[field]}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${scorecard[field]}%` }} /></div><div className="mt-1 flex gap-1"><button className="rounded bg-slate-950/5 px-1.5 text-xs dark:bg-white/10" onClick={() => bumpScore(field, -5)}>-</button><button className="rounded bg-slate-950/5 px-1.5 text-xs dark:bg-white/10" onClick={() => bumpScore(field, 5)}>+</button></div></div>)}</div></div>}<div className="mt-4 rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><Label>Private notes<Textarea rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add salary notes, recruiter details, commute concerns, or research questions..." /></Label><div className="mt-2 flex justify-end"><Button variant="secondary" size="sm" onClick={() => onSaveNotes(job, noteDraft)} disabled={isBusy}>Save notes</Button></div></div><div className="mt-5 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => onStatus(job, "Saved")} disabled={isBusy || job.status === "Saved"}>Save</Button><Button variant="ghost" size="sm" onClick={() => onStatus(job, "Rejected")} disabled={isBusy}>Skip</Button><Button variant="secondary" size="sm" onClick={() => onGenerate(job)} disabled={isBusy}><Wand2 className="h-4 w-4" /> Customize resume</Button><Button variant="secondary" size="sm" onClick={() => onGenerate(job)} disabled={isBusy}><FileText className="h-4 w-4" /> Cover letter</Button><Button variant="gradient" size="sm" onClick={() => onGenerate(job)} disabled={isBusy}>Apply <ArrowRight className="h-4 w-4" /></Button></div></article>;
}

function ManualJobIntake({ jobDraft, setJobDraft, addManualJob, isBusy }: { jobDraft: typeof blankJob; setJobDraft: (draft: typeof blankJob) => void; addManualJob: () => void; isBusy: boolean }) {
  const [importText, setImportText] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [imported, setImported] = useState<ImportedJobDraft | null>(null);
  const [extracting, setExtracting] = useState(false);

  const extractJob = async () => {
    if (!importText.trim() && !importUrl.trim() && !recruiterEmail.trim()) {
      toast.error("Paste a job description, URL, or recruiter email first.");
      return;
    }
    setExtracting(true);
    try {
      const result = await request<ImportedJobDraft>("/api/jobs/import", {
        method: "POST",
        body: JSON.stringify({ text: importText, url: importUrl, recruiterEmail, source: importUrl ? "Job URL import" : recruiterEmail ? "Recruiter email import" : "Manual paste import" })
      });
      setImported(result);
      setJobDraft({
        title: result.title,
        company: result.company,
        location: result.location,
        source: result.source,
        pay: result.pay ?? "",
        description: result.description,
        preferredSkills: result.preferredSkills ?? [],
        yearsExperience: result.yearsExperience ?? "",
        employmentType: result.employmentType ?? "",
        applicationUrl: result.applicationUrl ?? ""
      });
      toast.success(`Extracted job details with ${result.confidence}% confidence. Review before adding.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not extract job details");
    } finally {
      setExtracting(false);
    }
  };

  return <Card><CardHeader><CardTitle className="text-2xl">Job intelligence importer</CardTitle><CardDescription>Paste a description, recruiter email, or URL. Local URL scraping falls back to manual content review, so you stay in control.</CardDescription></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[1fr_380px]"><div className="grid gap-4"><div className="rounded-[1.5rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 p-4 dark:border-white/10"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Extract structured job data</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Title, company, location, pay, skills, years, source, and application URL.</p></div>{imported && <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">{imported.confidence}% confidence</Badge>}</div><div className="mt-4 grid gap-3"><Label>Job URL<Input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="https://company.com/careers/job-id" /></Label><Label>Recruiter email text<Textarea rows={4} value={recruiterEmail} onChange={(event) => setRecruiterEmail(event.target.value)} placeholder="Paste a recruiter email or LinkedIn message..." /></Label><Label>Job description or posting content<Textarea rows={7} value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste full job content for best extraction accuracy..." /></Label><Button variant="secondary" onClick={extractJob} disabled={extracting}>{extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Extract job details</Button></div>{imported && <ul className="mt-4 space-y-1 text-sm text-slate-500 dark:text-slate-400">{imported.extractionNotes.map((note) => <li key={note}>- {note}</li>)}</ul>}</div><div className="grid gap-4 md:grid-cols-2"><Label>Job title<Input value={jobDraft.title} onChange={(event) => setJobDraft({ ...jobDraft, title: event.target.value })} placeholder="Validation Technician" /></Label><Label>Company<Input value={jobDraft.company} onChange={(event) => setJobDraft({ ...jobDraft, company: event.target.value })} placeholder="Acme Mobility" /></Label><Label>Location<Input value={jobDraft.location} onChange={(event) => setJobDraft({ ...jobDraft, location: event.target.value })} placeholder="Detroit, MI / Remote" /></Label><Label>Pay, if available<Input value={jobDraft.pay} onChange={(event) => setJobDraft({ ...jobDraft, pay: event.target.value })} placeholder="$28-$36/hr" /></Label><Label>Years experience<Input value={jobDraft.yearsExperience} onChange={(event) => setJobDraft({ ...jobDraft, yearsExperience: event.target.value })} placeholder="2+ years" /></Label><Label>Employment type<Input value={jobDraft.employmentType} onChange={(event) => setJobDraft({ ...jobDraft, employmentType: event.target.value })} placeholder="Full-time" /></Label></div><Label>Application URL<Input value={jobDraft.applicationUrl} onChange={(event) => setJobDraft({ ...jobDraft, applicationUrl: event.target.value })} placeholder="https://..." /></Label><Label>Source<Input value={jobDraft.source} onChange={(event) => setJobDraft({ ...jobDraft, source: event.target.value })} placeholder="Company careers page" /></Label><Label>Job description<Textarea rows={10} value={jobDraft.description} onChange={(event) => setJobDraft({ ...jobDraft, description: event.target.value })} placeholder="Paste the full job description here..." /></Label><Button variant="gradient" size="lg" onClick={addManualJob} disabled={isBusy}>{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Score and add to pending</Button></div><div className="rounded-[1.5rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 p-5 dark:border-white/10"><Sparkles className="h-8 w-8 text-indigo-500" /><h3 className="mt-4 text-xl font-semibold tracking-[-0.04em]">Advanced matching engine</h3><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Scores title alignment, skill overlap, experience level, remote/location fit, pay fit, industry fit, red flags, missing qualifications, and career growth.</p><div className="mt-5 space-y-3">{["Strong fit / possible fit / stretch", "Missing qualifications", "Decision scorecard", "Application packet", "Review-before-apply safety"].map((item) => <div key={item} className="flex items-center justify-between rounded-2xl bg-white/60 p-3 text-sm transition hover:translate-x-1 dark:bg-white/10"><span>{item}</span><ChevronRight className="h-4 w-4 text-slate-400" /></div>)}</div></div></CardContent></Card>;
}

function ProfileEditor({ profileDraft, setProfileDraft, titlesDraft, setTitlesDraft, skillsDraft, setSkillsDraft, saveProfile, isBusy, completion, onResumeFile, resumeParseResult }: { profileDraft: UserProfile; setProfileDraft: (profile: UserProfile) => void; titlesDraft: string; setTitlesDraft: (value: string) => void; skillsDraft: string; setSkillsDraft: (value: string) => void; saveProfile: () => void; isBusy: boolean; completion: number; onResumeFile: (file: File) => void; resumeParseResult: ResumeParseResult | null }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onResumeFile(file);
  };

  const parsed = resumeParseResult?.parsedResume ?? profileDraft.parsedResume;
  const suggestions = resumeParseResult?.suggestions ?? profileDraft.profileSuggestions ?? [];

  return <Card><CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-2xl">Resume intelligence and profile</CardTitle><CardDescription>Import PDF, DOCX, TXT, or MD resumes, review extracted fields, then save only what is accurate.</CardDescription></div><div className="min-w-[220px]"><ProgressLabel label="Profile strength" value={profileDraft.profileStrength ?? completion} /></div></CardHeader><CardContent className="grid gap-5 lg:grid-cols-2"><div className="grid gap-4"><div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} className={`rounded-[1.25rem] border border-dashed p-4 transition ${dragging ? "border-indigo-400 bg-indigo-500/10" : "border-slate-300 bg-slate-950/[0.03] dark:border-white/15 dark:bg-white/[0.04]"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500"><UploadCloud className="h-5 w-5" /></div><div><p className="font-semibold">Drag and drop resume</p><p className="text-sm text-slate-500 dark:text-slate-400">PDF, DOCX, TXT, or MD. Review extracted data before saving.</p></div></div><Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>Choose file</Button></div><input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onResumeFile(file); }} /></div>{parsed && <div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><div className="flex items-center justify-between gap-3"><p className="font-semibold">Extracted resume profile</p><Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">Review before save</Badge></div><div className="mt-3 grid gap-3 text-sm"><div><p className="text-slate-500 dark:text-slate-400">Name/contact</p><p>{parsed.name || "Name not detected"}</p><p className="text-slate-500 dark:text-slate-400">{parsed.contactInfo.join(" · ") || "Contact info not detected"}</p></div><div><p className="text-slate-500 dark:text-slate-400">Skills</p><div className="mt-1 flex flex-wrap gap-2">{parsed.skills.slice(0, 10).map((skill) => <Badge key={skill}>{skill}</Badge>)}</div></div><div><p className="text-slate-500 dark:text-slate-400">Tools/tech</p><div className="mt-1 flex flex-wrap gap-2">{parsed.toolsTechnologies.slice(0, 8).map((tool) => <Badge key={tool}>{tool}</Badge>)}</div></div><div><p className="text-slate-500 dark:text-slate-400">Education/certs</p><p>{[...parsed.education, ...parsed.certifications].slice(0, 4).join(" · ") || "No education/certifications detected"}</p></div></div></div>}{suggestions.length > 0 && <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"><p className="font-semibold text-amber-900 dark:text-amber-100">Resume improvement suggestions</p><ul className="mt-2 space-y-2 text-sm text-amber-800 dark:text-amber-100/80">{suggestions.map((item) => <li key={`${item.category}-${item.suggestion}`}><strong>{item.impact}:</strong> {item.suggestion}</li>)}</ul></div>}<div className="grid gap-4 md:grid-cols-2"><Label>Name<Input value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} /></Label><Label>Email<Input value={profileDraft.email} onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })} /></Label><Label>Location<Input value={profileDraft.location} onChange={(event) => setProfileDraft({ ...profileDraft, location: event.target.value })} /></Label><Label>Commute miles<Input type="number" value={profileDraft.commuteMiles} onChange={(event) => setProfileDraft({ ...profileDraft, commuteMiles: Number(event.target.value) })} /></Label><Label>Minimum pay<Input type="number" value={profileDraft.desiredPayMin} onChange={(event) => setProfileDraft({ ...profileDraft, desiredPayMin: Number(event.target.value) })} /></Label><Label>Maximum pay<Input type="number" value={profileDraft.desiredPayMax} onChange={(event) => setProfileDraft({ ...profileDraft, desiredPayMax: Number(event.target.value) })} /></Label></div><Label>Preferred job titles, one per line<Textarea rows={5} value={titlesDraft} onChange={(event) => setTitlesDraft(event.target.value)} /></Label><Label>Skills, one per line<Textarea rows={5} value={skillsDraft} onChange={(event) => setSkillsDraft(event.target.value)} /></Label></div><div className="grid gap-4"><Label>Experience summary<Textarea rows={7} value={profileDraft.experience} onChange={(event) => setProfileDraft({ ...profileDraft, experience: event.target.value })} /></Label><Label>Base resume<Textarea rows={14} value={profileDraft.resume} onChange={(event) => setProfileDraft({ ...profileDraft, resume: event.target.value })} /></Label><Label>Cover letter style<Select value={profileDraft.coverLetterStyle} onChange={(event) => setProfileDraft({ ...profileDraft, coverLetterStyle: event.target.value as UserProfile["coverLetterStyle"] })}><option>Direct and practical</option><option>Warm and confident</option><option>Technical and detailed</option><option>Entry-level and eager</option></Select></Label><div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"><strong>Accuracy reminder:</strong> Only save skills, tools, certifications, and experience that are true. The app should never invent experience for you.</div><Button variant="gradient" size="lg" onClick={saveProfile} disabled={isBusy}>{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />} Save reviewed profile</Button></div></CardContent></Card>;
}

function ApplicationTracker({ jobs, onGenerate, onStatus, progressPercent }: { jobs: JobPosting[]; onGenerate: (job: JobPosting) => void; onStatus: (job: JobPosting, status: ApplicationStatus) => void; progressPercent: number }) {
  const statusCounts = statusOrder.filter((status) => status !== "Pending").map((status) => ({ status, count: jobs.filter((job) => job.status === status).length }));
  const maxCount = Math.max(1, ...statusCounts.map((item) => item.count));

  return <div className="grid gap-4"><Card><CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]"><div><CardTitle className="text-2xl">Application pipeline</CardTitle><CardDescription>Move jobs from saved to applied, interview, offer, or rejected as your search progresses.</CardDescription><div className="mt-5"><ProgressLabel label="Pipeline progress" value={progressPercent} /></div></div><div className="flex items-end gap-2 rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]" aria-label="Application status chart">{statusCounts.map((item) => <div key={item.status} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-28 w-full items-end rounded-full bg-white/70 p-1 dark:bg-slate-950/40"><motion.div className="w-full rounded-full bg-gradient-to-t from-indigo-500 to-fuchsia-400" initial={{ height: 0 }} animate={{ height: `${Math.max(8, (item.count / maxCount) * 100)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div><span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.status.slice(0, 3)}</span></div>)}</div></CardContent></Card><div className="grid gap-4 overflow-x-auto lg:grid-cols-5">{statusCounts.map(({ status }) => <Card key={status} className="min-h-[260px] min-w-[220px]"><CardHeader className="p-4"><CardTitle className="text-base">{status}</CardTitle></CardHeader><CardContent className="space-y-3 p-4 pt-0">{jobs.filter((job) => job.status === status).length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-white/10">No roles yet.</p>}{jobs.filter((job) => job.status === status).map((job) => <div key={job.id} className="rounded-2xl bg-slate-950/[0.04] p-3 transition hover:-translate-y-0.5 dark:bg-white/[0.06]"><p className="font-semibold text-slate-900 dark:text-white">{job.title}</p><p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p><div className="mt-3 flex gap-2"><Button variant="secondary" size="sm" onClick={() => onGenerate(job)}>Docs</Button>{status !== "Interview" && <Button variant="ghost" size="sm" onClick={() => onStatus(job, "Interview")}>Interview</Button>}</div></div>)}</CardContent></Card>)}</div></div>;
}

function CareerCoachPage({ jobs, profile, localDemoMode }: { jobs: JobPosting[]; profile: UserProfile; localDemoMode: boolean }) {
  const [report, setReport] = useState<CareerCoachReport | null>(null);
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? "");
  const [marketplace, setMarketplace] = useState<MissingSkillsMarketplace | null>(null);
  const [simulator, setSimulator] = useState<InterviewSimulator | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0];

  useEffect(() => {
    request<CareerCoachReport>("/api/career/coach").then(setReport).catch(() => {
      if (localDemoMode) setReport(buildCareerCoachReport(profile, jobs));
      else toast.error("Could not load career coach report.");
    });
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setSelectedJobId(selectedJob.id);
  }, [selectedJob?.id]);

  const loadJobCoach = async () => {
    if (!selectedJob) return;
    setLoading(true);
    try {
      let skills: MissingSkillsMarketplace;
      let interview: InterviewSimulator;
      try {
        [skills, interview] = await Promise.all([
          request<MissingSkillsMarketplace>(`/api/jobs/${selectedJob.id}/skills-marketplace`),
          request<InterviewSimulator>(`/api/jobs/${selectedJob.id}/interview`, { method: "POST" })
        ]);
      } catch (error) {
        if (!localDemoMode) throw error;
        skills = buildMissingSkillsMarketplace(profile, selectedJob);
        interview = buildInterviewSimulator(profile, selectedJob);
      }
      setMarketplace(skills);
      setSimulator(interview);
      toast.success(`Career coach loaded for ${selectedJob.company}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load coach tools.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="grid gap-4"><Card><CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-2xl">AI Career Coach</CardTitle><CardDescription>Diagnose why interviews are not happening, close missing skill gaps, and practice against real saved jobs.</CardDescription></div><Badge className="bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300">sticky SaaS layer</Badge></CardHeader><CardContent className="grid gap-4 lg:grid-cols-3"><CoachList title="Why interviews may be low" items={report?.interviewDiagnosis ?? ["Loading coach report..."]} /><CoachList title="Career gap analysis" items={report?.careerGapAnalysis ?? []} /><CoachList title="Salary recommendations" items={report?.salaryRecommendations ?? []} /></CardContent></Card>{report && <Card><CardHeader><CardTitle>Recurring missing skills</CardTitle><CardDescription>These are the skills that can turn MomentumAI into a learning loop, not just an application tracker.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{report.missingSkills.length ? report.missingSkills.map((skill) => <div key={skill.skill} className="rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><div className="flex items-center justify-between gap-2"><p className="font-semibold capitalize">{skill.skill}</p><Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{skill.importance}</Badge></div><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{skill.reason}</p></div>) : <EmptyState icon={CheckCircle2} title="No recurring missing skills yet" description="Import more real jobs to build a better learning map." />}</CardContent></Card>}<Card><CardHeader className="flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><CardTitle>Missing Skills Marketplace + Interview Simulator</CardTitle><CardDescription>Pick a saved job to see score lift opportunities and realistic interview practice.</CardDescription></div><div className="flex gap-2"><Select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.company} · {job.title}</option>)}</Select><Button variant="gradient" onClick={loadJobCoach} disabled={loading || !selectedJob}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyze</Button></div></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{marketplace ? <div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><div className="flex items-center justify-between"><p className="font-semibold">Score lift plan</p><Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">{marketplace.currentScore}% to {marketplace.projectedScore}%</Badge></div><div className="mt-4 space-y-3">{marketplace.plans.length ? marketplace.plans.map((plan) => <div key={plan.skill} className="rounded-2xl bg-white/70 p-3 dark:bg-slate-950/30"><div className="flex items-center justify-between gap-2"><p className="font-semibold capitalize">{plan.skill}</p><span className="text-sm text-emerald-500">+{plan.projectedScoreLift}%</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.explanation}</p><div className="mt-2 flex flex-wrap gap-2">{plan.resources.map((resource) => <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer" className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300">{resource.type}: {resource.title}</a>)}</div></div>) : <p className="text-sm text-slate-500 dark:text-slate-400">This role has no obvious missing skills.</p>}</div></div> : <EmptyState icon={Target} title="Analyze a job" description="Generate skill-gap resources and projected score lift for any saved role." />}{simulator ? <div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="font-semibold">{simulator.title}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{simulator.intro}</p><div className="mt-4 space-y-3">{simulator.questions.slice(0, 5).map((item) => <div key={item.question} className="rounded-2xl bg-white/70 p-3 dark:bg-slate-950/30"><Badge>{item.category}</Badge><p className="mt-2 font-semibold">{item.question}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why: {item.whyAsked}</p><p className="mt-1 text-sm text-indigo-600 dark:text-indigo-300">STAR: {item.starSuggestion}</p></div>)}</div></div> : <EmptyState icon={Wand2} title="Practice interview" description="Generate technical, behavioral, and role-specific questions from the selected posting." />}</CardContent></Card></div>;
}

function CoachList({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-[1.25rem] bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><p className="font-semibold">{title}</p><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />{item}</li>)}</ul></div>;
}

function CommandPalette({ open, setOpen, commandQuery, setCommandQuery, setView, setTheme, theme, jobs, generateForJob }: { open: boolean; setOpen: (open: boolean) => void; commandQuery: string; setCommandQuery: (query: string) => void; setView: (view: View) => void; setTheme: (theme: Theme) => void; theme: Theme; jobs: JobPosting[]; generateForJob: (job: JobPosting) => void }) {
  const search = commandQuery.toLowerCase();
  const matchingJobs = jobs.filter((job) => [job.title, job.company, job.location].join(" ").toLowerCase().includes(search)).slice(0, 4);
  const actions = navItems.filter((item) => item.label.toLowerCase().includes(search) || item.helper.toLowerCase().includes(search));

  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><div className="p-4"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Jump to pages, find jobs, generate docs..." className="h-14 rounded-2xl pl-11 text-base" /></div><div className="mt-4 max-h-[60vh] overflow-y-auto"><p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Navigate</p><div className="mt-2 grid gap-1">{actions.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setView(item.id); setOpen(false); }} className="flex items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-950/5 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:hover:bg-white/10"><Icon className="h-4 w-4 text-indigo-500" /><div className="flex-1"><p className="font-semibold">{item.label}</p><p className="text-sm text-slate-500 dark:text-slate-400">{item.helper}</p></div><kbd className="rounded-md bg-slate-950/5 px-2 py-1 text-xs text-slate-400 dark:bg-white/10">{item.shortcut}</kbd></button>; })}</div><p className="mt-4 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quick actions</p><button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setOpen(false); }} className="mt-2 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-950/5 dark:hover:bg-white/10"><Keyboard className="h-4 w-4 text-indigo-500" /><div><p className="font-semibold">Toggle theme</p><p className="text-sm text-slate-500 dark:text-slate-400">Switch between dark and light mode</p></div></button>{matchingJobs.length > 0 && <><p className="mt-4 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Jobs</p><div className="mt-2 grid gap-1">{matchingJobs.map((job) => <button key={job.id} onClick={() => { generateForJob(job); setOpen(false); }} className="flex items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-950/5 dark:hover:bg-white/10"><Briefcase className="h-4 w-4 text-indigo-500" /><div className="flex-1"><p className="font-semibold">{job.title}</p><p className="text-sm text-slate-500 dark:text-slate-400">{job.company} · {job.matchScore}% match</p></div><ArrowRight className="h-4 w-4 text-slate-400" /></button>)}</div></>}</div></div></DialogContent></Dialog>;
}

function ApplicationDialog({ generated, activeJob, profile, setGenerated, onApplied }: { generated: GeneratedApplication | null; activeJob: JobPosting | null; profile: UserProfile | null; setGenerated: (generated: GeneratedApplication | null) => void; onApplied: (job: JobPosting) => void }) {
  const [tab, setTab] = useState("preview");
  const [template, setTemplate] = useState<ResumeTemplate>("ATS Optimized");
  const [coverStyle, setCoverStyle] = useState<CoverLetterStudioStyle>("Professional");
  const [pageLength, setPageLength] = useState<ResumePageLength>("one-page");

  const studio = generated && activeJob && profile ? buildResumeStudio(profile, activeJob, generated, { template, coverLetterStyle: coverStyle, pageLength }) : null;
  const legacyDocs = generated && activeJob ? [
    { id: "recruiter", label: "Recruiter", title: "Recruiter message", value: generated.packet?.recruiterMessage ?? "" },
    { id: "linkedin", label: "LinkedIn", title: "LinkedIn message", value: generated.packet?.linkedInMessage ?? "" },
    { id: "interview", label: "Interview", title: "Interview talking points", value: generated.packet?.interviewTalkingPoints.join("\n") ?? "" }
  ] : [];
  const legacyDoc = legacyDocs.find((doc) => doc.id === tab);

  const copy = async (value: string, label: string) => { await navigator.clipboard.writeText(value); toast.success(`${label} copied.`); };
  const downloadBlob = (filename: string, content: BlobPart, type = "text/plain;charset=utf-8") => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = async (title: string, value: string) => {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 54;
    const lines = pdf.splitTextToSize(value, 504) as string[];
    let y = margin;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(title, margin, y);
    y += 28;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    lines.forEach((line) => {
      if (y > 738) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += 15;
    });
    pdf.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    toast.success(`${title} exported as PDF.`);
  };
  const exportDocx = async () => {
    if (!studio || !activeJob) return;
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const doc = new Document({ sections: [{ children: studio.resumePlainText.split("\n").map((line) => new Paragraph({ children: [new TextRun(line)] })) }] });
    const blob = await Packer.toBlob(doc);
    downloadBlob(`${activeJob.company}-resume.docx`, blob, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  };
  const exportZip = async () => {
    if (!studio || !activeJob) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file("resume.txt", studio.resumePlainText);
    zip.file("coverletter.txt", studio.coverLetterPlainText);
    zip.file("resume.tex", studio.resumeTex);
    zip.file("coverletter.tex", studio.coverLetterTex);
    zip.file("README.txt", "Review every generated line for accuracy. Do not claim experience, tools, or credentials you do not have.");
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(`${activeJob.company}-application-package.zip`, blob, "application/zip");
  };

  const tabs = [
    { id: "preview", label: "Preview" },
    { id: "score", label: "Resume Score" },
    { id: "resumeTex", label: "resume.tex" },
    { id: "coverTex", label: "coverletter.tex" },
    { id: "cover", label: "Cover Letter" },
    { id: "exports", label: "Export Center" },
    ...legacyDocs.map((doc) => ({ id: doc.id, label: doc.label }))
  ];

  return <Dialog open={Boolean(generated && activeJob)} onOpenChange={(open) => !open && setGenerated(null)}><DialogContent>{generated && activeJob && studio && <div className="max-h-[92vh] overflow-y-auto p-4 md:p-8"><DialogHeader className="pr-10"><Badge className="w-fit bg-amber-500/10 text-amber-600 dark:text-amber-300">Professional Resume Studio</Badge><DialogTitle>Application package for {activeJob.company}</DialogTitle><DialogDescription>Overleaf-ready LaTeX, ATS scoring, editable previews, and exports. Uses only verified profile information and this job description.</DialogDescription></DialogHeader><div className="mt-5 grid gap-3 lg:grid-cols-3"><Label>Resume template<Select value={template} onChange={(event) => setTemplate(event.target.value as ResumeTemplate)}><option>Automotive Test Engineer</option><option>Validation Engineer</option><option>Engineering Technician</option><option>Quality Engineer</option><option>ATS Optimized</option><option>Executive Professional</option></Select></Label><Label>Cover letter style<Select value={coverStyle} onChange={(event) => setCoverStyle(event.target.value as CoverLetterStudioStyle)}><option>Professional</option><option>Technical</option><option>Executive</option><option>Automotive</option><option>Concise</option></Select></Label><Label>Length<Select value={pageLength} onChange={(event) => setPageLength(event.target.value as ResumePageLength)}><option value="one-page">One-page resume</option><option value="two-page">Two-page resume</option></Select></Label></div><div className="mt-5 flex gap-2 overflow-x-auto pb-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-950/5 text-slate-500 hover:bg-slate-950/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"}`}>{item.label}</button>)}</div>{tab === "preview" && <ResumePreview studio={studio} activeJob={activeJob} pageLength={pageLength} />}{tab === "score" && <ResumeScorePanel studio={studio} />}{tab === "resumeTex" && <DocumentBox title="Overleaf resume.tex" value={studio.resumeTex} onCopy={() => copy(studio.resumeTex, "resume.tex")} onExport={() => downloadBlob("resume.tex", studio.resumeTex)} />}{tab === "coverTex" && <DocumentBox title="Overleaf coverletter.tex" value={studio.coverLetterTex} onCopy={() => copy(studio.coverLetterTex, "coverletter.tex")} onExport={() => downloadBlob("coverletter.tex", studio.coverLetterTex)} />}{tab === "cover" && <DocumentBox title={`${coverStyle} cover letter`} value={studio.coverLetterPlainText} onCopy={() => copy(studio.coverLetterPlainText, "Cover letter")} onExport={() => exportPdf(`${activeJob.company} cover letter`, studio.coverLetterPlainText)} />}{legacyDoc && <DocumentBox title={legacyDoc.title} value={legacyDoc.value} onCopy={() => copy(legacyDoc.value, legacyDoc.title)} onExport={() => exportPdf(`${activeJob.company} ${legacyDoc.title}`, legacyDoc.value)} />}{tab === "exports" && <ExportCenter studio={studio} activeJob={activeJob} onPdf={() => exportPdf(`${activeJob.company} resume`, studio.resumePlainText)} onDocx={exportDocx} onZip={exportZip} onResumeTex={() => downloadBlob("resume.tex", studio.resumeTex)} onCoverTex={() => downloadBlob("coverletter.tex", studio.coverLetterTex)} />}<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"><p className="font-semibold text-amber-900 dark:text-amber-100">Production-quality safety checklist</p><ul className="mt-2 space-y-2 text-sm text-amber-800 dark:text-amber-100/80">{studio.warnings.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}</ul></div><div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={() => setGenerated(null)}>Keep editing</Button><Button variant="gradient" onClick={() => onApplied(activeJob)}><CheckCircle2 className="h-4 w-4" /> I submitted it, mark applied</Button></div></div>}</DialogContent></Dialog>;
}

function ResumePreview({ studio, activeJob, pageLength }: { studio: ReturnType<typeof buildResumeStudio>; activeJob: JobPosting; pageLength: ResumePageLength }) {
  return <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]"><div className="rounded-[1.25rem] bg-slate-200 p-4 dark:bg-slate-900"><div className="mx-auto min-h-[760px] max-w-[720px] bg-white p-8 text-slate-950 shadow-2xl"><pre className="whitespace-pre-wrap font-serif text-sm leading-6">{studio.resumePlainText}</pre>{pageLength === "two-page" && <><div className="my-8 border-t border-dashed border-slate-300 text-center text-xs text-slate-400">Page break</div><pre className="whitespace-pre-wrap font-serif text-sm leading-6">{studio.coverLetterPlainText}</pre></>}</div></div><div className="grid gap-3"><Card><CardHeader><CardTitle>Why sections were included</CardTitle><CardDescription>{activeJob.title} at {activeJob.company}</CardDescription></CardHeader><CardContent className="space-y-3">{studio.includedSections.map((item) => <div key={item.section} className="rounded-2xl bg-slate-950/[0.04] p-3 dark:bg-white/[0.06]"><p className="font-semibold">{item.section}</p><p className="text-sm text-slate-500 dark:text-slate-400">{item.why}</p></div>)}</CardContent></Card></div></div>;
}

function ResumeScorePanel({ studio }: { studio: ReturnType<typeof buildResumeStudio> }) {
  const metrics = [{ label: "ATS Score", value: studio.score.atsScore }, { label: "Readability", value: studio.score.readabilityScore }, { label: "Match Score", value: studio.score.matchScore }, { label: "Keyword Coverage", value: studio.score.keywordCoverage }];
  return <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]"><Card><CardHeader><CardTitle>Resume score</CardTitle><CardDescription>Use this before exporting. Scores are guidance, not guarantees.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{metrics.map((metric) => <div key={metric.label} className="rounded-2xl bg-slate-950/[0.04] p-4 dark:bg-white/[0.06]"><div className="flex items-center justify-between"><p className="font-semibold">{metric.label}</p><span>{metric.value}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${metric.value}%` }} /></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Recommendations</CardTitle></CardHeader><CardContent><div className="mb-4 flex flex-wrap gap-2">{studio.score.missingKeywords.map((keyword) => <Badge key={keyword} className="bg-amber-500/10 text-amber-600 dark:text-amber-300">{keyword}</Badge>)}</div><ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">{studio.score.recommendations.map((item) => <li key={item} className="flex gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />{item}</li>)}</ul></CardContent></Card></div>;
}

function ExportCenter({ studio, activeJob, onPdf, onDocx, onZip, onResumeTex, onCoverTex }: { studio: ReturnType<typeof buildResumeStudio>; activeJob: JobPosting; onPdf: () => void; onDocx: () => void; onZip: () => void; onResumeTex: () => void; onCoverTex: () => void }) {
  const exports = [{ label: "PDF", text: "Download a clean resume PDF.", action: onPdf }, { label: "DOCX", text: "Download Word-editable resume.docx.", action: onDocx }, { label: "TEX", text: "Download resume.tex and coverletter.tex.", action: () => { onResumeTex(); onCoverTex(); } }, { label: "ZIP", text: "Download full application package.", action: onZip }];
  return <div className="mt-4"><Card><CardHeader><CardTitle>Export center</CardTitle><CardDescription>Export professional materials for {activeJob.company}. Everything remains editable before submission.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{exports.map((item) => <button key={item.label} onClick={item.action} className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-left transition hover:-translate-y-1 hover:border-indigo-300 dark:border-white/10 dark:bg-white/[0.06]"><p className="text-xl font-semibold">{item.label}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.text}</p></button>)}</CardContent></Card><div className="mt-4 rounded-2xl bg-slate-950/[0.04] p-4 text-sm text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"><strong>Overleaf note:</strong> Upload <code>resume.tex</code> or <code>coverletter.tex</code> directly into Overleaf. Comments in the generated code mark editable sections.</div></div>;
}

function OnboardingDialog({ open, onComplete, setView, setProgress }: { open: boolean; onComplete: () => void; setView: (view: View) => void; setProgress: (progress: number) => void }) {
  const steps = [
    { icon: UploadCloud, title: "Upload or paste resume", text: "Parse your resume into skills, tools, experience, education, and profile strength.", view: "profile" as View, progress: 25 },
    { icon: Target, title: "Choose target roles", text: "Pick test engineer, technician, quality, validation, or automotive testing paths.", view: "profile" as View, progress: 50 },
    { icon: CircleDollarSign, title: "Set salary and location", text: "Tell MomentumAI your pay range, commute limits, and remote/hybrid preferences.", view: "profile" as View, progress: 50 },
    { icon: Search, title: "Add your first job", text: "Paste a job posting or use the browser extension to capture one from anywhere.", view: "search" as View, progress: 75 },
    { icon: Gauge, title: "Generate Momentum Score™", text: "See resume strength, market competitiveness, job match, and interview readiness.", view: "pending" as View, progress: 100 }
  ];
  return <Dialog open={open} onOpenChange={(next) => !next && onComplete()}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto"><div className="p-5 md:p-8"><DialogHeader><Badge className="w-fit bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">New user onboarding</Badge><DialogTitle className="text-3xl">Create your first career intelligence loop.</DialogTitle><DialogDescription>Follow these steps to turn MomentumAI from an empty workspace into a daily job-search assistant.</DialogDescription></DialogHeader><div className="mt-6 grid gap-3 md:grid-cols-5">{steps.map((item, index) => { const Icon = item.icon; return <button key={item.title} onClick={() => { setView(item.view); setProgress(item.progress); onComplete(); }} className="rounded-2xl bg-slate-950/[0.04] p-4 text-left transition hover:-translate-y-1 hover:bg-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-white/[0.06]"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-indigo-500" /><span className="text-xs font-bold text-slate-400">0{index + 1}</span></div><p className="mt-3 font-semibold">{item.title}</p><p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{item.text}</p></button>; })}</div><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"><strong>Trust reminder:</strong> MomentumAI does not auto-apply, does not invent experience, and keeps generated documents under your review.</div><div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={() => { setView("search"); setProgress(75); onComplete(); }}>Add first job</Button><Button variant="gradient" onClick={() => { setView("profile"); setProgress(25); onComplete(); }}>Start with resume <ArrowRight className="h-4 w-4" /></Button></div></div></DialogContent></Dialog>;
}
function DocumentBox({ title, value, onCopy, onExport }: { title: string; value: string; onCopy: () => void; onExport: () => void }) {
  return <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={onCopy}>Copy</Button><Button variant="secondary" size="sm" onClick={onExport}><Download className="h-4 w-4" /> PDF</Button></div></div><div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/50"><Textarea value={value} readOnly rows={18} className="border-0 bg-transparent font-mono text-xs leading-5 shadow-none" /></div></div>;
}

function MatchRing({ score, inverse = false }: { score: number; inverse?: boolean }) {
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (score / 100) * circumference;
  return <motion.div className="relative grid h-20 w-20 place-items-center" whileHover={{ scale: 1.05 }}><svg className="h-20 w-20 -rotate-90 drop-shadow-[0_0_18px_rgba(99,102,241,0.35)]" viewBox="0 0 64 64" role="img" aria-label={`${score}% match score`}><circle cx="32" cy="32" r="26" fill="none" stroke={inverse ? "rgba(255,255,255,0.18)" : "currentColor"} strokeWidth="7" className={inverse ? "" : "text-slate-200 dark:text-white/10"} /><motion.circle cx="32" cy="32" r="26" fill="none" stroke="url(#scoreGradient)" strokeLinecap="round" strokeWidth="7" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 0.9, ease: "easeOut" }} /><defs><linearGradient id="scoreGradient" x1="0" x2="1"><stop stopColor="#6366f1" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs></svg><span className={`absolute text-sm font-bold ${inverse ? "text-white" : "text-slate-950 dark:text-white"}`}>{score}%</span></motion.div>;
}

function ProgressLabel({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  return <div><div className={`flex justify-between text-xs font-semibold ${inverse ? "text-white/70" : "text-slate-500 dark:text-slate-400"}`}><span>{label}</span><span>{value}%</span></div><div className={`mt-2 h-2 overflow-hidden rounded-full ${inverse ? "bg-white/15" : "bg-slate-200 dark:bg-white/10"}`}><motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} /></div></div>;
}

function MetricTile({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl bg-slate-950/5 p-3 dark:bg-white/10"><p className="text-lg font-semibold">{value}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p></div>;
}

function InfoPill({ icon: Icon, text }: { icon: IconComponent; text: string }) {
  return <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-950/[0.04] px-3 py-2 dark:bg-white/[0.06]"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{text}</span></div>;
}

function DemoDataBanner({ local, onImport }: { local: boolean; onImport: () => void }) {
  return <Card className="border-cyan-300/30 bg-cyan-50/90 dark:border-cyan-400/20 dark:bg-cyan-400/10"><CardContent className="flex flex-col gap-3 p-4 text-cyan-950 dark:text-cyan-100 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">This is demo data</p><p className="text-sm leading-6 opacity-80">Explore realistic automotive validation jobs, application packets, career coach, and interview prep. {local ? "This demo is running locally without the API." : "Live demo API is connected."}</p></div></div><Button variant="secondary" onClick={onImport}>Import your own job</Button></CardContent></Card>;
}

function OnboardingProgressCard({ progress, setView }: { progress: number; setView: (view: View) => void }) {
  const steps = [
    { label: "Profile", view: "profile" as View, threshold: 25 },
    { label: "Target roles", view: "profile" as View, threshold: 50 },
    { label: "First job", view: "search" as View, threshold: 75 },
    { label: "Momentum Score", view: "pending" as View, threshold: 100 }
  ];
  return <Card className="border-indigo-200/70 bg-white/85 dark:border-white/10 dark:bg-white/[0.06]"><CardContent className="p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-slate-950 dark:text-white">First workspace setup</p><p className="text-sm text-slate-500 dark:text-slate-400">Complete these steps to get your first Momentum Score and application packet.</p></div><Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{progress}% complete</Badge></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" animate={{ width: `${progress}%` }} /></div><div className="mt-4 grid gap-2 sm:grid-cols-4">{steps.map((step) => <button key={step.label} onClick={() => setView(step.view)} className="rounded-2xl bg-slate-950/[0.04] p-3 text-left text-sm transition hover:bg-indigo-500/10 dark:bg-white/[0.06]"><span className={progress >= step.threshold ? "text-emerald-500" : "text-slate-400"}>{progress >= step.threshold ? "✓" : "○"}</span><span className="ml-2 font-semibold">{step.label}</span></button>)}</div></CardContent></Card>;
}

function ServiceStatusBanner({ message, cached, onRetry }: { message: string; cached: boolean; onRetry: () => void }) {
  return <Card className="border-amber-300/40 bg-amber-50/90 dark:border-amber-400/20 dark:bg-amber-400/10"><CardContent className="flex flex-col gap-3 p-4 text-amber-900 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{cached ? "Showing cached workspace" : "Workspace connection needs attention"}</p><p className="text-sm leading-6 opacity-80">{message}</p></div></div><Button variant="secondary" onClick={onRetry}>Retry now</Button></CardContent></Card>;
}

function WorkspaceServiceStatus({ error, onRetry, onSignOut }: { error: string | null; onRetry: () => void; onSignOut: () => void }) {
  return <Card className="overflow-hidden border-white/70 bg-white/80 dark:border-white/10 dark:bg-white/[0.06]"><CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_320px]"><div><Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-300">Service status</Badge><h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">We could not sync your live workspace yet.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">MomentumAI automatically retried the request and checked for cached data. Your account is still safe; this usually means the API URL, hosting environment, or network tunnel needs attention.</p><div className="mt-5 rounded-2xl bg-slate-950/[0.04] p-4 text-sm text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"><p className="font-semibold text-slate-900 dark:text-white">What we checked</p><ul className="mt-2 space-y-1"><li>- API request timeout/retry path</li><li>- Cached dashboard fallback</li><li>- Session token validity</li><li>- Configurable API base URL</li></ul>{error && <p className="mt-3 text-amber-600 dark:text-amber-300">Last response: {error}</p>}</div><div className="mt-5 flex flex-wrap gap-3"><Button variant="gradient" onClick={onRetry}>Retry connection</Button><Button variant="secondary" onClick={() => window.location.reload()}>Reload app</Button><Button variant="ghost" onClick={onSignOut}>Sign out</Button></div></div><div className="rounded-[1.5rem] border border-white/70 bg-slate-950 p-5 text-white dark:border-white/10"><p className="text-sm text-white/60">Deployment tip</p><p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Set VITE_API_BASE_URL when frontend and API deploy separately.</p><p className="mt-3 text-sm leading-6 text-white/60">For Vercel + Render/Railway, the frontend must know the hosted Express API URL. In local dev, Vite proxy still handles /api.</p></div></CardContent></Card>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: IconComponent; title: string; description: string; action?: React.ReactNode }) {
  return <div className="grid place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/40 p-10 text-center dark:border-white/10 dark:bg-white/[0.03]"><motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950/5 text-slate-500 dark:bg-white/10 dark:text-slate-300"><Icon className="h-6 w-6" /></motion.div><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function DashboardSkeleton() {
  return <div className="grid gap-4" aria-label="Loading dashboard"><Skeleton className="h-80 rounded-[2rem]" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div><Skeleton className="h-96 rounded-[2rem]" /></div>;
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ME";
  return <div className={`${small ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm"} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 font-bold text-white shadow-lg shadow-indigo-500/20`}>{initials}</div>;
}

function calculateProfileCompletion(profile?: UserProfile | null) {
  if (!profile) return 0;
  const checks = [
    profile.name,
    profile.email,
    profile.location,
    profile.commuteMiles > 0,
    profile.desiredPayMin > 0,
    profile.desiredPayMax > 0,
    profile.preferredTitles.length > 0,
    profile.skills.length >= 4,
    profile.experience.length > 30,
    profile.resume.length > 30,
    profile.coverLetterStyle
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default App;
