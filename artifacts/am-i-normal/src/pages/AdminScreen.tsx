import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, Clock, ShieldCheck, Pencil, Save, ChevronDown, ChevronUp,
  BookOpen, AlertCircle, Flag, Trash2, CheckCircle2, Lock, Delete,
  LayoutList, BarChart2, Upload, ChevronRight,
} from "lucide-react";
import {
  useListSubmissions,
  useUpdateSubmission,
  getListSubmissionsQueryKey,
  useGetFlaggedHabits,
  getGetFlaggedHabitsQueryKey,
  useUpdateFlaggedHabit,
  useVerifyAdminPin,
  useListAdminHabits,
  getListAdminHabitsQueryKey,
  useDeleteHabit,
  useUpdateHabit,
} from "@workspace/api-client-react";
import type { Submission, FlaggedHabit, AdminHabit } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// ── Analytics types ────────────────────────────────────────────────────────────

interface AdminAnalytics {
  totalUsers: number;
  dailyActiveUsers: number;
  totalHabits: number;
  habitsToday: number;
  votesToday: number;
  reportsToday: number;
  topCategories: { category: string; count: number }[];
  mostVotedHabits: { id: number; question: string; answerCount: number; meTooPct: number }[];
}

// ── Import types & parser ─────────────────────────────────────────────────────

interface ParsedHabit {
  raw: string;
  category: string;
  question: string;
  valid: boolean;
  error?: string;
}

const VALID_CATEGORIES = new Set([
  "Food",
  "Sleep",
  "Technology",
  "Social",
  "Body",
  "Overthinking",
]);

interface ImportResult {
  imported: number;
  skipped: number;
  skippedQuestions: string[];
  skippedUnknownCategory: { question: string; category: string }[];
}

function parseImportText(text: string): ParsedHabit[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const pipeIdx = line.indexOf("|");
      if (pipeIdx === -1) {
        return { raw: line, category: "", question: "", valid: false, error: "Missing | separator" };
      }
      const category = line.slice(0, pipeIdx).trim();
      const question = line.slice(pipeIdx + 1).trim();
      if (!category) return { raw: line, category, question, valid: false, error: "Empty category" };
      if (!question) return { raw: line, category, question, valid: false, error: "Empty question" };
      if (question.length < 5) return { raw: line, category, question, valid: false, error: "Question too short" };
      if (!VALID_CATEGORIES.has(category)) {
        return { raw: line, category, question, valid: false, error: `Unknown category: ${category}` };
      }
      return { raw: line, category, question, valid: true };
    });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  "Too generic", "Not a habit", "Offensive content",
  "Sexual content", "Drug-related content", "Spam", "Duplicate",
] as const;

