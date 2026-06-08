import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Users, Percent, Trophy, Fingerprint } from "lucide-react";
import { useLocation } from "wouter";
import { useGetMySubmissions } from "@workspace/api-client-react";
import type { MySubmission } from "@workspace/api-client-react";

const SESSION_KEY = "ain_session_id";
function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

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

function HabitCard({ sub, delay = 0 }: { sub: MySubmission; delay?: number }) {
  const statusKey = (sub.status as Status) in STATUS_CONFIG ? (sub.status as Status) : "pending";
  const cfg = STATUS_CONFIG[statusKey];
  const StatusIcon = cfg.icon;
  const isApproved = sub.status === "approved";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.2, duration: 0.45 }}
      className="w-full bg-card rounded-[1.5rem] p-5 shadow-lg shadow-black/10 flex flex-col gap-3"
    >
      <p className="text-card-foreground font-semibold text-base leading-snug">{sub.question}</p>

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
                {sub.meTooPct !== null ? `${Math.round(sub.meTooPct)}` : "—"}
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
}: {
  sub: MySubmission;
  icon: React.ReactNode;
  label: string;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.25, duration: 0.45 }}
      className="w-full bg-card rounded-[1.5rem] p-5 shadow-lg shadow-black/10 flex flex-col gap-3"
    >
      <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${accent}`}>
        {icon}
        {label}
      </div>
      <p className="text-card-foreground font-semibold text-base leading-snug">{sub.question}</p>
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col items-center gap-0.5 bg-primary/5 rounded-2xl py-2.5 px-3">
          <div className="flex items-center gap-1 text-primary">
            <Percent className="w-3.5 h-3.5" />
            <span className="font-extrabold text-lg leading-none">
              {sub.meTooPct !== null ? `${Math.round(sub.meTooPct)}` : "—"}
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
    </motion.div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MyHabitsScreen() {
  const [, navigate] = useLocation();
  const sessionId = getSessionId();

  const { data: submissions = [], isLoading } = useGetMySubmissions(
    { sessionId: sessionId ?? "" },
    { query: { enabled: !!sessionId } }
  );

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
          <p className="text-purple-200 font-medium text-sm mt-1">
            {submissions.length === 0 && !isLoading
              ? "Habits you submit will appear here."
              : `${submissions.length} habit${submissions.length !== 1 ? "s" : ""} submitted`}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* Loading */}
          {isLoading && (
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

          {/* No session or empty */}
          {!isLoading && !sessionId && (
            <motion.div
              key="no-session"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-[1.5rem] p-8 shadow-xl text-center"
            >
              <p className="text-card-foreground/60 font-medium">
                Start playing and submit a habit to see it here.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/")}
                className="mt-5 bg-primary text-white font-bold px-6 py-3 rounded-full text-sm"
              >
                Start Discovering
              </motion.button>
            </motion.div>
          )}

          {!isLoading && sessionId && submissions.length === 0 && (
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

          {!isLoading && sessionId && submissions.length > 0 && (
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
                    />
                  )}

                  {showMostUnique && mostUnique && (
                    <HighlightCard
                      sub={mostUnique}
                      icon={<Fingerprint className="w-3.5 h-3.5" />}
                      label="Most Unique"
                      accent="text-violet-400"
                      delay={0.1}
                    />
                  )}
                </div>
              )}

              {/* All submissions */}
              <div className="flex flex-col gap-3">
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest px-1">All Submitted</p>
                {submissions.map((sub, i) => (
                  <HabitCard key={sub.id} sub={sub} delay={0.05 + i * 0.04} />
                ))}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
