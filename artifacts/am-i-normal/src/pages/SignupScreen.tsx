import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useSignup } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";

export default function SignupScreen() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const signupMutation = useSignup({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        navigate("/");
      },
      onError: (err) => {
        const status = (err as { status?: number }).status;
        if (status === 409) {
          setError("An account with that email already exists.");
        } else if (status === 400) {
          setError("Password must be at least 6 characters.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    signupMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] p-4">
      <div className="w-full max-w-[390px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="w-full flex items-center mb-8">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center mr-3"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-200" />
              <span className="text-white font-extrabold text-lg">Am I Normal?</span>
            </div>
          </div>

          <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30">
            <h1 className="text-2xl font-extrabold text-card-foreground mb-1">Create account</h1>
            <p className="text-card-foreground/50 text-sm font-medium mb-8">
              Track your habits and share your own
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-card-foreground/50 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-2xl bg-purple-50 border border-purple-100 text-card-foreground placeholder:text-card-foreground/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-card-foreground/50 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 rounded-2xl bg-purple-50 border border-purple-100 text-card-foreground placeholder:text-card-foreground/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm font-semibold bg-red-50 px-4 py-2.5 rounded-xl">
                  {error}
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full bg-primary text-white font-bold text-base py-4 rounded-full shadow-lg shadow-primary/30 disabled:opacity-60 mt-2"
              >
                {signupMutation.isPending ? "Creating account…" : "Sign Up"}
              </motion.button>
            </form>

            <p className="text-center text-card-foreground/40 text-sm font-medium mt-6">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-primary font-bold hover:underline"
              >
                Log in
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
