import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Check, X, ArrowRight, Sparkles, Flame, Brain } from "lucide-react";

// --- TYPES ---
type Category = "Overthinking" | "Pets" | "Food" | "Sleep" | "Technology" | "Social" | "Body" | "Habits";
type Answer = "me-too" | "not-me";
type Trait =
  | "Overthinker"
  | "Animal Lover"
  | "Pattern Seeker"
  | "Sentimental"
  | "Introvert"
  | "Observer"
  | "Creative Thinker"
  | "Comfort Seeker";

interface Habit {
  question: string;
  meTooPct: number;
  category: Category;
  respondents: number;
  traits: Partial<Record<Trait, number>>;
}

// --- CONSTANTS ---
const PROFILE_UNLOCK_AT = 20;

const CATEGORY_EMOJI: Record<Category, string> = {
  Overthinking: "🧠", Pets: "🐶", Food: "🍔", Sleep: "😴",
  Technology: "📱", Social: "👥", Body: "🫀", Habits: "🔁",
};

const TRAIT_EMOJI: Record<Trait, string> = {
  "Overthinker": "🧠",
  "Animal Lover": "🐾",
  "Pattern Seeker": "🔢",
  "Sentimental": "💛",
  "Introvert": "🌙",
  "Observer": "👁️",
  "Creative Thinker": "✨",
  "Comfort Seeker": "☕",
};

const TRAIT_DESCRIPTION: Record<Trait, string> = {
  "Overthinker": "Your mind never truly clocks out.",
  "Animal Lover": "You speak fluent animal.",
  "Pattern Seeker": "You find order in everything.",
  "Sentimental": "You feel things deeply and remember everything.",
  "Introvert": "You recharge in your own company.",
  "Observer": "You notice what others walk past.",
  "Creative Thinker": "Your imagination is always running.",
  "Comfort Seeker": "You know exactly what feels right.",
};

const TRAIT_COLOR: Record<Trait, string> = {
  "Overthinker": "from-violet-500 to-purple-600",
  "Animal Lover": "from-amber-400 to-orange-500",
  "Pattern Seeker": "from-cyan-500 to-blue-600",
  "Sentimental": "from-rose-400 to-pink-600",
  "Introvert": "from-indigo-500 to-violet-600",
  "Observer": "from-emerald-500 to-teal-600",
  "Creative Thinker": "from-fuchsia-500 to-purple-600",
  "Comfort Seeker": "from-yellow-500 to-amber-600",
};

// --- HABIT DATA ---
function fakeRespondents(): number {
  return Math.floor(Math.random() * 99000) + 1000;
}

