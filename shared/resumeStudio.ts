import type { GeneratedApplication, JobPosting, UserProfile } from "./types";

export type ResumeTemplate =
  | "Automotive Test Engineer"
  | "Validation Engineer"
  | "Engineering Technician"
  | "Quality Engineer"
  | "ATS Optimized"
  | "Executive Professional";

export type CoverLetterStudioStyle =
  | "Professional"
  | "Technical"
  | "Executive"
  | "Automotive"
  | "Concise";

export type ResumePageLength = "one-page" | "two-page";

export interface ResumeStudioOptions {
  template: ResumeTemplate;
  coverLetterStyle: CoverLetterStudioStyle;
  pageLength: ResumePageLength;
}

export interface ResumeStudioScore {
  atsScore: number;
  readabilityScore: number;
  matchScore: number;
  keywordCoverage: number;
  missingKeywords: string[];
  recommendations: string[];
}

export interface ResumeStudioOutput {
  resumePlainText: string;
  coverLetterPlainText: string;
  resumeTex: string;
  coverLetterTex: string;
  score: ResumeStudioScore;
  includedSections: Array<{ section: string; why: string }>;
  bulletSuggestions: string[];
  warnings: string[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const normalize = (value = "") => value.toLowerCase();

export function escapeLatex(value = "") {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function selectRelevantSkills(profile: UserProfile, job: JobPosting) {
  const jobText = normalize(`${job.title} ${job.description} ${job.requiredSkills.join(" ")}`);
  const skills = unique([...(profile.skills ?? []), ...(profile.parsedResume?.skills ?? []), ...(profile.parsedResume?.toolsTechnologies ?? [])]);
  const matched = skills.filter((skill) => jobText.includes(normalize(skill)));
  return unique([...matched, ...skills]).slice(0, 14);
}

function templateSummaryPrefix(template: ResumeTemplate) {
  switch (template) {
    case "Automotive Test Engineer":
      return "Automotive test and validation candidate";
    case "Validation Engineer":
      return "Validation-focused engineering candidate";
    case "Engineering Technician":
      return "Hands-on engineering technician";
    case "Quality Engineer":
      return "Quality and continuous-improvement candidate";
    case "Executive Professional":
      return "Technical leader and quality-focused professional";
    default:
      return "ATS-focused testing and quality candidate";
  }
}

function coverLetterOpening(style: CoverLetterStudioStyle, job: JobPosting) {
  switch (style) {
    case "Technical":
      return `I am interested in the ${job.title} role because it aligns with hands-on validation, structured testing, documentation, and technical troubleshooting.`;
    case "Executive":
      return `I am excited to be considered for ${job.title}, where disciplined execution, communication, and quality leadership matter.`;
    case "Automotive":
      return `I am interested in the ${job.title} role because it sits directly in the automotive testing, validation, and quality space I am targeting.`;
    case "Concise":
      return `I am interested in the ${job.title} role at ${job.company}.`;
    default:
      return `I am writing to express interest in the ${job.title} role at ${job.company}.`;
  }
}

function measurableWarning(profile: UserProfile) {
  return /\d|%|\$|reduced|improved|increased|decreased|saved|completed|documented/i.test(profile.experience);
}

export function buildResumeStudio(profile: UserProfile, job: JobPosting, generated: GeneratedApplication, options: ResumeStudioOptions): ResumeStudioOutput {
  const relevantSkills = selectRelevantSkills(profile, job);
  const jobKeywords = unique([...job.requiredSkills, ...(job.preferredSkills ?? [])]).slice(0, 18);
  const missingKeywords = jobKeywords.filter((keyword) => !relevantSkills.some((skill) => normalize(skill).includes(normalize(keyword)) || normalize(keyword).includes(normalize(skill)))).slice(0, 10);
  const keywordCoverage = jobKeywords.length ? clamp(((jobKeywords.length - missingKeywords.length) / jobKeywords.length) * 100) : 68;
  const summary = `${templateSummaryPrefix(options.template)} with verified experience across ${relevantSkills.slice(0, 6).join(", ") || "testing, troubleshooting, documentation, and validation"}. Targeting ${job.title} at ${job.company}, with emphasis on accurate test execution, clear defect communication, and practical engineering support.`;
  const bullets = generated.packet?.tailoredBulletSuggestions ?? [
    "Emphasize verified testing, validation, troubleshooting, and documentation work connected to the posting.",
    "Add measurable results only when they are true and defensible.",
    "Keep tools and technical keywords visible for ATS matching."
  ];
  const pageLimit = options.pageLength === "one-page" ? 4 : 7;
  const experienceLines = (profile.experience || "Add verified experience bullets here. Do not invent responsibilities or achievements.")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, pageLimit);

  const resumePlainText = `${profile.name}
${profile.email} | ${profile.location}

SUMMARY
${summary}

CORE SKILLS
${relevantSkills.map((skill) => `- ${skill}`).join("\n")}

EXPERIENCE
${experienceLines.map((line) => `- ${line}`).join("\n")}

TARGETED FIT
${job.whyMatches.slice(0, 5).map((reason) => `- ${reason}`).join("\n")}

EDITABLE BULLET IMPROVEMENTS
${bullets.map((bullet) => `- ${bullet}`).join("\n")}

MISSING / OPTIONAL KEYWORDS TO REVIEW
${missingKeywords.length ? missingKeywords.map((keyword) => `- ${keyword}`).join("\n") : "- No major missing keywords detected."}`;

  const coverLetterPlainText = `${profile.name}
${profile.email} | ${profile.location}

Hello ${job.company} hiring team,

${coverLetterOpening(options.coverLetterStyle, job)} My saved profile supports this application through verified experience with ${relevantSkills.slice(0, 6).join(", ") || "testing and validation work"}.

What stood out in the role:
${job.whyMatches.slice(0, 4).map((reason) => `- ${reason}`).join("\n")}

I would bring a careful, documentation-focused approach to testing, defect communication, troubleshooting, and collaboration with engineering or quality teams.

Thank you for your time and consideration.

${profile.name}`;

  const resumeTex = buildResumeTex(profile, job, summary, relevantSkills, experienceLines, bullets, missingKeywords, options);
  const coverLetterTex = buildCoverLetterTex(profile, job, coverLetterPlainText, options);
  const warnings = [
    "Review every line before submitting.",
    "Do not claim tools, certifications, years of experience, or achievements that are not true.",
    "Generated bullets are suggestions; edit them to match your verified work.",
    ...(measurableWarning(profile) ? [] : ["Your profile is missing measurable accomplishments. Add true numbers such as tests completed, defects documented, cycle time improved, or tools used."])
  ];
  const recommendations = [
    ...(missingKeywords.length ? [`Review missing keywords: ${missingKeywords.slice(0, 5).join(", ")}.`] : []),
    ...(measurableWarning(profile) ? [] : ["Add measurable, truthful accomplishments to improve credibility."]),
    "Keep the resume to one page for technician/early-career roles unless your verified experience needs two pages.",
    "Use the ATS template for online portals and a role-specific template for direct recruiter outreach."
  ];

  return {
    resumePlainText,
    coverLetterPlainText,
    resumeTex,
    coverLetterTex,
    score: {
      atsScore: clamp(58 + keywordCoverage * 0.28 + relevantSkills.length * 2),
      readabilityScore: clamp(options.template === "ATS Optimized" ? 90 : 82),
      matchScore: job.matchScore,
      keywordCoverage,
      missingKeywords,
      recommendations
    },
    includedSections: [
      { section: "Summary", why: `Rewritten for ${job.title} and the ${options.template} template.` },
      { section: "Core Skills", why: "Prioritizes profile skills that overlap with the job description first." },
      { section: "Experience", why: "Uses verified profile experience only; no invented bullets are inserted." },
      { section: "Targeted Fit", why: "Shows why the role matches your saved preferences and skills." },
      { section: "Editable Bullet Improvements", why: "Highlights where you should add truthful metrics or stronger phrasing." }
    ],
    bulletSuggestions: bullets,
    warnings
  };
}

function latexList(items: string[]) {
  return items.length ? items.map((item) => `  \\item ${escapeLatex(item)}`).join("\n") : "  \\item Add verified details here.";
}

function buildResumeTex(profile: UserProfile, job: JobPosting, summary: string, skills: string[], experienceLines: string[], bullets: string[], missingKeywords: string[], options: ResumeStudioOptions) {
  return `\\documentclass[10pt]{article}
\\usepackage[margin=0.65in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\setlength{\\parindent}{0pt}
\\setlist[itemize]{leftmargin=*, noitemsep, topsep=2pt}

\\begin{document}

% ===== EDITABLE HEADER =====
{\\Large \\textbf{${escapeLatex(profile.name)}}}\\\\
${escapeLatex(profile.email)} \\textbar{} ${escapeLatex(profile.location)}

\\vspace{6pt}
% ===== TARGET ROLE: ${escapeLatex(job.title)} at ${escapeLatex(job.company)} =====
\\textbf{Professional Summary}\\\\
${escapeLatex(summary)}

\\vspace{6pt}
% ===== EDITABLE SKILLS: prioritize truthful skills only =====
\\textbf{Core Skills}
\\begin{itemize}
${latexList(skills.slice(0, options.pageLength === "one-page" ? 10 : 14))}
\\end{itemize}

\\vspace{4pt}
% ===== EDITABLE EXPERIENCE: replace suggestions with verified accomplishments =====
\\textbf{Experience Highlights}
\\begin{itemize}
${latexList(experienceLines)}
\\end{itemize}

\\vspace{4pt}
% ===== WHY THIS RESUME WAS TAILORED =====
\\textbf{Targeted Fit}
\\begin{itemize}
${latexList(job.whyMatches.slice(0, 5))}
\\end{itemize}

\\vspace{4pt}
% ===== BULLET IMPROVEMENT IDEAS: do not submit until edited for accuracy =====
\\textbf{Bullet Improvement Ideas}
\\begin{itemize}
${latexList(bullets.slice(0, 5))}
\\end{itemize}

% ===== OPTIONAL KEYWORDS TO REVIEW =====
% Missing/optional keywords: ${escapeLatex(missingKeywords.join(", ") || "None detected")}

\\end{document}
`;
}

function buildCoverLetterTex(profile: UserProfile, job: JobPosting, coverLetter: string, options: ResumeStudioOptions) {
  return `\\documentclass[11pt]{letter}
\\usepackage[margin=0.85in]{geometry}
\\signature{${escapeLatex(profile.name)}}
\\address{${escapeLatex(profile.name)}\\\\${escapeLatex(profile.email)}\\\\${escapeLatex(profile.location)}}

\\begin{document}

% ===== EDITABLE COVER LETTER (${escapeLatex(options.coverLetterStyle)} style) =====
\\begin{letter}{${escapeLatex(job.company)} Hiring Team}
\\opening{Hello,}

${escapeLatex(coverLetter)
  .split("\n")
  .filter((line) => line.trim() && !line.includes(profile.name) && !line.includes(profile.email) && !line.startsWith("Hello"))
  .join("\n\n")}

\\closing{Thank you for your consideration,}
\\end{letter}

\\end{document}
`;
}
