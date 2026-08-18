import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { useRequestPasswordReset } from "@workspace/api-client-react";

export default function ForgotPasswordScreen() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const requestMutation = useRequestPasswordReset({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
      },
      onError: () => {
        setError("We couldn't send that just now. Please try again.");
      },
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitted(false);
    requestMutation.mutate({ data: { email: email.trim() } });
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
              type="button"
              onClick={() => navigate("/login")}
              aria-label="Back to log in"
              data-testid="button-back-to-login"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70 transition-colors flex items-center justify-center mr-3"
            >
              <ArrowLeft className="w-5 h-5 text-white" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-200" aria-hidden="true" />
              <span className="text-white font-extrabold text-lg">Am I Normal?</span>
            </div>
          </div>

          <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl shadow-black/30">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
                  <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-extrabold text-card-foreground mb-2">Check your inbox</h1>
                <p
                  className="text-card-foreground/55 text-sm font-medium leading-6"
                  data-testid="status-password-reset-request"
                  role="status"
                >
                  If an account matches that email, a reset link is on its way. It can take a few minutes to arrive.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  data-testid="button-return-to-login"
                  className="w-full bg-primary text-white font-bold text-base py-4 rounded-full shadow-lg shadow-primary/30 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition mt-7"
                >
                  Back to Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  data-testid="button-request-another-reset"
                  className="text-primary font-bold text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded mt-5"
                >
                  Try another email
                </button>
              </motion.div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100">
                    <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-card-foreground mb-1">Reset your password</h1>
                  <p className="text-card-foreground/50 text-sm font-medium leading-6">
                    No judgment, no rush. Enter your email and we&apos;ll help you get back in.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="block text-xs font-bold text-card-foreground/50 uppercase tracking-wider mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(error)}
                      data-testid="input-reset-email"
                      className="w-full px-4 py-3 rounded-2xl bg-purple-50 border border-purple-100 text-card-foreground placeholder:text-card-foreground/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  {error && (
                    <p
                      className="flex items-start gap-2 text-red-600 text-sm font-semibold bg-red-50 px-4 py-2.5 rounded-xl"
                      data-testid="error-password-reset-request"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </p>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={requestMutation.isPending}
                    data-testid="button-send-reset-email"
                    className="w-full bg-primary text-white font-bold text-base py-4 rounded-full shadow-lg shadow-primary/30 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 mt-2"
                  >
                    {requestMutation.isPending ? "Sending reset link…" : "Send Reset Link"}
                  </motion.button>
                </form>

                <p className="text-center text-card-foreground/40 text-sm font-medium mt-6">
                  Remembered it?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    data-testid="link-login-from-forgot"
                    className="text-primary font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                  >
                    Log in
                  </button>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}