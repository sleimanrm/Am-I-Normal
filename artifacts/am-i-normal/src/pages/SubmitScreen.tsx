import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Check, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";
import { useCreateSubmission } from "@workspace/api-client-react";

const SESSION_KEY = "ain_session_id";
function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function SubmitScreen() {
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState("");

  const sessionId = getOrCreateSessionId();

  const createSubmission = useCreateSubmission({
    mutation: {
      onSuccess: () => setSubmitted(true),
    },
  });

  const handleSubmit = () => {
    const trimmed = question.trim();
    if (trimmed.length < 10) {
      setLocalError("A little more detail would help — try at least 10 characters.");
      return;
    }
    if (trimmed.length > 280) {
      setLocalError("Keep it under 280 characters.");
      return;
    }
    setLocalError("");
    createSubmission.mutate({ data: { question: trimmed, sessionId } });
  };

  const error = localError || (createSubmission.isError ? "Something went wrong. Please try again." : "");

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-hidden p-4">
      <div className="w-full max-w-[390px]">

        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/70 font-semibold text-sm mb-6 hover:text-white transition-colors"
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
              className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30 flex flex-col gap-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-card-foreground leading-tight">
                  Share Your Weird Habit
                </h1>
                <p className="text-card-foreground/55 text-base leading-relaxed">
                  What's something you do that makes you wonder if you're the only one?
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <textarea
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setLocalError("");
                  }}
                  placeholder="Do you ever…"
                  maxLength={280}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-primary/20 bg-primary/5 p-4 text-card-foreground placeholder:text-card-foreground/30 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <div className="flex justify-between items-center px-1">
                  {error
                    ? <p className="text-red-500 text-xs font-medium">{error}</p>
                    : <span />
                  }
                  <p className="text-card-foreground/30 text-xs ml-auto">{question.length}/280</p>
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
    </div>
  );
}
