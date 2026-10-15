import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, CreditCard, Wallet, Building2,
  Loader2, AlertTriangle, Lock, ChevronRight, Check, Mail, MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatPrice, formatDate, formatTime } from "@/lib/spots";
import { useIsDemo, useListing } from "@/lib/listings-api";
import { useCreateBooking, useInitializePayment } from "@/lib/bookings-api";
import { clearCheckoutIntent, getCheckoutIntent, setPendingPayment, type CheckoutIntent } from "@/lib/store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/checkout/$id")({
  head: () => ({ meta: [{ title: "Checkout — TROVE" }] }),
  component: CheckoutPage,
});

type Step = "details" | "loading" | "payment" | "processing" | "failed";
type PayMethod = "card" | "eft" | "wallet";
type DeliveryMethod = "email" | "whatsapp";

const WHATSAPP_DELIVERY_FEE_RAND = 5;
const CHECKOUT_HOLD_MIN = 15;

function CheckoutPage() {
  const { id } = useParams({ from: "/checkout/$id" });
  const navigate = useNavigate();
  const { data: spot, isLoading } = useListing(id);
  const demo = useIsDemo();
  const createBooking = useCreateBooking();
  const initPayment = useInitializePayment();
  const { isAuthenticated, openAuthModal, profile, user } = useAuth();

  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [step, setStep] = useState<Step>("details");

  // Buyer details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idType, setIdType] = useState<"ID" | "PASSPORT">("ID");
  const [idNumber, setIdNumber] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>("email");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

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

  // Prefill buyer details from the signed-in account.
  useEffect(() => {
    if (profile?.full_name) {
      const [first, ...rest] = profile.full_name.trim().split(/\s+/);
      setFirstName((f) => f || first || "");
      setLastName((l) => l || rest.join(" "));
    }
    if (user?.email) setEmail((e) => e || user.email!);
  }, [profile?.full_name, user?.email]);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!spot) return <div className="p-10 text-center">Spot not found.</div>;
  if (!isAuthenticated) return <AuthRequired onSignIn={openAuthModal} spotId={id} />;
  if (!intent) return <div className="p-10 text-center text-muted-foreground">Loading checkout…</div>;

  // Paid + live (non-demo) listings settle through TradeSafe's hosted checkout;
  // demo/free bookings use the in-app mock flow.
  const isTradeSafe = !demo && intent.total > 0;
  const questions = spot.customQuestions ?? [];
  // Free/demo bookings have no payment rail for a standalone fee — the R5
  // WhatsApp delivery fee only actually applies to paid TradeSafe checkouts.
  const deliveryFee = isTradeSafe && delivery === "whatsapp" ? WHATSAPP_DELIVERY_FEE_RAND : 0;
  const total = intent.total + deliveryFee;

  const detailsValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    phone.trim().replace(/\D/g, "").length >= 7 &&
    (!isTradeSafe || idNumber.trim().length >= 4) &&
    (delivery !== "whatsapp" || phone.trim().replace(/\D/g, "").length >= 7) &&
    questions.every((q) => !q.required || (customAnswers[q.id] ?? "").trim().length > 0);

  // TradeSafe checkout collects payment details on its hosted secure page.
  // page, so there's nothing to validate here. The mock card form only gates
  // the demo/free flow.
  const paymentValid =
    termsAccepted &&
    (isTradeSafe ||
      method !== "card" ||
      (cardNumber.replace(/\s/g, "").length >= 12 && /^\d{2}\/\d{2}$/.test(expiry) && cvc.length >= 3));

  function goToPayment() {
    setStep("loading");
    window.setTimeout(() => setStep("payment"), 550);
  }

  async function processPayment() {
    if (!spot || !intent) return;
    setErrorMsg(null);
    setStep("processing");
    try {
      // Paid live listings go through TradeSafe; demo + free use the
      // direct booking path.
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (isTradeSafe) {
        const { authorizationUrl, bookingId, checkoutExpiresAt } = await initPayment.mutateAsync({
          listingId: spot.id,
          qty: intent.qty,
          attestedAge: true,
          buyer: { name: fullName, phone, idNumber, idType },
          deliveryMethod: delivery,
          termsAccepted,
          customAnswers,
        });
        // Stash the booking before we leave the app — TradeSafe returns the
        // payer to a static URL with no booking context, so /payment/return
        // has nothing else to go on.
        setPendingPayment({
          bookingId,
          spotId: spot.id,
          total,
          expiresAt: checkoutExpiresAt,
          startedAt: Date.now(),
        });
        clearCheckoutIntent();
        window.location.href = authorizationUrl;
        return;
      }
      const { bookingId } = await createBooking.mutateAsync({
        listingId: spot.id,
        qty: intent.qty,
        total: intent.total,
        attestedAge: true,
        buyer: { name: fullName, email, phone },
        paymentMethod: method,
        split: intent.split,
        deliveryMethod: delivery,
        termsAccepted,
        customAnswers,
      });
      clearCheckoutIntent();
      navigate({ to: "/booking/$id", params: { id: bookingId } });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "We couldn't complete your booking.");
      setStep("failed");
    }
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
              (s === "payment" && (step === "loading" || step === "payment")) ||
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
            <img
              src={spot.image}
              alt=""
              data-fallback={spot.imageFallback}
              onError={(e) => {
                const t = e.currentTarget;
                const fb = t.dataset.fallback;
                if (fb && t.src !== fb) t.src = fb;
              }}
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-accent">{formatDate(spot.date)} · {formatTime(spot.date)}</p>
              <p className="font-display text-base truncate">{spot.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{spot.area} · {spot.city}</p>
            </div>
          </div>
          <div className="border-t border-border px-4 py-3 text-xs space-y-1.5">
            <Row label={`Tickets × ${intent.qty}`} value={formatPrice(intent.total)} />
            <Row label="Service fee" value={formatPrice(0)} muted />
            {deliveryFee > 0 && <Row label="WhatsApp delivery" value={formatPrice(deliveryFee)} muted />}
            <div className="border-t border-dashed border-border pt-2">
              <Row label="Total" value={formatPrice(total)} bold />
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input
                    value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sipho" autoComplete="given-name"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dlamini" autoComplete="family-name"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                  />
                </Field>
              </div>
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

              {isTradeSafe && (
                <>
                  <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
                    <Field label="ID type">
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value as "ID" | "PASSPORT")}
                        className="w-full bg-transparent text-sm outline-none"
                      >
                        <option value="ID">ID number</option>
                        <option value="PASSPORT">Passport</option>
                      </select>
                    </Field>
                    <Field label={idType === "ID" ? "ID number" : "Passport number"}>
                      <input
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        autoComplete="off"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                      />
                    </Field>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Required by TradeSafe, our secure payment provider, to verify who's paying.
                  </p>
                </>
              )}

              {/* Host-defined extra questions */}
              {questions.map((q) => (
                <Field key={q.id} label={q.required ? `${q.label} *` : q.label}>
                  {q.type === "select" ? (
                    <select
                      value={customAnswers[q.id] ?? ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className="w-full bg-transparent text-sm outline-none"
                    >
                      <option value="">Select…</option>
                      {(q.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : q.type === "textarea" ? (
                    <textarea
                      value={customAnswers[q.id] ?? ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      rows={2}
                      className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                  ) : (
                    <input
                      value={customAnswers[q.id] ?? ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                  )}
                </Field>
              ))}

              {/* Ticket delivery */}
              <div className="space-y-1.5">
                <span className="block px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Ticket delivery
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDelivery("email")}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition ${
                      delivery === "email" ? "bg-gradient-brand text-primary-foreground shadow-glow-soft" : "bg-surface ring-1 ring-border text-foreground"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" /> Email · Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelivery("whatsapp")}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition ${
                      delivery === "whatsapp" ? "bg-gradient-brand text-primary-foreground shadow-glow-soft" : "bg-surface ring-1 ring-border text-foreground"
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp · {isTradeSafe ? formatPrice(WHATSAPP_DELIVERY_FEE_RAND) : "Free"}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-success" />
                We'll send your QR ticket to your {delivery === "whatsapp" ? "WhatsApp" : "email"}.
              </p>
            </motion.section>
          )}

          {/* LOADING (brief transition between steps) */}
          {step === "loading" && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-20 text-center"
            >
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </motion.section>
          )}

          {/* PAYMENT */}
          {step === "payment" && (
            <motion.section
              key="payment"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h2 className="font-display text-lg">Payment</h2>

              {/* TradeSafe checkout — payment details are entered on TradeSafe's
                  secure, PCI-compliant page after redirect. */}
              {isTradeSafe && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-surface ring-1 ring-border p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand shadow-glow-soft">
                        <ShieldCheck className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Secure checkout by TradeSafe</p>
                        <p className="text-[11px] text-muted-foreground">
                          You'll be redirected to TradeSafe to pay {formatPrice(total)} securely. We hold it until your booking is done.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["Card", "Instant EFT", "Apple / Google Pay"].map((m) => (
                        <span key={m} className="rounded-full bg-surface-elevated px-2.5 py-1 text-[10px] text-muted-foreground ring-1 ring-border">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <Lock className="h-3 w-3 text-success" /> 3-D Secure protected · your card details never touch TROVE.
                  </p>
                </div>
              )}

              {!isTradeSafe && (
              <div className="grid grid-cols-3 gap-2">
                <PayTab icon={<CreditCard className="h-4 w-4" />} label="Card" active={method === "card"} onClick={() => setMethod("card")} />
                <PayTab icon={<Building2 className="h-4 w-4" />} label="EFT" active={method === "eft"} onClick={() => setMethod("eft")} />
                <PayTab icon={<Wallet className="h-4 w-4" />} label="Wallet" active={method === "wallet"} onClick={() => setMethod("wallet")} />
              </div>
              )}

              {!isTradeSafe && method === "card" && (
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

              {!isTradeSafe && method === "eft" && (
                <div className="rounded-2xl bg-surface ring-1 ring-border p-4 text-sm space-y-1">
                  <p className="font-semibold">Instant EFT</p>
                  <p className="text-xs text-muted-foreground">
                    You'll be redirected to your bank to authorise {formatPrice(total)}.
                  </p>
                </div>
              )}
              {!isTradeSafe && method === "wallet" && (
                <div className="rounded-2xl bg-gradient-soft ring-1 ring-primary/30 p-4 text-sm space-y-1">
                  <p className="font-semibold">TROVE Wallet</p>
                  <p className="text-xs text-muted-foreground">Balance: {formatPrice(2400)} · Sufficient ✓</p>
                </div>
              )}

              {!isTradeSafe && (
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Demo checkout — no real charge will be made.
                </p>
              )}

              <p className="rounded-xl bg-surface-elevated px-3 py-2 text-[11px] text-muted-foreground">
                Your spot is held for {CHECKOUT_HOLD_MIN} minutes — complete payment before then or it releases back to the pool.
              </p>

              <label className="flex items-start gap-2 px-1 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                />
                <span>
                  I agree to TROVE's{" "}
                  <a href="https://welovetrove.co.za/legal/terms" target="_blank" rel="noreferrer" className="underline">Terms & Conditions</a>
                  {" "}and{" "}
                  <a href="https://welovetrove.co.za/legal/privacy" target="_blank" rel="noreferrer" className="underline">Privacy Policy</a>.
                </span>
              </label>
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
                <div className="font-display text-lg text-gradient">{formatPrice(total)}</div>
              </div>
              {step === "details" ? (
                <button
                  disabled={!detailsValid}
                  onClick={goToPayment}
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
                  <Lock className="h-4 w-4" /> Pay {formatPrice(total)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthRequired({ onSignIn, spotId }: { onSignIn: () => void; spotId: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="flex items-center justify-between">
          <Link to="/spot/$id" params={{ id: spotId }} className="grid h-10 w-10 place-items-center rounded-full bg-surface ring-1 ring-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-base">Checkout</h1>
          <span className="w-10" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
          <Lock className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="mt-5 font-display text-2xl">Sign in to book</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You need a TROVE account to secure your spot. Your ticket and QR code get tied to it — and we'll keep your selection.
        </p>
        <button
          onClick={onSignIn}
          className="mt-6 w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] transition"
        >
          Sign in
        </button>
        <Link
          to="/onboarding"
          className="mt-3 w-full rounded-full bg-surface py-3 text-sm font-semibold text-foreground ring-1 ring-border active:scale-[0.98] transition"
        >
          Create your account
        </Link>
      </main>
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
