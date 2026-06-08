export type LiveCheck = { label: string; pass: boolean };
export type ValidationResult = { ok: true } | { ok: false; error: string };

const GUIDELINES_ERROR =
  "This habit doesn't fit our community guidelines. Try sharing an unusual everyday behavior instead.";

// ─────────────────────────────────────────────────────────────────────────────
// TEXT NORMALISATION
// Collapses common obfuscation before pattern matching:
//   leet speak  →  letters      ("5ex" → "sex", "pr0n" → "pron")
//   separators  →  removed      ("f.u.c.k" → "fuck", "s*x" → "sx")
//   spaced chars →  collapsed   ("s e x" → "sex")
// ─────────────────────────────────────────────────────────────────────────────

function normalise(raw: string): string {
  let s = raw.toLowerCase();

  // Leet substitutions — digits/symbols → letters
  s = s
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1|!]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g")
    .replace(/\+/g, "t");

  // Collapse non-alpha separators sitting between two letters: "f.u.c.k" → "fuck"
  for (let i = 0; i < 5; i++) {
    s = s.replace(/([a-z])[^a-z0-9\s]{1,3}([a-z])/g, "$1$2");
  }

  // Collapse spaced single-char sequences (≥3 consecutive): "s e x" → "sex"
  for (let i = 0; i < 6; i++) {
    s = s.replace(/(?<![a-z])([a-z]) ([a-z]) ([a-z]) ([a-z])(?![a-z])/g, "$1$2$3$4");
    s = s.replace(/(?<![a-z])([a-z]) ([a-z]) ([a-z])(?![a-z])/g, "$1$2$3");
  }

  // Strip residual punctuation, normalise whitespace
  s = s.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN BUILDER
// Words get \b prefix (prevents matching inside longer words like "brass").
// Stems (like "ejaculat") get \b prefix only — no trailing \b — so they match
//   "ejaculate", "ejaculating", "ejaculation" etc.
// Phrases (containing spaces) are matched as-is.
// ─────────────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pattern(...terms: string[]): RegExp {
  const parts = terms.map((t) => {
    if (t.includes(" ")) return esc(t); // phrase
    if (t.endsWith("*")) return `\\b${esc(t.slice(0, -1))}`; // stem (prefix only)
    return `\\b${esc(t)}\\b`; // full word
  });
  return new RegExp(parts.join("|"), "i");
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/** Sexual content, pornography, prostitution */
const SEXUAL = pattern(
  // Acts & concepts
  "sex", "sexual", "sexually", "sexting", "sexy", "intercourse",
  "blowjob", "blow job", "handjob", "hand job", "rimjob", "rim job",
  "cunnilingus", "fellatio", "fingering", "fisting",
  "gangbang", "gang bang", "threesome", "foursome", "orgy",
  "anal sex", "oral sex",
  // Explicit anatomy
  "penis", "vagina", "vaginal", "vulva", "clitoris",
  "testicl*", "scrotum",
  "erection", "boner", "hardon", "hard on",
  // High-confidence slang
  "pussy", "cunt", "cock", "dick",
  "tits", "titties", "boobs", "boob",
  // Ejaculation / fluids
  "ejaculat*", "orgasm*", "cumshot", "cum shot", "facial", "jizz", "semen",
  // Self-pleasure
  "masturbat*", "jerk off", "jerking off", "jack off", "jacking off",
  // Arousal
  "horny", "aroused",
  // Porn industry
  "porn", "pornography", "porno", "xxx", "onlyfans", "only fans",
  "camgirl", "cam girl", "camboy", "cam boy",
  "adult film", "sex tape", "nude", "nudes",
  // Prostitution / trafficking
  "prostitut*", "hooker", "whore",
  "escort service", "sex worker", "sex work",
  "pimp", "brothel", "strip club", "stripper",
  "sex trafficking", "human trafficking",
);

/** Drug promotion and glorification */
const DRUGS = pattern(
  // Unambiguous hard drug names
  "cocaine", "heroin", "methamphetamine", "crystal meth",
  "fentanyl", "oxycodone", "oxycontin", "hydrocodone", "percocet",
  "mdma", "ecstasy", "molly", "lsd", "psilocybin", "ketamine",
  "crack cocaine", "crack rock",
  // Explicit actions with drugs
  "snort cocaine", "shoot heroin", "inject heroin", "inject drugs",
  "buy drugs", "sell drugs", "deal drugs", "drug dealer",
  // Promotional phrases
  "drugs are", "doing drugs", "do drugs", "taking drugs",
  "on meth", "smoked meth", "snorted coke", "rolled on mdma",
  "getting high on drugs",
  // Slang with context
  "shooting up", "shoot up drugs",
);

