import type { Submission, SubmissionStatus, Habit } from "../types";

const STORAGE_KEY = "ain_submissions";

// ── Persistence ───────────────────────────────────────────────────────────────

export function getSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Submission[]) : [];
  } catch {
    return [];
  }
}

function saveSubmissions(submissions: Submission[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function addSubmission(question: string): Submission {
  const submission: Submission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    question: question.trim(),
    submittedAt: Date.now(),
    status: "pending",
    meTooPct: Math.floor(Math.random() * 41) + 30, // 30–70 %, assigned at submit time
  };
  const all = getSubmissions();
  saveSubmissions([...all, submission]);
  return submission;
}

export function updateSubmissionStatus(id: string, status: SubmissionStatus): void {
  const all = getSubmissions();
  saveSubmissions(all.map((s) => (s.id === id ? { ...s, status } : s)));
}

// ── Feed integration ──────────────────────────────────────────────────────────

/**
 * Returns approved community submissions as Habit objects so they can be
 * merged into the main swipe feed. IDs start at 100_000 to avoid collisions.
 */
export function getApprovedAsHabits(): Habit[] {
  return getSubmissions()
    .filter((s) => s.status === "approved")
    .map((s, i) => ({
      id: 100_000 + i,
      question: s.question,
      category: "Community" as const,
      meTooPct: s.meTooPct,
      traits: {},
    }));
}
