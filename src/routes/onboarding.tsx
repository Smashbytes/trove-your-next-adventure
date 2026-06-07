import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Mail, MapPin, Search, CalendarClock, TrendingUp,
  Ticket, Sparkles, Compass, Check, Loader2, Eye, EyeOff,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { patchGuestPrefs, getGuestPrefs } from "@/lib/guest-prefs";
import { CITIES } from "@/lib/spots";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to TROVE" }] }),
  component: Onboarding,
});

// Brand interest set (mirrors the onboarding map). Used for personalization.
const INTERESTS = [
  "Comedy", "Music", "Food & Drink", "Nightlife", "Arts & Culture",
  "Sports", "Adventure", "Tech", "Wellness", "Business",
];

const STEP_LABELS = [
  "Welcome", "Create Account", "Verify", "About You", "Your Interests",
  "Location", "Notifications", "Discover", "All Set",
];
const TOTAL = STEP_LABELS.length;

function Onboarding() {
  const navigate = useNavigate();
  const { signUpWithEmail, isAuthenticated, user, profile, refreshProfile, openAuthModal } = useAuth();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const prefs = useMemo(() => getGuestPrefs(), []);

  // Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // About / interests / location / notifs
  const [dob, setDob] = useState(prefs.dob ?? "");
  const [gender, setGender] = useState(prefs.gender ?? "");
  const [interests, setInterests] = useState<string[]>(prefs.interests);
  const [city, setCity] = useState<string | null>(prefs.city);
  const [notifs, setNotifs] = useState(prefs.notifs);

  // Once a session exists (e.g. returning from the email verification link, or
  // cross-tab), jump past Welcome/Account/Verify into personalization.
  useEffect(() => {
    if (isAuthenticated && step < 3) {
      setDir(1);
      setStep(3);
    }
  }, [isAuthenticated, step]);

  useEffect(() => {
    if (profile?.full_name && !fullName) setFullName(profile.full_name);
  }, [profile, fullName]);

  const go = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); };

  async function createAccount() {
    if (fullName.trim().length < 2) return toast.error("Tell us your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email.");
    if (password.length < 8) return toast.error("Password needs at least 8 characters.");
    setBusy(true);
    const { error } = await signUpWithEmail(email.trim(), password, fullName.trim());
    setBusy(false);
    if (error) return toast.error(error);
    go(2); // Verify
  }

  async function resend() {
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    toast[error ? "error" : "success"](error ? error.message : "Verification email resent.");
  }

  async function saveAbout() {
    if (user && fullName.trim().length >= 2 && fullName.trim() !== profile?.full_name) {
      await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
      await refreshProfile();
    }
    patchGuestPrefs({ dob: dob || null, gender: gender || null });
    go(4);
  }

  function finish() {
    patchGuestPrefs({ interests, city, notifs, onboarded: true });
    navigate({ to: "/" });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Location isn't available on this device.");
    navigator.geolocation.getCurrentPosition(
      () => toast.success("Location captured. Showing what's near you."),
      () => toast.error("Couldn't get your location — pick a city instead."),
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
              <button onClick={() => go(step - 1)} className="grid h-8 w-8 place-items-center rounded-full bg-surface ring-1 ring-border">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex flex-1 items-center gap-1.5">
              {STEP_LABELS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i <= step ? "bg-gradient-brand shadow-glow-soft" : "bg-surface-elevated"
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
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
                <div className="space-y-3">
                  <Field label="Full name">
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" autoComplete="name" className={inputCls} />
                  </Field>
                  <Field label="Email">
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" autoComplete="email" className={inputCls} />
                  </Field>
                  <Field label="Password">
                    <div className="flex items-center gap-2">
                      <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="Min. 8 characters" autoComplete="new-password" className={inputCls} />
                      <button onClick={() => setShowPw((s) => !s)} className="text-muted-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <PrimaryButton onClick={createAccount} busy={busy}>Create account</PrimaryButton>
                  <Divider label="or" />
                  <div className="space-y-2">
                    {["Google", "Apple", "Facebook"].map((p) => (
                      <button key={p} onClick={() => toast("Social sign-in is coming soon — use email for now.")} className="w-full rounded-2xl bg-surface py-3 text-sm font-semibold ring-1 ring-border">
                        Continue with {p}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    By signing up you agree to TROVE's Terms & Privacy Policy.
                  </p>
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={openAuthModal} className="text-primary font-medium">Log in</button>
                  </p>
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell eyebrow="Verify" title="Verify your email" subtitle="We've sent a verification link.">
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-soft ring-1 ring-primary/30">
                    <Mail className="h-8 w-8 text-primary" />
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground">
                    We sent a link to <span className="font-semibold text-foreground">{email}</span>.
                    Tap it to confirm — this page updates automatically.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for confirmation…
                  </div>
                  <button onClick={resend} className="mt-6 text-sm font-semibold text-primary">Resend email</button>
                  <button onClick={() => go(1)} className="mt-2 text-xs text-muted-foreground">Change email</button>
                </div>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell eyebrow="About you" title="Tell us about you" subtitle="Help us personalize your TROVE." skip={() => go(4)}>
                <div className="space-y-3">
                  <Field label="Full name">
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Date of birth (optional)">
                    <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" className={inputCls} />
                  </Field>
                  <Field label="Gender (optional)">
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${inputCls} appearance-none`}>
                      <option value="">Prefer not to say</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-binary</option>
                    </select>
                  </Field>
                  <PrimaryButton onClick={saveAbout}>Continue</PrimaryButton>
                </div>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell eyebrow="Your interests" title="What are you into?" subtitle="Select all that apply." skip={() => go(5)}>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((it) => {
                    const on = interests.includes(it);
                    return (
                      <button
                        key={it}
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
                  <PrimaryButton onClick={() => go(5)}>Continue</PrimaryButton>
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell eyebrow="Location" title="Where are you?" subtitle="So we can show what's happening near you." skip={() => go(6)}>
                <button onClick={useMyLocation} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow">
                  <MapPin className="h-4 w-4" /> Use my current location
                </button>
                <Divider label="or pick your city" />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    list="cities"
                    value={city ?? ""}
                    onChange={(e) => setCity(e.target.value || null)}
                    placeholder="Search for your city"
                    className="w-full rounded-2xl bg-surface py-3 pl-10 pr-4 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
                  />
                  <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CITIES.slice(0, 6).map((c) => (
                    <button key={c} onClick={() => setCity(c)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${city === c ? "bg-gradient-brand text-primary-foreground" : "bg-surface ring-1 ring-border text-muted-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-6">
                  <PrimaryButton onClick={() => go(6)}>Continue</PrimaryButton>
                </div>
              </StepShell>
            )}

            {step === 6 && (
              <StepShell eyebrow="Notifications" title="Stay in the loop" subtitle="Never miss the best events." skip={() => go(7)}>
                <div className="space-y-2.5">
                  <Toggle icon={<Sparkles className="h-4 w-4 text-primary" />} label="Event recommendations" hint="Personalized suggestions" on={notifs.recommendations} onToggle={() => setNotifs((n) => ({ ...n, recommendations: !n.recommendations }))} />
                  <Toggle icon={<CalendarClock className="h-4 w-4 text-primary" />} label="Event reminders" hint="For events you book or save" on={notifs.reminders} onToggle={() => setNotifs((n) => ({ ...n, reminders: !n.reminders }))} />
                  <Toggle icon={<TrendingUp className="h-4 w-4 text-primary" />} label="Upcoming & trending" hint="What's hot near you" on={notifs.trending} onToggle={() => setNotifs((n) => ({ ...n, trending: !n.trending }))} />
                </div>
                <div className="mt-auto pt-6">
                  <PrimaryButton onClick={() => go(7)}>Continue</PrimaryButton>
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
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.35em] text-primary">
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
        <button type="button" onClick={onSignIn} className="mt-4 block w-full text-sm text-muted-foreground">
          Already have an account? <span className="text-primary font-medium">Log in</span>
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
const inputCls = "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50";

function StepShell({
  eyebrow, title, subtitle, children, skip,
}: {
  eyebrow: string; title: string; subtitle: string; children: React.ReactNode; skip?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pt-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl leading-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
      {skip && (
        <button onClick={skip} className="mt-4 text-center text-xs font-medium text-muted-foreground">
          Skip for now
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-border focus-within:ring-primary/60 transition">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function PrimaryButton({ onClick, children, busy }: { onClick: () => void; children: React.ReactNode; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{children}<ArrowRight className="h-4 w-4" /></>}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Toggle({ icon, label, hint, on, onToggle }: { icon: React.ReactNode; label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-border text-left">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-elevated">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <span className={`relative h-6 w-11 rounded-full transition ${on ? "bg-gradient-brand shadow-glow-soft" : "bg-surface-elevated"}`}>
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
