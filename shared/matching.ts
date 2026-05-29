import type {
  AdvancedScoreBreakdown,
  AnalyticsData,
  ApplicationPacket,
  ApplicationStatus,
  FitLabel,
  GeneratedApplication,
  ImportedJobDraft,
  JobDecisionScorecard,
  JobInput,
  JobPosting,
  JobSourceProvider,
  CareerCoachReport,
  InterviewSimulator,
  MissingSkillsMarketplace,
  ParsedResume,
  ProfileSuggestion,
  Recommendation,
  ResumeParseResult,
  UserProfile
} from "./types";

const SKILL_KEYWORDS = [
  "manual testing",
  "automated testing",
  "test cases",
  "test plans",
  "qa",
  "quality assurance",
  "sdet",
  "validation",
  "verification",
  "calibration",
  "diagnostics",
  "root cause",
  "automotive",
  "can",
  "lin",
  "python",
  "selenium",
  "jira",
  "sql",
  "labview",
  "oscilloscope",
  "technician",
  "troubleshooting",
  "electrical",
  "mechanical",
  "manufacturing",
  "inspection",
  "iso",
  "ppap",
  "test automation",
  "regression testing",
  "validation protocol",
  "data analysis",
  "excel",
  "matlab",
  "hardware",
  "software testing",
  "bug reports"
];

const TOOL_KEYWORDS = ["jira", "python", "selenium", "sql", "labview", "matlab", "excel", "can", "lin", "oscilloscope", "git", "postman", "test rail"];
const INDUSTRY_KEYWORDS = ["automotive", "manufacturing", "medical device", "aerospace", "ev", "battery", "software", "electronics", "quality", "validation"];
const CERT_KEYWORDS = ["six sigma", "asq", "istqb", "iso", "osha", "ase", "comptia", "lean", "pmp"];
const EDUCATION_KEYWORDS = ["bachelor", "associate", "degree", "university", "college", "certificate", "diploma"];

const RED_FLAG_KEYWORDS = [
  "unpaid",
  "commission only",
  "1099",
  "must have active clearance",
  "senior only",
  "10+ years",
  "relocation required",
  "no benefits",
  "startup equity only",
  "fast-paced and ambiguous"
];

const GROWTH_KEYWORDS = ["training", "mentor", "growth", "career path", "learn", "junior", "entry level", "cross-functional", "promotion", "certification"];

const normalize = (value = "") => value.toLowerCase();
const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(normalize(term)));
const lines = (text: string) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

export function extractRequiredSkills(description: string): string[] {
  const text = normalize(description);
  return SKILL_KEYWORDS.filter((keyword) => text.includes(keyword)).slice(0, 14);
}

function extractPreferredSkills(description: string): string[] {
  const text = normalize(description);
  const preferredText = text.split(/preferred|nice to have|bonus|plus/).slice(1).join(" ") || text;
  return SKILL_KEYWORDS.filter((keyword) => preferredText.includes(keyword)).slice(0, 8);
}

function extractYearsExperience(text: string) {
  const match = text.match(/(\d+\+?\s*(?:-|to)?\s*\d*\+?\s*years?[^.,;\n]*)/i);
  return match?.[1]?.trim();
}

function extractPay(text: string) {
  const match = text.match(/(\$\s?\d{2,3}(?:[,\d]{0,5})?(?:\s?[\-/to]+\s?\$?\d{2,3}(?:[,\d]{0,5})?)?\s?(?:\/hr|per hour|hour|k|annually|salary)?)/i);
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

function extractUrl(text: string) {
  return text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[),.]+$/, "");
}

function scoreSalary(profile: UserProfile, pay?: string) {
  if (!pay) return 55;
  const numbers = pay.match(/\d+/g)?.map(Number) ?? [];
  if (!numbers.length) return 50;
  const normalized = numbers.map((num) => (num > 1000 ? Math.round(num / 2080) : num > 200 ? Math.round(num / 1000) : num));
  const high = Math.max(...normalized);
  if (high >= profile.desiredPayMin && high <= profile.desiredPayMax + 10) return 95;
  if (high >= profile.desiredPayMin * 0.85) return 75;
  return 35;
}

