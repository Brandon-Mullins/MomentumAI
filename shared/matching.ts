import type { JobInput, JobPosting, UserProfile } from "./types";

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
  "ppap"
];

const RED_FLAG_KEYWORDS = [
  "unpaid",
  "commission only",
  "1099",
  "must have active clearance",
  "senior only",
  "10+ years",
  "relocation required",
  "no benefits"
];

const normalize = (value: string) => value.toLowerCase();

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(normalize(term)));

export function extractRequiredSkills(description: string): string[] {
  const text = normalize(description);
  return SKILL_KEYWORDS.filter((keyword) => text.includes(keyword)).slice(0, 10);
}

export function scoreJob(profile: UserProfile, job: JobInput): Omit<JobPosting, "id" | "createdAt" | "status"> {
  const text = normalize(`${job.title} ${job.company} ${job.location} ${job.description}`);
  const requiredSkills = extractRequiredSkills(job.description);
  const userSkillMatches = profile.skills.filter((skill) => text.includes(normalize(skill)));
  const titleMatches = profile.preferredTitles.filter((title) => text.includes(normalize(title)));
  const locationMatch =
    text.includes(normalize(profile.location)) ||
    text.includes("remote") ||
    text.includes("hybrid");
  const fieldMatch = includesAny(text, [
    "test engineer",
    "qa",
    "quality",
    "validation",
    "technician",
    "automotive",
    "sdet",
    "verification"
  ]);

  let matchScore = 35;
  matchScore += Math.min(userSkillMatches.length * 8, 32);
  matchScore += Math.min(titleMatches.length * 12, 24);
  matchScore += locationMatch ? 9 : 0;
  matchScore += fieldMatch ? 10 : 0;
  matchScore = Math.min(matchScore, 98);

  const whyMatches = [
    ...titleMatches.map((title) => `Matches your preferred title: ${title}`),
    ...userSkillMatches.slice(0, 4).map((skill) => `Uses your ${skill} experience`),
    ...(locationMatch ? [`Fits your location or remote/hybrid preference near ${profile.location}`] : []),
    ...(fieldMatch ? ["Aligned with test engineering, technician, quality, validation, or automotive testing work"] : [])
  ];

  const redFlags = RED_FLAG_KEYWORDS.filter((flag) => text.includes(flag)).map(
    (flag) => `Posting mentions "${flag}"`
  );

  if (job.pay && !job.pay.match(/\d/)) {
    redFlags.push("Pay is listed but not specific");
  }

  return {
    ...job,
    pay: job.pay?.trim() || undefined,
    requiredSkills,
    matchScore,
    whyMatches: whyMatches.length ? whyMatches : ["Could be relevant, but more profile/job details would improve matching"],
    redFlags
  };
}

export function generateApplication(profile: UserProfile, job: JobPosting) {
  const strongestSkills = profile.skills
    .filter((skill) => job.description.toLowerCase().includes(skill.toLowerCase()))
    .slice(0, 5);
  const skillsLine = strongestSkills.length ? strongestSkills.join(", ") : profile.skills.slice(0, 5).join(", ");

  const resume = `${profile.name}
${profile.email} | ${profile.location}

TARGET ROLE
${job.title} at ${job.company}

SUMMARY
Test engineering and quality-focused candidate with hands-on experience across ${skillsLine}. Interested in roles that combine structured troubleshooting, validation, documentation, and practical product testing.

RELEVANT SKILLS
${profile.skills.map((skill) => `- ${skill}`).join("\n")}

EXPERIENCE HIGHLIGHTS
${profile.experience}

TAILORED FIT FOR THIS ROLE
${job.whyMatches.map((reason) => `- ${reason}`).join("\n")}

KEYWORDS FROM POSTING
${job.requiredSkills.map((skill) => `- ${skill}`).join("\n") || "- Add more job description detail to extract keywords."}`;

  const coverLetter = `Hello ${job.company} hiring team,

I am interested in the ${job.title} role in ${job.location}. My background lines up well with this position because I have experience with ${skillsLine}, and I enjoy work that requires careful testing, clear documentation, and practical troubleshooting.

What stood out to me about this posting:
${job.whyMatches.map((reason) => `- ${reason}`).join("\n")}

I would bring a dependable, detail-oriented approach to validating products, finding defects, documenting results, and working with engineers or technicians to solve problems. I am especially interested in opportunities where I can grow further into test engineering, quality, validation, or automotive testing.

Thank you for considering my application.

${profile.name}`;

  return {
    jobId: job.id,
    resume,
    coverLetter,
    checklist: [
      "Review every generated line for accuracy before submitting.",
      "Confirm the job source and company website are legitimate.",
      "Adjust the resume bullets to match your real experience only.",
      "Submit only after you approve the final resume and cover letter."
    ]
  };
}