/** Self-harm and suicide */
const SELF_HARM = pattern(
  "suicide", "suicidal",
  "kill myself", "killing myself",
  "end my life", "take my own life",
  "want to die", "wish i was dead",
  "self harm", "selfharm", "self harming",
  "cutting myself", "cut myself",
  "hurt myself", "harm myself",
  "overdose on",
);

/** Violence and threats */
const VIOLENCE = pattern(
  "rape", "rapist", "sexual assault",
  "molest*",
  "murder someone", "want to kill", "going to kill",
  "stab someone", "shoot someone",
  "make a bomb", "build a bomb", "make explosives",
  "torture someone", "beat someone up",
  "domestic violence", "child abuse",
);

/** Hate speech — slurs and incitement */
const HATE = pattern(
  // Racial/ethnic slurs
  "nigger", "nigga", "chink", "spic", "kike",
  "wetback", "towelhead", "raghead",
  // Homophobic/transphobic slurs
  "faggot", "fagot", "tranny",
  // Incitement
  "death to all", "should be exterminated", "kill all",
  "i hate all",
);

/** Harassment and stalking */
const HARASSMENT = pattern(
  "i stalk", "stalking people", "stalking someone",
  "follow people home", "spy on my neighbor",
  "i hack into", "i phish", "i scam people",
  "blackmail", "i threaten people",
);

/** Child exploitation */
const CSAM = pattern(
  "child pornography", "child porn",
  "sex with a minor", "sex with a child",
  "child sexual",
);

/** Profanity (strong language as tone signal) */
const PROFANITY = pattern(
  "fuck", "shit",
  "motherfucker", "motherfucking",
  "asshole", "bastard",
);

const CONTENT_RULES: RegExp[] = [
  SEXUAL, DRUGS, SELF_HARM, VIOLENCE, HATE, HARASSMENT, CSAM, PROFANITY,
];

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY CHECKS  (not moderation — these gate for specificity)
// ─────────────────────────────────────────────────────────────────────────────

// Overly generic: "I eat food", "I like pizza", "I drink water"
const GENERIC_RE =
  /^i (eat|drink|like|love|hate|watch|listen to|play|enjoy|do|use|have|make|buy|wear|read|cook|sleep|wake|walk|run|go|come|take|get|see|feel|think|know|want|need|try)\s+\w{1,20}[.!?]?$/i;

function isGibberish(text: string): boolean {
  if (/(.)\1{4,}/.test(text)) return true;
  const words = text.split(/\s+/);
  if (words.some((w) => w.length > 4 && !/[aeiou]/i.test(w))) return true;
  const letters = (text.match(/[a-z]/gi) ?? []).length;
  if (letters < 4) return false;
  const vowels = (text.match(/[aeiou]/gi) ?? []).length;
  return letters > 8 && vowels / letters < 0.06;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

function isContentViolation(text: string): boolean {
  const plain = text.toLowerCase();
  const norm = normalise(text);
  return CONTENT_RULES.some((re) => re.test(plain) || re.test(norm));
}

export function validateHabit(text: string): ValidationResult {
  const t = text.trim();

  if (t.length < 15) {
    return {
      ok: false,
      error: "A bit too short — describe the behavior in a little more detail (at least 15 characters).",
    };
  }

  if (isGibberish(t)) {
    return {
      ok: false,
      error: "That doesn't look like a real sentence. Try describing something you actually do.",
    };
  }

  if (isContentViolation(t)) {
    return { ok: false, error: GUIDELINES_ERROR };
  }

  if (GENERIC_RE.test(t)) {
    return {
      ok: false,
      error: "Too generic — make it specific. What exactly do you do, and how?",
    };
  }

  return { ok: true };
}

export function getLiveChecks(text: string): LiveCheck[] {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  return [
    { label: "15+ characters", pass: t.length >= 15 },
    { label: "Specific behavior", pass: words.length >= 4 && !GENERIC_RE.test(t) },
    { label: "Complete sentence", pass: words.length >= 3 && /\s/.test(t) },
  ];
}
