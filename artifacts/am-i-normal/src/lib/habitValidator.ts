export type LiveCheck = { label: string; pass: boolean };
export type ValidationResult = { ok: true } | { ok: false; error: string };

// ── Word lists ─────────────────────────────────────────────────────────────────

const DRUG_WORDS = [
  "cocaine", "heroin", "meth", "methamphetamine", "marijuana", "cannabis",
  "mdma", "ecstasy", "lsd", "acid trip", "fentanyl", "crack", "opioid",
  "xanax", "oxy", "oxycodone", "ketamine", "shrooms", "psilocybin",
  "drug", "drugs", "weed", "dope", "stoned", "high on",
];

const SEXUAL_WORDS = [
  "porn", "pornography", "masturbat", "intercourse", "orgasm",
  "sex tape", "nude", "naked body", "erotic",
];

const VIOLENT_WORDS = [
  "suicide", "suicidal", "self-harm", "self harm", "kill myself",
  "rape", "sexually assault",
];

const PROFANITY = [
  "fuck", "shit", "cunt", "faggot", "nigger", "nigga", "bitch ass",
];

// Generic patterns: "I eat food", "I drink water", "I like pizza" etc.
// Must be a short sentence with just "I <verb> <simple object>"
const GENERIC_RE = /^i (eat|drink|like|love|hate|watch|listen to|play|enjoy|do|use|have|make|buy|wear|read|cook|sleep|wake|walk|run|go|come|take|get|see|feel|think|know|want|need|try)\s+\w{1,20}[.!?]?$/i;

// ── Checks ─────────────────────────────────────────────────────────────────────

function containsWord(text: string, words: string[]): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return words.some((w) => lower.includes(` ${w} `) || lower.includes(` ${w}.`) || lower.includes(` ${w},`));
}

function isGibberish(text: string): boolean {
  // Repeated character run: "aaaaaaa", "hahahahaha"
  if (/(.)\1{4,}/.test(text)) return true;
  // Words longer than 4 chars with no vowels
  const words = text.split(/\s+/);
  if (words.some((w) => w.length > 4 && !/[aeiouáéíóú]/i.test(w))) return true;
  // Very low vowel density across the whole string
  const letters = (text.match(/[a-z]/gi) || []).length;
  if (letters < 4) return false; // too short to judge
  const vowels = (text.match(/[aeiou]/gi) || []).length;
  if (letters > 8 && vowels / letters < 0.06) return true;
  return false;
}

function isTooGeneric(text: string): boolean {
  return GENERIC_RE.test(text.trim());
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function validateHabit(text: string): ValidationResult {
  const t = text.trim();

  if (t.length < 15) {
    return { ok: false, error: "A bit too short — describe the behavior in a little more detail (at least 15 characters)." };
  }

  if (isGibberish(t)) {
    return { ok: false, error: "That doesn't look like a real sentence. Try describing something you actually do." };
  }

  if (containsWord(t, PROFANITY)) {
    return { ok: false, error: "Please keep it clean — no profanity." };
  }

  if (containsWord(t, DRUG_WORDS)) {
    return { ok: false, error: "Drug-related content isn't allowed. Habits should be everyday behaviours." };
  }

  if (containsWord(t, SEXUAL_WORDS)) {
    return { ok: false, error: "Sexual content isn't allowed here." };
  }

  if (containsWord(t, VIOLENT_WORDS)) {
    return { ok: false, error: "That kind of content isn't allowed. Habits should be everyday behaviours." };
  }

  if (isTooGeneric(t)) {
    return { ok: false, error: "Too generic — make it specific. What exactly do you do, and how?" };
  }

  return { ok: true };
}

export function getLiveChecks(text: string): LiveCheck[] {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  return [
    { label: "15+ characters", pass: t.length >= 15 },
    { label: "Specific behavior", pass: words.length >= 4 && !isTooGeneric(t) },
    { label: "Complete sentence", pass: words.length >= 3 && /\s/.test(t) },
  ];
}