function fitLabel(score: number): FitLabel {
  if (score >= 82) return "Strong fit";
  if (score >= 62) return "Possible fit";
  return "Stretch role";
}

function recommendation(score: number, redFlags: string[]): Recommendation {
  if (redFlags.length >= 3) return "Needs more research";
  if (score >= 82) return "Apply now";
  if (score >= 62) return "Save for later";
  return "Skip";
}

export function parseResumeText(rawText: string): ResumeParseResult {
  const text = rawText.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim();
  const textLines = lines(text);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ?? "";
  const name = textLines.find((line) => line.length < 60 && !line.includes("@") && !/resume|summary|experience/i.test(line)) ?? "";
  const lower = normalize(text);
  const skills = unique(SKILL_KEYWORDS.filter((skill) => lower.includes(skill))).slice(0, 18);
  const toolsTechnologies = unique(TOOL_KEYWORDS.filter((tool) => lower.includes(tool))).slice(0, 12);
  const certifications = unique(CERT_KEYWORDS.filter((cert) => lower.includes(cert))).slice(0, 8);
  const education = textLines.filter((line) => EDUCATION_KEYWORDS.some((keyword) => normalize(line).includes(keyword))).slice(0, 6);
  const industryKeywords = unique(INDUSTRY_KEYWORDS.filter((keyword) => lower.includes(keyword))).slice(0, 10);
  const experienceLines = textLines
    .filter((line) => /tested|validated|quality|technician|engineer|inspected|troubleshoot|documented|built|supported|managed|operated/i.test(line))
    .slice(0, 10);

  const parsedResume: ParsedResume = {
    name,
    contactInfo: unique([email, phone]),
    skills,
    workExperience: experienceLines,
    education,
    certifications,
    toolsTechnologies,
    industryKeywords,
    rawText: text
  };

  const suggestions: ProfileSuggestion[] = [];
  if (skills.length < 8) suggestions.push({ category: "Skills", suggestion: "Add a focused skills section with QA, validation, troubleshooting, tools, and testing methods.", impact: "High" });
  if (experienceLines.length < 3) suggestions.push({ category: "Experience", suggestion: "Add measurable bullets that show testing, defects found, documentation, tools used, and outcomes.", impact: "High" });
  if (!email || !phone) suggestions.push({ category: "Contact", suggestion: "Include a professional email and phone number so recruiters can reach you quickly.", impact: "Medium" });
  if (!certifications.length) suggestions.push({ category: "Certifications", suggestion: "If accurate, add relevant certifications such as ISTQB, Six Sigma, ISO, OSHA, ASE, or tooling courses.", impact: "Low" });
  if (!toolsTechnologies.length) suggestions.push({ category: "Tools", suggestion: "List tools and technologies you have actually used, such as Jira, Python, CAN/LIN, SQL, LabVIEW, Excel, or oscilloscopes.", impact: "Medium" });

  const profileStrength = clamp(35 + skills.length * 3 + experienceLines.length * 4 + toolsTechnologies.length * 2 + certifications.length * 3 + (email ? 5 : 0) + (phone ? 5 : 0));

  return {
    parsedResume,
    profileDraft: {
      name,
      email,
      skills,
      experience: experienceLines.join("\n"),
      resume: text,
      parsedResume,
      profileStrength,
      profileSuggestions: suggestions
    },
    profileStrength,
    suggestions
  };
}

