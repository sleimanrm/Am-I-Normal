import type { Trait, TraitScores, ProfileTrait, Answer } from "../types";

// ── Constants ────────────────────────────────────────────────────────────────

export const ALL_TRAITS: Trait[] = [
  "Overthinker",
  "Animal Lover",
  "Pattern Seeker",
  "Sentimental",
  "Introvert",
  "Observer",
  "Creative Thinker",
  "Comfort Seeker",
];

export const CATEGORY_EMOJI: Record<Category, string> = {
  Overthinking: "🧠",
  Pets: "🐶",
  Food: "🍔",
  Sleep: "😴",
  Technology: "📱",
  Social: "👥",
  Body: "🫀",
  Habits: "🔁",
};

export const TRAIT_EMOJI: Record<Trait, string> = {
  "Overthinker": "🧠",
  "Animal Lover": "🐾",
  "Pattern Seeker": "🔢",
  "Sentimental": "💛",
  "Introvert": "🌙",
  "Observer": "👁️",
  "Creative Thinker": "✨",
  "Comfort Seeker": "☕",
};

export const TRAIT_DESCRIPTION: Record<Trait, string> = {
  "Overthinker": "Your mind never truly clocks out.",
  "Animal Lover": "You speak fluent animal.",
  "Pattern Seeker": "You find order in everything.",
  "Sentimental": "You feel things deeply and remember everything.",
  "Introvert": "You recharge in your own company.",
  "Observer": "You notice what others walk past.",
  "Creative Thinker": "Your imagination is always running.",
  "Comfort Seeker": "You know exactly what feels right.",
};

export const TRAIT_COLOR: Record<Trait, string> = {
  "Overthinker": "from-violet-500 to-purple-600",
  "Animal Lover": "from-amber-400 to-orange-500",
  "Pattern Seeker": "from-cyan-500 to-blue-600",
  "Sentimental": "from-rose-400 to-pink-600",
  "Introvert": "from-indigo-500 to-violet-600",
  "Observer": "from-emerald-500 to-teal-600",
  "Creative Thinker": "from-fuchsia-500 to-purple-600",
  "Comfort Seeker": "from-yellow-500 to-amber-600",
};

export const PROFILE_HEADLINE: Record<Trait, string> = {
  "Overthinker": "Your mind is always a few steps ahead.",
  "Animal Lover": "You love deeply — especially the ones who can't say it back.",
  "Pattern Seeker": "You bring order to the chaos around you.",
  "Sentimental": "You carry the moments others forget.",
  "Introvert": "Your inner world is richer than most people know.",
  "Observer": "You notice everything. Absolutely everything.",
  "Creative Thinker": "Your imagination runs the show.",
  "Comfort Seeker": "You know what feels right, and you go for it.",
};

// ── Score helpers ────────────────────────────────────────────────────────────

export function emptyScores(): TraitScores {
  return Object.fromEntries(ALL_TRAITS.map((t) => [t, 0])) as TraitScores;
}

/**
 * Add the trait weights from a single habit into a scores object.
 * Returns a new object (immutable update).
 */
export function addTraitPoints(
  scores: TraitScores,
  traits: Partial<Record<Trait, number>>,
): TraitScores {
  const updated = { ...scores };
  for (const [trait, pts] of Object.entries(traits) as [Trait, number][]) {
    updated[trait] = (updated[trait] ?? 0) + pts;
  }
  return updated;
}

// ── Profile calculation ──────────────────────────────────────────────────────

/**
 * Compute what percentage of possible points the user earned per trait,
 * sorted descending. Only traits that appeared in shown habits are included.
 */
export function calculateProfile(
  scores: TraitScores,
  maxScores: TraitScores,
  topN = 5,
): ProfileTrait[] {
  return ALL_TRAITS.map((trait) => ({
    trait,
    pct:
      maxScores[trait] > 0
        ? Math.min(Math.round((scores[trait] / maxScores[trait]) * 100), 100)
        : 0,
  }))
    .filter((t) => maxScores[t.trait] > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, topN);
}

// ── Result messages ──────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Returns a context-aware feedback message based on the habit's meTooPct
 * and whether the user agreed or disagreed with the majority.
 */
export function getResultMessage(pct: number, answer: Answer): string {
  const agreedWithMajority =
    (answer === "me-too" && pct > 50) || (answer === "not-me" && pct <= 50);
  const isSplit = pct >= 40 && pct <= 60;

  if (isSplit) {
    return pick([
      "This one is surprisingly split.",
      "The world is divided on this one.",
      "Almost exactly half and half.",
      "No clear winner here.",
    ]);
  }

  if (pct >= 80) {
    return agreedWithMajority
      ? "Almost everyone does this. You're in great company."
      : "Almost everyone does this — but not you. You're rare.";
  }

  if (pct >= 60) {
    return agreedWithMajority
      ? pick(["You're in the majority.", "Most people are with you on this.", "You're not alone."])
      : pick(["You're more unique than most.", "You stand out on this one.", "Not many would say the same."]);
  }

  if (pct <= 20) {
    return agreedWithMajority
      ? "Hardly anyone does this — but you do. Own it."
      : "Almost no one does this. You're totally normal.";
  }

  // 20–40 %
  return agreedWithMajority
    ? pick(["You're with the minority — the interesting crowd.", "Fewer people than you'd think agree."])
    : pick(["You're in the majority here.", "Most people are on your side."]);
}

// ── Utilities ────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fakeRespondents(): number {
  return Math.floor(Math.random() * 99_000) + 1_000;
}

export function formatRespondents(n: number): string {
  return n.toLocaleString();
}
