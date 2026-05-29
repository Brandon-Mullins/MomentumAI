import type { GeneratedApplication, JobPosting, UserProfile } from "./types";

export type ResumeTemplate = "Modern Compact" | "ATS Clean" | "Engineering Professional" | "Automotive/Test Engineer";
export type CoverLetterStudioStyle = "Professional" | "Technical" | "Executive" | "Automotive" | "Concise";
export type ResumePageLength = "one-page" | "two-page";
export type ResumeExportKind = "pdf" | "docx" | "tex" | "zip";

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
  projectsOrTools: string[];
  education: string[];
}

export interface ResumeExportOption {
  kind: ResumeExportKind;
  label: string;
  filename: string;
  description: string;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const normalize = (value = "") => value.toLowerCase();

export function getResumeStudioExportOptions(): ResumeExportOption[] {
  return [
    { kind: "pdf", label: "Download PDF", filename: "resume.pdf", description: "Rendered resume PDF from the styled preview, not LaTeX source." },
    { kind: "docx", label: "Download DOCX", filename: "resume.docx", description: "Word-editable resume document." },
    { kind: "tex", label: "Download .tex", filename: "resume.tex + coverletter.tex", description: "Overleaf-ready LaTeX source files." },
    { kind: "zip", label: "Download ZIP", filename: "application-package.zip", description: "Resume, cover letter, LaTeX files, and README instructions." }
  ];
}

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
  return unique([...matched, ...skills]).slice(0, 16);
}