export function extractJobData(input: { text?: string; url?: string; recruiterEmail?: string; source?: string }): ImportedJobDraft {
  const combined = [input.text, input.recruiterEmail, input.url].filter(Boolean).join("\n");
  const text = combined.trim();
  const textLines = lines(text);
  const sentencePattern = text.match(/([^.!?\n]{3,80}?)\s+at\s+([^.!?\n]{2,80}?)\s+(?:in|near|-)\s+([^.!?\n]{2,80})/i);
  const titleLine = sentencePattern?.[1] ?? textLines.find((line) => /engineer|technician|quality|qa|validation|test|sdet/i.test(line))?.split(/[.|-]/)[0] ?? "Imported role";
  const companyLine = sentencePattern?.[2] ?? textLines.find((line) => /company|at\s+[A-Z]|inc|llc|corp|labs|systems|motors/i.test(line));
  const locationLine = sentencePattern?.[3] ?? textLines.find((line) => /remote|hybrid|[A-Z][a-z]+,\s?[A-Z]{2}|michigan|detroit|dearborn|auburn hills/i.test(line));
  const requiredSkills = extractRequiredSkills(text);
  const preferredSkills = extractPreferredSkills(text);
  const employmentType = text.match(/full[- ]time|part[- ]time|contract|temporary|internship|direct hire/i)?.[0];
  const applicationUrl = extractUrl(text) ?? input.url;

  return {
    title: titleLine.replace(/job title:|title:/i, "").trim(),
    company: companyLine?.replace(/company:|^at\s+/i, "").replace(/\s+(?:in|near|-).*$/i, "").trim() || "Company to verify",
    location: locationLine?.replace(/location:/i, "").replace(/\b(?:pay|salary|full-time|part-time).*$/i, "").trim() || "Location to verify",
    source: input.source || (input.url ? "Job URL import" : input.recruiterEmail ? "Recruiter email import" : "Manual paste import"),
    pay: extractPay(text),
    description: text,
    preferredSkills,
    yearsExperience: extractYearsExperience(text),
    employmentType,
    applicationUrl,
    requiredSkills,
    confidence: clamp(35 + (titleLine ? 15 : 0) + (companyLine ? 10 : 0) + (locationLine ? 10 : 0) + requiredSkills.length * 3 + (applicationUrl ? 8 : 0)),
    sourceProvider: detectJobSourceProvider(input.url || input.source || text),
    sourceUrl: input.url || applicationUrl,
    fetchedFromUrl: Boolean(input.url && input.text),
    extractionNotes: [
      "Review extracted fields before adding the job.",
      ...(input.url ? ["URL scraping is not performed in the local MVP; paste page content for best accuracy."] : []),
      ...(requiredSkills.length ? [] : ["Could not identify many required skills from the provided text."])
    ]
  };
}

