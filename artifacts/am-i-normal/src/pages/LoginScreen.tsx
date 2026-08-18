import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        navigate("/");
      },
      onError: () => {
        setError("Invalid email or password.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ data: { email, password } });
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
            <h1 className="text-2xl font-extrabold text-card-foreground mb-1">Welcome back</h1>
            <p className="text-card-foreground/50 text-sm font-medium mb-8">
              Log in to track your habits
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
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl bg-purple-50 border border-purple-100 text-card-foreground placeholder:text-card-foreground/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
              </div>

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  data-testid="link-forgot-password"
                  className="text-primary text-sm font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <p className="text-red-600 text-sm font-semibold bg-red-50 px-4 py-2.5 rounded-xl">
                  {error}
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-primary text-white font-bold text-base py-4 rounded-full shadow-lg shadow-primary/30 disabled:opacity-60 mt-2"
              >
                {loginMutation.isPending ? "Logging in…" : "Log In"}
              </motion.button>
            </form>

            <p className="text-center text-card-foreground/40 text-sm font-medium mt-6">
              No account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary font-bold hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
