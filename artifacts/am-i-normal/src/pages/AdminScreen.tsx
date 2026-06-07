import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, ShieldCheck } from "lucide-react";
import { getSubmissions, updateSubmissionStatus } from "../data/submissions";
import type { Submission, SubmissionStatus } from "../types";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SubmissionCard({
  submission,
  onAction,
}: {
  submission: Submission;
  onAction: (id: string, status: SubmissionStatus) => void;
}) {
  const isPending = submission.status === "pending";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100"
    >
      <p className="text-gray-800 font-medium text-base leading-snug mb-3">
        {submission.question}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs">{timeAgo(submission.submittedAt)}</span>

        <div className="flex items-center gap-2">
          {submission.status === "pending" && (
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" /> Pending
            </span>
          )}
          {submission.status === "approved" && (
            <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full">
              <Check className="w-3 h-3" /> Approved
            </span>
          )}
          {submission.status === "rejected" && (
            <span className="flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 text-xs font-semibold px-2.5 py-1 rounded-full">
              <X className="w-3 h-3" /> Rejected
            </span>
          )}
        </div>
      </div>

      {isPending && (
        <div className="flex gap-2 mt-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction(submission.id, "rejected")}
            data-testid={`button-reject-${submission.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 border border-red-200 text-red-600 font-bold text-sm py-2.5 rounded-xl hover:bg-red-100 transition-colors"
          >
            <X className="w-4 h-4" /> Reject
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction(submission.id, "approved")}
            data-testid={`button-approve-${submission.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 border border-green-200 text-green-700 font-bold text-sm py-2.5 rounded-xl hover:bg-green-100 transition-colors"
          >
            <Check className="w-4 h-4" /> Approve
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

type FilterTab = "pending" | "approved" | "rejected";

export default function AdminScreen() {
  const [submissions, setSubmissions] = useState<Submission[]>(getSubmissions);
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");

  const handleAction = (id: string, status: SubmissionStatus) => {
    updateSubmissionStatus(id, status);
    setSubmissions(getSubmissions());
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        {/* Tabs */}
        <div className="flex bg-white/10 rounded-2xl p-1 mb-5 gap-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              data-testid={`tab-${key}`}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === key
                  ? "bg-white text-purple-900 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {label} {count > 0 && <span className="opacity-60">({count})</span>}
            </button>
          ))}
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {visibleList.length === 0 ? (
              <div className="text-center py-16 text-white/40 font-medium">
                Nothing here yet.
              </div>
            ) : (
              <AnimatePresence>
                {visibleList.map((s) => (
                  <SubmissionCard key={s.id} submission={s} onAction={handleAction} />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
