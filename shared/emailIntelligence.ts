import type { ApplicationStatus, JobPosting, UserProfile } from "./types";

export type EmailProvider = "gmail" | "outlook" | "mock";
export type EmailClassification = "recruiter_outreach" | "interview_request" | "application_confirmation" | "rejection" | "offer" | "follow_up" | "other";

export interface EmailMessage {
  id: string;
  provider: EmailProvider;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  classification: EmailClassification;
  company?: string;
  jobTitle?: string;
  confidence: number;
}

export interface TimelineEvent {
  id: string;
  jobId?: string;
  company?: string;
  type: EmailClassification | "status_change" | "follow_up_reminder";
  title: string;
  description: string;
  occurredAt: string;
  suggestedStatus?: ApplicationStatus;
  sourceEmailId?: string;
  reviewRequired: boolean;
}

export interface FollowUpSuggestion {
  id: string;
  jobId?: string;
  company?: string;
  subject: string;
  message: string;
  recommendedSendAt: string;
  reason: string;
  tone: "professional" | "thank-you" | "recruiter" | "concise";
}

export interface EmailActivitySummary {
  connectedProviders: EmailProvider[];
  totalMessages: number;
  recruiterOutreach: number;
  interviewRequests: number;
  confirmations: number;
  rejections: number;
  offers: number;
  followUpsDue: number;
  latestEvents: TimelineEvent[];
  followUps: FollowUpSuggestion[];
}

const normalize = (value = "") => value.toLowerCase();
const nowIso = () => new Date().toISOString();

export interface RawEmailInput {
  id?: string;
  provider?: EmailProvider;
  from: string;
  subject: string;
  body: string;
  receivedAt?: string;
}

export interface EmailProviderClient {
  provider: EmailProvider;
  getAuthorizationUrl(userId: string): string;
  fetchRecentMessages(userId: string): Promise<RawEmailInput[]>;
}

export class MockEmailProvider implements EmailProviderClient {
  provider: EmailProvider = "mock";

  getAuthorizationUrl(userId: string) {
    return `/api/email/connect/mock?userId=${encodeURIComponent(userId)}`;
  }

  async fetchRecentMessages(): Promise<RawEmailInput[]> {
    return mockEmailMessages();
  }
}

export class GmailProvider implements EmailProviderClient {
  provider: EmailProvider = "gmail";

  getAuthorizationUrl(userId: string) {
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=GMAIL_CLIENT_ID&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly")}&state=${encodeURIComponent(userId)}`;
  }

  async fetchRecentMessages(): Promise<RawEmailInput[]> {
    // Production hook: exchange OAuth code, call Gmail API, map messages into RawEmailInput.
    return mockEmailMessages("gmail");
  }
}

export class OutlookProvider implements EmailProviderClient {
  provider: EmailProvider = "outlook";

  getAuthorizationUrl(userId: string) {
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=OUTLOOK_CLIENT_ID&response_type=code&scope=${encodeURIComponent("Mail.Read offline_access")}&state=${encodeURIComponent(userId)}`;
  }

  async fetchRecentMessages(): Promise<RawEmailInput[]> {
    // Production hook: exchange OAuth code, call Microsoft Graph, map messages into RawEmailInput.
    return mockEmailMessages("outlook");
  }
}

export function providerFor(provider: EmailProvider): EmailProviderClient {
  if (provider === "gmail") return new GmailProvider();
  if (provider === "outlook") return new OutlookProvider();
  return new MockEmailProvider();
}

export function classifyEmail(input: RawEmailInput): EmailMessage {
  const text = normalize(`${input.subject} ${input.body}`);
  const classification: EmailClassification = text.includes("offer") || text.includes("congratulations")
    ? "offer"
    : text.includes("unfortunately") || text.includes("not moving forward") || text.includes("rejection")
      ? "rejection"
      : text.includes("interview") || text.includes("phone screen") || text.includes("schedule")
        ? "interview_request"
        : text.includes("received your application") || text.includes("application confirmation") || text.includes("thank you for applying")
          ? "application_confirmation"
          : text.includes("recruiter") || text.includes("opportunity") || text.includes("your background")
            ? "recruiter_outreach"
            : text.includes("follow up")
              ? "follow_up"
              : "other";
  const company = extractCompany(input.subject, input.body, input.from);
  const jobTitle = extractJobTitle(input.subject, input.body);
  const confidence = classification === "other" ? 35 : 78 + (company ? 8 : 0) + (jobTitle ? 8 : 0);
  return {
    id: input.id ?? `email-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    provider: input.provider ?? "mock",
    from: input.from,
    subject: input.subject,
    body: input.body,
    receivedAt: input.receivedAt ?? nowIso(),
    classification,
    company,
    jobTitle,
    confidence: Math.min(98, confidence)
  };
}

