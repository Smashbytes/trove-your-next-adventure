import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, CreditCard, Wallet, Building2,
  Loader2, AlertTriangle, Lock, ChevronRight, Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatPrice, formatDate, formatTime, getSpot } from "@/lib/spots";
import {
  addBooking, clearCheckoutIntent, getCheckoutIntent, type CheckoutIntent,
} from "@/lib/store";

export const Route = createFileRoute("/checkout/$id")({
  head: () => ({ meta: [{ title: "Checkout — TROVE" }] }),
  component: CheckoutPage,
});

type Step = "details" | "payment" | "processing" | "failed";
type PayMethod = "card" | "eft" | "wallet";

function CheckoutPage() {
  const { id } = useParams({ from: "/checkout/$id" });
  const navigate = useNavigate();
  const spot = getSpot(id);

  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [step, setStep] = useState<Step>("details");

  // Buyer details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Payment fields (mock)
  const [method, setMethod] = useState<PayMethod>("card");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/29");
  const [cvc, setCvc] = useState("123");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const i = getCheckoutIntent();
    if (!i || i.spotId !== id) {
      // Fallback intent: 1 ticket at face price
      if (spot) setIntent({ spotId: spot.id, qty: 1, total: spot.price });
    } else {
      setIntent(i);
    }
  }, [id, spot]);

  if (!spot) return <div className="p-10 text-center">Spot not found.</div>;
  if (!intent) return <div className="p-10 text-center text-muted-foreground">Loading checkout…</div>;

  const detailsValid =
    name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    phone.trim().replace(/\D/g, "").length >= 7;

  const paymentValid =
    method !== "card" ||
    (cardNumber.replace(/\s/g, "").length >= 12 && /^\d{2}\/\d{2}$/.test(expiry) && cvc.length >= 3);

  function processPayment() {
    setErrorMsg(null);
    setStep("processing");
    // Mock gateway: succeed unless card ends in 0000 (test failure card)
    const last4 = cardNumber.replace(/\s/g, "").slice(-4);
    const willFail = method === "card" && last4 === "0000";
    setTimeout(() => {
      if (willFail) {
        setErrorMsg("Your card was declined. Try another card or method.");
        setStep("failed");
        return;
      }
      const booking = addBooking({
        spotId: spot.id,
        qty: intent!.qty,
        total: intent!.total,
        split: intent!.split,
        status: "confirmed",
        buyer: { name, email, phone },
        paymentMethod: method,
        paymentRef: `mock_${Math.random().toString(36).slice(2, 10)}`,
      });
      clearCheckoutIntent();
      navigate({ to: "/booking/$id", params: { id: booking.id } });
    }, 1800);
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="flex items-center justify-between">
          <Link to="/spot/$id" params={{ id: spot.id }} className="grid h-10 w-10 place-items-center rounded-full bg-surface ring-1 ring-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-base">Checkout</h1>
          <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Secure
          </div>
        </div>
        {/* Progress */}
        <div className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
          {(["details", "payment", "confirm"] as const).map((s, i) => {
            const active =
              (s === "details" && step === "details") ||
              (s === "payment" && step === "payment") ||
              (s === "confirm" && (step === "processing" || step === "failed"));
            const done =
              (s === "details" && step !== "details") ||
              (s === "payment" && (step === "processing" || step === "failed"));
            return (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <div className={`h-1.5 flex-1 rounded-full ${done || active ? "bg-gradient-brand" : "bg-surface-elevated"}`} />
                <span className={`${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {i + 1}. {s}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      <main className="px-5 pt-5 space-y-5">
        {/* Order summary card */}
        <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
          <div className="flex items-center gap-3 p-3">
            <img src={spot.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-accent">{formatDate(spot.date)} · {formatTime(spot.date)}</p>
              <p className="font-display text-base truncate">{spot.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{spot.area} · {spot.city}</p>
            </div>
          </div>
          <div className="border-t border-border px-4 py-3 text-xs space-y-1.5">
            <Row label={`Tickets × ${intent.qty}`} value={formatPrice(intent.total)} />
            <Row label="Service fee" value={formatPrice(0)} muted />
            <div className="border-t border-dashed border-border pt-2">
              <Row label="Total" value={formatPrice(intent.total)} bold />
              {intent.split && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Split with {intent.split.participants.length - 1} friend(s) · {formatPrice(intent.split.perPerson)} each
                </p>
              )}
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {/* DETAILS */}
          {step === "details" && (
            <motion.section
              key="details"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h2 className="font-display text-lg">Your details</h2>
              <Field label="Full name">
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Sipho Dlamini" autoComplete="name"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </Field>
              <Field label="Email">
                <input
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  type="email" placeholder="you@trove.app" autoComplete="email"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </Field>
              <Field label="Mobile (WhatsApp)">
                <input
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  type="tel" placeholder="+27 71 234 5678" autoComplete="tel"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </Field>
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-success" />
                We'll send your QR ticket to email and WhatsApp.
              </p>
            </motion.section>
          )}

          {/* PAYMENT */}
          {step === "payment" && (
            <motion.section
              key="payment"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h2 className="font-display text-lg">Payment method</h2>

              <div className="grid grid-cols-3 gap-2">
                <PayTab icon={<CreditCard className="h-4 w-4" />} label="Card" active={method === "card"} onClick={() => setMethod("card")} />
                <PayTab icon={<Building2 className="h-4 w-4" />} label="EFT" active={method === "eft"} onClick={() => setMethod("eft")} />
                <PayTab icon={<Wallet className="h-4 w-4" />} label="Wallet" active={method === "wallet"} onClick={() => setMethod("wallet")} />
              </div>

              {method === "card" && (
                <div className="space-y-3">
                  <Field label="Card number">
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCard(e.target.value))}
                      inputMode="numeric"
                      className="w-full bg-transparent font-mono text-sm tracking-wider outline-none"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Expiry">
                      <input
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY" inputMode="numeric"
                        className="w-full bg-transparent font-mono text-sm outline-none"
                      />
                    </Field>
                    <Field label="CVC">
                      <input
                        value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        inputMode="numeric"
                        className="w-full bg-transparent font-mono text-sm outline-none"
                      />
                    </Field>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Test mode · Use card ending <span className="font-mono">0000</span> to simulate a failure.
                  </p>
                </div>
              )}

              {method === "eft" && (
                <div className="rounded-2xl bg-surface ring-1 ring-border p-4 text-sm space-y-1">
                  <p className="font-semibold">Instant EFT</p>
                  <p className="text-xs text-muted-foreground">
                    You'll be redirected to your bank to authorise {formatPrice(intent.total)}.
                  </p>
                </div>
              )}
              {method === "wallet" && (
                <div className="rounded-2xl bg-gradient-soft ring-1 ring-primary/30 p-4 text-sm space-y-1">
                  <p className="font-semibold">TROVE Wallet</p>
                  <p className="text-xs text-muted-foreground">Balance: {formatPrice(2400)} · Sufficient ✓</p>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> Mock gateway — no real charge will be made.
              </p>
            </motion.section>
          )}

          {/* PROCESSING */}
          {step === "processing" && (
            <motion.section
              key="processing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-16 text-center space-y-4"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-brand shadow-glow animate-pulse">
                <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-xl">Processing payment</p>
                <p className="mt-1 text-xs text-muted-foreground">Securing your spot…</p>
              </div>
            </motion.section>
          )}

          {/* FAILED */}
          {step === "failed" && (
            <motion.section
              key="failed"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="rounded-2xl bg-destructive/10 ring-1 ring-destructive/40 p-5 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/20">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <p className="mt-3 font-display text-lg">Payment failed</p>
                <p className="mt-1 text-xs text-muted-foreground">{errorMsg ?? "Something went wrong."}</p>
              </div>
              <button
                onClick={() => setStep("payment")}
                className="w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Try a different method
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky CTA */}
      {(step === "details" || step === "payment") && (
        <div className="fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="mx-auto max-w-md px-3">
            <div className="glass-strong rounded-2xl p-3 shadow-glow flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground">Total</div>
                <div className="font-display text-lg text-gradient">{formatPrice(intent.total)}</div>
              </div>
              {step === "details" ? (
                <button
                  disabled={!detailsValid}
                  onClick={() => setStep("payment")}
                  className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  disabled={!paymentValid}
                  onClick={processPayment}
                  className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
                >
                  <Lock className="h-4 w-4" /> Pay {formatPrice(intent.total)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span className={bold ? "font-semibold text-sm" : ""}>{label}</span>
      <span className={bold ? "font-display text-base text-gradient" : "font-mono"}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-surface ring-1 ring-border px-4 py-2.5 focus-within:ring-primary/60 transition">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function PayTab({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-semibold transition ${
        active ? "bg-gradient-brand text-primary-foreground shadow-glow-soft" : "bg-surface ring-1 ring-border text-foreground"
      }`}
    >
      {icon}
      {label}
      {active && (
        <span className="absolute top-1.5 right-1.5 grid h-4 w-4 place-items-center rounded-full bg-white/30">
          <Check className="h-3 w-3 text-primary-foreground" />
        </span>
      )}
    </button>
  );
}

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