export function advancedScoreJob(profile: UserProfile, job: JobInput): Omit<JobPosting, "id" | "createdAt" | "status"> {
  const text = normalize(`${job.title} ${job.company} ${job.location} ${job.description}`);
  const requiredSkills = extractRequiredSkills(job.description);
  const preferredSkills = job.preferredSkills?.length ? job.preferredSkills : extractPreferredSkills(job.description);
  const profileSkills = unique([...(profile.skills ?? []), ...(profile.parsedResume?.skills ?? []), ...(profile.parsedResume?.toolsTechnologies ?? [])]);
  const userSkillMatches = profileSkills.filter((skill) => text.includes(normalize(skill)));
  const titleMatches = profile.preferredTitles.filter((title) => text.includes(normalize(title)) || normalize(job.title).includes(normalize(title).split(" ")[0] ?? ""));
  const locationMatch = text.includes(normalize(profile.location)) || text.includes("remote") || text.includes("hybrid");
  const fieldMatch = includesAny(text, ["test engineer", "qa", "quality", "validation", "technician", "automotive", "sdet", "verification"]);
  const missingQualifications = requiredSkills.filter((skill) => !profileSkills.some((profileSkill) => normalize(profileSkill).includes(normalize(skill)) || normalize(skill).includes(normalize(profileSkill)))).slice(0, 8);
  const redFlags = RED_FLAG_KEYWORDS.filter((flag) => text.includes(flag)).map((flag) => `Posting mentions "${flag}"`);
  const growthSignals = GROWTH_KEYWORDS.filter((keyword) => text.includes(keyword)).slice(0, 5);
  if (job.pay && !job.pay.match(/\d/)) redFlags.push("Pay is listed but not specific");

  const years = Number((job.yearsExperience || extractYearsExperience(job.description) || "").match(/\d+/)?.[0] ?? 0);
  const seniorSignals = includesAny(text, ["senior", "lead", "principal", "manager"]);
  const entrySignals = includesAny(text, ["entry", "junior", "technician", "associate", "training"]);

  const breakdown: AdvancedScoreBreakdown = {
    titleAlignment: clamp(35 + titleMatches.length * 25 + (fieldMatch ? 20 : 0)),
    skillOverlap: clamp(25 + userSkillMatches.length * 10 - missingQualifications.length * 4),
    experienceLevelFit: clamp(entrySignals ? 88 : seniorSignals || years > 6 ? 48 : years > 3 ? 68 : 78),
    locationFit: locationMatch ? 94 : 55,
    salaryFit: scoreSalary(profile, job.pay),
    industryFit: fieldMatch ? 88 : 52,
    redFlagRisk: clamp(100 - redFlags.length * 22),
    missingQualifications: clamp(100 - missingQualifications.length * 10),
    careerGrowthPotential: clamp(55 + growthSignals.length * 9 + (entrySignals ? 10 : 0))
  };

  const matchScore = clamp(
    breakdown.titleAlignment * 0.16 +
      breakdown.skillOverlap * 0.22 +
      breakdown.experienceLevelFit * 0.12 +
      breakdown.locationFit * 0.1 +
      breakdown.salaryFit * 0.1 +
      breakdown.industryFit * 0.1 +
      breakdown.redFlagRisk * 0.08 +
      breakdown.missingQualifications * 0.07 +
      breakdown.careerGrowthPotential * 0.05
  );

  const whyMatches = [
    ...titleMatches.map((title) => `Matches your preferred title: ${title}`),
    ...userSkillMatches.slice(0, 5).map((skill) => `Uses your ${skill} experience`),
    ...(locationMatch ? [`Fits your location or remote/hybrid preference near ${profile.location}`] : []),
    ...(fieldMatch ? ["Aligned with test engineering, technician, quality, validation, or automotive testing work"] : []),
    ...(growthSignals.length ? [`Growth signals found: ${growthSignals.join(", ")}`] : [])
  ];

  const scorecard = buildDecisionScorecard(profile, job, matchScore, breakdown, redFlags);

  return {
    ...job,
    pay: job.pay?.trim() || undefined,
    requiredSkills,
    preferredSkills,
    yearsExperience: job.yearsExperience || extractYearsExperience(job.description),
    employmentType: job.employmentType || job.description.match(/full[- ]time|part[- ]time|contract|temporary|internship|direct hire/i)?.[0],
    applicationUrl: job.applicationUrl || extractUrl(job.description),
    matchScore,
    fitLabel: fitLabel(matchScore),
    scoreBreakdown: breakdown,
    missingQualifications,
    growthSignals,
    whyMatches: whyMatches.length ? whyMatches : ["Could be relevant, but more profile/job details would improve matching"],
    redFlags,
    scorecard
  };
}

export function scoreJob(profile: UserProfile, job: JobInput): Omit<JobPosting, "id" | "createdAt" | "status"> {
  return advancedScoreJob(profile, job);
}

