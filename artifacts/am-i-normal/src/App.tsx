import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";

// --- TYPES ---
type Category = "Overthinking" | "Pets" | "Food" | "Sleep" | "Technology" | "Social" | "Body" | "Habits";
type Answer = "me-too" | "not-me";

interface Habit {
  question: string;
  meTooPct: number;
  category: Category;
  respondents: number;
}

// --- DATA ---
const CATEGORY_EMOJI: Record<Category, string> = {
  Overthinking: "🧠",
  Pets: "🐶",
  Food: "🍔",
  Sleep: "😴",
  Technology: "📱",
  Social: "👥",
  Body: "🫀",
  Habits: "🔁",
};

function fakeRespondents(): number {
  return Math.floor(Math.random() * 99000) + 1000;
}

const RAW_HABITS: Omit<Habit, "respondents">[] = [
  // Overthinking
  { question: "Do you rehearse conversations in your head before they happen?", meTooPct: 72, category: "Overthinking" },
  { question: "Do you replay embarrassing moments from years ago?", meTooPct: 68, category: "Overthinking" },
  { question: "Do you mentally argue with people who aren't there?", meTooPct: 61, category: "Overthinking" },
  { question: "Do you plan what you'll say in a meeting but then forget it all?", meTooPct: 55, category: "Overthinking" },
  { question: "Do you catastrophize small mistakes into career-ending disasters?", meTooPct: 47, category: "Overthinking" },
  { question: "Do you reread your own texts to see how they sound?", meTooPct: 74, category: "Overthinking" },
  { question: "Do you practice arguments before they happen and win every time?", meTooPct: 58, category: "Overthinking" },

  // Pets
  { question: "Do you make songs for your pets?", meTooPct: 57, category: "Pets" },
  { question: "Do you talk to your pets like they fully understand you?", meTooPct: 82, category: "Pets" },
  { question: "Do you feel guilty leaving the house because of your pet?", meTooPct: 65, category: "Pets" },
  { question: "Do you use a baby voice exclusively for your pet?", meTooPct: 71, category: "Pets" },
  { question: "Do you share your food with your pet and feel no shame?", meTooPct: 60, category: "Pets" },

  // Food
  { question: "Do you open the fridge even when you're not hungry?", meTooPct: 78, category: "Food" },
  { question: "Do you eat one food item at a time before touching the others?", meTooPct: 34, category: "Food" },
  { question: "Do you narrate what you're eating while eating it?", meTooPct: 29, category: "Food" },
  { question: "Do you save the best bite for last?", meTooPct: 66, category: "Food" },
  { question: "Do you eat the same breakfast almost every day?", meTooPct: 52, category: "Food" },
  { question: "Do you plan what you'll eat next while still eating?", meTooPct: 61, category: "Food" },

  // Sleep
  { question: "Do you imagine elaborate scenarios before falling asleep?", meTooPct: 63, category: "Sleep" },
  { question: "Do you set multiple alarms just in case?", meTooPct: 77, category: "Sleep" },
  { question: "Do you feel more creative at night than during the day?", meTooPct: 58, category: "Sleep" },
  { question: "Do you check the time in the middle of the night and calculate remaining sleep?", meTooPct: 70, category: "Sleep" },
  { question: "Do you stay in bed scrolling after your alarm goes off?", meTooPct: 85, category: "Sleep" },
  { question: "Do you fall asleep to the same show playing in the background?", meTooPct: 44, category: "Sleep" },

  // Technology
  { question: "Do you check your phone even when it didn't vibrate?", meTooPct: 81, category: "Technology" },
  { question: "Do you have tabs open you know you'll never read?", meTooPct: 79, category: "Technology" },
  { question: "Do you mute notifications but still check constantly?", meTooPct: 67, category: "Technology" },
  { question: "Do you screenshot things you'll never look at again?", meTooPct: 53, category: "Technology" },
  { question: "Do you narrate your life in your head like a Twitter thread?", meTooPct: 38, category: "Technology" },

  // Social
  { question: "Do you observe strangers and invent stories about their lives?", meTooPct: 54, category: "Social" },
  { question: "Do you talk to yourself when you're alone?", meTooPct: 63, category: "Social" },
  { question: "Do you mentally rehearse how to say goodbye before a call ends?", meTooPct: 42, category: "Social" },
  { question: "Do you feel relieved when plans get cancelled?", meTooPct: 71, category: "Social" },
  { question: "Do you wave back at someone who wasn't waving at you?", meTooPct: 88, category: "Social" },
  { question: "Do you lie awake wishing you had said something differently?", meTooPct: 65, category: "Social" },

  // Body
  { question: "Do you hold your breath without realizing it?", meTooPct: 56, category: "Body" },
  { question: "Do you crack your knuckles, neck, or back for satisfaction?", meTooPct: 62, category: "Body" },
  { question: "Do you notice a song is stuck in your head mid-song?", meTooPct: 74, category: "Body" },

  // Habits
  { question: "Do you smell things before putting them in the laundry to check?", meTooPct: 76, category: "Habits" },
  { question: "Do you make deals with yourself to procrastinate?", meTooPct: 69, category: "Habits" },
  { question: "Do you arrange things symmetrically without knowing why?", meTooPct: 43, category: "Habits" },
];

