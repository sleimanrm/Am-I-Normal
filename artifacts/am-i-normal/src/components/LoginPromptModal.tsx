import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { LogIn, X } from "lucide-react";

interface LoginPromptModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export default function LoginPromptModal({
  open,
  onClose,
  message = "Create a free account to vote and track your habits.",
}: LoginPromptModalProps) {
  const [, navigate] = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            className="fixed inset-x-4 bottom-8 z-50 max-w-[390px] mx-auto bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/40"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-card-foreground/40 hover:text-card-foreground/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="w-7 h-7 text-primary" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-card-foreground mb-2">
                  Sign in to continue
                </h2>
                <p className="text-card-foreground/50 text-sm font-medium leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { onClose(); navigate("/login"); }}
                  className="flex-1 py-3.5 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
                >
                  Log In
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { onClose(); navigate("/signup"); }}
                  className="flex-1 py-3.5 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30"
                >
                  Sign Up Free
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
