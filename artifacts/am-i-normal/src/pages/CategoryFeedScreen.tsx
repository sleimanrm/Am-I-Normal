import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X, Users } from "lucide-react";
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
        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
          answered === "me_too"
            ? "bg-primary/10 text-primary"
            : "bg-rose-50 text-rose-500"
        }`}
      >
        {answered === "me_too" ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <X className="w-3.5 h-3.5" />
        )}
        {answered === "me_too" ? "Me Too" : "Not Me"}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => onAnswer(habit.id, "me_too")}
        className="flex items-center gap-1.5 bg-primary/10 text-primary font-bold text-xs px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
        Me Too
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => onAnswer(habit.id, "not_me")}
        className="flex items-center gap-1.5 bg-rose-50 text-rose-500 font-bold text-xs px-3 py-1.5 rounded-full border border-rose-100 hover:bg-rose-100 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Not Me
      </motion.button>
    </div>
  );
}

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
    pct >= 70
      ? "bg-amber-400"
      : pct <= 35
      ? "bg-rose-400"
      : "bg-violet-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", bounce: 0.25 }}
      className="bg-card rounded-2xl p-5 shadow-md shadow-black/5"
    >
      <p className="font-bold text-foreground text-base leading-snug mb-4">
        {habit.question}
      </p>

      {/* Bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: index * 0.04 + 0.2, duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-foreground">{pct}%</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-semibold">Me Too</span>
            {habit.answerCount > 0 && (
              <>
                <span>·</span>
                <Users className="w-3 h-3" />
                <span>{habit.answerCount.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
        <AnswerButtons
          habit={habit}
          localAnswers={localAnswers}
          onAnswer={onAnswer}
        />
      </div>

      {answered && (
        <p className="text-xs text-muted-foreground mt-2">
          {answered === "me_too"
            ? `${pct >= 50 ? "You're in good company" : "You're rare for this one"}!`
            : `${pct >= 50 ? "Interesting — most people relate to this" : "Same, most people don't either"}.`}
        </p>
      )}
    </motion.div>
  );
}

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

  const emoji = CATEGORY_EMOJI[category as Category] ?? "💬";

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
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
          <h1 className="text-3xl font-black text-white tracking-tight">
            {emoji} {category}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {isLoading
              ? "Loading…"
              : `${habits?.length ?? 0} habit${(habits?.length ?? 0) !== 1 ? "s" : ""}`}
          </p>
        </motion.div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/10 animate-pulse" />
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
              <p className="font-black text-foreground text-lg">Nothing here yet</p>
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