function templateSummaryPrefix(template: ResumeTemplate) {
  switch (template) {
    case "Automotive/Test Engineer":
      return "Automotive test and validation professional";
    case "Engineering Professional":
      return "Engineering-focused technical professional";
    case "Modern Compact":
      return "Testing and quality professional";
    default:
      return "ATS-focused testing and validation candidate";
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

function projectsOrTools(profile: UserProfile, skills: string[]) {
  return unique([...(profile.parsedResume?.toolsTechnologies ?? []), ...skills.filter((skill) => /jira|python|can|lin|sql|labview|matlab|excel|selenium|oscilloscope/i.test(skill))]).slice(0, 8);
}

function education(profile: UserProfile) {
  return unique([...(profile.parsedResume?.education ?? []), ...(profile.parsedResume?.certifications ?? [])]).slice(0, 5);
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
  const toolRows = projectsOrTools(profile, relevantSkills);
  const educationRows = education(profile);

  const resumePlainText = `${profile.name}
${profile.email} | ${profile.location}

SUMMARY
${summary}

CORE SKILLS
${relevantSkills.map((skill) => `- ${skill}`).join("\n")}

EXPERIENCE
${experienceLines.map((line) => `- ${line}`).join("\n")}

TOOLS / PROJECTS
${toolRows.length ? toolRows.map((tool) => `- ${tool}`).join("\n") : "- Add verified tools, labs, projects, or test equipment here."}

EDUCATION / CERTIFICATIONS
${educationRows.length ? educationRows.map((item) => `- ${item}`).join("\n") : "- Add verified education or certifications here if relevant."}

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

  const resumeTex = buildResumeTex(profile, job, summary, relevantSkills, experienceLines, bullets, missingKeywords, toolRows, educationRows, options);
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
    "Keep the resume to one page for technician/early-career roles unless verified experience needs two pages.",
    "Use ATS Clean for online portals and Automotive/Test Engineer or Engineering Professional for recruiter outreach."
  ];

  return {
    resumePlainText,
    coverLetterPlainText,
    resumeTex,
    coverLetterTex,
    score: {
      atsScore: clamp(62 + keywordCoverage * 0.25 + relevantSkills.length * 1.8 + (options.template === "ATS Clean" ? 6 : 0)),
      readabilityScore: clamp(options.template === "ATS Clean" ? 92 : options.template === "Modern Compact" ? 88 : 84),
      matchScore: job.matchScore,
      keywordCoverage,
      missingKeywords,
      recommendations
    },
    includedSections: [
      { section: "Summary", why: `Rewritten for ${job.title} and the ${options.template} template.` },
      { section: "Core Skills", why: "Prioritizes profile skills that overlap with the job description first." },
      { section: "Experience", why: "Uses verified profile experience only; no invented bullets are inserted." },
      { section: "Tools / Projects", why: "Highlights relevant tools, labs, and technical keywords when present." },
      { section: "Education / Certifications", why: "Included only when parsed or saved profile data contains verified education/certification signals." }
    ],
    bulletSuggestions: bullets,
    warnings,
    projectsOrTools: toolRows,
    education: educationRows
  };
}

function latexList(items: string[]) {
  return items.length ? items.map((item) => `  \\item ${escapeLatex(item)}`).join("\n") : "  \\item Add verified details here.";
}

function sectionColor(template: ResumeTemplate) {
  if (template === "Automotive/Test Engineer") return "0B5394";
  if (template === "Engineering Professional") return "1F4E79";
  if (template === "Modern Compact") return "4F46E5";
  return "111827";
}

function buildResumeTex(profile: UserProfile, job: JobPosting, summary: string, skills: string[], experienceLines: string[], bullets: string[], missingKeywords: string[], tools: string[], educationRows: string[], options: ResumeStudioOptions) {
  const color = sectionColor(options.template);
  const compact = options.pageLength === "one-page";
  return `\\documentclass[10pt]{article}
\\usepackage[margin=0.58in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{tabularx}
\\definecolor{accent}{HTML}{${color}}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\pagenumbering{gobble}
\\titleformat{\\section}{\\large\\bfseries\\color{accent}}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{${compact ? "6pt" : "9pt"}}{${compact ? "3pt" : "5pt"}}
\\setlist[itemize]{leftmargin=*, noitemsep, topsep=2pt, parsep=0pt}

\\begin{document}

% ===== EDITABLE HEADER =====
\\begin{center}
{\\LARGE \\textbf{${escapeLatex(profile.name)}}}\\\\
\\vspace{2pt}
${escapeLatex(profile.email)} \\; \\textbullet \\; ${escapeLatex(profile.location)} \\; \\textbullet \\; Target: ${escapeLatex(job.title)}
\\end{center}

% ===== EDITABLE SUMMARY: tailored for ${escapeLatex(job.company)} =====
\\section*{Professional Summary}
${escapeLatex(summary)}

% ===== EDITABLE SKILLS: keep only truthful skills =====
\\section*{Core Skills}
\\begin{tabularx}{\\textwidth}{@{}X X@{}}
${skills.slice(0, compact ? 10 : 14).map((skill, index, arr) => index % 2 === 0 ? `${escapeLatex(skill)}${arr[index + 1] ? ` & ${escapeLatex(arr[index + 1])} \\\\` : " \\\\"}` : "").filter(Boolean).join("\n")}
\\end{tabularx}

% ===== EDITABLE EXPERIENCE: replace with verified accomplishments =====
\\section*{Experience Highlights}
\\begin{itemize}
${latexList(experienceLines)}
\\end{itemize}

% ===== TOOLS / PROJECTS: include only tools you can discuss =====
\\section*{Tools \\& Projects}
\\begin{itemize}
${latexList(tools.length ? tools : ["Add verified tools, labs, projects, or test equipment here."])}
\\end{itemize}

% ===== EDUCATION / CERTIFICATIONS: remove if not applicable =====
\\section*{Education \\& Certifications}
\\begin{itemize}
${latexList(educationRows.length ? educationRows : ["Add verified education or certifications here if relevant."])}
\\end{itemize}

% ===== TARGETED FIT: why MomentumAI included these points =====
\\section*{Targeted Fit for ${escapeLatex(job.company)}}
\\begin{itemize}
${latexList(job.whyMatches.slice(0, 5))}
\\end{itemize}

% ===== BULLET IMPROVEMENT IDEAS: do not submit until edited for accuracy =====
% ${bullets.map(escapeLatex).join("\n% ")}
% Missing/optional keywords to review: ${escapeLatex(missingKeywords.join(", ") || "None detected")}

\\end{document}
`;
}

function buildCoverLetterTex(profile: UserProfile, job: JobPosting, coverLetter: string, options: ResumeStudioOptions) {
  const color = sectionColor(options.template);
  return `\\documentclass[11pt]{letter}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{xcolor}
\\usepackage[hidelinks]{hyperref}
\\definecolor{accent}{HTML}{${color}}
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
