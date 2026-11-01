import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Mail, MapPin, Search, CalendarClock, TrendingUp,
  Ticket, Sparkles, Compass, Check, Loader2, Eye, EyeOff,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Field, fieldInputCls } from "@/components/Field";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";
import { patchGuestPrefs, getGuestPrefs, saveGuestPrefs } from "@/lib/guest-prefs";
import { CATEGORIES, CITIES, nearestCity } from "@/lib/format";
import { useTopLevelCategories } from "@/lib/listings-api";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to TROVE" }] }),
  component: Onboarding,
});

const STEP_LABELS = [
  "Welcome", "Create Account", "Verify", "About You", "Your Interests",
  "Location", "Notifications", "Discover", "All Set",
];
const TOTAL = STEP_LABELS.length;
const LEGAL = "https://welovetrove.co.za/legal";

type AccountErrors = { fullName?: string; email?: string; password?: string; form?: string };

function Onboarding() {
  const navigate = useNavigate();
  const { signUpWithEmail, verifyEmailOtp, isAuthenticated, user, profile, refreshProfile, openAuthModal } = useAuth();
  const [saving, setSaving] = useState(false);
  const { names: dbCategories } = useTopLevelCategories();
  const interestOptions = dbCategories.length ? dbCategories : (CATEGORIES as string[]);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const prefs = useMemo(() => getGuestPrefs(), []);

  // Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accErr, setAccErr] = useState<AccountErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  // OTP PIN
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // About / interests / location / notifs
  const [dob, setDob] = useState(prefs.dob ?? "");
  const [gender, setGender] = useState(prefs.gender ?? "");
  const [interests, setInterests] = useState<string[]>(prefs.interests);
  const [city, setCity] = useState<string | null>(prefs.city);
  const [cityErr, setCityErr] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [notifs, setNotifs] = useState(prefs.notifs);

  // Once a session is established (OTP verified or cross-tab), jump past the
  // verify step into personalization.
  useEffect(() => {
    if (isAuthenticated && step < 3) {
      setDir(1);
      setStep(3);
    }
  }, [isAuthenticated, step]);

  useEffect(() => {
    if (profile?.full_name && !fullName) setFullName(profile.full_name);
    if (profile?.city && !city) setCity(profile.city);
  }, [profile, fullName, city]);

  const go = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); };

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    const errs: AccountErrors = {};
    if (fullName.trim().length < 2) errs.fullName = "Tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    const pwProblem = passwordProblem(password);
    if (pwProblem) errs.password = pwProblem;
    setAccErr(errs);
    if (errs.fullName) return nameRef.current?.focus();
    if (errs.email) return emailRef.current?.focus();
    if (errs.password) return pwRef.current?.focus();

    setBusy(true);
    try {
      const { error, alreadyRegistered } = await signUpWithEmail(email.trim(), password, fullName.trim());
      if (error) {
        setAccErr({ form: friendlyError(error, "We couldn't create your account. Try again.") });
        return;
      }
      // No code was sent (GST-L04-06). Stay neutral: don't confirm the account exists.
      if (alreadyRegistered) {
        setAccErr({
          form: "If you already have a TROVE account with this email, log in or reset your password.",
        });
        return;
      }
      setPin(["", "", "", "", "", ""]);
      setPinErr(null);
      go(2);
      setTimeout(() => pinRefs.current[0]?.focus(), 400);
    } catch (err) {
      setAccErr({ form: friendlyError(err, "We couldn't create your account. Try again.") });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setPinErr(null);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    if (error) {
      setPinErr(friendlyError(error, "We couldn't send a new code. Try again in a minute."));
    } else {
      setResent(true);
      toast.success("New code sent. Check your inbox.");
      setPin(["", "", "", "", "", ""]);
      setTimeout(() => pinRefs.current[0]?.focus(), 100);
    }
  }

  function handlePinChange(index: number, value: string) {
    const digits = value.replace(/\D/g, "");
    // A full code arriving in one box (iOS/Android one-time-code autofill).
    if (digits.length > 1) return fillPin(digits);
    const next = [...pin];
    next[index] = digits.slice(-1);
    setPin(next);
    if (digits && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function fillPin(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6).split("");
    setPin([...digits, ...Array(6 - digits.length).fill("")]);
    setTimeout(() => pinRefs.current[Math.min(digits.length, 5)]?.focus(), 0);
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) pinRefs.current[index - 1]?.focus();
  }

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    const code = pin.join("");
    if (code.length < 6) {
      setPinErr("Enter all 6 digits of the code.");
      pinRefs.current[code.length]?.focus();
      return;
    }
    setPinErr(null);
    setBusy(true);
    try {
      const { error } = await verifyEmailOtp(email.trim(), code);
      if (error) {
        setPinErr("That code is wrong or has expired. Check it, or send a new one.");
        setPin(["", "", "", "", "", ""]);
        pinRefs.current[0]?.focus();
      }
      // On success: auth state change fires → useEffect jumps to step 3.
    } catch (err) {
      setPinErr(friendlyError(err, "We couldn't check the code. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function saveAbout(e: React.FormEvent) {
    e.preventDefault();
    if (user && fullName.trim().length >= 2 && fullName.trim() !== profile?.full_name) {
      const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
      if (error) toast.error(friendlyError(error, "We couldn't save your name. You can change it later in Profile."));
      else await refreshProfile();
    }
    await save({ dob: dob || null, gender: gender || null });
    go(4);
  }

  /** Save to the account (and this device); a failure doesn't block onboarding. */
  async function save(patch: Parameters<typeof patchGuestPrefs>[0]) {
    setSaving(true);
    try {
      await saveGuestPrefs(user?.id, patch);
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't save that to your account. You can change it later in Settings."));
    } finally {
      setSaving(false);
    }
  }

  async function saveCity() {
    // City lives on the account (it also powers Friends Close By and the feed).
    await save({ city });
    await refreshProfile();
    go(6);
  }

  async function finish() {
    patchGuestPrefs({ onboarded: true });
    navigate({ to: "/" });
  }

  function useMyLocation() {
    setCityErr(null);
    if (!navigator.geolocation) return setCityErr("Location isn't available on this device. Pick your city below.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const near = nearestCity(pos.coords.latitude, pos.coords.longitude);
        setCity(near);
        toast.success(`Showing what's on in and around ${near}.`);
      },
      () => {
        setLocating(false);
        setCityErr("We couldn't get your location. Pick your city below.");
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-background">
      {/* Ambient brand glow — the memorable anchor */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 -right-16 h-64 w-64 rounded-full bg-accent/15 blur-[90px]" />

      {/* Progress rail */}
      {step > 0 && (
        <header className="relative z-10 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
          <div className="flex items-center gap-3">
            {step > 1 && step < 8 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                aria-label="Back"
                className="grid h-9 w-9 place-items-center rounded-full bg-surface ring-1 ring-border"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div
              className="flex flex-1 items-center gap-1.5"
              role="progressbar"
              aria-label="Sign-up progress"
              aria-valuemin={1}
              aria-valuemax={TOTAL}
              aria-valuenow={step + 1}
              aria-valuetext={`Step ${step + 1} of ${TOTAL}: ${STEP_LABELS[step]}`}
            >
              {STEP_LABELS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i <= step ? "bg-gradient-brand shadow-glow-soft" : "bg-surface-elevated"
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground" aria-hidden="true">
              {step + 1}/{TOTAL}
            </span>
          </div>
        </header>
      )}

      <main className="relative z-10 flex flex-1 flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col"
          >
            {step === 0 && <Welcome onStart={() => go(1)} onSignIn={openAuthModal} />}

            {step === 1 && (
              <StepShell eyebrow="Create account" title="Create your TROVE account" subtitle="Let's get you started.">
                <form onSubmit={createAccount} noValidate className="space-y-3">
                  <Field label="Full name" error={accErr.fullName}>
                    <input ref={nameRef} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Thandi Nkosi" autoComplete="name" maxLength={80} className={fieldInputCls} />
                  </Field>
                  <Field label="Email" error={accErr.email}>
                    <input ref={emailRef} value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder="you@email.com" autoComplete="email" maxLength={254} className={fieldInputCls} />
                  </Field>
                  <Field label="Password" error={accErr.password}>
                    <div className="flex items-center gap-2">
                      <input ref={pwRef} value={password} onChange={(e) => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder={PASSWORD_HINT} autoComplete="new-password" className={fieldInputCls} />
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
                  {accErr.form && <FormError>{accErr.form}</FormError>}
                  <PrimaryButton type="submit" busy={busy}>Create account</PrimaryButton>
                  <p className="pt-2 text-center text-xs text-muted-foreground">
                    By creating an account you agree to TROVE's{" "}
                    <a href={`${LEGAL}/terms`} target="_blank" rel="noopener noreferrer" className="text-foreground underline">Terms &amp; Conditions</a>
                    {" "}and{" "}
                    <a href={`${LEGAL}/privacy`} target="_blank" rel="noopener noreferrer" className="text-foreground underline">Privacy Policy</a>.
                  </p>
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={openAuthModal} className="py-1 font-medium text-primary">Log in</button>
                  </p>
                </form>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell eyebrow="Verify" title="Enter your code" subtitle={`We sent a 6-digit code to ${email}`}>
                <form onSubmit={verifyPin} noValidate className="flex flex-col items-center gap-6 py-2">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-soft ring-1 ring-primary/30">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>

                  <fieldset className="flex flex-col items-center gap-2" aria-describedby={pinErr ? "pin-error" : undefined}>
                    <legend className="sr-only">6-digit verification code</legend>
                    <div className="flex gap-2.5">
                      {pin.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { pinRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          aria-label={`Digit ${i + 1} of 6`}
                          aria-invalid={pinErr ? true : undefined}
                          maxLength={i === 0 ? 6 : 1}
                          value={digit}
                          onChange={(e) => handlePinChange(i, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(i, e)}
                          onPaste={(e) => { e.preventDefault(); fillPin(e.clipboardData.getData("text")); }}
                          className={`h-14 w-11 rounded-2xl bg-surface text-center text-xl font-bold ring-1 transition-all duration-150 focus:outline-none caret-transparent ${
                            digit ? "ring-primary shadow-glow-soft text-foreground" : pinErr ? "ring-destructive/70" : "ring-border text-muted-foreground"
                          } focus:ring-2 focus:ring-primary`}
                        />
                      ))}
                    </div>
                    {pinErr && <p id="pin-error" role="alert" className="text-center text-sm text-destructive">{pinErr}</p>}
                  </fieldset>

                  <PrimaryButton type="submit" busy={busy}>Verify code</PrimaryButton>

                  <div className="flex flex-col items-center gap-1 text-center">
                    <button type="button" onClick={resend} className="py-2 text-sm font-semibold text-primary active:opacity-60">
                      {resent ? "Send another code" : "Resend code"}
                    </button>
                    <button type="button" onClick={() => go(1)} className="py-2 text-sm text-muted-foreground active:opacity-60">
                      Wrong email? Change it
                    </button>
                  </div>
                </form>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell eyebrow="About you" title="Tell us about you" subtitle="Help us personalise your TROVE." skip={() => go(4)}>
                <form onSubmit={saveAbout} className="space-y-3">
                  <Field label="Full name">
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={80} className={fieldInputCls} />
                  </Field>
                  <Field label="Date of birth (optional)">
                    <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} className={fieldInputCls} />
                  </Field>
                  <Field label="Gender (optional)">
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${fieldInputCls} appearance-none`}>
                      <option value="">Prefer not to say</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-binary</option>
                    </select>
                  </Field>
                  <PrimaryButton type="submit">Continue</PrimaryButton>
                </form>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell eyebrow="Your interests" title="What are you into?" subtitle="Select all that apply." skip={() => go(5)}>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
                  {interestOptions.map((it) => {
                    const on = interests.includes(it);
                    return (
                      <button
                        type="button"
                        key={it}
                        aria-pressed={on}
                        onClick={() => setInterests((cur) => (on ? cur.filter((x) => x !== it) : [...cur, it]))}
                        className={`rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${
                          on ? "bg-gradient-brand text-primary-foreground shadow-glow-soft" : "bg-surface ring-1 ring-border text-foreground"
                        }`}
                      >
                        {it}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-auto pt-6">
                  <PrimaryButton busy={saving} onClick={async () => { await save({ interests }); go(5); }}>Continue</PrimaryButton>
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell eyebrow="Location" title="Where are you?" subtitle="So we can show what's happening near you." skip={() => go(6)}>
                <button type="button" onClick={useMyLocation} disabled={locating} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-70">
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Use my current location
                </button>
                {cityErr && <p role="alert" className="mt-2 text-sm text-destructive">{cityErr}</p>}
                <Divider label="or pick your city" />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    list="cities"
                    aria-label="Search for your city"
                    value={city ?? ""}
                    onChange={(e) => setCity(e.target.value || null)}
                    placeholder="Search for your city"
                    className="w-full rounded-2xl bg-surface py-3 pl-10 pr-4 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
                  />
                  <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cities">
                  {CITIES.slice(0, 6).map((c) => (
                    <button type="button" key={c} aria-pressed={city === c} onClick={() => setCity(c)} className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${city === c ? "bg-gradient-brand text-primary-foreground" : "bg-surface ring-1 ring-border text-muted-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-6">
                  <PrimaryButton onClick={saveCity} busy={saving}>Continue</PrimaryButton>
                </div>
              </StepShell>
            )}

            {step === 6 && (
              <StepShell eyebrow="Notifications" title="Stay in the loop" subtitle="Choose what TROVE suggests to you. You can change this anytime in Settings." skip={() => go(7)}>
                <div className="space-y-2.5">
                  <Toggle icon={<Sparkles className="h-4 w-4 text-primary" />} label="Event recommendations" hint="Personalised suggestions" on={notifs.recommendations} onToggle={() => setNotifs((n) => ({ ...n, recommendations: !n.recommendations }))} />
                  <Toggle icon={<CalendarClock className="h-4 w-4 text-primary" />} label="Event reminders" hint="For events you book or save" on={notifs.reminders} onToggle={() => setNotifs((n) => ({ ...n, reminders: !n.reminders }))} />
                  <Toggle icon={<TrendingUp className="h-4 w-4 text-primary" />} label="Upcoming & trending" hint="What's hot near you" on={notifs.trending} onToggle={() => setNotifs((n) => ({ ...n, trending: !n.trending }))} />
                </div>
                <div className="mt-auto pt-6">
                  <PrimaryButton busy={saving} onClick={async () => { await save({ notifs }); go(7); }}>Continue</PrimaryButton>
                </div>
              </StepShell>
            )}

            {step === 7 && (
              <StepShell eyebrow="Discover TROVE" title="Your next adventure" subtitle="Here's what you can do.">
                <div className="space-y-3">
                  <Feature icon={<Compass className="h-5 w-5" />} title="Find events" body="Browse experiences tailored to your vibe." />
                  <Feature icon={<Ticket className="h-5 w-5" />} title="Book instantly" body="Secure your spot in just a few taps." />
                  <Feature icon={<Sparkles className="h-5 w-5" />} title="Experience more" body="Make memories that last a lifetime." />
                </div>
                <div className="mt-auto pt-6">
                  <PrimaryButton onClick={() => go(8)}>Continue</PrimaryButton>
                </div>
              </StepShell>
            )}

            {step === 8 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }}
                  className="relative grid h-28 w-28 place-items-center rounded-[2rem] bg-gradient-brand shadow-glow">
                  <Logo size={56} withWord={false} />
                  <span className="absolute -right-1 -top-1 grid h-9 w-9 place-items-center rounded-full bg-success ring-4 ring-background">
                    <Check className="h-5 w-5 text-white" />
                  </span>
                </motion.div>
                <h1 className="mt-7 font-display text-4xl">You're all set!</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get ready to discover, book and experience the best near you.
                </p>
                <div className="mt-8 w-full">
                  <PrimaryButton onClick={finish}>Explore events</PrimaryButton>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Welcome (full-bleed hero) — step 0
// ---------------------------------------------------------------------------
function Welcome({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pt-[max(env(safe-area-inset-top),2rem)] text-center">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
        <div className="flex justify-center"><Logo size={40} /></div>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.35em] text-primary">
          Discover. Book. Experience.
        </p>
      </motion.div>
      <motion.h1 initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.6 }}
        className="mt-10 font-display text-[2.6rem] leading-[0.95]">
        Tonight <span className="text-gradient">lives</span> here.
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        className="mt-4 max-w-xs text-sm font-medium text-muted-foreground">
        Find the best events, book instantly and make unforgettable memories across South Africa.
      </motion.p>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 w-full">
        <PrimaryButton onClick={onStart}>Get started</PrimaryButton>
        <button type="button" onClick={onSignIn} className="mt-4 block w-full py-2 text-sm text-muted-foreground">
          Already have an account? <span className="text-primary font-medium">Log in</span>
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
function StepShell({
  eyebrow, title, subtitle, children, skip,
}: {
  eyebrow: string; title: string; subtitle: string; children: React.ReactNode; skip?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pt-6">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl leading-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
      {skip && (
        <button type="button" onClick={skip} className="mt-4 py-2 text-center text-sm font-medium text-muted-foreground">
          Skip for now
        </button>
      )}
    </div>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}

function PrimaryButton({
  onClick, children, busy, type = "button",
}: { onClick?: () => void; children: React.ReactNode; busy?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy || undefined}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60"
    >
      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="sr-only">Please wait</span></> : <>{children}<ArrowRight className="h-4 w-4" /></>}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Toggle({ icon, label, hint, on, onToggle }: { icon: React.ReactNode; label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-border text-left"
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-elevated">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition ${on ? "bg-gradient-brand shadow-glow-soft" : "bg-surface-elevated ring-1 ring-border"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "right-0.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-soft text-primary ring-1 ring-primary/30">{icon}</div>
      <div>
        <p className="font-display text-base">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
