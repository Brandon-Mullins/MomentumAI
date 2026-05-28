export type ApplicationStatus =
  | "Pending"
  | "Saved"
  | "Applied"
  | "Interview"
  | "Rejected"
  | "Offer";

export type CoverLetterTone =
  | "Direct and practical"
  | "Warm and confident"
  | "Technical and detailed"
  | "Entry-level and eager";

export type FitLabel = "Strong fit" | "Possible fit" | "Stretch role";
export type Recommendation = "Apply now" | "Save for later" | "Skip" | "Needs more research";

export interface ParsedResume {
  name: string;
  contactInfo: string[];
  skills: string[];
  workExperience: string[];
  education: string[];
  certifications: string[];
  toolsTechnologies: string[];
  industryKeywords: string[];
  rawText: string;
}

export interface ProfileSuggestion {
  category: string;
  suggestion: string;
  impact: "High" | "Medium" | "Low";
}

export interface ResumeParseResult {
  parsedResume: ParsedResume;
  profileDraft: Partial<UserProfile>;
  profileStrength: number;
  suggestions: ProfileSuggestion[];
}

export interface UserProfile {
  name: string;
  email: string;
  location: string;
  commuteMiles: number;
  desiredPayMin: number;
  desiredPayMax: number;
  preferredTitles: string[];
  skills: string[];
  experience: string;
  resume: string;
  coverLetterStyle: CoverLetterTone;
  parsedResume?: ParsedResume;
  profileStrength?: number;
  profileSuggestions?: ProfileSuggestion[];
}

export interface AdvancedScoreBreakdown {
  titleAlignment: number;
  skillOverlap: number;
  experienceLevelFit: number;
  locationFit: number;
  salaryFit: number;
  industryFit: number;
  redFlagRisk: number;
  missingQualifications: number;
  careerGrowthPotential: number;
}

export interface JobDecisionScorecard {
  pay: number;
  commute: number;
  careerGrowth: number;
  workLifeBalance: number;
  companyConfidence: number;
  roleFit: number;
  recommendation: Recommendation;
  rationale: string[];
}

export interface JobNotes {
  text: string;
  updatedAt: string;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  pay?: string;
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  yearsExperience?: string;
  employmentType?: string;
  applicationUrl?: string;
  status: ApplicationStatus;
  matchScore: number;
  fitLabel?: FitLabel;
  scoreBreakdown?: AdvancedScoreBreakdown;
  missingQualifications?: string[];
  growthSignals?: string[];
  whyMatches: string[];
  redFlags: string[];
  notes?: JobNotes;
  scorecard?: JobDecisionScorecard;
  createdAt: string;
}

export interface JobInput {
  title: string;
  company: string;
  location: string;
  source: string;
  pay?: string;
  description: string;
  preferredSkills?: string[];
  yearsExperience?: string;
  employmentType?: string;
  applicationUrl?: string;
}

export interface ImportedJobDraft extends JobInput {
  confidence: number;
  extractionNotes: string[];
  requiredSkills: string[];
}

export interface ApplicationPacket {
  tailoredResumeSummary: string;
  tailoredSkillsSection: string;
  tailoredBulletSuggestions: string[];
  coverLetter: string;
  recruiterMessage: string;
  linkedInMessage: string;
  interviewTalkingPoints: string[];
  safetyWarnings: string[];
}

export interface GeneratedApplication {
  jobId: string;
  resume: string;
  coverLetter: string;
  packet?: ApplicationPacket;
  checklist: string[];
}

export interface AnalyticsData {
  applicationsByStatus: Record<ApplicationStatus, number>;
  averageMatchScore: number;
  responseRate: number;
  companiesAppliedTo: number;
  topMatchedSkills: Array<{ skill: string; count: number }>;
  commonMissingSkills: Array<{ skill: string; count: number }>;
  bestJobSources: Array<{ source: string; count: number; averageMatch: number }>;
}

export interface DashboardData {
  profile: UserProfile;
  jobs: JobPosting[];
  applications: JobPosting[];
  analytics?: AnalyticsData;
}
