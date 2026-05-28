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
  status: ApplicationStatus;
  matchScore: number;
  whyMatches: string[];
  redFlags: string[];
  createdAt: string;
}

export interface JobInput {
  title: string;
  company: string;
  location: string;
  source: string;
  pay?: string;
  description: string;
}

export interface GeneratedApplication {
  jobId: string;
  resume: string;
  coverLetter: string;
  checklist: string[];
}

export interface DashboardData {
  profile: UserProfile;
  jobs: JobPosting[];
  applications: JobPosting[];
}
