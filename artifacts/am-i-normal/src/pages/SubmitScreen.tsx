import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Check, ClipboardList, CheckCircle2, Circle, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useCreateSubmission } from "@workspace/api-client-react";
import { validateHabit, getLiveChecks } from "../lib/habitValidator";
import { useAuth } from "../contexts/AuthContext";
import LoginPromptModal from "../components/LoginPromptModal";

const SESSION_KEY = "ain_session_id";
function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ── Examples ──────────────────────────────────────────────────────────────────

const GOOD_EXAMPLES = [
  "I smell books before reading them.",
  "I rehearse conversations before they happen.",
  "I count tiles while walking.",
];

const BAD_EXAMPLES = [
  "I eat food.",
  "I like music.",
  "drugs are awesome.",
];

function ExamplesPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="w-full bg-white/8 backdrop-blur border border-white/12 rounded-[1.5rem] p-5 space-y-4"
    >
      <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Examples</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-green-300 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Good
          </p>
          {GOOD_EXAMPLES.map((ex) => (
            <p key={ex} className="text-white/70 text-sm leading-snug font-medium pl-5">
              {ex}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-red-300 text-xs font-bold flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Too generic
          </p>
          {BAD_EXAMPLES.map((ex) => (
            <p key={ex} className="text-white/40 text-sm leading-snug font-medium line-through pl-5">
              {ex}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Quality checks ────────────────────────────────────────────────────────────

function QualityChecks({ text }: { text: string }) {
  const checks = getLiveChecks(text);
  if (text.trim().length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {checks.map(({ label, pass }) => (
        <span
          key={label}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-200 ${
            pass
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-50 text-gray-400 border-gray-200"
          }`}
        >
          {pass ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Circle className="w-3 h-3" />
          )}
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SubmitScreen() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [similarityWarning, setSimilarityWarning] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const sessionId = getOrCreateSessionId();

  const createSubmission = useCreateSubmission({
    mutation: {
      onSuccess: (data) => {
        setSimilarityWarning(data.similarityWarning ?? null);
        setSubmitted(true);
      },
    },
  });

  const handleSubmit = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    const trimmed = question.trim();
    const result = validateHabit(trimmed);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    setValidationError("");
    createSubmission.mutate({ data: { question: trimmed, sessionId } });
  };

  const apiErr = createSubmission.error as { status?: number; data?: { error?: string } } | null;
  const serverError = apiErr?.status === 409
    ? "This habit has already been submitted."
    : createSubmission.isError
    ? "Something went wrong. Please try again."
    : "";
  const error = validationError || serverError;

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-y-auto py-8 px-4">
      <div className="w-full max-w-[390px] flex flex-col gap-4">

        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/")}
          className="self-start flex items-center gap-2 text-white/70 font-semibold text-sm hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        <AnimatePresence mode="wait">

          {!submitted && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="flex flex-col gap-4"
            >
              {/* Main card */}
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col gap-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-extrabold text-card-foreground leading-tight">
                    Share Your Weird Habit
                  </h1>
                  <p className="text-card-foreground/55 text-base leading-relaxed">
                    What's something you do that makes you wonder if you're the only one?
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <textarea
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      setValidationError("");
                    }}
                    placeholder="Do you ever…"
                    maxLength={280}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-primary/20 bg-primary/5 p-4 text-card-foreground placeholder:text-card-foreground/30 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />

                  {/* Live quality checks */}
                  <QualityChecks text={question} />

                  {/* Error / char count row */}
                  <div className="flex justify-between items-start px-1 min-h-[1.25rem]">
                    <AnimatePresence mode="wait">
                      {error ? (
                        <motion.p
                          key="error"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-red-500 text-xs font-medium leading-snug max-w-[240px]"
                        >
                          {error}
                        </motion.p>
                      ) : (
                        <span key="spacer" />
                      )}
                    </AnimatePresence>
                    <p className="text-card-foreground/30 text-xs ml-auto shrink-0">
                      {question.length}/280
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSubmit}
                    disabled={createSubmission.isPending}
                    className="w-full bg-primary text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-5 h-5" />
                    {createSubmission.isPending ? "Submitting…" : "Submit Anonymously"}
                  </motion.button>
                  <p className="text-center text-card-foreground/35 text-xs">
                    Your name is never stored or shown.
                  </p>
                </div>
              </div>

              {/* Examples panel */}
              <ExamplesPanel />
            </motion.div>
          )}

          {submitted && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
              className="w-full bg-card rounded-[2rem] p-10 shadow-2xl shadow-black/30 flex flex-col items-center text-center gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-green-600" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-card-foreground">You're not alone.</h2>
                <p className="text-card-foreground/55 text-base leading-relaxed px-4">
                  Your habit has been submitted for review. If approved, it'll appear in the feed for everyone to relate to.
                </p>
              </div>

              {similarityWarning && (
                <div className="w-full bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-yellow-800 text-sm font-medium text-left">
                  ⚠️ {similarityWarning}
                </div>
              )}

              <div className="w-full space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate("/my-habits")}
                  className="w-full bg-primary text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-5 h-5" />
                  View My Habits
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate("/")}
                  className="w-full bg-white/10 border border-white/20 text-white font-semibold text-base py-3.5 rounded-full"
                >
                  Back to Discovering
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <LoginPromptModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Create a free account to share your weird habits with the world."
      />
    </div>
  );
}
