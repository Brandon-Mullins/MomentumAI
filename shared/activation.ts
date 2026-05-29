import type { ImportedJobDraft, JobPosting, ResumeParseResult, UserProfile } from "./types";

export interface FieldConfidence {
  field: string;
  value: string;
  confidence: number;
  uncertain: boolean;
  reason: string;
}

export interface ActivationProfileReview {
  overallConfidence: number;
  resumeCompleteness: number;
  profileCompleteness: number;
  fields: FieldConfidence[];
  missingAchievements: string[];
}

export interface ActivationFirstMatchSummary {
  headline: string;
  projectedScore: number;
  missingSkills: string[];
  resumeScore: number;
  momentumScore: number;
  successMessages: string[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function hasMeasurableAchievement(text = "") {
  return /\d|%|\$|reduced|improved|increased|decreased|saved|completed|documented|validated|tested/i.test(text);
}

export function buildActivationProfileReview(result: ResumeParseResult, profile: Partial<UserProfile>): ActivationProfileReview {
  const parsed = result.parsedResume;
  const fields: FieldConfidence[] = [
    confidence("Name", profile.name || parsed.name, Boolean(parsed.name), "Detected from resume header."),
    confidence("Email", profile.email || parsed.contactInfo.find((item) => item.includes("@")), Boolean(parsed.contactInfo.find((item) => item.includes("@"))), "Detected from contact line."),
    confidence("Location", profile.location, Boolean(profile.location), "May need user confirmation."),
    confidence("Job titles", profile.preferredTitles?.join(", "), Boolean(profile.preferredTitles?.length), "Estimated from profile preferences."),
    confidence("Skills", profile.skills?.join(", ") || parsed.skills.join(", "), parsed.skills.length >= 5, "Extracted from resume keywords."),
    confidence("Tools", parsed.toolsTechnologies.join(", "), parsed.toolsTechnologies.length >= 2, "Detected from tools and technology keywords."),
    confidence("Certifications", parsed.certifications.join(", "), parsed.certifications.length > 0, "Detected from certification keywords."),
    confidence("Education", parsed.education.join(", "), parsed.education.length > 0, "Detected from education keywords."),
    confidence("Experience summary", profile.experience || parsed.workExperience.join(" "), Boolean((profile.experience || parsed.workExperience.join(" ")).length > 40), "Built from experience-like resume lines.")
  ];

  const resumeCompleteness = clamp(
    20 +
      parsed.skills.length * 4 +
      parsed.workExperience.length * 5 +
      parsed.toolsTechnologies.length * 3 +
      parsed.education.length * 4 +
      parsed.certifications.length * 4
  );
  const profileCompleteness = clamp(
    fields.filter((field) => field.value).length * 10 +
      (profile.skills?.length ?? 0) * 2 +
      ((profile.resume?.length ?? parsed.rawText.length) > 300 ? 10 : 0)
  );
  const overallConfidence = clamp(fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length);
  const experienceText = `${profile.experience ?? ""}\n${parsed.workExperience.join("\n")}\n${parsed.rawText}`;
  const missingAchievements = hasMeasurableAchievement(experienceText)
    ? []
    : [
        "Add true numbers such as tests completed, defects documented, cycle time improved, or tools used.",
        "Add measurable outcomes only if you can explain them in an interview.",
        "Add one bullet showing how your testing or troubleshooting helped the team."
      ];

  return { overallConfidence, resumeCompleteness, profileCompleteness, fields, missingAchievements };
}

export function buildActivationFirstMatchSummary(job: JobPosting, resumeScore: number, momentumScore: number): ActivationFirstMatchSummary {
  const missingSkills = (job.missingQualifications ?? []).slice(0, 3);
  const projectedScore = clamp(job.matchScore + missingSkills.length * 4 + (missingSkills.length ? 2 : 0));
  return {
    headline: `Your profile matches this role at ${job.matchScore}%`,
    projectedScore,
    missingSkills,
    resumeScore,
    momentumScore,
    successMessages: [
      `${job.fitLabel ?? "Possible fit"} for ${job.title} at ${job.company}.`,
      missingSkills.length
        ? `Fixing these ${missingSkills.length} skill gap${missingSkills.length > 1 ? "s" : ""} could raise it to ${projectedScore}%.`
        : "No major missing skills detected from this posting.",
      "Resume tailored successfully. Review every line before submitting."
    ]
  };
}

export function activationJobDraftReady(job: ImportedJobDraft) {
  return Boolean(job.title && job.company && job.location && job.description.length >= 20);
}

function confidence(field: string, value: unknown, highConfidence: boolean, reason: string): FieldConfidence {
  const stringValue = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  const present = Boolean(stringValue.trim());
  const confidenceValue = present ? (highConfidence ? 92 : 64) : 25;
  return {
    field,
    value: stringValue,
    confidence: confidenceValue,
    uncertain: confidenceValue < 75,
    reason: present ? reason : "Not confidently detected. Please add or confirm."
  };
}
