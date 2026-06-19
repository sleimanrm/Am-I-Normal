import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, Clock, ShieldCheck, Pencil, Save, ChevronDown, ChevronUp,
  BookOpen, AlertCircle, Flag, Trash2, CheckCircle2,
} from "lucide-react";
import {
  useListSubmissions,
  useUpdateSubmission,
  getListSubmissionsQueryKey,
  useGetFlaggedHabits,
  getGetFlaggedHabitsQueryKey,
  useUpdateFlaggedHabit,
} from "@workspace/api-client-react";
import type { Submission, FlaggedHabit } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// ── Constants ─────────────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  "Too generic",
  "Not a habit",
  "Offensive content",
  "Sexual content",
  "Drug-related content",
  "Spam",
  "Duplicate",
] as const;

const GUIDELINES = [
  { icon: "🎯", label: "Specific", desc: "Describes a concrete behaviour, not a vague feeling." },
  { icon: "🔄", label: "Behavioral", desc: "Something you actually do, not just a thought or preference." },
  { icon: "🤝", label: "Relatable", desc: "Others could plausibly recognise themselves in it." },
  { icon: "🤔", label: "Wonderable", desc: "Makes you wonder if anyone else does the same thing." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Guidelines panel ──────────────────────────────────────────────────────────

function GuidelinesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl overflow-hidden mb-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-violet-300" />
          <span className="text-white font-bold text-sm">Moderation Guidelines</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
              <p className="text-white/60 text-xs leading-relaxed">
                A valid habit must satisfy <strong className="text-white/80">all four</strong> criteria:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GUIDELINES.map(({ icon, label, desc }) => (
                  <div key={label} className="bg-white/8 rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{icon}</span>
                      <span className="text-white font-bold text-sm">{label}</span>
                    </div>
                    <p className="text-white/50 text-xs leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-red-500/15 border border-red-400/25 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-200 text-xs leading-relaxed">
                    Always reject habits with offensive, sexual, or drug-related content regardless of how specific they are.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Submission card ───────────────────────────────────────────────────────────

type CardMode = "view" | "edit" | "reject";

interface ActionPayload {
  status?: string;
  question?: string;
  moderationReason?: string | null;
}

function SubmissionCard({
  submission,
  onAction,
  isPending: isMutating,
}: {
  submission: Submission;
  onAction: (id: number, payload: ActionPayload) => void;
  isPending: boolean;
}) {
  const [mode, setMode] = useState<CardMode>("view");
  const [editText, setEditText] = useState(submission.question);
  const [selectedReason, setSelectedReason] = useState<string>("");

  const statusIs = (s: string) => submission.status === s;

  const reset = () => {
    setMode("view");
    setEditText(submission.question);
    setSelectedReason("");
  };

  const handleApprove = () => { reset(); onAction(submission.id, { status: "approved" }); };
  const handleReject = () => {
    if (!selectedReason) return;
    onAction(submission.id, { status: "rejected", moderationReason: selectedReason });
    reset();
  };
  const handleSave = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === submission.question) { reset(); return; }
    onAction(submission.id, { question: trimmed });
    reset();
  };
  const handleSaveAndApprove = () => {
    const trimmed = editText.trim();
    onAction(submission.id, { status: "approved", question: trimmed || undefined });
    reset();
  };

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-purple-100"
    >
      <div className="p-5">
        {mode === "edit" ? (
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
            maxLength={280} rows={3}
            className="w-full resize-none rounded-xl border border-purple-200 bg-purple-50 p-3 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3" />
        ) : (
          <p className="text-gray-800 font-medium text-base leading-snug mb-3">{submission.question}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">{timeAgo(submission.submittedAt)}</span>
          <div className="flex items-center gap-2">
            {statusIs("pending") && (
              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" /> Pending
              </span>
            )}
            {statusIs("approved") && (
              <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <Check className="w-3 h-3" /> Approved
              </span>
            )}
            {statusIs("rejected") && (
              <span className="flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                <X className="w-3 h-3" /> Rejected
              </span>
            )}
          </div>
        </div>

        {statusIs("rejected") && submission.moderationReason && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs font-semibold text-red-500">{submission.moderationReason}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {mode === "reject" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-red-100 bg-red-50/60"
          >
            <div className="p-4 space-y-3">
              <p className="text-red-700 font-bold text-xs uppercase tracking-wider">Select a reason</p>
              <div className="flex flex-wrap gap-2">
                {REJECTION_REASONS.map((reason) => (
                  <button key={reason}
                    onClick={() => setSelectedReason(reason === selectedReason ? "" : reason)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      selectedReason === reason
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-red-600 border-red-200 hover:border-red-400"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={reset}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={!selectedReason || isMutating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                  <X className="w-4 h-4" /> Confirm Rejection
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode !== "reject" && (
        <div className="px-5 pb-4 flex gap-2">
          {mode === "edit" ? (
            <>
              <button onClick={reset}
                className="py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              {statusIs("pending") && (
                <button onClick={handleSaveAndApprove} disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> Save & Approve
                </button>
              )}
              <button onClick={handleSave} disabled={isMutating}
                className={`${statusIs("pending") ? "" : "flex-1"} flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50`}>
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setMode("edit")}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              {!statusIs("rejected") && (
                <button onClick={() => setMode("reject")} disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">
                  <X className="w-4 h-4" /> Reject
                </button>
              )}
              {!statusIs("approved") && (
                <button onClick={handleApprove} disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
                  <Check className="w-4 h-4" /> Approve
                </button>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Flagged habit card ────────────────────────────────────────────────────────

function FlaggedHabitCard({
  habit,
  onAction,
  isPending,
}: {
  habit: FlaggedHabit;
  onAction: (id: number, action: "dismiss" | "archive") => void;
  isPending: boolean;
}) {
  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-red-100"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-gray-800 font-medium text-base leading-snug flex-1">{habit.question}</p>
          <span className="flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
            <Flag className="w-3 h-3" /> {habit.reportCount} report{habit.reportCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Report reasons breakdown */}
        {habit.topReasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {habit.topReasons.map(({ reason, count }) => (
              <span key={reason}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                {reason}
                <span className="bg-red-200 text-red-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{count}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{habit.category}</span>
          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{habit.source}</span>
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2 border-t border-gray-100 pt-3">
        <button
          onClick={() => onAction(habit.id, "dismiss")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" /> Dismiss Flag
        </button>
        <button
          onClick={() => onAction(habit.id, "archive")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> Archive
        </button>
      </div>
    </motion.div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type MainTab = "submissions" | "flagged";
type FilterTab = "pending" | "approved" | "rejected";

export default function AdminScreen() {
  const [mainTab, setMainTab] = useState<MainTab>("submissions");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("pending");
  const queryClient = useQueryClient();

  // ── Submissions ──────────────────────────────────────────────────────────
  const { data: submissions = [], isLoading: subsLoading } = useListSubmissions();

  const updateSubmission = useUpdateSubmission({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      },
    },
  });

  const handleAction = (id: number, payload: ActionPayload) => {
    updateSubmission.mutate({ id, data: payload });
  };

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const rejected = submissions.filter((s) => s.status === "rejected");

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "approved", label: "Approved", count: approved.length },
    { key: "rejected", label: "Rejected", count: rejected.length },
  ];

  const visibleSubmissions =
    activeFilter === "pending" ? pending : activeFilter === "approved" ? approved : rejected;

  // ── Flagged habits ───────────────────────────────────────────────────────
  const { data: flaggedHabits = [], isLoading: flaggedLoading } = useGetFlaggedHabits();

  const updateFlagged = useUpdateFlaggedHabit({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFlaggedHabitsQueryKey() });
      },
    },
  });

  const handleFlaggedAction = (id: number, action: "dismiss" | "archive") => {
    updateFlagged.mutate({ id, data: { action } });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] p-4 pb-12">
      <div className="w-full max-w-[500px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 py-6">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl leading-none">Admin Dashboard</h1>
            <p className="text-white/50 text-xs mt-0.5">
              {submissions.length} submissions · {flaggedHabits.length} flagged
            </p>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Pending", value: pending.length, color: "bg-amber-400" },
            { label: "Approved", value: approved.length, color: "bg-green-400" },
            { label: "Rejected", value: rejected.length, color: "bg-red-400" },
            { label: "Flagged", value: flaggedHabits.length, color: "bg-orange-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/10 rounded-2xl p-3 text-center backdrop-blur border border-white/15">
              <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-1.5`} />
              <p className="text-white font-extrabold text-xl leading-none">{value}</p>
              <p className="text-white/50 text-[10px] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Main tabs ── */}
        <div className="flex bg-white/10 rounded-2xl p-1 mb-5 gap-1">
          <button
            onClick={() => setMainTab("submissions")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              mainTab === "submissions" ? "bg-white text-purple-900 shadow-sm" : "text-white/60 hover:text-white"
            }`}
          >
            Submissions
            {pending.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${mainTab === "submissions" ? "bg-amber-100 text-amber-700" : "bg-white/20 text-white"}`}>
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainTab("flagged")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              mainTab === "flagged" ? "bg-white text-purple-900 shadow-sm" : "text-white/60 hover:text-white"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            Flagged Habits
            {flaggedHabits.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${mainTab === "flagged" ? "bg-red-100 text-red-700" : "bg-white/20 text-white"}`}>
                {flaggedHabits.length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ─────────────────── SUBMISSIONS TAB ─────────────────────────── */}
          {mainTab === "submissions" && (
            <motion.div key="submissions"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            >
              <GuidelinesPanel />

              {/* Filter tabs */}
              <div className="flex bg-white/10 rounded-2xl p-1 mb-5 gap-1">
                {filterTabs.map(({ key, label, count }) => (
                  <button key={key} onClick={() => setActiveFilter(key)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      activeFilter === key ? "bg-white text-purple-900 shadow-sm" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {label}{count > 0 && <span className="opacity-60"> ({count})</span>}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeFilter}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                  className="flex flex-col gap-3"
                >
                  {subsLoading ? (
                    <div className="text-center py-16 text-white/40 font-medium">Loading…</div>
                  ) : visibleSubmissions.length === 0 ? (
                    <div className="text-center py-16 text-white/40 font-medium">Nothing here yet.</div>
                  ) : (
                    <AnimatePresence>
                      {visibleSubmissions.map((s) => (
                        <SubmissionCard key={s.id} submission={s} onAction={handleAction}
                          isPending={updateSubmission.isPending} />
                      ))}
                    </AnimatePresence>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─────────────────── FLAGGED HABITS TAB ──────────────────────── */}
          {mainTab === "flagged" && (
            <motion.div key="flagged"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
            >
              {/* Info strip */}
              <div className="bg-orange-500/15 border border-orange-400/25 rounded-2xl px-4 py-3 flex items-start gap-2.5 mb-2">
                <Flag className="w-4 h-4 text-orange-300 mt-0.5 shrink-0" />
                <p className="text-orange-100 text-xs leading-relaxed">
                  Habits flagged by <strong className="text-white">3 or more</strong> users appear here.
                  Dismiss to clear the flag, or Archive to remove from the feed.
                </p>
              </div>

              {flaggedLoading ? (
                <div className="text-center py-16 text-white/40 font-medium">Loading…</div>
              ) : flaggedHabits.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-300" />
                  </div>
                  <p className="text-white/60 font-medium">No flagged habits right now.</p>
                  <p className="text-white/35 text-sm">Habits flagged by 3+ users will appear here.</p>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {flaggedHabits.map((h) => (
                    <FlaggedHabitCard key={h.id} habit={h} onAction={handleFlaggedAction}
                      isPending={updateFlagged.isPending} />
                  ))}
                </AnimatePresence>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