export function buildDecisionScorecard(profile: UserProfile, job: JobInput, matchScore: number, breakdown?: AdvancedScoreBreakdown, redFlags: string[] = []): JobDecisionScorecard {
  const resolved = breakdown ?? advancedScoreJob(profile, job).scoreBreakdown!;
  const scores = {
    pay: resolved.salaryFit,
    commute: resolved.locationFit,
    careerGrowth: resolved.careerGrowthPotential,
    workLifeBalance: includesAny(normalize(job.description), ["flexible", "hybrid", "remote", "work-life", "40 hours"]) ? 82 : 62,
    companyConfidence: redFlags.length ? 55 : 78,
    roleFit: matchScore
  };
  const average = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length;
  const finalRecommendation = recommendation(Math.round((average + matchScore) / 2), redFlags);
  return {
    ...scores,
    recommendation: finalRecommendation,
    rationale: [
      `Overall fit is ${matchScore}% (${fitLabel(matchScore).toLowerCase()}).`,
      redFlags.length ? `Review ${redFlags.length} red flag(s) before applying.` : "No obvious red flags found in the posting.",
      scores.pay >= 75 ? "Pay appears aligned with your target range." : "Pay needs more research or may be below target.",
      scores.careerGrowth >= 75 ? "Role includes growth or learning signals." : "Career growth signal is moderate; ask about training and advancement."
    ]
  };
}

export function generateApplication(profile: UserProfile, job: JobPosting): GeneratedApplication {
  const strongestSkills = profile.skills
    .filter((skill) => job.description.toLowerCase().includes(skill.toLowerCase()))
    .slice(0, 6);
  const skillsLine = strongestSkills.length ? strongestSkills.join(", ") : profile.skills.slice(0, 6).join(", ");
  const safeExperience = profile.experience || "Use your verified experience here. Do not add anything you have not actually done.";
  const missing = job.missingQualifications?.length ? job.missingQualifications.join(", ") : "No major missing qualifications detected from the available text.";

  const packet: ApplicationPacket = {
    tailoredResumeSummary: `Test engineering and quality-focused candidate with verified experience in ${skillsLine}. Interested in ${job.title} at ${job.company}, with emphasis on troubleshooting, documentation, validation, and practical product testing.`,
    tailoredSkillsSection: unique([...strongestSkills, ...job.requiredSkills.filter((skill) => profile.skills.some((profileSkill) => normalize(profileSkill).includes(normalize(skill)) || normalize(skill).includes(normalize(profileSkill))))]).map((skill) => `- ${skill}`).join("\n"),
    tailoredBulletSuggestions: [
      `Emphasize verified testing or validation work that connects to ${job.requiredSkills.slice(0, 3).join(", ") || "the role requirements"}.`,
      "Add measurable results only if they are true, such as defects found, tests completed, cycle time reduced, or documentation improved.",
      `Prepare to explain gaps or stretch areas: ${missing}.`,
      "Keep hands-on troubleshooting, documentation, and cross-functional communication near the top."
    ],
    coverLetter: `Hello ${job.company} hiring team,\n\nI am interested in the ${job.title} role in ${job.location}. My background lines up with this opportunity through verified experience with ${skillsLine}. I enjoy work that requires careful testing, clear documentation, practical troubleshooting, and collaboration with engineering or quality teams.\n\nWhat stood out to me about this posting:\n${job.whyMatches.map((reason) => `- ${reason}`).join("\n")}\n\nI would bring a dependable, detail-oriented approach to validating products, finding defects, documenting results, and learning the tools and processes needed to contribute accurately.\n\nThank you for considering my application.\n\n${profile.name}`,
    recruiterMessage: `Hi, I saw the ${job.title} role at ${job.company}. Based on my verified experience with ${skillsLine}, I think it could be a strong fit. I would be glad to share my resume and learn more about the team, requirements, and next steps.`,
    linkedInMessage: `Hi, I am interested in ${job.company}'s ${job.title} role. My background is focused on ${skillsLine}, and I am targeting test engineering, technician, quality, validation, and automotive testing opportunities. Would you be open to a quick conversation?`,
    interviewTalkingPoints: [
      `Why this role: ${job.whyMatches[0] ?? "It aligns with your target testing path."}`,
      `Strengths to emphasize: ${skillsLine}.`,
      `Questions to ask: testing tools, training, defect workflow, team structure, and success metrics for the first 90 days.`,
      `Be ready to discuss missing/stretch areas honestly: ${missing}.`
    ],
    safetyWarnings: [
      "Review every generated line for accuracy before submitting.",
      "Do not claim tools, years of experience, certifications, or accomplishments you do not actually have.",
      "Generated documents are drafts based only on your saved profile and the pasted job description.",
      "This app does not auto-submit applications; you must review and submit manually."
    ]
  };

  const resume = `${profile.name}\n${profile.email} | ${profile.location}\n\nTARGET ROLE\n${job.title} at ${job.company}\n\nSUMMARY\n${packet.tailoredResumeSummary}\n\nTAILORED SKILLS\n${packet.tailoredSkillsSection || profile.skills.map((skill) => `- ${skill}`).join("\n")}\n\nEXPERIENCE HIGHLIGHTS\n${safeExperience}\n\nTAILORED FIT FOR THIS ROLE\n${job.whyMatches.map((reason) => `- ${reason}`).join("\n")}\n\nKEYWORDS FROM POSTING\n${job.requiredSkills.map((skill) => `- ${skill}`).join("\n") || "- Add more job description detail to extract keywords."}`;

  return {
    jobId: job.id,
    resume,
    coverLetter: packet.coverLetter,
    packet,
    checklist: packet.safetyWarnings
  };
}