const ALL_CATEGORIES = [
  "Overthinking", "Pets", "Food", "Sleep",
  "Technology", "Social", "Body", "Habits", "Community",
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

const SESSION_KEY = "ain_admin_auth";

// ── PIN Gate ──────────────────────────────────────────────────────────────────

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const verify = useVerifyAdminPin({
    mutation: {
      onSuccess: (data) => {
        if (data.ok) {
          const token = (data as { ok: boolean; token?: string }).token ?? "";
          sessionStorage.setItem(SESSION_KEY, token);
          onAuth();
        } else {
          setShaking(true);
          setError(true);
          setDigits([]);
          setTimeout(() => setShaking(false), 500);
        }
      },
    },
  });

  const addDigit = (d: string) => {
    if (digits.length >= 4 || verify.isPending) return;
    const next = [...digits, d];
    setDigits(next);
    setError(false);
    if (next.length === 4) {
      verify.mutate({ data: { pin: next.join("") } });
    }
  };

  const removeDigit = () => setDigits((prev) => prev.slice(0, -1));

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex flex-col items-center justify-center p-6">
      <motion.div
        animate={shaking ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[320px] flex flex-col items-center gap-8"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center shadow-2xl">
          <Lock className="w-9 h-9 text-white" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-white font-extrabold text-2xl">Admin Access</h1>
          <p className="text-white/50 text-sm mt-1">Enter your PIN to continue</p>
        </div>

        {/* Dots */}
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                digits.length > i
                  ? error ? "bg-red-400 border-red-400" : "bg-white border-white"
                  : "bg-transparent border-white/40"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-red-300 text-sm font-semibold -mt-4"
            >
              Incorrect PIN
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {keys.map((k, i) => {
            if (k === "") return <div key={`empty-${i}`} />;
            const isBack = k === "⌫";
            return (
              <button
                key={`key-${i}`}
                onClick={() => isBack ? removeDigit() : addDigit(k)}
                disabled={verify.isPending}
                className={`h-16 rounded-2xl font-bold text-xl transition-all active:scale-95 disabled:opacity-50 ${
                  isBack
                    ? "bg-white/10 text-white/70 hover:bg-white/20"
                    : "bg-white/15 text-white hover:bg-white/25 backdrop-blur border border-white/10"
                }`}
              >
                {isBack ? <Delete className="w-5 h-5 mx-auto" /> : k}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ── Guidelines panel ──────────────────────────────────────────────────────────

function GuidelinesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl overflow-hidden mb-5">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-violet-300" />
          <span className="text-white font-bold text-sm">Moderation Guidelines</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"
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

type CardMode = "view" | "edit" | "reject" | "approve";

interface ActionPayload {
  status?: string;
  question?: string;
  category?: string;
  moderationReason?: string | null;
}

function SubmissionCard({
  submission,
  onAction,
  isPending,
}: {
  submission: Submission;
  onAction: (id: number, payload: ActionPayload) => void;
  isPending: boolean;
}) {
  const [mode, setMode] = useState<CardMode>("view");
  const [editText, setEditText] = useState(submission.question);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Community");
  const [pendingApproveQuestion, setPendingApproveQuestion] = useState<string | undefined>(undefined);

  const isMutating = isPending;
  const statusIs = (s: string) => submission.status === s;

  const reset = () => {
    setMode("view");
    setEditText(submission.question);
    setSelectedReason("");
    setSelectedCategory("Community");
    setPendingApproveQuestion(undefined);
  };

  const handleApprove = () => { setPendingApproveQuestion(undefined); setMode("approve"); };
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
    setPendingApproveQuestion(trimmed || undefined);
    setMode("approve");
  };
  const confirmApprove = () => {
    onAction(submission.id, {
      status: "approved",
      category: selectedCategory,
      ...(pendingApproveQuestion ? { question: pendingApproveQuestion } : {}),
    });
    reset();
  };

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
  };
  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    approved: <Check className="w-3 h-3" />,
    rejected: <X className="w-3 h-3" />,
  };

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-purple-100"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          {mode === "edit" ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="flex-1 text-gray-800 font-medium text-base leading-snug bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          ) : (
            <p className="text-gray-800 font-medium text-base leading-snug flex-1">{submission.question}</p>
          )}
          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${statusStyles[submission.status] ?? ""}`}>
            {statusIcons[submission.status]} {submission.status}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <Clock className="w-3 h-3" />
          <span>{timeAgo(submission.submittedAt)}</span>
          {submission.moderationReason && (
            <span className="ml-auto text-red-500 font-medium">{submission.moderationReason}</span>
          )}
        </div>
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
                  >{reason}</button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={reset} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleReject} disabled={!selectedReason || isMutating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                  <X className="w-4 h-4" /> Confirm Rejection
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === "approve" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-green-100 bg-green-50/60"
          >
            <div className="p-4 space-y-3">
              <p className="text-green-700 font-bold text-xs uppercase tracking-wider">Assign a category</p>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => (
                  <button key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      selectedCategory === cat
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-green-700 border-green-200 hover:border-green-400"
                    }`}
                  >{cat}</button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={reset} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={confirmApprove} disabled={isMutating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-green-600 text-white disabled:opacity-40 hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Confirm Approval
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode !== "reject" && mode !== "approve" && (
        <div className="px-5 pb-4 flex gap-2">
          {mode === "edit" ? (
            <>
              <button onClick={reset} className="py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
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

// ── Habit admin card ──────────────────────────────────────────────────────────

function HabitAdminCard({
  habit,
  onDelete,
  onSave,
  isDeleting,
  isSaving,
}: {
  habit: AdminHabit;
  onDelete: (id: number) => void;
  onSave: (id: number, question: string, category: string) => void;
  isDeleting: boolean;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(habit.question);
  const [editCategory, setEditCategory] = useState(habit.category);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const reset = () => {
    setEditing(false);
    setEditText(habit.question);
    setEditCategory(habit.category);
    setConfirmDelete(false);
  };

  const handleSave = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onSave(habit.id, trimmed, editCategory);
    setEditing(false);
  };

  const pct = Math.round(habit.meTooPct);
  const isArchived = habit.status === "archived";

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${isArchived ? "border-gray-200 opacity-60" : habit.flagged ? "border-red-200" : "border-purple-100"}`}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-2 mb-3">
          {editing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="flex-1 text-gray-800 font-medium text-base leading-snug bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          ) : (
            <p className={`flex-1 font-medium text-base leading-snug ${isArchived ? "text-gray-400 line-through" : "text-gray-800"}`}>
              {habit.question}
            </p>
          )}
        </div>

        {/* Category selector (edit mode) or badges (view mode) */}
        {editing ? (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ALL_CATEGORIES.map((cat) => (
              <button key={cat}
                onClick={() => setEditCategory(cat)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  editCategory === cat
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-purple-300"
                }`}
              >{cat}</button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">{habit.category}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${habit.source === "community" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {habit.source}
            </span>
            {habit.flagged && (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                <Flag className="w-3 h-3" /> {habit.reportCount} report{habit.reportCount !== 1 ? "s" : ""}
              </span>
            )}
            {isArchived && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">archived</span>}
          </div>
        )}

        {/* Vote stats */}
        {!editing && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{habit.answerCount} vote{habit.answerCount !== 1 ? "s" : ""}</span>
              <span className="font-bold text-gray-600">{pct}% me too</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Created at */}
        {!editing && (
          <p className="text-gray-300 text-[11px] mt-2">{timeAgo(habit.createdAt)}</p>
        )}
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-red-100 bg-red-50/70"
          >
            <div className="p-4 space-y-3">
              <p className="text-red-700 font-bold text-sm">Archive this habit?</p>
              <p className="text-red-500 text-xs">It will be hidden from all feeds. Votes and reports are kept.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { onDelete(habit.id); setConfirmDelete(false); }} disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white disabled:opacity-50 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> Archive
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!confirmDelete && (
        <div className="px-5 pb-4 flex gap-2 border-t border-gray-100 pt-3">
          {editing ? (
            <>
              <button onClick={reset}
                className="py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} disabled={isArchived}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-40">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              {!isArchived && (
                <button onClick={() => setConfirmDelete(true)} disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> Archive
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
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-gray-800 font-medium text-base leading-snug flex-1">{habit.question}</p>
          <span className="flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
            <Flag className="w-3 h-3" /> {habit.reportCount} report{habit.reportCount !== 1 ? "s" : ""}
          </span>
        </div>
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
        <button onClick={() => onAction(habit.id, "dismiss")} disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50">
          <CheckCircle2 className="w-4 h-4" /> Dismiss Flag
        </button>
        <button onClick={() => onAction(habit.id, "archive")} disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">
          <Trash2 className="w-4 h-4" /> Archive
        </button>
      </div>
    </motion.div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type MainTab = "submissions" | "habits" | "flagged" | "analytics";
type FilterTab = "pending" | "approved" | "rejected";
type HabitFilter = "all" | "curated" | "community";

export default function AdminScreen() {
  const isAuthed = !!sessionStorage.getItem(SESSION_KEY);
  const [authed, setAuthed] = useState(isAuthed);
  // Incremented on every successful auth so AdminDashboard remounts with a
  // clean React Query cache — this handles the stale/expired-token case where
  // authed was already true but all queries had failed with 401.
  const [authNonce, setAuthNonce] = useState(0);

  const handleAuth = () => {
    setAuthed(true);
    setAuthNonce((n) => n + 1);
  };

  const handleLock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  if (!authed) return <PinGate onAuth={handleAuth} />;

  return <AdminDashboard key={authNonce} onLock={handleLock} />;
}

function AdminDashboard({ onLock }: { onLock: () => void }) {
  const [mainTab, setMainTab] = useState<MainTab>("submissions");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("pending");
  const [habitFilter, setHabitFilter] = useState<HabitFilter>("all");
  const queryClient = useQueryClient();

  // ── Submissions ──────────────────────────────────────────────────────────
  const { data: submissions = [], isLoading: subsLoading } = useListSubmissions();

  const updateSubmission = useUpdateSubmission({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }),
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

  // ── Import state ─────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const parsedHabits = parseImportText(importText);
  const validHabits = parsedHabits.filter((h) => h.valid);

  const handleImport = async () => {
    if (validHabits.length === 0) return;
    setIsImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const token = sessionStorage.getItem(SESSION_KEY) ?? "";
      const res = await fetch("/api/admin/habits/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({ habits: validHabits.map((h) => ({ question: h.question, category: h.category })) }),
      });
      if (res.status === 401) {
        setImportError("Session expired — please re-authenticate.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setImportError(err.error ?? `Server error (${res.status})`);
        return;
      }
      const data = await res.json() as ImportResult;
      setImportResult(data);
      if (data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: getListAdminHabitsQueryKey() });
        setImportText("");
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Network error — could not reach server.");
    } finally {
      setIsImporting(false);
    }
  };

  // ── Habits ───────────────────────────────────────────────────────────────
  const { data: allHabits = [], isLoading: habitsLoading } = useListAdminHabits();

  const deleteHabit = useDeleteHabit({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminHabitsQueryKey() }),
    },
  });

  const updateHabit = useUpdateHabit({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminHabitsQueryKey() }),
    },
  });

  const visibleHabits = allHabits.filter((h) => {
    if (habitFilter === "curated") return h.source === "curated";
    if (habitFilter === "community") return h.source === "community";
    return true;
  });

  const activeHabits = allHabits.filter((h) => h.status === "active");
  const archivedHabits = allHabits.filter((h) => h.status === "archived");

  // ── Analytics ────────────────────────────────────────────────────────────
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AdminAnalytics>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const token = sessionStorage.getItem(SESSION_KEY) ?? "";
      const res = await fetch("/api/admin/analytics", {
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json() as Promise<AdminAnalytics>;
    },
    staleTime: 60_000,
    enabled: mainTab === "analytics",
  });

  // ── Flagged habits ───────────────────────────────────────────────────────
  const { data: flaggedHabits = [], isLoading: flaggedLoading } = useGetFlaggedHabits();

  const updateFlagged = useUpdateFlaggedHabit({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFlaggedHabitsQueryKey() }),
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
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-xl leading-none">Admin Dashboard</h1>
            <p className="text-white/50 text-xs mt-0.5">
              {pending.length} pending · {flaggedHabits.length} flagged
            </p>
          </div>
          <button onClick={onLock}
            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs font-semibold transition-colors px-3 py-2 rounded-xl hover:bg-white/10">
            <Lock className="w-3.5 h-3.5" /> Lock
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Pending", value: pending.length, color: "bg-amber-400" },
            { label: "Active", value: activeHabits.length, color: "bg-green-400" },
            { label: "Archived", value: archivedHabits.length, color: "bg-gray-400" },
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
          {([
            { key: "submissions" as MainTab, label: "Subs", badge: pending.length },
            { key: "habits" as MainTab, label: "Habits", badge: 0 },
            { key: "flagged" as MainTab, label: "Flagged", badge: flaggedHabits.length },
            { key: "analytics" as MainTab, label: "Stats", badge: 0 },
          ]).map(({ key, label, badge }) => (
            <button key={key}
              onClick={() => setMainTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mainTab === key ? "bg-white text-purple-900 shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              {label}
              {badge > 0 && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  mainTab === key ? "bg-purple-600 text-white" : "bg-white/20 text-white"
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Submissions tab ── */}
        {mainTab === "submissions" && (
          <>
            <GuidelinesPanel />

            <div className="flex bg-white/10 rounded-xl p-1 mb-4 gap-1">
              {filterTabs.map(({ key, label, count }) => (
                <button key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === key ? "bg-white text-purple-900" : "text-white/60 hover:text-white"
                  }`}
                >
                  {label} {count > 0 && <span className="opacity-60">({count})</span>}
                </button>
              ))}
            </div>

            {subsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : visibleSubmissions.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <p className="text-4xl mb-3">✨</p>
                <p className="font-semibold">No {activeFilter} submissions</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {visibleSubmissions.map((sub) => (
                    <SubmissionCard
                      key={sub.id}
                      submission={sub}
                      onAction={handleAction}
                      isPending={updateSubmission.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ── Habits tab ── */}
        {mainTab === "habits" && (
          <>
            {/* ── Import toggle button ── */}
            <button
              onClick={() => { setShowImport((v) => !v); setImportResult(null); setImportError(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl mb-3 text-sm font-bold transition-all border ${
                showImport
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/10 border-white/15 text-white/70 hover:text-white hover:bg-white/15"
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Habits
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${showImport ? "rotate-90" : ""}`} />
            </button>

            {/* ── Import panel ── */}
            <AnimatePresence>
              {showImport && (
                <motion.div
                  key="import-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/15 space-y-4">

                    {/* Format hint */}
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
                      <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">Format — one habit per line</p>
                      <code className="text-white/70 text-xs font-mono block leading-relaxed">
                        {"Food | Do you eat cereal without milk?"}<br />
                        {"Sleep | Do you sleep with the TV on?"}<br />
                        {"# Lines starting with # are ignored"}
                      </code>
                      <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide pt-1">Valid categories</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(VALID_CATEGORIES).map((cat) => (
                          <span key={cat} className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-semibold">{cat}</span>
                        ))}
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={importText}
                      onChange={(e) => { setImportText(e.target.value); setImportResult(null); setImportError(null); }}
                      placeholder={"Category | Habit question\nCategory | Another habit"}
                      rows={8}
                      className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-white text-xs font-mono placeholder:text-white/25 resize-none focus:outline-none focus:border-white/40 leading-relaxed"
                    />

                    {/* Live parse preview */}
                    {parsedHabits.length > 0 && (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide">
                          Preview — {validHabits.length} valid · {parsedHabits.length - validHabits.length} invalid
                        </p>
                        {parsedHabits.map((h, i) => (
                          <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs ${
                            h.valid ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
                          }`}>
                            <span className={`mt-0.5 flex-shrink-0 ${h.valid ? "text-green-400" : "text-red-400"}`}>
                              {h.valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            </span>
                            {h.valid ? (
                              <span className="text-white/80 leading-snug">
                                <span className="text-white/40">{h.category}</span>
                                <span className="text-white/25 mx-1">|</span>
                                {h.question}
                              </span>
                            ) : (
                              <span className="text-red-300/70 leading-snug">
                                {h.raw || "(empty)"} <span className="text-red-400/60">— {h.error}</span>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Import error */}
                    {importError && (
                      <div className="rounded-xl px-4 py-3 text-sm font-semibold bg-red-500/15 border border-red-500/25 text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {importError}
                      </div>
                    )}

                    {/* Import result */}
                    {importResult && (
                      <div className="space-y-2">
                        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                          importResult.imported > 0 ? "bg-green-500/15 border border-green-500/25 text-green-300" : "bg-white/10 border border-white/15 text-white/60"
                        }`}>
                          {importResult.imported > 0
                            ? `✓ Imported ${importResult.imported} habit${importResult.imported !== 1 ? "s" : ""}`
                            : "Nothing new to import"}
                          {importResult.skipped > 0 && (
                            <span className="text-white/40 text-xs font-normal ml-2">({importResult.skipped} duplicate{importResult.skipped !== 1 ? "s" : ""} skipped)</span>
                          )}
                        </div>
                        {importResult.skippedUnknownCategory.length > 0 && (
                          <div className="rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                            <p className="text-amber-300 text-xs font-bold">
                              {importResult.skippedUnknownCategory.length} habit{importResult.skippedUnknownCategory.length !== 1 ? "s" : ""} skipped — unknown category
                            </p>
                            {importResult.skippedUnknownCategory.map((h, i) => (
                              <p key={i} className="text-amber-200/60 text-xs font-mono leading-snug">
                                Unknown category: <span className="text-amber-300 font-bold">{h.category}</span>
                                <span className="text-amber-200/40 ml-2">→ {h.question}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Import button */}
                    <button
                      onClick={handleImport}
                      disabled={validHabits.length === 0 || isImporting}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-purple-900 hover:bg-white/90 active:scale-[0.98]"
                    >
                      {isImporting ? (
                        <div className="w-4 h-4 border-2 border-purple-900/30 border-t-purple-900 rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isImporting ? "Importing…" : `Import ${validHabits.length} Habit${validHabits.length !== 1 ? "s" : ""}`}
                    </button>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter pills */}
            <div className="flex bg-white/10 rounded-xl p-1 mb-4 gap-1">
              {([
                { key: "all" as HabitFilter, label: "All", count: allHabits.length },
                { key: "curated" as HabitFilter, label: "Curated", count: allHabits.filter(h => h.source === "curated").length },
                { key: "community" as HabitFilter, label: "Community", count: allHabits.filter(h => h.source === "community").length },
              ]).map(({ key, label, count }) => (
                <button key={key}
                  onClick={() => setHabitFilter(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    habitFilter === key ? "bg-white text-purple-900" : "text-white/60 hover:text-white"
                  }`}
                >
                  {label} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>

            {habitsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : visibleHabits.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <LayoutList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No habits found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {visibleHabits.map((habit) => (
                    <HabitAdminCard
                      key={habit.id}
                      habit={habit}
                      onDelete={(id) => deleteHabit.mutate({ id })}
                      onSave={(id, question, category) => updateHabit.mutate({ id, data: { question, category } })}
                      isDeleting={deleteHabit.isPending}
                      isSaving={updateHabit.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ── Flagged tab ── */}
        {mainTab === "flagged" && (
          <>
            {flaggedLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : flaggedHabits.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <p className="text-4xl mb-3">🛡️</p>
                <p className="font-semibold">No flagged habits</p>
                <p className="text-xs mt-1">All clear!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {flaggedHabits.map((habit) => (
                    <FlaggedHabitCard
                      key={habit.id}
                      habit={habit}
                      onAction={handleFlaggedAction}
                      isPending={updateFlagged.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ── Analytics tab ── */}
        {mainTab === "analytics" && (
          <>
            {analyticsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : !analytics ? (
              <div className="text-center py-16 text-white/40">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Failed to load analytics</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* ── Metric cards ── */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total Users", value: analytics.totalUsers, color: "text-violet-300", dot: "bg-violet-400" },
                    { label: "Active Today", value: analytics.dailyActiveUsers, color: "text-sky-300", dot: "bg-sky-400" },
                    { label: "Total Habits", value: analytics.totalHabits, color: "text-emerald-300", dot: "bg-emerald-400" },
                    { label: "Habits Today", value: analytics.habitsToday, color: "text-teal-300", dot: "bg-teal-400" },
                    { label: "Votes Today", value: analytics.votesToday, color: "text-amber-300", dot: "bg-amber-400" },
                    { label: "Reports Today", value: analytics.reportsToday, color: "text-rose-300", dot: "bg-rose-400" },
                  ].map(({ label, value, color, dot }) => (
                    <div key={label} className="bg-white/10 rounded-2xl p-4 backdrop-blur border border-white/15">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">{label}</p>
                      </div>
                      <p className={`font-extrabold text-3xl leading-none ${color}`}>
                        {value.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── Top categories ── */}
                {analytics.topCategories.length > 0 && (
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur border border-white/15">
                    <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide mb-3">Top Categories</p>
                    <div className="space-y-2.5">
                      {(() => {
                        const max = analytics.topCategories[0].count;
                        return analytics.topCategories.map(({ category, count }) => (
                          <div key={category}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white text-xs font-semibold">{category}</span>
                              <span className="text-white/50 text-xs">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-500"
                                style={{ width: `${Math.round((count / max) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* ── Most voted habits ── */}
                {analytics.mostVotedHabits.length > 0 && (
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur border border-white/15">
                    <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide mb-3">Most Voted</p>
                    <div className="space-y-3">
                      {analytics.mostVotedHabits.map((habit, i) => (
                        <div key={habit.id} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white/60 text-[10px] font-extrabold">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium leading-snug line-clamp-2">{habit.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-white/40 text-[10px]">{habit.answerCount.toLocaleString()} votes</span>
                              <span className="text-white/25 text-[10px]">·</span>
                              <span className="text-white/40 text-[10px]">{habit.meTooPct}% me too</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
