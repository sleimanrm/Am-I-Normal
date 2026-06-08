import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, ShieldCheck, Pencil, Save } from "lucide-react";
import {
  useListSubmissions,
  useUpdateSubmission,
  getListSubmissionsQueryKey,
} from "@workspace/api-client-react";
import type { Submission } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function timeAgo(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
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
  onAction: (id: number, status: string, question?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(submission.question);
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
      {editing ? (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          maxLength={280}
          rows={3}
          className="w-full resize-none rounded-xl border border-purple-200 bg-purple-50 p-3 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
        />
      ) : (
        <p className="text-gray-800 font-medium text-base leading-snug mb-3">
          {submission.question}
        </p>
      )}

      <div className="flex items-center justify-between mb-0">
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
          {editing ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditing(false);
              }}
              className="flex items-center justify-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 font-bold text-sm py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditing(true)}
              className="flex items-center justify-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-sm py-2.5 px-4 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditing(false);
              onAction(submission.id, "rejected");
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 border border-red-200 text-red-600 font-bold text-sm py-2.5 rounded-xl hover:bg-red-100 transition-colors"
          >
            <X className="w-4 h-4" /> Reject
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditing(false);
              onAction(submission.id, "approved", editing ? editText : undefined);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 border border-green-200 text-green-700 font-bold text-sm py-2.5 rounded-xl hover:bg-green-100 transition-colors"
          >
            {editing ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {editing ? "Save & Approve" : "Approve"}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

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

  const handleAction = (id: number, status: string, question?: string) => {
    updateSubmission.mutate({
      id,
      data: { status, ...(question !== undefined ? { question } : {}) },
    });
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

        <div className="flex items-center gap-3 py-6">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl leading-none">Submissions Admin</h1>
            <p className="text-white/50 text-xs mt-0.5">{submissions.length} total submissions</p>
          </div>
        </div>

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
              {label} {count > 0 && <span className="opacity-60">({count})</span>}
            </button>
          ))}
        </div>

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
