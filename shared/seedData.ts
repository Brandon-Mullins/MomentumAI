import type { JobInput, UserProfile } from "./types";

export const defaultProfile: UserProfile = {
  name: "Brandon Candidate",
  email: "brandon@example.com",
  location: "Detroit, MI",
  commuteMiles: 35,
  desiredPayMin: 26,
  desiredPayMax: 45,
  preferredTitles: [
    "Test Engineer",
    "Engineering Technician",
    "Validation Technician",
    "Quality Technician",
    "Automotive Test Technician"
  ],
  skills: [
    "manual testing",
    "test cases",
    "troubleshooting",
    "validation",
    "automotive",
    "root cause",
    "Jira",
    "Python",
    "inspection",
    "diagnostics"
  ],
  experience:
    "Hands-on testing and troubleshooting experience, comfortable documenting issues, following procedures, working with engineers, and learning tools used in validation and quality environments.",
  resume:
    "Paste your current resume here. The generator will reuse your real experience and tailor language for each role.",
  coverLetterStyle: "Warm and confident"
};

export const seedJobs: JobInput[] = [
  {
    title: "Automotive Validation Technician",
    company: "Vector Mobility Labs",
    location: "Dearborn, MI",
    source: "Company careers page",
    pay: "$28-$36/hr",
    description:
      "Support automotive validation testing for electrical systems. Build test plans, run diagnostics, document defects in Jira, perform root cause troubleshooting, and work with test engineers on CAN/LIN communication issues."
  },
  {
    title: "Quality Assurance Test Analyst",
    company: "Northstar Software",
    location: "Remote",
    source: "Indeed",
    pay: "$70,000-$86,000",
    description:
      "Create test cases, execute manual testing, validate bug fixes, write clear QA reports, and collaborate with product and engineering teams. Python or Selenium exposure is helpful but not required."
  },
  {
    title: "Senior Manufacturing Quality Manager",
    company: "Peak Industrial",
    location: "Toledo, OH",
    source: "Recruiter email",
    pay: "Competitive",
    description:
      "Senior only role requiring 10+ years of management experience, ISO audits, PPAP ownership, relocation required, and ownership of plant-wide quality strategy."
  }
];