export function buildTimelineFromEmails(messages: EmailMessage[], jobs: JobPosting[]): TimelineEvent[] {
  return messages
    .filter((message) => message.classification !== "other")
    .map((message) => {
      const job = findMatchingJob(message, jobs);
      const suggestedStatus = statusForClassification(message.classification);
      return {
        id: `timeline-${message.id}`,
        jobId: job?.id,
        company: message.company ?? job?.company,
        type: message.classification,
        title: titleForClassification(message),
        description: message.subject,
        occurredAt: message.receivedAt,
        suggestedStatus,
        sourceEmailId: message.id,
        reviewRequired: true
      };
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function applyEmailPipelineSuggestions(jobs: JobPosting[], events: TimelineEvent[]) {
  const priority: Record<ApplicationStatus, number> = { Pending: 0, Saved: 1, Applied: 2, Interview: 3, Rejected: 4, Offer: 5 };
  for (const event of events) {
    if (!event.jobId || !event.suggestedStatus) continue;
    const job = jobs.find((candidate) => candidate.id === event.jobId);
    if (!job) continue;
    if (priority[event.suggestedStatus] >= priority[job.status]) job.status = event.suggestedStatus;
  }
}

export function buildFollowUps(profile: UserProfile, messages: EmailMessage[], jobs: JobPosting[]): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const appliedJobs = jobs.filter((job) => ["Applied", "Interview"].includes(job.status));
  for (const job of appliedJobs.slice(0, 4)) {
    const related = messages.find((message) => message.company && normalize(job.company).includes(normalize(message.company)));
    const days = job.status === "Interview" ? 1 : 7;
    suggestions.push({
      id: `follow-${job.id}`,
      jobId: job.id,
      company: job.company,
      subject: job.status === "Interview" ? `Thank you - ${job.title} interview` : `Following up on ${job.title}`,
      message: job.status === "Interview"
        ? `Hello,\n\nThank you for taking the time to discuss the ${job.title} role. I appreciated learning more about the team, expectations, and testing work. I remain interested and would be glad to provide any additional details.\n\nBest,\n${profile.name}`
        : `Hello,\n\nI wanted to follow up on my application for the ${job.title} role at ${job.company}. I am still very interested and believe my background in ${profile.skills.slice(0, 4).join(", ")} could be a strong fit.\n\nBest,\n${profile.name}`,
      recommendedSendAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      reason: related ? `Related recruiter thread found: ${related.subject}` : `No recent response found for ${job.company}.`,
      tone: job.status === "Interview" ? "thank-you" : "professional"
    });
  }
  return suggestions;
}

export function summarizeEmailActivity(providers: EmailProvider[], messages: EmailMessage[], timeline: TimelineEvent[], followUps: FollowUpSuggestion[]): EmailActivitySummary {
  return {
    connectedProviders: providers,
    totalMessages: messages.length,
    recruiterOutreach: messages.filter((message) => message.classification === "recruiter_outreach").length,
    interviewRequests: messages.filter((message) => message.classification === "interview_request").length,
    confirmations: messages.filter((message) => message.classification === "application_confirmation").length,
    rejections: messages.filter((message) => message.classification === "rejection").length,
    offers: messages.filter((message) => message.classification === "offer").length,
    followUpsDue: followUps.length,
    latestEvents: timeline.slice(0, 8),
    followUps
  };
}

function statusForClassification(classification: EmailClassification): ApplicationStatus | undefined {
  if (classification === "application_confirmation") return "Applied";
  if (classification === "interview_request") return "Interview";
  if (classification === "rejection") return "Rejected";
  if (classification === "offer") return "Offer";
  return undefined;
}

function titleForClassification(message: EmailMessage) {
  switch (message.classification) {
    case "recruiter_outreach": return "Recruiter outreach detected";
    case "interview_request": return "Interview request detected";
    case "application_confirmation": return "Application confirmation detected";
    case "rejection": return "Rejection detected";
    case "offer": return "Offer detected";
    default: return "Job-search email detected";
  }
}

function findMatchingJob(message: EmailMessage, jobs: JobPosting[]) {
  return jobs.find((job) => {
    const companyMatch = message.company && normalize(job.company).includes(normalize(message.company));
    const titleMatch = message.jobTitle && normalize(job.title).includes(normalize(message.jobTitle).split(" ")[0]);
    return companyMatch || titleMatch;
  });
}

function extractCompany(subject: string, body: string, from: string) {
  const text = `${subject}\n${body}`;
  const atMatch = text.match(/(?:at|with)\s+([A-Z][A-Za-z0-9& .-]{2,40})/);
  if (atMatch?.[1]) return atMatch[1].replace(/\s+(for|about|regarding).*$/i, "").trim();
  const domain = from.split("@")[1]?.split(".")[0];
  return domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : undefined;
}

function extractJobTitle(subject: string, body: string) {
  const text = `${subject}\n${body}`;
  return text.match(/((?:validation|test|quality|engineering|automotive|product development)[A-Za-z ]{3,45}(?:technician|engineer|analyst|specialist))/i)?.[1]?.trim();
}

export function mockEmailMessages(provider: EmailProvider = "mock"): RawEmailInput[] {
  const now = Date.now();
  return [
    { id: `${provider}-1`, provider, from: "recruiter@ford.com", subject: "Interview request for Automotive Validation Technician at Ford", body: "Your background looks aligned with our Automotive Validation Technician role. Are you available for a phone screen next week?", receivedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
    { id: `${provider}-2`, provider, from: "jobs@bosch.com", subject: "Thank you for applying to Bosch Quality Technician", body: "We received your application and our recruiting team will review it shortly.", receivedAt: new Date(now - 28 * 60 * 60 * 1000).toISOString() },
    { id: `${provider}-3`, provider, from: "talent@magna.com", subject: "Opportunity with Magna for Validation Engineer", body: "I am a recruiter reaching out because your background in validation and diagnostics may fit an open role at Magna.", receivedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString() },
    { id: `${provider}-4`, provider, from: "noreply@toyota.com", subject: "Update on your Toyota Engineering Technician application", body: "Unfortunately, we will not be moving forward at this time.", receivedAt: new Date(now - 72 * 60 * 60 * 1000).toISOString() }
  ];
}
