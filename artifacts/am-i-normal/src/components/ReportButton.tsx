import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flag } from "lucide-react";
import { useReportHabit } from "@workspace/api-client-react";

const REPORTED_KEY = "ain_reported_habits";

const REPORT_REASONS = [
  "Not a habit",
  "Sexual content",
  "Drug-related content",
  "Offensive content",
  "Spam",
] as const;

type ReportButtonProps = {
  habit: { id: number };
  sessionId: string;
  tone?: "dark" | "light";
};

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

export default function ReportButton({
  habit,
  sessionId,
  tone = "dark",
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(() => getReportedHabits().has(habit.id));
  const [selectedReason, setSelectedReason] = useState("");
  const reportHabit = useReportHabit();
  const isLight = tone === "light";

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
          // Treat a duplicate response as reported, including a race between tabs.
          markHabitReported(habit.id);
          setDone(true);
          setOpen(false);
        },
      },
    );
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center justify-center gap-1.5 text-xs font-medium py-1 ${
          isLight ? "text-muted-foreground" : "text-white/35"
        }`}
      >
        <Check className="w-3 h-3" /> Reported
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <button
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 text-xs font-medium py-1 transition-colors ${
          isLight
            ? "text-muted-foreground hover:text-card-foreground"
            : "text-white/35 hover:text-white/60"
        }`}
      >
        <Flag className="w-3 h-3" />
        Report this habit
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden w-full mt-2"
          >
            <div
              className={`backdrop-blur border rounded-2xl p-4 flex flex-col gap-3 ${
                isLight
                  ? "bg-muted/50 border-border"
                  : "bg-white/10 border-white/20"
              }`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? "text-muted-foreground" : "text-white/60"
                }`}
              >
                Why are you reporting this?
              </p>
              <div className="flex flex-wrap gap-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() =>
                      setSelectedReason((current) =>
                        reason === current ? "" : reason,
                      )
                    }
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      selectedReason === reason
                        ? isLight
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-purple-900 border-white"
                        : isLight
                          ? "bg-card text-card-foreground/70 border-border hover:bg-muted"
                          : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setSelectedReason("");
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isLight
                      ? "text-muted-foreground hover:text-card-foreground"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || reportHabit.isPending}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border disabled:opacity-40 transition-colors ${
                    isLight
                      ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      : "bg-white/15 text-white border-white/20 hover:bg-white/25"
                  }`}
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