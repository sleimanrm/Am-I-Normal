import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";

const habits = [
  { question: "Do you rehearse conversations in your head before they happen?", meTooPct: 72 },
  { question: "Do you talk to yourself when alone?", meTooPct: 63 },
  { question: "Do you make songs for your pets?", meTooPct: 57 },
  { question: "Do you check your phone even when it didn't vibrate?", meTooPct: 81 },
  { question: "Do you open the fridge even when you're not hungry?", meTooPct: 78 },
];

function AnimatedCounter({ targetValue }: { targetValue: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const startTime = performance.now();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * targetValue));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [targetValue]);

  return <span>{value}</span>;
}

interface SwipeCardProps {
  habit: { question: string; meTooPct: number };
  index: number;
  total: number;
  onAnswer: (answer: "me-too" | "not-me") => void;
}

function SwipeCard({ habit, index, total, onAnswer }: SwipeCardProps) {
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
      <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden"
        style={{ minHeight: 380 }}>

        {/* Me Too overlay */}
        <motion.div
          style={{ opacity: meeTooOpacity, scale: meeTooScale }}
          className="absolute top-7 left-7 z-20 border-4 border-green-400 rounded-xl px-4 py-2 rotate-[-12deg]"
        >
          <span className="text-green-400 font-extrabold text-2xl tracking-widest uppercase">Me Too</span>
        </motion.div>

        {/* Not Me overlay */}
        <motion.div
          style={{ opacity: notMeOpacity, scale: notMeScale }}
          className="absolute top-7 right-7 z-20 border-4 border-red-400 rounded-xl px-4 py-2 rotate-[12deg]"
        >
          <span className="text-red-400 font-extrabold text-2xl tracking-widest uppercase">Not Me</span>
        </motion.div>

        {/* Progress */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-purple-400 font-semibold text-sm tracking-wider uppercase">Habit</span>
          <span className="text-purple-400 font-bold text-sm bg-purple-100/50 px-3 py-1 rounded-full" data-testid="text-progress">
            {index + 1} / {total}
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-center justify-center py-4">
          <h2
            className="text-[1.65rem] font-bold text-card-foreground text-center leading-snug"
            data-testid="text-habit-question"
          >
            "{habit.question}"
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

export default function App() {
  const [view, setView] = useState<"landing" | "question" | "result" | "done">("landing");
  const [currentHabitIndex, setCurrentHabitIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<"me-too" | "not-me" | null>(null);
  const [autoAdvanceProgress, setAutoAdvanceProgress] = useState(0);

  const currentHabit = habits[currentHabitIndex];
  const isMajority = currentHabit?.meTooPct > 50;

  const handleAnswer = (answer: "me-too" | "not-me") => {
    setUserAnswer(answer);
    setView("result");
  };

  const handleNext = () => {
    if (currentHabitIndex < habits.length - 1) {
      setCurrentHabitIndex((prev) => prev + 1);
      setUserAnswer(null);
      setAutoAdvanceProgress(0);
      setView("question");
    } else {
      setView("done");
    }
  };

  // Auto-advance from result after 2.8 seconds
  useEffect(() => {
    if (view !== "result") {
      setAutoAdvanceProgress(0);
      return;
    }

    setAutoAdvanceProgress(0);
    const totalMs = 2800;
    const tickMs = 30;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += tickMs;
      setAutoAdvanceProgress(Math.min(elapsed / totalMs, 1));
      if (elapsed >= totalMs) {
        clearInterval(interval);
        handleNext();
      }
    }, tickMs);

    return () => clearInterval(interval);
  }, [view, currentHabitIndex]);

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
              key={`question-${currentHabitIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col gap-5"
            >
              <SwipeCard
                habit={currentHabit}
                index={currentHabitIndex}
                total={habits.length}
                onAnswer={handleAnswer}
              />

              {/* Buttons */}
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
          {view === "result" && (
            <motion.div
              key={`result-${currentHabitIndex}`}
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.45 }}
              className="w-full flex flex-col gap-4"
            >
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                {/* Answer badge */}
                <div className="flex justify-center mb-6 z-10">
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

                {/* Percentage */}
                <div className="flex flex-col items-center z-10 space-y-2 mb-6">
                  <div className="flex items-baseline gap-1 text-primary">
                    <span className="text-8xl font-extrabold tracking-tighter leading-none" data-testid="text-result-percentage">
                      <AnimatedCounter targetValue={currentHabit.meTooPct} />
                    </span>
                    <span className="text-4xl font-bold">%</span>
                  </div>
                  <p className="text-card-foreground/60 font-medium text-lg">of people do this</p>

                  <div className="bg-primary/8 px-6 py-3 rounded-full border border-primary/20 mt-2">
                    <p className="text-xl font-bold text-card-foreground">
                      {isMajority ? "You're in the majority." : "You're in the minority."}
                    </p>
                  </div>
                </div>

                {/* Auto-advance progress bar + Next button */}
                <div className="z-10 space-y-3 mt-2">
                  {/* Progress bar showing auto-advance countdown */}
                  <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${autoAdvanceProgress * 100}%` }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleNext}
                    data-testid="button-next"
                    className="w-full bg-card-foreground text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2"
                  >
                    {currentHabitIndex < habits.length - 1 ? "Next Question" : "Finish"}
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* DONE */}
          {view === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.6, delay: 0.2 }}
                  className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Sparkles className="w-12 h-12 text-primary" />
                </motion.div>
                <h2 className="text-4xl font-extrabold text-white tracking-tight">
                  You're perfectly<br />normal.
                </h2>
                <p className="text-lg text-purple-200 font-medium px-8">
                  (Or at least, you're not alone in your weirdness.)
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setCurrentHabitIndex(0);
                  setUserAnswer(null);
                  setView("landing");
                }}
                className="w-full max-w-[280px] bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-lg py-4 px-8 rounded-full hover:bg-white/30 transition-colors"
              >
                Play Again
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
