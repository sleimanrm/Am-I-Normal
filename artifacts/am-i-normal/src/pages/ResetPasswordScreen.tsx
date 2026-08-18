import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import {
  getValidatePasswordResetQueryKey,
  useConfirmPasswordReset,
  useValidatePasswordReset,
} from "@workspace/api-client-react";

export default function ResetPasswordScreen() {
  const [location, navigate] = useLocation();
  const token = new URLSearchParams(location.split("?")[1] ?? "").get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  const validationQuery = useValidatePasswordReset(
    { token },
    {
      query: {
        enabled: Boolean(token),
        retry: false,
        queryKey: getValidatePasswordResetQueryKey({ token }),
      },
    },
  );

  const confirmMutation = useConfirmPasswordReset({
    mutation: {
      onSuccess: () => {
        setUpdated(true);
      },
      onError: () => {
        setFormError("That link may have expired. Request a new one and try again.");
      },
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError("Your password needs at least 6 characters.");
      return;
    }

    if (password !== confirmation) {
      setFormError("Those passwords don't match yet.");
      return;
    }

    confirmMutation.mutate({ data: { token, password } });
  };

  const showInvalidLink = !token || validationQuery.isError || validationQuery.data?.valid === false;
  const showLoading = Boolean(token) && validationQuery.isLoading;

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
              data-testid="button-reset-back-to-login"
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
            {showLoading ? (
              <div aria-label="Checking reset link" data-testid="loading-reset-link">
                <div className="h-11 w-11 rounded-2xl bg-purple-100 animate-pulse mb-5" />
                <div className="h-8 w-56 rounded-lg bg-purple-100 animate-pulse mb-3" />
                <div className="h-4 w-full rounded bg-purple-50 animate-pulse mb-2" />
                <div className="h-4 w-4/5 rounded bg-purple-50 animate-pulse mb-8" />
                <div className="h-14 w-full rounded-full bg-purple-100 animate-pulse" />
              </div>
            ) : showInvalidLink ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle className="h-7 w-7 text-red-500" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-extrabold text-card-foreground mb-2">That link is no longer valid</h1>
                <p className="text-card-foreground/55 text-sm font-medium leading-6" data-testid="status-invalid-reset-link">
                  Reset links are single-use and expire for your safety. Request a fresh one to choose a new password.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  data-testid="button-request-new-reset"
                  className="w-full bg-primary text-white font-bold text-base py-4 rounded-full shadow-lg shadow-primary/30 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition mt-7"
                >
                  Request a New Link
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  data-testid="link-login-invalid-reset"
                  className="text-primary font-bold text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded mt-5"
                >
                  Back to Log In
                </button>
              </motion.div>
            ) : updated ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
                  <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-extrabold text-card-foreground mb-2">Password updated</h1>
                <p className="text-card-foreground/55 text-sm font-medium leading-6" data-testid="status-password-updated" role="status">
                  You&apos;re all set. Log in with your new password and get back to your habits.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  data-testid="button-login-after-reset"
                  className="w-full bg-primary text-white font-bold text-base py-4 rounded-full shadow-lg shadow-primary/30 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition mt-7"
                >
                  Log In
                </button>
              </motion.div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100">
                    <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-card-foreground mb-1">Choose a new password</h1>
                  <p className="text-card-foreground/50 text-sm font-medium leading-6">
                    Pick something that feels secure and easy for you to remember.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-xs font-bold text-card-foreground/50 uppercase tracking-wider mb-1.5"
                    >
                      New password
                    </label>
                    <input
                      id="new-password"
                      name="new-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      aria-invalid={Boolean(formError)}
                      data-testid="input-new-password"
                      className="w-full px-4 py-3 rounded-2xl bg-purple-50 border border-purple-100 text-card-foreground placeholder:text-card-foreground/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-bold text-card-foreground/50 uppercase tracking-wider mb-1.5"
                    >
                      Confirm password
                    </label>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder="Type it one more time"
                      aria-invalid={Boolean(formError)}
                      data-testid="input-confirm-password"
                      className="w-full px-4 py-3 rounded-2xl bg-purple-50 border border-purple-100 text-card-foreground placeholder:text-card-foreground/30 font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  {formError && (
                    <p
                      className="flex items-start gap-2 text-red-600 text-sm font-semibold bg-red-50 px-4 py-2.5 rounded-xl"
                      data-testid="error-password-reset-confirm"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{formError}</span>
                    </p>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={confirmMutation.isPending}
                    data-testid="button-save-new-password"
                    className="w-full bg-primary text-white font-bold text-base py-4 rounded-full shadow-lg shadow-primary/30 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 mt-2"
                  >
                    {confirmMutation.isPending ? "Updating password…" : "Update Password"}
                  </motion.button>
                </form>

                <p className="text-center text-card-foreground/40 text-sm font-medium mt-6">
                  Changed your mind?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    data-testid="link-login-from-reset"
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