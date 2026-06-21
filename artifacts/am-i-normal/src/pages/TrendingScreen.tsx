import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Flame, Zap, Swords, Sparkles, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import {
  useGetTrending,
  getGetTrendingQueryKey,
  useRecordAnswer,
} from "@workspace/api-client-react";
import type { TrendingHabit } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const SESSION_KEY = "ain_session_id";
function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LocalAnswers = Record<number, "me_too" | "not_me">;

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
      <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${answered === "me_too" ? "bg-primary/10 text-primary" : "bg-rose-50 text-rose-500"}`}>
        {answered === "me_too" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
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

// ── Spotlight card ─────────────────────────────────────────────────────────────

function SpotlightCard({
  habit,
  emoji,
  label,
  accentBar,
  delay,
  localAnswers,
  onAnswer,
}: {
  habit: TrendingHabit;
  emoji: string;
  label: string;
  accentBar: string;
  delay?: number;
  localAnswers: LocalAnswers;
  onAnswer: (habitId: number, answer: "me_too" | "not_me") => void;
}) {
  const pct = Math.round(habit.meTooPct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.2, duration: 0.45 }}
      className="bg-card rounded-[1.75rem] p-5 shadow-xl shadow-black/15"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg leading-none">{emoji}</span>
        <span className="text-xs font-extrabold uppercase tracking-widest text-card-foreground/40">{label}</span>
      </div>

      <p className="text-card-foreground font-bold text-base leading-snug mb-4">{habit.question}</p>

      {/* Bar */}
      <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${accentBar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: (delay ?? 0) + 0.15, duration: 0.65, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-2xl text-card-foreground">{pct}%</span>
          <span className="text-card-foreground/40 text-xs font-semibold">Me Too</span>
          <span className="text-card-foreground/25 text-xs">·</span>
          <div className="flex items-center gap-1 text-card-foreground/35">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">
              {habit.answerCount >= 1000 ? `${(habit.answerCount / 1000).toFixed(1)}k` : habit.answerCount}
            </span>
          </div>
        </div>

        <AnswerButtons habit={habit} localAnswers={localAnswers} onAnswer={onAnswer} />
      </div>
    </motion.div>
  );
}

// ── Community habit row ────────────────────────────────────────────────────────

function CommunityCard({
  habit,
  delay,
  localAnswers,
  onAnswer,
}: {
  habit: TrendingHabit;
  delay?: number;
  localAnswers: LocalAnswers;
  onAnswer: (habitId: number, answer: "me_too" | "not_me") => void;
}) {
  const pct = Math.round(habit.meTooPct);
  const hasAnswers = habit.answerCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.2, duration: 0.4 }}
      className="bg-card rounded-[1.5rem] p-4 shadow-lg shadow-black/10"
    >
      <p className="text-card-foreground font-semibold text-sm leading-snug mb-3">{habit.question}</p>

      {hasAnswers && (
        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: (delay ?? 0) + 0.1, duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        {hasAnswers ? (
          <div className="flex items-center gap-2 text-card-foreground/40">
            <span className="text-sm font-bold text-primary">{pct}%</span>
            <span className="text-xs">Me Too</span>
            <span className="text-card-foreground/20">·</span>
            <Users className="w-3 h-3" />
            <span className="text-xs font-medium">{habit.answerCount}</span>
          </div>
        ) : (
          <span className="text-card-foreground/30 text-xs">Be the first to answer!</span>
        )}

        <AnswerButtons habit={habit} localAnswers={localAnswers} onAnswer={onAnswer} />
      </div>
    </motion.div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ emoji, title, delay }: { emoji: string; title: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-2 px-1"
    >
      <span className="text-base">{emoji}</span>
      <span className="text-white/55 text-xs font-extrabold uppercase tracking-widest">{title}</span>
    </motion.div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function TrendingScreen() {
  const [, navigate] = useLocation();
  const sessionId = getOrCreateSessionId();
  const queryClient = useQueryClient();
  const [localAnswers, setLocalAnswers] = useState<LocalAnswers>({});

  const trendingParams = { sessionId };
  const { data, isLoading } = useGetTrending(trendingParams, {
    query: { queryKey: getGetTrendingQueryKey(trendingParams) },
  });

  const { mutate: recordAnswer } = useRecordAnswer();

  const handleAnswer = (habitId: number, answer: "me_too" | "not_me") => {
    if (!sessionId) return;
    setLocalAnswers((prev) => ({ ...prev, [habitId]: answer }));
    recordAnswer(
      { data: { habitId, sessionId, answer } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTrendingQueryKey(trendingParams) });
        },
      }
    );
  };

  const { mostRelatable, mostSurprising, mostDivisive, newFromCommunity = [] } = data ?? {};
  const spotlights = [mostRelatable, mostSurprising, mostDivisive].filter(Boolean);

  return (
    <div
      className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-y-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="w-full max-w-[390px] mx-auto px-4 pt-6 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/70 font-semibold text-sm hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7"
        >
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Trending</h1>
          <p className="text-purple-200 font-medium text-sm mt-1">What the community is saying</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-3"
            >
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/60 font-medium text-sm">Loading trends…</p>
            </motion.div>
          )}

          {!isLoading && (
            <motion.div key="content" className="flex flex-col gap-5">

              {/* Spotlight section */}
              {spotlights.length > 0 && (
                <div className="flex flex-col gap-3">
                  <SectionHeader emoji="🔥" title="Community Highlights" delay={0.02} />

                  {mostRelatable && (
                    <SpotlightCard
                      habit={mostRelatable}
                      emoji="🔥"
                      label="Most Relatable"
                      accentBar="bg-amber-400"
                      delay={0.05}
                      localAnswers={localAnswers}
                      onAnswer={handleAnswer}
                    />
                  )}

                  {mostSurprising && (
                    <SpotlightCard
                      habit={mostSurprising}
                      emoji="🤯"
                      label="Most Surprising"
                      accentBar="bg-rose-400"
                      delay={0.1}
                      localAnswers={localAnswers}
                      onAnswer={handleAnswer}
                    />
                  )}

                  {mostDivisive && (
                    <SpotlightCard
                      habit={mostDivisive}
                      emoji="⚔️"
                      label="Most Divisive"
                      accentBar="bg-violet-400"
                      delay={0.15}
                      localAnswers={localAnswers}
                      onAnswer={handleAnswer}
                    />
                  )}
                </div>
              )}

              {/* New from community */}
              {newFromCommunity.length > 0 && (
                <div className="flex flex-col gap-3">
                  <SectionHeader emoji="🆕" title="New From The Community" delay={0.2} />
                  {newFromCommunity.map((habit, i) => (
                    <CommunityCard
                      key={habit.id}
                      habit={habit}
                      delay={0.22 + i * 0.04}
                      localAnswers={localAnswers}
                      onAnswer={handleAnswer}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {spotlights.length === 0 && newFromCommunity.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-[1.75rem] p-8 shadow-xl text-center"
                >
                  <p className="text-3xl mb-3">📊</p>
                  <p className="text-card-foreground font-bold text-lg mb-1">Nothing yet</p>
                  <p className="text-card-foreground/55 text-sm leading-relaxed">
                    Swipe more habits to build up community data — trends will appear here soon.
                  </p>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
