import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import {
  useGetHabitsByCategory,
  getGetHabitsByCategoryQueryKey,
  useRecordAnswer,
} from "@workspace/api-client-react";
import type { TrendingHabit } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CATEGORY_EMOJI } from "../engine/personality";
import type { Category } from "../types";

const SESSION_KEY = "ain_session_id";
function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

type LocalAnswers = Record<number, "me_too" | "not_me">;

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-white font-black text-lg leading-none">{value}</span>
      <span className="text-white/55 text-[11px] font-semibold mt-0.5 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

// ── Answer buttons ─────────────────────────────────────────────────────────────

function AnswerButtons({
  habit,
  localAnswers,
  onAnswer,
}: {
  habit: TrendingHabit;
  localAnswers: LocalAnswers;
  onAnswer: (habitId: number, answer: "me_too" | "not_me") => void;
}) {
  const answered = habit.userAnswer ?? localAnswers[habit.id] ?? null;

  if (answered) {
    return (
      <div
        className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full ${
          answered === "me_too"
            ? "bg-primary/10 text-primary"
            : "bg-rose-50 text-rose-500"
        }`}
      >
        {answered === "me_too" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        {answered === "me_too" ? "Me Too" : "Not Me"}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => onAnswer(habit.id, "me_too")}
        className="flex items-center gap-1.5 bg-primary/10 text-primary font-bold text-sm px-4 py-2 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
      >
        <Check className="w-4 h-4" />
        Me Too
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => onAnswer(habit.id, "not_me")}
        className="flex items-center gap-1.5 bg-rose-50 text-rose-500 font-bold text-sm px-4 py-2 rounded-full border border-rose-100 hover:bg-rose-100 transition-colors"
      >
        <X className="w-4 h-4" />
        Not Me
      </motion.button>
    </div>
  );
}

// ── Habit card ────────────────────────────────────────────────────────────────

function HabitCard({
  habit,
  index,
  localAnswers,
  onAnswer,
}: {
  habit: TrendingHabit;
  index: number;
  localAnswers: LocalAnswers;
  onAnswer: (habitId: number, answer: "me_too" | "not_me") => void;
}) {
  const answered = habit.userAnswer ?? localAnswers[habit.id] ?? null;
  const pct = habit.meTooPct;

  const barColor =
    pct >= 70 ? "bg-amber-400" : pct <= 35 ? "bg-rose-400" : "bg-violet-400";

  const relatabilityLabel =
    pct >= 80
      ? "Highly relatable"
      : pct >= 60
      ? "Pretty common"
      : pct >= 40
      ? "Divided"
      : pct >= 20
      ? "Uncommon"
      : "Rare habit";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, type: "spring", bounce: 0.22 }}
      className="bg-card rounded-2xl shadow-md shadow-black/8 overflow-hidden"
    >
      {/* Question */}
      <div className="px-5 pt-5 pb-4">
        <p className="font-black text-card-foreground text-[1.15rem] leading-snug">
          {habit.question}
        </p>
      </div>

      {/* Bar + percentage */}
      <div className="px-5 pb-4">
        <div className="flex items-end gap-3 mb-2">
          <span className="text-[2.75rem] font-black leading-none text-card-foreground">
            {pct}%
          </span>
          <div className="pb-1.5">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Me Too</p>
            <p className="text-xs text-muted-foreground font-medium">{relatabilityLabel}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: index * 0.045 + 0.18, duration: 0.7, ease: "easeOut" }}
          />
        </div>

        {/* Answer count */}
        <p className="text-xs text-muted-foreground mt-1.5 font-medium">
          {habit.answerCount > 0
            ? `${habit.answerCount.toLocaleString()} ${habit.answerCount === 1 ? "person" : "people"} answered`
            : "Be the first to answer"}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-border/50" />

      {/* Actions */}
      <div className="px-5 py-3.5 flex items-center justify-between">
        <AnswerButtons habit={habit} localAnswers={localAnswers} onAnswer={onAnswer} />
        {answered && (
          <p className="text-xs text-muted-foreground text-right max-w-[130px] leading-tight">
            {answered === "me_too"
              ? pct >= 50
                ? "You're in good company 👋"
                : "You're rare for this one ✨"
              : pct >= 50
              ? "Most people relate to this 🤔"
              : "Same, not many do either 😌"}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CategoryFeedScreen() {
  const params = useParams<{ category: string }>();
  const category = decodeURIComponent(params.category ?? "");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [localAnswers, setLocalAnswers] = useState<LocalAnswers>({});
  const sessionId = getSessionId();

  const queryParams = { category, ...(sessionId ? { sessionId } : {}) };

  const { data: habits, isLoading } = useGetHabitsByCategory(queryParams, {
    query: {
      enabled: !!category,
      queryKey: getGetHabitsByCategoryQueryKey(queryParams),
    },
  });

  const recordAnswer = useRecordAnswer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetHabitsByCategoryQueryKey(queryParams),
        });
      },
    },
  });

  const handleAnswer = (habitId: number, answer: "me_too" | "not_me") => {
    const sid = sessionId;
    if (!sid) return;
    setLocalAnswers((prev) => ({ ...prev, [habitId]: answer }));
    recordAnswer.mutate({ data: { habitId, answer, sessionId: sid } });
  };

  // Aggregate stats
  const stats = useMemo(() => {
    if (!habits || habits.length === 0) return null;
    const totalAnswers = habits.reduce((sum, h) => sum + h.answerCount, 0);
    const avgPct = Math.round(
      habits.reduce((sum, h) => sum + h.meTooPct, 0) / habits.length
    );
    return { totalAnswers, avgPct };
  }, [habits]);

  const emoji = CATEGORY_EMOJI[category as Category] ?? "💬";

  const formatCount = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
      : n.toString();

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/categories")}
          className="flex items-center gap-2 text-white/70 font-semibold text-sm hover:text-white transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h1 className="text-3xl font-black text-white tracking-tight mb-4">
            {emoji} {category}
          </h1>

          {/* Stats banner */}
          {isLoading ? (
            <div className="h-16 rounded-2xl bg-white/10 animate-pulse" />
          ) : stats ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="flex items-center justify-around bg-white/10 backdrop-blur rounded-2xl px-4 py-3.5 border border-white/15"
            >
              <StatPill
                value={(habits?.length ?? 0).toString()}
                label="habits"
              />
              <div className="w-px h-8 bg-white/20" />
              <StatPill
                value={formatCount(stats.totalAnswers)}
                label="answers"
              />
              <div className="w-px h-8 bg-white/20" />
              <StatPill
                value={`${stats.avgPct}%`}
                label="avg relatability"
              />
            </motion.div>
          ) : null}
        </motion.div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/10 animate-pulse" style={{ height: 180 }} />
            ))}
          </div>
        ) : (habits?.length ?? 0) === 0 ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl p-8 text-center"
            >
              <p className="text-4xl mb-3">🫙</p>
              <p className="font-black text-card-foreground text-lg">Nothing here yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                No habits in this category yet.
              </p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-col gap-3">
            {(habits ?? []).map((habit, i) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                index={i}
                localAnswers={localAnswers}
                onAnswer={handleAnswer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
