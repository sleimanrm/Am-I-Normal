import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Users, Flag, TrendingUp, TrendingDown, Hourglass } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useGetMySubmissions, getGetMySubmissionsQueryKey } from "@workspace/api-client-react";

const SESSION_KEY = "ain_session_id";
function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

type Status = "pending" | "approved" | "rejected";

const STATUS_CONFIG: Record<Status, { label: string; icon: typeof Clock; pill: string }> = {
  pending: { label: "Under Review", icon: Clock, pill: "bg-amber-100 text-amber-700 border border-amber-200" },
  approved: { label: "Live in Feed", icon: CheckCircle2, pill: "bg-green-100 text-green-700 border border-green-200" },
  rejected: { label: "Not Approved", icon: XCircle, pill: "bg-red-100 text-red-600 border border-red-200" },
};

function StatTile({
  value,
  label,
  icon,
  accent = "text-primary",
  delay = 0,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.2, duration: 0.4 }}
      className="flex-1 min-w-0 flex flex-col items-center gap-1 bg-primary/6 rounded-2xl py-4 px-2"
    >
      <div className={`flex items-center gap-1 ${accent}`}>
        {icon}
        <span className="font-extrabold text-2xl leading-none">{value}</span>
      </div>
      <span className="text-card-foreground/45 text-[10px] font-bold uppercase tracking-wider text-center">{label}</span>
    </motion.div>
  );
}

export default function HabitDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const sessionId = getSessionId();

  const params = { sessionId: sessionId ?? "" };
  const { data: submissions = [], isLoading } = useGetMySubmissions(
    params,
    { query: { enabled: !!sessionId, queryKey: getGetMySubmissionsQueryKey(params) } }
  );

  const sub = submissions.find((s) => s.id === Number(id));

  const statusKey = sub && (sub.status as Status) in STATUS_CONFIG ? (sub.status as Status) : "pending";
  const cfg = sub ? STATUS_CONFIG[statusKey] : null;
  const StatusIcon = cfg?.icon ?? Clock;

  const isApproved = sub?.status === "approved";
  const hasAnswers = isApproved && sub.answerCount > 0 && sub.meTooPct !== null;

  const meTooPct = hasAnswers ? Math.round(sub.meTooPct!) : null;
  const notMePct = meTooPct !== null ? 100 - meTooPct : null;

  return (
    <div
      className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-y-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="w-full max-w-[390px] mx-auto px-4 pt-6 pb-12">

        {/* Back button */}
        <div className="flex items-center gap-3 mb-6">
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate("/my-habits")}
            className="flex items-center gap-2 text-white/70 font-semibold text-sm hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            My Habits
          </motion.button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 font-medium text-sm">Loading…</p>
          </div>
        )}

        {/* Not found */}
        {!isLoading && !sub && (
          <div className="bg-card rounded-[1.5rem] p-8 text-center shadow-xl">
            <p className="text-card-foreground/60 font-medium">Habit not found.</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && sub && cfg && (
          <div className="flex flex-col gap-5">

            {/* Question card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
              className="bg-card rounded-[1.75rem] p-6 shadow-xl shadow-black/15"
            >
              <p className="text-card-foreground font-bold text-xl leading-snug mb-4">
                {sub.question}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.pill}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {cfg.label}
                </span>
                <span className="text-card-foreground/35 text-xs font-medium">
                  {new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </motion.div>

            {/* Analytics card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07, type: "spring", bounce: 0.2, duration: 0.45 }}
              className="bg-card rounded-[1.75rem] p-6 shadow-xl shadow-black/15"
            >
              <h2 className="text-card-foreground font-extrabold text-base mb-4 tracking-tight">Analytics</h2>

              {/* Pending / no answers yet */}
              {!hasAnswers && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.12 }}
                  className="flex flex-col items-center gap-3 py-6"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <Hourglass className="w-7 h-7 text-primary/50" />
                  </div>
                  <p className="text-card-foreground/55 font-semibold text-sm text-center leading-relaxed">
                    {sub.status === "pending"
                      ? "Waiting for community responses."
                      : "No responses yet — check back soon."}
                  </p>
                </motion.div>
              )}

              {/* Live stats */}
              {hasAnswers && (
                <>
                  {/* Bar */}
                  <div className="w-full h-3 rounded-full bg-red-100 overflow-hidden mb-5">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${meTooPct}%` }}
                      transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>

                  {/* Tiles row */}
                  <div className="flex gap-3 mb-3">
                    <StatTile
                      value={`${meTooPct}%`}
                      label="Me Too"
                      icon={<TrendingUp className="w-4 h-4" />}
                      accent="text-primary"
                      delay={0.15}
                    />
                    <StatTile
                      value={`${notMePct}%`}
                      label="Not Me"
                      icon={<TrendingDown className="w-4 h-4" />}
                      accent="text-rose-500"
                      delay={0.2}
                    />
                    <StatTile
                      value={sub.answerCount >= 1000 ? `${(sub.answerCount / 1000).toFixed(1)}k` : sub.answerCount}
                      label="Answers"
                      icon={<Users className="w-4 h-4" />}
                      accent="text-violet-600"
                      delay={0.25}
                    />
                    <StatTile
                      value={sub.reportCount}
                      label="Reports"
                      icon={<Flag className="w-4 h-4" />}
                      accent={sub.reportCount > 0 ? "text-orange-500" : "text-card-foreground/30"}
                      delay={0.3}
                    />
                  </div>

                  {/* Me Too interpretation */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-card-foreground/45 text-xs font-medium text-center pt-1"
                  >
                    {meTooPct! >= 70
                      ? "😄 Super relatable — most people do this too."
                      : meTooPct! >= 40
                      ? "🤷 Pretty normal — you're in good company."
                      : meTooPct! >= 20
                      ? "🦄 A bit unique — not everyone gets it."
                      : "🎭 Very rare — you're one of a kind."}
                  </motion.p>
                </>
              )}
            </motion.div>

          </div>
        )}

      </div>
    </div>
  );
}
