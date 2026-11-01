import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Field, fieldInputCls } from "@/components/Field";
import { arrivedWithRecoveryHash, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset your password — TROVE" }] }),
  component: ResetPasswordPage,
});

type Phase = "verifying" | "ready" | "invalid" | "success";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { openAuthModal } = useAuth();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const pwRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // The recovery email can arrive in three shapes:
  //   1. ?token_hash=…&type=recovery  (token-hash template, works across devices)
  //   2. ?code=…                      (PKCE; needs the verifier from this browser)
  //   3. #access_token=…&type=recovery (implicit; supabase-js fires PASSWORD_RECOVERY)
  useEffect(() => {
    let cancelled = false;
    const fail = (e: unknown) => {
      if (cancelled) return;
      setLinkError(friendlyError(e, "This reset link is invalid or has expired."));
      setPhase("invalid");
    };

    (async () => {
      try {
        const url = new URL(window.location.href);
        const tokenHash = url.searchParams.get("token_hash");
        const code = url.searchParams.get("code");
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (error) return fail(error);
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) return fail(error);
        } else if (!arrivedWithRecoveryHash) {
          // No recovery link: being signed in isn't enough (GST-L04-04).
          return fail(null);
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            // Give the implicit-flow hash a moment to be parsed.
            await new Promise((r) => setTimeout(r, 1200));
            const again = await supabase.auth.getSession();
            if (!again.data.session) return fail(null);
          }
        }
        if (cancelled) return;
        window.history.replaceState({}, "", url.pathname);
        setPhase("ready");
      } catch (e) {
        fail(e);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!cancelled && event === "PASSWORD_RECOVERY") setPhase("ready");
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const pwProblem = passwordProblem(password);
    if (pwProblem) next.password = pwProblem;
    else if (confirm !== password) next.confirm = "The passwords don't match.";
    setErrors(next);
    if (next.password) return pwRef.current?.focus();
    if (next.confirm) return confirmRef.current?.focus();

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrors({ form: friendlyError(error, "We couldn't update your password. Try again.") });
        return;
      }
      setPhase("success");
      setTimeout(() => navigate({ to: "/" }), 1500);
    } catch (err) {
      setErrors({ form: friendlyError(err, "We couldn't update your password. Try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[100px]" />
      <div className="relative">
        <Logo size={32} />

        {phase === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-16" role="status">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <h1 className="text-base font-sans font-medium text-muted-foreground">Checking your reset link…</h1>
          </div>
        )}

        {phase === "invalid" && (
          <div className="pt-10 text-center">
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-destructive/15">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="font-display text-3xl">Link expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {linkError ?? "This reset link is invalid or has expired."} Request a new one from the
              sign-in screen.
            </p>
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/" });
                openAuthModal();
              }}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Back to sign in <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === "success" && (
          <div className="pt-10 text-center" role="status">
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-success/20">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h1 className="font-display text-3xl">Password updated</h1>
            <p className="mt-2 text-sm text-muted-foreground">You're signed in. Taking you to Discover…</p>
          </div>
        )}

        {phase === "ready" && (
          <form onSubmit={submit} noValidate className="pt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Account recovery</p>
            <h1 className="mt-2 font-display text-3xl leading-tight">Set a new password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{PASSWORD_HINT}. You'll be signed in straight away.</p>
            <div className="mt-6 space-y-3">
              <Field label="New password" error={errors.password}>
                <div className="flex items-center gap-2">
                  <input
                    ref={pwRef}
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters, a letter and a number"
                    className={fieldInputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    aria-pressed={showPw}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm new password" error={errors.confirm}>
                <input
                  ref={confirmRef}
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={fieldInputCls}
                />
              </Field>
              {errors.form && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errors.form}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Update password <ArrowRight className="h-4 w-4" /></>}
              </button>
              <Link to="/" className="block py-2 text-center text-sm text-muted-foreground">
                Back to Discover
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