const RAW_HABITS: Omit<Habit, "respondents">[] = [
  // Overthinking
  { question: "Do you rehearse conversations in your head before they happen?", meTooPct: 72, category: "Overthinking", traits: { "Overthinker": 3, "Creative Thinker": 1 } },
  { question: "Do you replay embarrassing moments from years ago?", meTooPct: 68, category: "Overthinking", traits: { "Overthinker": 3, "Sentimental": 2 } },
  { question: "Do you mentally argue with people who aren't there?", meTooPct: 61, category: "Overthinking", traits: { "Overthinker": 2, "Creative Thinker": 1 } },
  { question: "Do you plan what you'll say in a meeting but then forget it all?", meTooPct: 55, category: "Overthinking", traits: { "Overthinker": 2, "Pattern Seeker": 1 } },
  { question: "Do you catastrophize small mistakes into career-ending disasters?", meTooPct: 47, category: "Overthinking", traits: { "Overthinker": 3 } },
  { question: "Do you reread your own texts to see how they sound?", meTooPct: 74, category: "Overthinking", traits: { "Overthinker": 2, "Observer": 1 } },
  { question: "Do you practice arguments before they happen and win every time?", meTooPct: 58, category: "Overthinking", traits: { "Overthinker": 2, "Creative Thinker": 2 } },
  // Pets
  { question: "Do you make songs for your pets?", meTooPct: 57, category: "Pets", traits: { "Animal Lover": 3, "Creative Thinker": 2 } },
  { question: "Do you talk to your pets like they fully understand you?", meTooPct: 82, category: "Pets", traits: { "Animal Lover": 3, "Sentimental": 1 } },
  { question: "Do you feel guilty leaving the house because of your pet?", meTooPct: 65, category: "Pets", traits: { "Animal Lover": 3, "Sentimental": 2 } },
  { question: "Do you use a baby voice exclusively for your pet?", meTooPct: 71, category: "Pets", traits: { "Animal Lover": 2, "Sentimental": 1 } },
  { question: "Do you share your food with your pet and feel no shame?", meTooPct: 60, category: "Pets", traits: { "Animal Lover": 2, "Comfort Seeker": 1 } },
  // Food
  { question: "Do you open the fridge even when you're not hungry?", meTooPct: 78, category: "Food", traits: { "Comfort Seeker": 3 } },
  { question: "Do you eat one food item at a time before touching the others?", meTooPct: 34, category: "Food", traits: { "Pattern Seeker": 3 } },
  { question: "Do you narrate what you're eating while eating it?", meTooPct: 29, category: "Food", traits: { "Creative Thinker": 2, "Observer": 1 } },
  { question: "Do you save the best bite for last?", meTooPct: 66, category: "Food", traits: { "Pattern Seeker": 2, "Sentimental": 1 } },
  { question: "Do you eat the same breakfast almost every day?", meTooPct: 52, category: "Food", traits: { "Comfort Seeker": 2, "Pattern Seeker": 2 } },
  { question: "Do you plan what you'll eat next while still eating?", meTooPct: 61, category: "Food", traits: { "Comfort Seeker": 2, "Overthinker": 1 } },
  // Sleep
  { question: "Do you imagine elaborate scenarios before falling asleep?", meTooPct: 63, category: "Sleep", traits: { "Creative Thinker": 3, "Introvert": 1 } },
  { question: "Do you set multiple alarms just in case?", meTooPct: 77, category: "Sleep", traits: { "Overthinker": 2, "Pattern Seeker": 1 } },
  { question: "Do you feel more creative at night than during the day?", meTooPct: 58, category: "Sleep", traits: { "Creative Thinker": 3, "Introvert": 2 } },
  { question: "Do you check the time at night and calculate remaining sleep?", meTooPct: 70, category: "Sleep", traits: { "Pattern Seeker": 2, "Overthinker": 2 } },
  { question: "Do you stay in bed scrolling after your alarm goes off?", meTooPct: 85, category: "Sleep", traits: { "Comfort Seeker": 3, "Introvert": 1 } },
  { question: "Do you fall asleep to the same show playing in the background?", meTooPct: 44, category: "Sleep", traits: { "Comfort Seeker": 2, "Pattern Seeker": 1 } },
  // Technology
  { question: "Do you check your phone even when it didn't vibrate?", meTooPct: 81, category: "Technology", traits: { "Pattern Seeker": 1, "Overthinker": 1 } },
  { question: "Do you have tabs open you know you'll never read?", meTooPct: 79, category: "Technology", traits: { "Observer": 2, "Comfort Seeker": 1 } },
  { question: "Do you mute notifications but still check constantly?", meTooPct: 67, category: "Technology", traits: { "Overthinker": 2, "Pattern Seeker": 1 } },
  { question: "Do you screenshot things you'll never look at again?", meTooPct: 53, category: "Technology", traits: { "Observer": 2, "Sentimental": 1 } },
  { question: "Do you narrate your life in your head like a social media post?", meTooPct: 38, category: "Technology", traits: { "Creative Thinker": 2, "Observer": 2 } },
  // Social
  { question: "Do you observe strangers and invent stories about their lives?", meTooPct: 54, category: "Social", traits: { "Observer": 3, "Creative Thinker": 2 } },
  { question: "Do you talk to yourself when you're alone?", meTooPct: 63, category: "Social", traits: { "Introvert": 2, "Creative Thinker": 1 } },
  { question: "Do you mentally rehearse how to say goodbye before a call ends?", meTooPct: 42, category: "Social", traits: { "Overthinker": 2, "Pattern Seeker": 1 } },
  { question: "Do you feel relieved when plans get cancelled?", meTooPct: 71, category: "Social", traits: { "Introvert": 3, "Comfort Seeker": 1 } },
  { question: "Do you wave back at someone who wasn't waving at you?", meTooPct: 88, category: "Social", traits: { "Sentimental": 1, "Observer": 1 } },
  { question: "Do you lie awake wishing you'd said something differently?", meTooPct: 65, category: "Social", traits: { "Overthinker": 3, "Sentimental": 2 } },
  // Body
  { question: "Do you hold your breath without realizing it?", meTooPct: 56, category: "Body", traits: { "Observer": 2 } },
  { question: "Do you crack your knuckles, neck, or back for satisfaction?", meTooPct: 62, category: "Body", traits: { "Comfort Seeker": 2, "Pattern Seeker": 1 } },
  { question: "Do you notice a song is stuck in your head mid-song?", meTooPct: 74, category: "Body", traits: { "Observer": 2, "Creative Thinker": 1 } },
  // Habits
  { question: "Do you smell things before putting them in the laundry to check?", meTooPct: 76, category: "Habits", traits: { "Pattern Seeker": 2, "Observer": 1 } },
  { question: "Do you make deals with yourself to procrastinate?", meTooPct: 69, category: "Habits", traits: { "Overthinker": 2, "Comfort Seeker": 1 } },
  { question: "Do you arrange things symmetrically without knowing why?", meTooPct: 43, category: "Habits", traits: { "Pattern Seeker": 3, "Observer": 1 } },
];