export function buildAnalytics(jobs: JobPosting[]): AnalyticsData {
  const statuses: ApplicationStatus[] = ["Pending", "Saved", "Applied", "Interview", "Rejected", "Offer"];
  const applicationsByStatus = statuses.reduce((acc, status) => ({ ...acc, [status]: jobs.filter((job) => job.status === status).length }), {} as Record<ApplicationStatus, number>);
  const averageMatchScore = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + job.matchScore, 0) / jobs.length) : 0;
  const responseJobs = jobs.filter((job) => ["Interview", "Offer", "Rejected"].includes(job.status));
  const submittedJobs = jobs.filter((job) => ["Applied", "Interview", "Offer", "Rejected"].includes(job.status));
  const responseRate = submittedJobs.length ? Math.round((responseJobs.length / submittedJobs.length) * 100) : 0;
  const companiesAppliedTo = new Set(submittedJobs.map((job) => job.company)).size;
  const countBy = (values: string[]) => Object.entries(values.reduce((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {} as Record<string, number>)).map(([key, count]) => ({ skill: key, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  const sources = Object.entries(jobs.reduce((acc, job) => ({ ...acc, [job.source]: [...(acc[job.source] ?? []), job.matchScore] }), {} as Record<string, number[]>))
    .map(([source, scores]) => ({ source, count: scores.length, averageMatch: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    applicationsByStatus,
    averageMatchScore,
    responseRate,
    companiesAppliedTo,
    topMatchedSkills: countBy(jobs.flatMap((job) => job.requiredSkills.filter((skill) => job.matchScore >= 70))),
    commonMissingSkills: countBy(jobs.flatMap((job) => job.missingQualifications ?? [])),
    bestJobSources: sources
  };
}

export function detectJobSourceProvider(value = ""): JobSourceProvider {
  const text = normalize(value);
  if (text.includes("greenhouse.io") || text.includes("boards.greenhouse")) return "Greenhouse";
  if (text.includes("lever.co") || text.includes("jobs.lever")) return "Lever";
  if (text.includes("workdayjobs") || text.includes("myworkdayjobs") || text.includes("workday")) return "Workday";
  if (text.includes("recruiter") || text.includes("reply to") || text.includes("email")) return "Recruiter email";
  if (text.includes("careers") || text.includes("jobs")) return "Company careers page";
  if (text.startsWith("http")) return "Generic job URL";
  return "Manual paste";
}

export function htmlToJobText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const RESOURCE_LIBRARY: Record<string, { title: string; type: "YouTube" | "Course" | "Certification" | "Documentation"; url: string; why: string }[]> = {
  can: [
    { title: "CSS Electronics CAN Bus Explained", type: "Documentation", url: "https://www.csselectronics.com/pages/can-bus-simple-intro-tutorial", why: "Clear fundamentals for automotive networks." },
    { title: "Vector CAN basics", type: "Course", url: "https://www.vector.com/", why: "Industry-standard tooling context for CAN work." }
  ],
  lin: [{ title: "LIN bus overview", type: "Documentation", url: "https://www.csselectronics.com/pages/lin-bus-protocol-intro-basics", why: "Useful companion skill for automotive validation roles." }],
  ppap: [{ title: "AIAG PPAP overview", type: "Certification", url: "https://www.aiag.org/quality/automotive-core-tools/ppap", why: "Recognized automotive quality process knowledge." }],
  python: [{ title: "Python for Everybody", type: "Course", url: "https://www.py4e.com/", why: "Practical beginner path for automation and data analysis." }],
  selenium: [{ title: "Selenium documentation", type: "Documentation", url: "https://www.selenium.dev/documentation/", why: "Core web automation reference." }],
  jira: [{ title: "Atlassian Jira fundamentals", type: "Course", url: "https://university.atlassian.com/student/catalog", why: "Helps document and triage defects professionally." }],
  minitab: [{ title: "Minitab training", type: "Course", url: "https://www.minitab.com/en-us/training/", why: "Common quality and process analysis tool." }],
  iso: [{ title: "ISO 9001 overview", type: "Documentation", url: "https://www.iso.org/iso-9001-quality-management.html", why: "Quality-system vocabulary for QA roles." }]
};

function resourcesForSkill(skill: string) {
  const key = Object.keys(RESOURCE_LIBRARY).find((candidate) => normalize(skill).includes(candidate));
  return RESOURCE_LIBRARY[key ?? ""] ?? [
    { title: `Search: ${skill} fundamentals`, type: "YouTube" as const, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " fundamentals")}`, why: "Fast way to learn vocabulary before deeper study." },
    { title: `Coursera: ${skill}`, type: "Course" as const, url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`, why: "Structured course options if this skill appears in multiple target roles." }
  ];
}

export function buildMissingSkillsMarketplace(profile: UserProfile, job: JobPosting): MissingSkillsMarketplace {
  const missing = (job.missingQualifications?.length ? job.missingQualifications : job.requiredSkills.filter((skill) => !profile.skills.some((profileSkill) => normalize(profileSkill).includes(normalize(skill))))).slice(0, 5);
  const plans = missing.map((skill, index) => ({
    skill,
    currentImpact: Math.max(8, 22 - index * 3),
    projectedScoreLift: Math.max(3, 9 - index),
    explanation: `Learning ${skill} could improve confidence for ${job.title} because it appears in the job requirements but is not clearly present in the saved profile.`,
    resources: resourcesForSkill(skill)
  }));
  const projectedScore = clamp(job.matchScore + plans.reduce((sum, plan) => sum + plan.projectedScoreLift, 0));
  return { jobId: job.id, currentScore: job.matchScore, projectedScore, plans };
}

export function buildCareerCoachReport(profile: UserProfile, jobs: JobPosting[]): CareerCoachReport {
  const applied = jobs.filter((job) => ["Applied", "Interview", "Offer", "Rejected"].includes(job.status));
  const interviews = jobs.filter((job) => ["Interview", "Offer"].includes(job.status));
  const missingCounts = Object.entries(jobs.flatMap((job) => job.missingQualifications ?? []).reduce((acc, skill) => ({ ...acc, [skill]: (acc[skill] ?? 0) + 1 }), {} as Record<string, number>))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const avgMatch = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + job.matchScore, 0) / jobs.length) : 0;
  return {
    interviewDiagnosis: [
      applied.length === 0 ? "No applications have been marked applied yet, so response data is not available." : `You have ${applied.length} submitted applications and ${interviews.length} interview/offer outcomes.`,
      interviews.length === 0 && applied.length > 0 ? "If applications are not producing interviews, focus on stronger title alignment, measurable resume bullets, and applying to roles above 75% match first." : "Prioritize roles where your match score and missing qualification count are strongest.",
      `Your average match score is ${avgMatch}%. Build a weekly habit around improving the top recurring missing skills.`
    ],
    missingSkills: missingCounts.map(([skill, count], index) => ({ skill, importance: index < 2 ? "High" : index < 4 ? "Medium" : "Low", reason: `Missing from ${count} matching role(s).` })),
    careerGapAnalysis: [
      profile.experience.length < 120 ? "Experience summary is short. Add 3-5 concrete bullets with tools, testing methods, and outcomes." : "Experience summary has enough detail for the MVP, but measurable outcomes would still strengthen it.",
      profile.skills.length < 10 ? "Skill list is light for competitive testing roles. Add only tools/processes you can honestly discuss." : "Skill list is healthy; keep it tuned toward target job descriptions.",
      profile.parsedResume?.certifications?.length ? "Certifications are visible in the parsed resume." : "Consider adding relevant certifications or courses if you truly completed them."
    ],
    salaryRecommendations: [
      `Current target range is $${profile.desiredPayMin}-$${profile.desiredPayMax}/hr. Compare this against jobs above 80% match before lowering expectations.`,
      "For technician/validation roles, ask whether overtime, shift differential, contract benefits, and training are included.",
      "Track actual posted pay by source to calibrate your target range over time."
    ],
    resumeImprovements: profile.profileSuggestions ?? parseResumeText(profile.resume || profile.experience).suggestions,
    interviewPrepFocus: [
      "Prepare one STAR story about finding or documenting a defect.",
      "Prepare one troubleshooting story involving unclear symptoms and a structured test plan.",
      "Prepare a concise explanation of your target path into test engineering or validation.",
      missingCounts[0] ? `Study fundamentals for ${missingCounts[0][0]} before interviews.` : "Review the required skills for each role before interviews."
    ]
  };
}

export function buildInterviewSimulator(profile: UserProfile, job: JobPosting): InterviewSimulator {
  const skills = job.requiredSkills.slice(0, 4);
  return {
    jobId: job.id,
    title: `Practice interview for ${job.company} ${job.title}`,
    intro: "This mock interview is based on the saved job description, your profile, and the role's missing qualifications. Keep answers truthful and specific.",
    questions: [
      { category: "Role-specific", question: `Why are you interested in the ${job.title} role at ${job.company}?`, whyAsked: "Hiring teams want motivation and role clarity.", starSuggestion: "Connect the company/role to verified testing, technician, quality, or validation experience." },
      { category: "Technical", question: `Walk me through how you would validate a defect involving ${skills[0] ?? "a test case"}.`, whyAsked: "Tests structured troubleshooting and validation thinking.", starSuggestion: "Situation: defect context. Task: what needed validation. Action: test steps/tools. Result: documented outcome." },
      { category: "Technical", question: "Which tools from this role have you used, and where would you need ramp-up time?", whyAsked: "Checks honesty and tool readiness.", starSuggestion: "Be direct about verified tools; name one ramp-up plan for a missing skill." },
      { category: "Behavioral", question: "Tell me about a time you found a problem others missed.", whyAsked: "Evaluates attention to detail and communication.", starSuggestion: "Use STAR with the defect, evidence, who you told, and what changed." },
      { category: "Behavioral", question: "How do you document testing so engineers can act on the results?", whyAsked: "Documentation quality is critical for QA/test roles.", starSuggestion: "Mention reproduction steps, expected vs actual, environment, evidence, severity, and follow-up." },
      { category: "Role-specific", question: `This job may require ${job.missingQualifications?.slice(0, 2).join(" and ") || "new tools"}. How would you close that gap?`, whyAsked: "Assesses coachability and learning plan.", starSuggestion: "State what you know, how you would learn, and how quickly you would apply it safely." }
    ],
    closingAdvice: [
      "Do not invent hands-on experience. Explain adjacent experience and your learning plan.",
      "Bring 2-3 questions about tools, training, defect workflow, and first-90-day expectations.",
      `Re-read the posting and prepare examples around: ${skills.join(", ") || "testing, documentation, and troubleshooting"}.`
    ]
  };
}
