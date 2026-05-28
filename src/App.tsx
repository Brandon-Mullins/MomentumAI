import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  FileText,
  Gauge,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound
} from "lucide-react";
import type { ApplicationStatus, DashboardData, GeneratedApplication, JobPosting, UserProfile } from "../shared/types";

type View = "pending" | "saved" | "profile" | "search" | "tracker";

const statusOrder: ApplicationStatus[] = ["Pending", "Saved", "Applied", "Interview", "Offer", "Rejected"];

const blankJob = {
  title: "",
  company: "",
  location: "",
  source: "Manual paste",
  pay: "",
  description: ""
};

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const joinLines = (value: string[]) => value.join("\n");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function App() {
  const [view, setView] = useState<View>("pending");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [profileDraft, setProfileDraft] = useState<UserProfile | null>(null);
  const [titlesDraft, setTitlesDraft] = useState("");
  const [skillsDraft, setSkillsDraft] = useState("");
  const [jobDraft, setJobDraft] = useState(blankJob);
  const [generated, setGenerated] = useState<GeneratedApplication | null>(null);
  const [activeJob, setActiveJob] = useState<JobPosting | null>(null);
  const [notice, setNotice] = useState("Loading your job copilot...");

  const loadDashboard = async () => {
    const data = await request<DashboardData>("/api/dashboard");
    setDashboard(data);
    setProfileDraft(data.profile);
    setTitlesDraft(joinLines(data.profile.preferredTitles));
    setSkillsDraft(joinLines(data.profile.skills));
    setNotice("Ready to review matched jobs.");
  };

  useEffect(() => {
    loadDashboard().catch(() => setNotice("Could not reach the API. Start the Express server with npm run dev:api."));
  }, []);

  const pendingJobs = useMemo(
    () => dashboard?.jobs.filter((job) => job.status === "Pending") ?? [],
    [dashboard]
  );
  const savedJobs = useMemo(
    () => dashboard?.jobs.filter((job) => job.status === "Saved") ?? [],
    [dashboard]
  );
  const trackerJobs = useMemo(
    () => dashboard?.jobs.filter((job) => job.status !== "Pending") ?? [],
    [dashboard]
  );

  const updateStatus = async (job: JobPosting, status: ApplicationStatus) => {
    await request<JobPosting>(`/api/jobs/${job.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    setNotice(`${job.title} moved to ${status}.`);
    await loadDashboard();
  };

  const generateForJob = async (job: JobPosting) => {
    const result = await request<GeneratedApplication>(`/api/jobs/${job.id}/generate`, { method: "POST" });
    setActiveJob(job);
    setGenerated(result);
    setNotice(`Generated resume and cover letter for ${job.company}. Review before applying.`);
  };

  const saveProfile = async () => {
    if (!profileDraft) return;
    const updatedProfile = {
      ...profileDraft,
      preferredTitles: splitLines(titlesDraft),
      skills: splitLines(skillsDraft)
    };
    await request<UserProfile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(updatedProfile)
    });
    setNotice("Profile saved and job matches refreshed.");
    await loadDashboard();
  };

  const addManualJob = async () => {
    await request<JobPosting>("/api/jobs/manual", {
      method: "POST",
      body: JSON.stringify(jobDraft)
    });
    setJobDraft(blankJob);
    setNotice("Job added to pending review.");
    setView("pending");
    await loadDashboard();
  };

  if (!dashboard || !profileDraft) {
    return (
      <main className="app-shell">
        <section className="hero compact">
          <Sparkles />
          <p>{notice}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">MomentumAI Job Copilot</p>
          <h1>Find and apply to test engineering jobs without depending on LinkedIn alone.</h1>
          <p>
            Build your profile, paste job descriptions from any source, review matched opportunities, and generate
            tailored resume and cover letter drafts only when you approve.
          </p>
        </div>
        <div className="hero-card">
          <Gauge />
          <strong>{pendingJobs.length}</strong>
          <span>jobs waiting for review</span>
        </div>
      </section>

      <nav className="tabs" aria-label="Main navigation">
        <button className={view === "pending" ? "active" : ""} onClick={() => setView("pending")}>
          Pending jobs
        </button>
        <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}>
          Saved jobs
        </button>
        <button className={view === "search" ? "active" : ""} onClick={() => setView("search")}>
          Search preferences
        </button>
        <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>
          Profile
        </button>
        <button className={view === "tracker" ? "active" : ""} onClick={() => setView("tracker")}>
          Tracker
        </button>
      </nav>

      <p className="notice">{notice}</p>

      {view === "pending" && (
        <JobBoard
          title="Pending review"
          description="These jobs match your target roles. Review the fit, then save, skip, customize, or apply."
          jobs={pendingJobs}
          empty="No pending jobs yet. Paste a job description from a company site, Indeed, ZipRecruiter, recruiter email, or another source."
          onStatus={updateStatus}
          onGenerate={generateForJob}
        />
      )}

      {view === "saved" && (
        <JobBoard
          title="Saved jobs"
          description="Saved roles are worth more research before you apply."
          jobs={savedJobs}
          empty="No saved jobs yet."
          onStatus={updateStatus}
          onGenerate={generateForJob}
        />
      )}

      {view === "search" && (
        <section className="panel grid-two">
          <div>
            <p className="eyebrow">Manual MVP intake</p>
            <h2>Add a job from any source</h2>
            <p className="muted">
              For version one, paste postings manually. Later this can connect to job APIs, company career pages, or a
              browser extension.
            </p>
            <label>
              Job title
              <input value={jobDraft.title} onChange={(event) => setJobDraft({ ...jobDraft, title: event.target.value })} />
            </label>
            <label>
              Company
              <input value={jobDraft.company} onChange={(event) => setJobDraft({ ...jobDraft, company: event.target.value })} />
            </label>
            <label>
              Location
              <input value={jobDraft.location} onChange={(event) => setJobDraft({ ...jobDraft, location: event.target.value })} />
            </label>
            <label>
              Source
              <input value={jobDraft.source} onChange={(event) => setJobDraft({ ...jobDraft, source: event.target.value })} />
            </label>
            <label>
              Pay, if available
              <input value={jobDraft.pay} onChange={(event) => setJobDraft({ ...jobDraft, pay: event.target.value })} />
            </label>
            <label>
              Job description
              <textarea
                rows={8}
                value={jobDraft.description}
                onChange={(event) => setJobDraft({ ...jobDraft, description: event.target.value })}
              />
            </label>
            <button className="primary" onClick={addManualJob}>
              <Search size={18} /> Score and add to pending
            </button>
          </div>
          <div className="assistant-card">
            <Sparkles />
            <h3>How matching works</h3>
            <p>
              The MVP scores titles, locations, target fields, and skills like QA, validation, automotive testing,
              troubleshooting, test cases, Python, Jira, inspection, and diagnostics.
            </p>
            <p>
              It flags possible issues such as unclear pay, unpaid roles, relocation requirements, senior-only language,
              or suspicious terms. You make the final decision.
            </p>
          </div>
        </section>
      )}

      {view === "profile" && (
        <section className="panel grid-two">
          <div>
            <p className="eyebrow">Your profile</p>
            <h2>Tell the assistant what a good job looks like</h2>
            <label>
              Name
              <input value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} />
            </label>
            <label>
              Email
              <input value={profileDraft.email} onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })} />
            </label>
            <label>
              Location
              <input value={profileDraft.location} onChange={(event) => setProfileDraft({ ...profileDraft, location: event.target.value })} />
            </label>
            <div className="form-row">
              <label>
                Minimum pay
                <input
                  type="number"
                  value={profileDraft.desiredPayMin}
                  onChange={(event) => setProfileDraft({ ...profileDraft, desiredPayMin: Number(event.target.value) })}
                />
              </label>
              <label>
                Maximum pay
                <input
                  type="number"
                  value={profileDraft.desiredPayMax}
                  onChange={(event) => setProfileDraft({ ...profileDraft, desiredPayMax: Number(event.target.value) })}
                />
              </label>
              <label>
                Commute miles
                <input
                  type="number"
                  value={profileDraft.commuteMiles}
                  onChange={(event) => setProfileDraft({ ...profileDraft, commuteMiles: Number(event.target.value) })}
                />
              </label>
            </div>
            <label>
              Preferred job titles, one per line
              <textarea rows={5} value={titlesDraft} onChange={(event) => setTitlesDraft(event.target.value)} />
            </label>
            <label>
              Skills, one per line
              <textarea rows={5} value={skillsDraft} onChange={(event) => setSkillsDraft(event.target.value)} />
            </label>
          </div>
          <div>
            <label>
              Experience summary
              <textarea
                rows={7}
                value={profileDraft.experience}
                onChange={(event) => setProfileDraft({ ...profileDraft, experience: event.target.value })}
              />
            </label>
            <label>
              Base resume
              <textarea
                rows={10}
                value={profileDraft.resume}
                onChange={(event) => setProfileDraft({ ...profileDraft, resume: event.target.value })}
              />
            </label>
            <label>
              Cover letter style
              <select
                value={profileDraft.coverLetterStyle}
                onChange={(event) =>
                  setProfileDraft({ ...profileDraft, coverLetterStyle: event.target.value as UserProfile["coverLetterStyle"] })
                }
              >
                <option>Direct and practical</option>
                <option>Warm and confident</option>
                <option>Technical and detailed</option>
                <option>Entry-level and eager</option>
              </select>
            </label>
            <button className="primary" onClick={saveProfile}>
              <UserRound size={18} /> Save profile
            </button>
          </div>
        </section>
      )}

      {view === "tracker" && (
        <section className="panel">
          <p className="eyebrow">Application tracker</p>
          <h2>Keep every application moving</h2>
          <div className="tracker">
            {statusOrder
              .filter((status) => status !== "Pending")
              .map((status) => (
                <div className="tracker-column" key={status}>
                  <h3>{status}</h3>
                  {trackerJobs
                    .filter((job) => job.status === status)
                    .map((job) => (
                      <article className="mini-card" key={job.id}>
                        <strong>{job.title}</strong>
                        <span>{job.company}</span>
                        <button onClick={() => generateForJob(job)}>Open documents</button>
                      </article>
                    ))}
                </div>
              ))}
          </div>
        </section>
      )}

      {generated && activeJob && (
        <section className="generator panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Review before applying</p>
              <h2>Application package for {activeJob.company}</h2>
            </div>
            <button className="primary" onClick={() => updateStatus(activeJob, "Applied")}>
              <CheckCircle2 size={18} /> Mark applied after submission
            </button>
          </div>
          <div className="grid-two">
            <DocumentBox title="Tailored resume draft" value={generated.resume} />
            <DocumentBox title="Cover letter draft" value={generated.coverLetter} />
          </div>
          <ul className="checklist">
            {generated.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function JobBoard({
  title,
  description,
  jobs,
  empty,
  onStatus,
  onGenerate
}: {
  title: string;
  description: string;
  jobs: JobPosting[];
  empty: string;
  onStatus: (job: JobPosting, status: ApplicationStatus) => void;
  onGenerate: (job: JobPosting) => void;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>
      {jobs.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="job-grid">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onStatus={onStatus} onGenerate={onGenerate} />
          ))}
        </div>
      )}
    </section>
  );
}

function JobCard({
  job,
  onStatus,
  onGenerate
}: {
  job: JobPosting;
  onStatus: (job: JobPosting, status: ApplicationStatus) => void;
  onGenerate: (job: JobPosting) => void;
}) {
  return (
    <article className="job-card">
      <div className="job-topline">
        <div>
          <h3>{job.title}</h3>
          <p>{job.company}</p>
        </div>
        <span className="score">{job.matchScore}% match</span>
      </div>
      <div className="job-meta">
        <span>
          <MapPin size={15} /> {job.location}
        </span>
        <span>
          <Briefcase size={15} /> {job.pay ?? "Pay not listed"}
        </span>
        <span>
          <FileText size={15} /> {job.source}
        </span>
      </div>
      <div className="tag-list">
        {(job.requiredSkills.length ? job.requiredSkills : ["More details needed"]).map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
      <div className="match-details">
        <h4>Why it matches</h4>
        <ul>
          {job.whyMatches.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <div className={job.redFlags.length ? "red-flags" : "red-flags clear"}>
        <h4>
          <ShieldAlert size={16} /> Red flags
        </h4>
        {job.redFlags.length ? (
          <ul>
            {job.redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        ) : (
          <p>No obvious red flags found.</p>
        )}
      </div>
      <div className="actions">
        <button onClick={() => onStatus(job, "Saved")}>Save</button>
        <button onClick={() => onStatus(job, "Rejected")}>Skip</button>
        <button onClick={() => onGenerate(job)}>Customize resume</button>
        <button onClick={() => onGenerate(job)}>Generate cover letter</button>
        <button className="primary" onClick={() => onGenerate(job)}>
          Apply
        </button>
      </div>
    </article>
  );
}

function DocumentBox({ title, value }: { title: string; value: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="document-box">
      <div className="document-heading">
        <h3>{title}</h3>
        <button onClick={copy}>Copy</button>
      </div>
      <textarea value={value} readOnly rows={18} />
    </div>
  );
}

export default App;