// Assign stable fake respondent counts
const habits: Habit[] = RAW_HABITS.map((h) => ({ ...h, respondents: fakeRespondents() }));

// Shuffle array (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getResultMessage(pct: number): string {
  if (pct >= 80) return "Almost everyone does this.";
  if (pct >= 60) return "You're in the majority.";
  if (pct >= 40) return "This one's surprisingly split.";
  if (pct >= 20) return "You're more unique than most.";
  return "That's surprisingly uncommon.";
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

// --- PROGRESS BAR (synced to counter) ---
function CountdownBar({ duration }: { duration: number }) {
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
  }, [duration]);

  return (
    <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-none"
        style={{ width: `${progress * 100}%` }}
      />
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
      <div
        className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden"
        style={{ minHeight: 360 }}
      >
        {/* Me Too stamp */}
        <motion.div
          style={{ opacity: meeTooOpacity, scale: meeTooScale }}
          className="absolute top-7 left-7 z-20 border-4 border-green-400 rounded-xl px-4 py-2 rotate-[-12deg]"
        >
          <span className="text-green-400 font-extrabold text-2xl tracking-widest uppercase">Me Too</span>
        </motion.div>

        {/* Not Me stamp */}
        <motion.div
          style={{ opacity: notMeOpacity, scale: notMeScale }}
          className="absolute top-7 right-7 z-20 border-4 border-red-400 rounded-xl px-4 py-2 rotate-[12deg]"
        >
          <span className="text-red-400 font-extrabold text-2xl tracking-widest uppercase">Not Me</span>
        </motion.div>

        {/* Category badge */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {CATEGORY_EMOJI[habit.category]} {habit.category}
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-center justify-center py-4">
          <h2
            className="text-[1.65rem] font-bold text-card-foreground text-center leading-snug"
            data-testid="text-habit-question"
          >
            {habit.question}
          </h2>
        </div>

        {/* Swipe hint */}
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

// --- SESSION PROFILE ---
type Profile = Record<Category, number>;

function emptyProfile(): Profile {
  return {
    Overthinking: 0, Pets: 0, Food: 0, Sleep: 0,
    Technology: 0, Social: 0, Body: 0, Habits: 0,
  };
}

// --- APP ---
export default function App() {
  const [view, setView] = useState<"landing" | "question" | "result">("landing");
  const [queue, setQueue] = useState<Habit[]>(() => shuffle(habits));
  const [queueIndex, setQueueIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<Answer | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile());

  // Ensure there's always more habits by re-shuffling when needed
  const currentHabit = queue[queueIndex] ?? queue[0];

  const REVEAL_DURATION = 3000; // ms — counter + progress bar speed

  const handleAnswer = (answer: Answer) => {
    setUserAnswer(answer);

    // Update hidden session profile
    if (answer === "me-too") {
      setProfile((prev) => ({
        ...prev,
        [currentHabit.category]: prev[currentHabit.category] + 1,
      }));
    }

    setView("result");
  };

  const handleNext = () => {
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      // Reshuffle for endless mode
      setQueue(shuffle(habits));
      setQueueIndex(0);
    } else {
      setQueueIndex(nextIndex);
    }
    setUserAnswer(null);
    setView("question");
  };

  // Auto-advance after REVEAL_DURATION + small buffer
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (view !== "result") return;
    autoTimer.current = setTimeout(handleNext, REVEAL_DURATION + 600);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [view, queueIndex]);

  const pct = currentHabit?.meTooPct ?? 50;
  const resultMessage = getResultMessage(pct);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-hidden p-4">
      <div className="w-full max-w-[390px] relative flex items-center justify-center" style={{ minHeight: 600 }}>

        <AnimatePresence mode="wait">

          {/* LANDING */}
          {view === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20"
                >
                  <Sparkles className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-extrabold text-white tracking-tight">
                  Am I<br />Normal?
                </h1>
                <p className="text-lg text-purple-200 font-medium px-8">
                  You're probably not as weird as you think.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView("question")}
                data-testid="button-start"
                className="w-full max-w-[280px] bg-white text-purple-900 font-bold text-lg py-4 px-8 rounded-full shadow-lg shadow-black/20 hover:shadow-xl transition-shadow"
              >
                Start Discovering
              </motion.button>
            </motion.div>
          )}

          {/* QUESTION */}
          {view === "question" && (
            <motion.div
              key={`question-${queueIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col gap-5"
            >
              <SwipeCard
                habit={currentHabit}
                index={queueIndex}
                onAnswer={handleAnswer}
              />

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleAnswer("not-me")}
                  data-testid="button-not-me"
                  className="flex-1 bg-white/10 backdrop-blur border border-white/20 text-white font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                  Not Me
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleAnswer("me-too")}
                  data-testid="button-me-too"
                  className="flex-1 bg-white text-purple-900 font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-black/20"
                >
                  <Check className="w-5 h-5" />
                  Me Too
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {view === "result" && currentHabit && (
            <motion.div
              key={`result-${queueIndex}`}
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.45 }}
              className="w-full flex flex-col gap-4"
            >
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                {/* Answer badge */}
                <div className="flex justify-center mb-5 z-10">
                  <div className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm ${
                    userAnswer === "me-too"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}>
                    {userAnswer === "me-too"
                      ? <><Check className="w-4 h-4" /> You said Me Too</>
                      : <><X className="w-4 h-4" /> You said Not Me</>
                    }
                  </div>
                </div>

                {/* Big percentage */}
                <div className="flex flex-col items-center z-10 space-y-1 mb-4">
                  <div className="flex items-baseline gap-1 text-primary leading-none">
                    <span className="text-[88px] font-extrabold tracking-tighter leading-none" data-testid="text-result-percentage">
                      <AnimatedCounter targetValue={pct} duration={REVEAL_DURATION} />
                    </span>
                    <span className="text-5xl font-bold leading-none">%</span>
                  </div>
                  <p className="text-card-foreground/60 font-semibold text-xl">said Me Too</p>
                </div>

                {/* Verdict */}
                <div className="flex justify-center z-10 mb-3">
                  <div className="bg-primary/8 px-6 py-3 rounded-full border border-primary/20">
                    <p className="text-lg font-bold text-card-foreground">{resultMessage}</p>
                  </div>
                </div>

                {/* Respondents */}
                <p className="text-center text-card-foreground/40 text-sm font-medium z-10 mb-6" data-testid="text-respondents">
                  {formatRespondents(currentHabit.respondents)} people answered
                </p>

                {/* Auto-advance bar + Next */}
                <div className="z-10 space-y-3">
                  <CountdownBar key={`bar-${queueIndex}`} duration={REVEAL_DURATION} />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleNext}
                    data-testid="button-next"
                    className="w-full bg-card-foreground text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2"
                  >
                    Next Question
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
