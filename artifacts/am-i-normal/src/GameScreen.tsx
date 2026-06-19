import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Check, X, ArrowRight, Sparkles, Flame, Brain, Plus, ClipboardList, Flag, TrendingUp, LayoutGrid } from "lucide-react";
import { useLocation } from "wouter";
import {
  useGetHabits,
  useRecordAnswer,
  useUpsertTraitScores,
  useReportHabit,
} from "@workspace/api-client-react";
import type { Habit } from "@workspace/api-client-react";

import type { Answer, Trait, TraitScores } from "./types";
import type { Category } from "./types";
import {
  CATEGORY_EMOJI,
  TRAIT_EMOJI,
  TRAIT_DESCRIPTION,
  TRAIT_COLOR,
  PROFILE_HEADLINE,
  emptyScores,
  addTraitPoints,
  calculateProfile,
  getResultMessage,
  shuffle,
  formatRespondents,
} from "./engine/personality";

// ── Constants ─────────────────────────────────────────────────────────────────

const PROFILE_UNLOCK_AT = 20;
const REVEAL_DURATION = 3000;
const SESSION_KEY = "ain_session_id";
const REPORTED_KEY = "ain_reported_habits";

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getReportedHabits(): Set<number> {
  try {
    const raw = localStorage.getItem(REPORTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function markHabitReported(id: number) {
  const set = getReportedHabits();
  set.add(id);
  localStorage.setItem(REPORTED_KEY, JSON.stringify([...set]));
}

const REPORT_REASONS = [
  "Not a habit",
  "Sexual content",
  "Drug-related content",
  "Offensive content",
  "Spam",
] as const;

// ── Animated number counter ───────────────────────────────────────────────────

function AnimatedCounter({ target, duration = REVEAL_DURATION }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <span>{value}</span>;
}

// ── Countdown progress bar ────────────────────────────────────────────────────

function CountdownBar({ duration, instanceKey }: { duration: number; instanceKey: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
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

// ── Animated trait bar ────────────────────────────────────────────────────────

function TraitBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      const duration = 900;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
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

// ── Report button + reason picker ─────────────────────────────────────────────

function ReportButton({
  habit,
  sessionId,
}: {
  habit: Habit;
  sessionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(() => getReportedHabits().has(habit.id));
  const [selectedReason, setSelectedReason] = useState("");

  const reportHabit = useReportHabit();

  // Reset local state when habit changes
  useEffect(() => {
    setOpen(false);
    setSelectedReason("");
    setDone(getReportedHabits().has(habit.id));
  }, [habit.id]);

  const handleSubmit = () => {
    if (!selectedReason) return;
    reportHabit.mutate(
      { id: habit.id, data: { sessionId, reason: selectedReason } },
      {
        onSuccess: () => {
          markHabitReported(habit.id);
          setDone(true);
          setOpen(false);
        },
        onError: () => {
          // 409 = already reported (race) — treat as done
          markHabitReported(habit.id);
          setDone(true);
          setOpen(false);
        },
      }
    );
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center gap-1.5 text-white/35 text-xs font-medium py-1"
      >
        <Check className="w-3 h-3" /> Reported
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Toggle link */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-white/35 hover:text-white/60 transition-colors text-xs font-medium py-1"
      >
        <Flag className="w-3 h-3" />
        Report this habit
      </button>

      {/* Reason picker */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden w-full mt-2"
          >
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Why are you reporting this?</p>
              <div className="flex flex-wrap gap-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason === selectedReason ? "" : reason)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      selectedReason === reason
                        ? "bg-white text-purple-900 border-white"
                        : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setOpen(false); setSelectedReason(""); }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || reportHabit.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-white/15 text-white border border-white/20 disabled:opacity-40 hover:bg-white/25 transition-colors"
                >
                  {reportHabit.isPending ? "Sending…" : "Submit Report"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Swipeable habit card ──────────────────────────────────────────────────────

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

  const categoryEmoji = CATEGORY_EMOJI[habit.category as Category] ?? "💬";

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
    >
      <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden" style={{ minHeight: 360 }}>
        <motion.div style={{ opacity: meeTooOpacity, scale: meeTooScale }}
          className="absolute top-7 left-7 z-20 border-4 border-green-400 rounded-xl px-4 py-2 rotate-[-12deg]">
          <span className="text-green-400 font-extrabold text-2xl tracking-widest uppercase">Me Too</span>
        </motion.div>
        <motion.div style={{ opacity: notMeOpacity, scale: notMeScale }}
          className="absolute top-7 right-7 z-20 border-4 border-red-400 rounded-xl px-4 py-2 rotate-[12deg]">
          <span className="text-red-400 font-extrabold text-2xl tracking-widest uppercase">Not Me</span>
        </motion.div>

        <div className="flex items-center mb-6">
          <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {categoryEmoji} {habit.category}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center py-4">
          <h2 className="text-[1.65rem] font-bold text-card-foreground text-center leading-snug">
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

// ── Queue ─────────────────────────────────────────────────────────────────────

type View = "landing" | "question" | "result" | "profile";

function buildQueue(habits: Habit[]): Habit[] {
  return shuffle([...habits]);
}

// ── Game screen ───────────────────────────────────────────────────────────────

export default function GameScreen() {
  const [, navigate] = useLocation();
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  const { data: habitsData = [], isLoading } = useGetHabits();
  const recordAnswer = useRecordAnswer();
  const upsertTraitScores = useUpsertTraitScores();

  const [view, setView] = useState<View>("landing");
  const [queue, setQueue] = useState<Habit[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<Answer | null>(null);
  const [streak, setStreak] = useState(0);
  const [traitScores, setTraitScores] = useState<TraitScores>(emptyScores);
  const [traitMax, setTraitMax] = useState<TraitScores>(emptyScores);

  const current = queue[queueIndex] ?? queue[0];
  const next = queue[(queueIndex + 1) % Math.max(queue.length, 1)];

  const handleStart = () => {
    setQueue(buildQueue(habitsData));
    setQueueIndex(0);
    setView("question");
  };

  const handleAnswer = (answer: Answer) => {
    if (!current) return;

    const newMax = addTraitPoints(traitMax, current.traits as Partial<Record<Trait, number>>);
    const newScores = answer === "me-too"
      ? addTraitPoints(traitScores, current.traits as Partial<Record<Trait, number>>)
      : traitScores;

    setUserAnswer(answer);
    setStreak((s) => s + 1);
    setTraitMax(newMax);
    setTraitScores(newScores);
    setView("result");

    recordAnswer.mutate({
      data: {
        habitId: current.id,
        sessionId,
        answer: answer === "me-too" ? "me_too" : "not_me",
      },
    });

    upsertTraitScores.mutate({
      sessionId,
      data: {
        scores: newScores as Record<string, number>,
        maxScores: newMax as Record<string, number>,
      },
    });
  };

  const handleNext = () => {
    const nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      setQueue(buildQueue(habitsData));
      setQueueIndex(0);
    } else {
      setQueueIndex(nextIdx);
    }
    setUserAnswer(null);
    setView(streak >= PROFILE_UNLOCK_AT ? "profile" : "question");
  };

  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (view !== "result") return;
    autoTimer.current = setTimeout(handleNext, REVEAL_DURATION + 600);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [view, queueIndex]);

  const resultMessage = userAnswer && current ? getResultMessage(current.meTooPct, userAnswer) : "";
  const topTraits = calculateProfile(traitScores, traitMax, 5);
  const topTrait: Trait = topTraits[0]?.trait ?? "Observer";
  const answersLeft = Math.max(PROFILE_UNLOCK_AT - streak, 0);
  const unlockProgress = Math.min(streak / PROFILE_UNLOCK_AT, 1);
  const profileUnlocked = streak >= PROFILE_UNLOCK_AT;

  const showFloatingAdd = view === "landing" || view === "question";

  if (!current && view !== "landing") {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95]">
        <div className="text-white/60 font-semibold">Loading habits…</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-hidden p-4">
      <div className="w-full max-w-[390px] relative flex items-center justify-center" style={{ minHeight: 600 }}>
        <AnimatePresence mode="wait">

          {/* ── LANDING ───────────────────────────────────────────────────── */}
          {view === "landing" && (
            <motion.div key="landing"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="space-y-4">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
                  <Sparkles className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-extrabold text-white tracking-tight">Am I<br />Normal?</h1>
                <p className="text-lg text-purple-200 font-medium px-8">
                  You're probably not as weird as you think.
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                disabled={isLoading}
                className="w-full max-w-[280px] bg-white text-purple-900 font-bold text-lg py-4 px-8 rounded-full shadow-lg shadow-black/20 hover:shadow-xl transition-shadow disabled:opacity-60">
                {isLoading ? "Loading…" : "Start Discovering"}
              </motion.button>
            </motion.div>
          )}

          {/* ── QUESTION ──────────────────────────────────────────────────── */}
          {view === "question" && current && (
            <motion.div key={`question-${queueIndex}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} className="w-full flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                {streak > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 shrink-0">
                    <Flame className="w-4 h-4 text-orange-300" />
                    <span className="text-white font-bold text-sm">{streak}</span>
                  </div>
                )}
                {!profileUnlocked ? (
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs font-medium flex items-center gap-1">
                        <Brain className="w-3 h-3" /> Mind Profile
                      </span>
                      <span className="text-white/50 text-xs">{answersLeft} to unlock</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-white/50 rounded-full transition-all duration-500"
                        style={{ width: `${unlockProgress * 100}%` }} />
                    </div>
                  </div>
                ) : (
                  <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.95 }} onClick={() => setView("profile")}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/30 text-white text-xs font-bold">
                    <Brain className="w-3.5 h-3.5" /> View My Mind Profile
                  </motion.button>
                )}
              </div>

              <SwipeCard habit={current} index={queueIndex} onAnswer={handleAnswer} />

              <div className="flex gap-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.93 }}
                  onClick={() => handleAnswer("not-me")}
                  className="flex-1 bg-white/10 backdrop-blur border border-white/20 text-white font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" /> Not Me
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.93 }}
                  onClick={() => handleAnswer("me-too")}
                  className="flex-1 bg-white text-purple-900 font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-black/20">
                  <Check className="w-5 h-5" /> Me Too
                </motion.button>
              </div>

              {/* Report link — sits below action buttons, unobtrusive */}
              <ReportButton habit={current} sessionId={sessionId} />
            </motion.div>
          )}

          {/* ── RESULT ────────────────────────────────────────────────────── */}
          {view === "result" && current && (
            <motion.div key={`result-${queueIndex}`}
              initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.45 }}
              className="w-full flex flex-col gap-3"
            >
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-5 z-10">
                  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-orange-600 font-bold text-xs">{streak} answered</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs ${userAnswer === "me-too" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {userAnswer === "me-too"
                      ? <><Check className="w-3.5 h-3.5" /> Me Too</>
                      : <><X className="w-3.5 h-3.5" /> Not Me</>}
                  </div>
                </div>

                <div className="flex flex-col items-center z-10 space-y-1 mb-4">
                  <div className="flex items-baseline gap-1 text-primary leading-none">
                    <span className="text-[88px] font-extrabold tracking-tighter leading-none">
                      <AnimatedCounter target={Math.round(current.meTooPct)} />
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

                {current.answerCount > 0 && (
                  <p className="text-center text-card-foreground/40 text-sm font-medium z-10 mb-5">
                    {formatRespondents(current.answerCount)} people answered
                  </p>
                )}

                {streak === PROFILE_UNLOCK_AT && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="flex items-center justify-center gap-2 bg-violet-50 border border-violet-200 rounded-2xl px-4 py-2.5 mb-4 z-10">
                    <Brain className="w-4 h-4 text-violet-600" />
                    <span className="text-violet-700 font-bold text-sm">Your Mind Profile is ready!</span>
                  </motion.div>
                )}

                <div className="z-10 space-y-3">
                  <CountdownBar duration={REVEAL_DURATION} instanceKey={`bar-${queueIndex}`} />
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    onClick={handleNext}
                    className="w-full bg-card-foreground text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2">
                    {streak >= PROFILE_UNLOCK_AT ? "See My Mind Profile" : "Next Question"}
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {next && !profileUnlocked && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-5 py-3">
                  <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Up next</span>
                  <span className="text-white font-semibold text-sm">
                    {CATEGORY_EMOJI[next.category as Category] ?? "💬"} {next.category}
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── PROFILE ───────────────────────────────────────────────────── */}
          {view === "profile" && (
            <motion.div key="profile"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
              className="w-full flex flex-col gap-4"
            >
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
                  {PROFILE_HEADLINE[topTrait]}
                </p>

                <div className="space-y-5 z-10 relative">
                  {topTraits.map(({ trait, pct }, i) => (
                    <motion.div key={trait}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{TRAIT_EMOJI[trait]}</span>
                          <span className="font-bold text-card-foreground text-sm">{trait}</span>
                        </div>
                        <span className="font-extrabold text-primary text-sm">{pct}%</span>
                      </div>
                      <TraitBar pct={pct} color={TRAIT_COLOR[trait]} delay={200 + i * 100} />
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

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                onClick={() => setView("question")}
                className="w-full bg-white text-purple-900 font-bold text-lg py-4 rounded-full shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                Keep Discovering
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom nav dock */}
      <AnimatePresence>
        {showFloatingAdd && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 shadow-2xl shadow-black/30"
          >
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/my-habits")}
              title="My submitted habits"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
            >
              <ClipboardList className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/categories")}
              title="Browse categories"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
            >
              <LayoutGrid className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/trending")}
              title="Trending habits"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </motion.button>
            <div className="w-px h-7 bg-white/20 mx-1" />
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/submit")}
              title="Share your weird habit"
              className="w-12 h-12 rounded-full bg-white shadow-lg shadow-black/20 flex items-center justify-center"
            >
              <Plus className="w-6 h-6 text-purple-700" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