const habits: Habit[] = RAW_HABITS.map((h) => ({ ...h, respondents: fakeRespondents() }));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- RESULT MESSAGE ---
function getResultMessage(pct: number, answer: Answer): string {
  const userWithMajority = (answer === "me-too" && pct > 50) || (answer === "not-me" && pct <= 50);
  const isSplit = pct >= 40 && pct <= 60;

  if (isSplit) {
    const msgs = ["This one is surprisingly split.", "The world is divided on this one.", "Almost exactly half and half.", "No clear winner here."];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (pct >= 80) {
    return userWithMajority ? "Almost everyone does this. You're in great company." : "Almost everyone does this — but not you. You're rare.";
  }
  if (pct >= 60) {
    if (userWithMajority) {
      const msgs = ["You're in the majority.", "Most people are with you on this.", "You're not alone."];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
    const msgs = ["You're more unique than most.", "You stand out on this one.", "Not many would say the same."];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (pct <= 20) {
    return userWithMajority ? "Hardly anyone does this — but you do. Own it." : "Almost no one does this. You're totally normal.";
  }
  if (userWithMajority) {
    const msgs = ["You're with the minority — the interesting crowd.", "Fewer people than you'd think agree."];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  const msgs = ["You're in the majority here.", "Most people are on your side."];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function formatRespondents(n: number): string {
  return n.toLocaleString();
}

// --- ANIMATED COUNTER ---
function AnimatedCounter({ targetValue, duration = 3000 }: { targetValue: number; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * targetValue));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [targetValue, duration]);

  return <span>{value}</span>;
}

// --- COUNTDOWN BAR ---
function CountdownBar({ duration, instanceKey }: { duration: number; instanceKey: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [duration, instanceKey]);

  return (
    <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-none" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

// --- ANIMATED TRAIT BAR ---
function TraitBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const startTime = performance.now();
      const duration = 900;
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setWidth(Math.round(eased * pct));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [pct, delay]);

  return (
    <div className="w-full h-2.5 bg-purple-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-none`} style={{ width: `${width}%` }} />
    </div>
  );
}

// --- SWIPE CARD ---
interface SwipeCardProps {
  habit: Habit;
  index: number;
  onAnswer: (answer: Answer) => void;
}

function SwipeCard({ habit, index, onAnswer }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-18, 18]);
  const meeTooOpacity = useTransform(x, [30, 110], [0, 1]);
  const notMeOpacity = useTransform(x, [-110, -30], [1, 0]);
  const meeTooScale = useTransform(x, [30, 110], [0.8, 1]);
  const notMeScale = useTransform(x, [-110, -30], [1, 0.8]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      animate(x, 700, { duration: 0.35, ease: "easeIn" });
      setTimeout(() => onAnswer("me-too"), 280);
    } else if (info.offset.x < -100) {
      animate(x, -700, { duration: 0.35, ease: "easeIn" });
      setTimeout(() => onAnswer("not-me"), 280);
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
    }
  };

  return (
    <motion.div
      key={`card-${index}`}
      initial={{ scale: 0.92, opacity: 0, y: 24 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={handleDragEnd}
      className="w-full select-none cursor-grab active:cursor-grabbing"
      data-testid="card-habit"
    >
      <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden" style={{ minHeight: 360 }}>
        <motion.div style={{ opacity: meeTooOpacity, scale: meeTooScale }} className="absolute top-7 left-7 z-20 border-4 border-green-400 rounded-xl px-4 py-2 rotate-[-12deg]">
          <span className="text-green-400 font-extrabold text-2xl tracking-widest uppercase">Me Too</span>
        </motion.div>
        <motion.div style={{ opacity: notMeOpacity, scale: notMeScale }} className="absolute top-7 right-7 z-20 border-4 border-red-400 rounded-xl px-4 py-2 rotate-[12deg]">
          <span className="text-red-400 font-extrabold text-2xl tracking-widest uppercase">Not Me</span>
        </motion.div>

        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {CATEGORY_EMOJI[habit.category]} {habit.category}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center py-4">
          <h2 className="text-[1.65rem] font-bold text-card-foreground text-center leading-snug" data-testid="text-habit-question">
            {habit.question}
          </h2>
        </div>

        <div className="flex justify-between items-center mt-6 px-2">
          <div className="flex items-center gap-1.5 text-red-400/60">
            <X className="w-4 h-4" />
            <span className="text-xs font-semibold">Not Me</span>
          </div>
          <span className="text-purple-300/50 text-xs font-medium">swipe or tap</span>
          <div className="flex items-center gap-1.5 text-green-400/60">
            <span className="text-xs font-semibold">Me Too</span>
            <Check className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- TRAIT SCORING ---
type TraitScores = Record<Trait, number>;
type TraitMax = Record<Trait, number>;

const ALL_TRAITS: Trait[] = [
  "Overthinker", "Animal Lover", "Pattern Seeker", "Sentimental",
  "Introvert", "Observer", "Creative Thinker", "Comfort Seeker",
];

function emptyScores(): TraitScores {
  return Object.fromEntries(ALL_TRAITS.map(t => [t, 0])) as TraitScores;
}

function getTopTraits(scores: TraitScores, maxScores: TraitMax, count = 5) {
  return ALL_TRAITS
    .map(trait => ({
      trait,
      pct: maxScores[trait] > 0 ? Math.min(Math.round((scores[trait] / maxScores[trait]) * 100), 100) : 0,
    }))
    .filter(t => maxScores[t.trait] > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, count);
}

function getProfileHeadline(topTrait: Trait): string {
  const headlines: Record<Trait, string> = {
    "Overthinker": "Your mind is always a few steps ahead.",
    "Animal Lover": "You love deeply — especially the ones who can't say it back.",
    "Pattern Seeker": "You bring order to the chaos around you.",
    "Sentimental": "You carry the moments others forget.",
    "Introvert": "Your inner world is richer than most people know.",
    "Observer": "You notice everything. Absolutely everything.",
    "Creative Thinker": "Your imagination runs the show.",
    "Comfort Seeker": "You know what feels right, and you go for it.",
  };
  return headlines[topTrait];
}

// --- APP ---
export default function App() {
  const [view, setView] = useState<"landing" | "question" | "result" | "profile">("landing");
  const [queue, setQueue] = useState<Habit[]>(() => shuffle(habits));
  const [queueIndex, setQueueIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<Answer | null>(null);
  const [streak, setStreak] = useState(0);

  // Trait scoring
  const [traitScores, setTraitScores] = useState<TraitScores>(emptyScores());
  const [traitMax, setTraitMax] = useState<TraitMax>(emptyScores());

  const currentHabit = queue[queueIndex] ?? queue[0];
  const nextHabit = queue[(queueIndex + 1) % queue.length];
  const REVEAL_DURATION = 3000;

  const handleAnswer = (answer: Answer) => {
    setUserAnswer(answer);
    const newStreak = streak + 1;
    setStreak(newStreak);

    // Add max possible points for every habit seen
    setTraitMax(prev => {
      const updated = { ...prev };
      for (const [trait, pts] of Object.entries(currentHabit.traits) as [Trait, number][]) {
        updated[trait] = (updated[trait] || 0) + pts;
      }
      return updated;
    });

    // Add scored points only on Me Too
    if (answer === "me-too") {
      setTraitScores(prev => {
        const updated = { ...prev };
        for (const [trait, pts] of Object.entries(currentHabit.traits) as [Trait, number][]) {
          updated[trait] = (updated[trait] || 0) + pts;
        }
        return updated;
      });
    }

    setView("result");
  };

  const handleNext = () => {
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      setQueue(shuffle(habits));
      setQueueIndex(0);
    } else {
      setQueueIndex(nextIndex);
    }
    setUserAnswer(null);

    // Unlock profile after PROFILE_UNLOCK_AT answers
    if (streak >= PROFILE_UNLOCK_AT) {
      setView("profile");
    } else {
      setView("question");
    }
  };

  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (view !== "result") return;
    autoTimer.current = setTimeout(handleNext, REVEAL_DURATION + 600);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [view, queueIndex]);

  const pct = currentHabit?.meTooPct ?? 50;
  const resultMessage = userAnswer ? getResultMessage(pct, userAnswer) : "";

  // Profile data
  const topTraits = getTopTraits(traitScores, traitMax, 5);
  const topTrait = topTraits[0]?.trait ?? "Observer";

  // Progress toward profile unlock (shown on question screen)
  const progressToUnlock = Math.min(streak / PROFILE_UNLOCK_AT, 1);
  const answersLeft = Math.max(PROFILE_UNLOCK_AT - streak, 0);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-hidden p-4">
      <div className="w-full max-w-[390px] relative flex items-center justify-center" style={{ minHeight: 600 }}>
        <AnimatePresence mode="wait">

          {/* LANDING */}
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center justify-center text-center space-y-8">
              <div className="space-y-4">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
                  <Sparkles className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-extrabold text-white tracking-tight">Am I<br />Normal?</h1>
                <p className="text-lg text-purple-200 font-medium px-8">You're probably not as weird as you think.</p>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} onClick={() => setView("question")}
                data-testid="button-start"
                className="w-full max-w-[280px] bg-white text-purple-900 font-bold text-lg py-4 px-8 rounded-full shadow-lg shadow-black/20 hover:shadow-xl transition-shadow">
                Start Discovering
              </motion.button>
            </motion.div>
          )}

          {/* QUESTION */}
          {view === "question" && (
            <motion.div key={`question-${queueIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="w-full flex flex-col gap-4">

              {/* Top bar: streak + profile unlock progress */}
              <div className="flex items-center gap-3">
                {streak > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 shrink-0">
                    <Flame className="w-4 h-4 text-orange-300" />
                    <span className="text-white font-bold text-sm" data-testid="text-streak">{streak}</span>
                  </div>
                )}
                {streak < PROFILE_UNLOCK_AT && (
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs font-medium flex items-center gap-1">
                        <Brain className="w-3 h-3" /> Mind Profile
                      </span>
                      <span className="text-white/50 text-xs">{answersLeft} to unlock</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-white/50 rounded-full transition-all duration-500" style={{ width: `${progressToUnlock * 100}%` }} />
                    </div>
                  </div>
                )}
                {streak >= PROFILE_UNLOCK_AT && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView("profile")}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/30 text-white text-xs font-bold"
                  >
                    <Brain className="w-3.5 h-3.5" /> View My Mind Profile
                  </motion.button>
                )}
              </div>

              <SwipeCard habit={currentHabit} index={queueIndex} onAnswer={handleAnswer} />

              <div className="flex gap-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.93 }} onClick={() => handleAnswer("not-me")}
                  data-testid="button-not-me"
                  className="flex-1 bg-white/10 backdrop-blur border border-white/20 text-white font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" /> Not Me
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.93 }} onClick={() => handleAnswer("me-too")}
                  data-testid="button-me-too"
                  className="flex-1 bg-white text-purple-900 font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-black/20">
                  <Check className="w-5 h-5" /> Me Too
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {view === "result" && currentHabit && (
            <motion.div key={`result-${queueIndex}`} initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.45 }} className="w-full flex flex-col gap-3">
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-5 z-10">
                  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-orange-600 font-bold text-xs" data-testid="text-streak-result">{streak} answered</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs ${userAnswer === "me-too" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {userAnswer === "me-too" ? <><Check className="w-3.5 h-3.5" /> Me Too</> : <><X className="w-3.5 h-3.5" /> Not Me</>}
                  </div>
                </div>

                <div className="flex flex-col items-center z-10 space-y-1 mb-4">
                  <div className="flex items-baseline gap-1 text-primary leading-none">
                    <span className="text-[88px] font-extrabold tracking-tighter leading-none" data-testid="text-result-percentage">
                      <AnimatedCounter targetValue={pct} duration={REVEAL_DURATION} />
                    </span>
                    <span className="text-5xl font-bold leading-none">%</span>
                  </div>
                  <p className="text-card-foreground/60 font-semibold text-xl">said Me Too</p>
                </div>

                <div className="flex justify-center z-10 mb-3">
                  <div className="bg-primary/8 px-6 py-3 rounded-full border border-primary/20">
                    <p className="text-lg font-bold text-card-foreground text-center">{resultMessage}</p>
                  </div>
                </div>

                <p className="text-center text-card-foreground/40 text-sm font-medium z-10 mb-5" data-testid="text-respondents">
                  {formatRespondents(currentHabit.respondents)} people answered
                </p>

                {/* Profile unlock teaser when close */}
                {streak === PROFILE_UNLOCK_AT && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-2.5 mb-4 z-10">
                    <Brain className="w-4 h-4 text-violet-600" />
                    <span className="text-violet-700 font-bold text-sm">Your Mind Profile is ready!</span>
                  </motion.div>
                )}

                <div className="z-10 space-y-3">
                  <CountdownBar key={`bar-${queueIndex}`} duration={REVEAL_DURATION} instanceKey={`bar-${queueIndex}`} />
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={handleNext}
                    data-testid="button-next"
                    className="w-full bg-card-foreground text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2">
                    {streak >= PROFILE_UNLOCK_AT ? "See My Mind Profile" : "Next Question"}
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {nextHabit && streak < PROFILE_UNLOCK_AT && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-5 py-3"
                  data-testid="next-category-preview">
                  <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Up next</span>
                  <span className="text-white font-semibold text-sm">{CATEGORY_EMOJI[nextHabit.category]} {nextHabit.category}</span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* PROFILE */}
          {view === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
              className="w-full flex flex-col gap-4">

              {/* Header card */}
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-fuchsia-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-3 mb-6 z-10 relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Your Mind Profile</p>
                    <h2 className="text-2xl font-extrabold text-card-foreground leading-tight">Top Traits</h2>
                  </div>
                </div>

                <p className="text-card-foreground/60 font-medium text-base mb-8 z-10 relative leading-relaxed">
                  {getProfileHeadline(topTrait)}
                </p>

                {/* Trait bars */}
                <div className="space-y-5 z-10 relative">
                  {topTraits.map(({ trait, pct: traitPct }, i) => (
                    <motion.div key={trait} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{TRAIT_EMOJI[trait]}</span>
                          <span className="font-bold text-card-foreground text-sm">{trait}</span>
                        </div>
                        <span className="font-extrabold text-primary text-sm">{traitPct}%</span>
                      </div>
                      <TraitBar pct={traitPct} color={TRAIT_COLOR[trait]} delay={200 + i * 100} />
                      {i === 0 && (
                        <p className="text-card-foreground/45 text-xs mt-1.5">{TRAIT_DESCRIPTION[trait]}</p>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-purple-100 z-10 relative">
                  <p className="text-card-foreground/40 text-xs text-center">Based on {streak} habits answered</p>
                </div>
              </div>

              {/* CTA buttons */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => setView("question")}
                data-testid="button-keep-discovering"
                className="w-full bg-white text-purple-900 font-bold text-lg py-4 rounded-full shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                Keep Discovering
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
