import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Users, Percent, Trophy, Fingerprint, ChevronRight, LogIn, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteMySubmission, useGetMySubmissions, getGetMySubmissionsQueryKey } from "@workspace/api-client-react";
import type { MySubmission } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";

// ── Status config ─────────────────────────────────────────────────────────────

type Status = "pending" | "approved" | "rejected";

const STATUS_CONFIG: Record<Status, { label: string; icon: typeof Clock; bg: string; text: string; border: string }> = {
  pending: {
    label: "Under Review",
    icon: Clock,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  approved: {
    label: "Live in Feed",
    icon: CheckCircle2,
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  rejected: {
    label: "Not Approved",
    icon: XCircle,
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRespondents(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ── Habit card ────────────────────────────────────────────────────────────────

function HabitCard({
  sub,
  delay = 0,
  onPress,
  onDelete,
  isDeleting,
}: {
  sub: MySubmission;
  delay?: number;
  onPress: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const statusKey = (sub.status as Status) in STATUS_CONFIG ? (sub.status as Status) : "pending";
  const cfg = STATUS_CONFIG[statusKey];
  const StatusIcon = cfg.icon;
  const isApproved = sub.status === "approved";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.2, duration: 0.45 }}
      whileTap={{ scale: 0.98 }}
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress();
        }
      }}
      className="w-full bg-card rounded-[1.5rem] p-5 shadow-lg shadow-black/10 flex flex-col gap-3 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-card-foreground font-semibold text-base leading-snug flex-1">{sub.question}</p>
        <ChevronRight className="w-4 h-4 text-card-foreground/25 flex-shrink-0 mt-0.5" />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {cfg.label}
        </span>
        <span className="text-card-foreground/35 text-xs font-medium">{formatDate(sub.submittedAt)}</span>
      </div>

      {isApproved && (
        <div className="flex gap-3 pt-1 border-t border-purple-100">
          <div className="flex-1 flex flex-col items-center gap-0.5 bg-primary/5 rounded-2xl py-2.5 px-3">
            <div className="flex items-center gap-1 text-primary">
              <Percent className="w-3.5 h-3.5" />
              <span className="font-extrabold text-lg leading-none">
                {sub.meTooPct != null ? `${Math.round(sub.meTooPct)}` : "—"}
              </span>
            </div>
            <span className="text-card-foreground/40 text-[10px] font-semibold uppercase tracking-wider">Me Too</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5 bg-primary/5 rounded-2xl py-2.5 px-3">
            <div className="flex items-center gap-1 text-primary">
              <Users className="w-3.5 h-3.5" />
              <span className="font-extrabold text-lg leading-none">
                {sub.answerCount > 0 ? formatRespondents(sub.answerCount) : "—"}
              </span>
            </div>
            <span className="text-card-foreground/40 text-[10px] font-semibold uppercase tracking-wider">Responses</span>
          </div>
        </div>
      )}
      <div className="pt-1 border-t border-purple-100 flex justify-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Highlight card ────────────────────────────────────────────────────────────

function HighlightCard({
  sub,
  icon,
  label,
  accent,
  delay,
  onPress,
}: {
  sub: MySubmission;
  icon: React.ReactNode;
  label: string;
  accent: string;
  delay: number;
  onPress: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.25, duration: 0.45 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="w-full bg-card rounded-[1.5rem] p-5 shadow-lg shadow-black/10 flex flex-col gap-3 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${accent}`}>
          {icon}
          {label}
        </div>
        <ChevronRight className="w-4 h-4 text-card-foreground/25 flex-shrink-0" />
      </div>
      <p className="text-card-foreground font-semibold text-base leading-snug">{sub.question}</p>
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col items-center gap-0.5 bg-primary/5 rounded-2xl py-2.5 px-3">
          <div className="flex items-center gap-1 text-primary">
            <Percent className="w-3.5 h-3.5" />
            <span className="font-extrabold text-lg leading-none">
              {sub.meTooPct != null ? `${Math.round(sub.meTooPct)}` : "—"}
            </span>
          </div>
          <span className="text-card-foreground/40 text-[10px] font-semibold uppercase tracking-wider">Me Too</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5 bg-primary/5 rounded-2xl py-2.5 px-3">
          <div className="flex items-center gap-1 text-primary">
            <Users className="w-3.5 h-3.5" />
            <span className="font-extrabold text-lg leading-none">
              {sub.answerCount > 0 ? formatRespondents(sub.answerCount) : "—"}
            </span>
          </div>
          <span className="text-card-foreground/40 text-[10px] font-semibold uppercase tracking-wider">Responses</span>
        </div>
      </div>
    </motion.button>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MyHabitsScreen() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const goToDetail = (id: number) => navigate(`/my-habits/${id}`);

  const qParams = {};
  const submissionsQueryKey = getGetMySubmissionsQueryKey(qParams);
  const { data: submissions = [], isLoading } = useGetMySubmissions(
    qParams,
    { query: { enabled: !!user, queryKey: submissionsQueryKey } }
  );

  const deleteSubmission = useDeleteMySubmission({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.setQueryData<MySubmission[]>(submissionsQueryKey, (current) =>
          current?.filter((submission) => submission.id !== variables.id) ?? [],
        );
        queryClient.invalidateQueries({ queryKey: submissionsQueryKey });
        setDeleteError(null);
      },
      onError: (error) => {
        const apiError = error as { data?: { error?: string } | null };
        setDeleteError(apiError.data?.error ?? "Unable to delete this habit. Please try again.");
      },
    },
  });

  const handleDelete = (submission: MySubmission) => {
    const confirmed = window.confirm(
      `Delete “${submission.question}”? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteError(null);
    deleteSubmission.mutate({ id: submission.id });
  };

  const approvedWithPct = submissions.filter(
    (s) => s.status === "approved" && s.meTooPct !== null && s.answerCount > 0
  );

  const mostRelatable =
    approvedWithPct.length > 0
      ? approvedWithPct.reduce((a, b) => (a.meTooPct! >= b.meTooPct! ? a : b))
      : null;

  const mostUnique =
    approvedWithPct.length > 1
      ? approvedWithPct.reduce((a, b) => (a.meTooPct! <= b.meTooPct! ? a : b))
      : null;

  const showMostUnique = mostUnique && mostUnique.id !== mostRelatable?.id;

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
          className="mb-6"
        >
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Habits</h1>
          {user && (
            <p className="text-purple-200 font-medium text-sm mt-1">
              {submissions.length === 0 && !isLoading
                ? "Habits you submit will appear here."
                : `${submissions.length} habit${submissions.length !== 1 ? "s" : ""} submitted`}
            </p>
          )}
        </motion.div>

        {deleteError && (
          <div className="mb-4 rounded-2xl bg-red-100 border border-red-200 px-4 py-3 text-red-700 text-sm font-semibold">
            {deleteError}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* Not logged in */}
          {!user && (
            <motion.div
              key="not-authed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-[1.5rem] p-8 shadow-xl text-center"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <p className="text-card-foreground font-bold text-lg mb-2">Sign in to see your habits</p>
              <p className="text-card-foreground/50 text-sm leading-relaxed mb-6">
                Create an account to submit habits and track how many people relate.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate("/login")}
                  className="flex-1 py-3 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
                >
                  Log In
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate("/signup")}
                  className="flex-1 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30"
                >
                  Sign Up
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {user && isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/60 font-medium text-sm">Loading your habits…</p>
            </motion.div>
          )}

          {/* Empty */}
          {user && !isLoading && submissions.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-[1.5rem] p-8 shadow-xl text-center"
            >
              <p className="text-2xl mb-3">💬</p>
              <p className="text-card-foreground font-bold text-lg mb-1">Nothing yet</p>
              <p className="text-card-foreground/55 text-sm leading-relaxed">
                Hit the <strong>+</strong> button while playing to share a weird habit you do.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/submit")}
                className="mt-5 bg-primary text-white font-bold px-6 py-3 rounded-full text-sm"
              >
                Share a Habit
              </motion.button>
            </motion.div>
          )}

          {user && !isLoading && submissions.length > 0 && (
            <motion.div key="content" className="flex flex-col gap-4">

              {/* Highlights */}
              {(mostRelatable || showMostUnique) && (
                <div className="flex flex-col gap-3">
                  <p className="text-white/50 text-xs font-bold uppercase tracking-widest px-1">Highlights</p>

                  {mostRelatable && (
                    <HighlightCard
                      sub={mostRelatable}
                      icon={<Trophy className="w-3.5 h-3.5" />}
                      label="Most Relatable"
                      accent="text-amber-400"
                      delay={0.05}
                      onPress={() => goToDetail(mostRelatable.id)}
                    />
                  )}

                  {showMostUnique && mostUnique && (
                    <HighlightCard
                      sub={mostUnique}
                      icon={<Fingerprint className="w-3.5 h-3.5" />}
                      label="Most Unique"
                      accent="text-violet-400"
                      delay={0.1}
                      onPress={() => goToDetail(mostUnique.id)}
                    />
                  )}
                </div>
              )}

              {/* All submissions */}
              <div className="flex flex-col gap-3">
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest px-1">All Submitted</p>
                {submissions.map((sub, i) => (
                  <HabitCard
                    key={sub.id}
                    sub={sub}
                    delay={0.05 + i * 0.04}
                    onPress={() => goToDetail(sub.id)}
                    onDelete={() => handleDelete(sub)}
                    isDeleting={deleteSubmission.isPending && deleteSubmission.variables?.id === sub.id}
                  />
                ))}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
