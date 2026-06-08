import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, Clock, ShieldCheck, Pencil, Save, ChevronDown, ChevronUp,
  BookOpen, AlertCircle,
} from "lucide-react";
import {
  useListSubmissions,
  useUpdateSubmission,
  getListSubmissionsQueryKey,
} from "@workspace/api-client-react";
import type { Submission } from "@workspace/api-client-react";
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
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/50" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/50" />
        )}
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
                A valid habit must satisfy <strong className="text-white/80">all four</strong> of the following criteria:
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

  const handleApprove = () => {
    reset();
    onAction(submission.id, { status: "approved" });
  };

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-purple-100"
    >
      {/* ── Main content ── */}
      <div className="p-5">
        {mode === "edit" ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={280}
            rows={3}
            className="w-full resize-none rounded-xl border border-purple-200 bg-purple-50 p-3 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
          />
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

        {/* Moderation reason badge */}
        {statusIs("rejected") && submission.moderationReason && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs font-semibold text-red-500">{submission.moderationReason}</span>
          </div>
        )}
      </div>

      {/* ── Reject: reason picker ── */}
      <AnimatePresence>
        {mode === "reject" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-red-100 bg-red-50/60"
          >
            <div className="p-4 space-y-3">
              <p className="text-red-700 font-bold text-xs uppercase tracking-wider">Select a reason</p>
              <div className="flex flex-wrap gap-2">
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
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
                <button
                  onClick={reset}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!selectedReason || isMutating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Confirm Rejection
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action buttons ── */}
      {mode !== "reject" && (
        <div className="px-5 pb-4 flex gap-2">
          {mode === "edit" ? (
            <>
              <button
                onClick={reset}
                className="py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              {statusIs("pending") && (
                <button
                  onClick={handleSaveAndApprove}
                  disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> Save & Approve
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isMutating}
                className={`${statusIs("pending") ? "" : "flex-1"} flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50`}
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </>
          ) : (
            <>
              {/* Edit — always available */}
              <button
                onClick={() => setMode("edit")}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>

              {/* Reject — available for pending + approved */}
              {!statusIs("rejected") && (
                <button
                  onClick={() => setMode("reject")}
                  disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              )}

              {/* Approve — available for pending + rejected */}
              {!statusIs("approved") && (
                <button
                  onClick={handleApprove}
                  disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
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

// ── Main screen ───────────────────────────────────────────────────────────────

type FilterTab = "pending" | "approved" | "rejected";

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading } = useListSubmissions();

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

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "approved", label: "Approved", count: approved.length },
    { key: "rejected", label: "Rejected", count: rejected.length },
  ];

  const visibleList =
    activeTab === "pending" ? pending : activeTab === "approved" ? approved : rejected;

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] p-4 pb-12">
      <div className="w-full max-w-[500px] mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 py-6">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl leading-none">Submissions Admin</h1>
            <p className="text-white/50 text-xs mt-0.5">{submissions.length} total submissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Pending", value: pending.length, color: "bg-amber-400" },
            { label: "Approved", value: approved.length, color: "bg-green-400" },
            { label: "Rejected", value: rejected.length, color: "bg-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur border border-white/15">
              <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-2`} />
              <p className="text-white font-extrabold text-2xl leading-none">{value}</p>
              <p className="text-white/50 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Guidelines */}
        <GuidelinesPanel />

        {/* Filter tabs */}
        <div className="flex bg-white/10 rounded-2xl p-1 mb-5 gap-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === key
                  ? "bg-white text-purple-900 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {label}{count > 0 && <span className="opacity-60"> ({count})</span>}
            </button>
          ))}
        </div>

        {/* Submission list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {isLoading ? (
              <div className="text-center py-16 text-white/40 font-medium">Loading…</div>
            ) : visibleList.length === 0 ? (
              <div className="text-center py-16 text-white/40 font-medium">Nothing here yet.</div>
            ) : (
              <AnimatePresence>
                {visibleList.map((s) => (
                  <SubmissionCard
                    key={s.id}
                    submission={s}
                    onAction={handleAction}
                    isPending={updateSubmission.isPending}
                  />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
