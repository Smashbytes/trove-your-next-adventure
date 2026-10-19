import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, CreditCard, Wallet, Building2,
  Loader2, AlertTriangle, Lock, ChevronRight, Check, Mail, MessageCircle, Ticket,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatPrice, formatDate, formatTime } from "@/lib/format";
import { useIsDemo, useListing } from "@/lib/listings-api";
import { useCreateBooking, useInitializePayment } from "@/lib/bookings-api";
import { clearCheckoutIntent, getCheckoutIntent, setPendingPayment, type CheckoutIntent } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { Field, fieldInputCls } from "@/components/Field";
import { NotFoundState } from "@/components/NotFoundState";

export const Route = createFileRoute("/checkout/$id")({
  head: () => ({ meta: [{ title: "Checkout — TROVE" }] }),
  component: CheckoutPage,
});

type Step = "details" | "loading" | "payment" | "processing" | "failed";
type PayMethod = "card" | "eft" | "wallet";
type DeliveryMethod = "email" | "whatsapp";
type DetailErrors = Partial<Record<"firstName" | "lastName" | "email" | "phone" | "idNumber" | "terms" | string, string>>;

const WHATSAPP_DELIVERY_FEE_RAND = 5;
// WhatsApp ticket delivery stays hidden until TROVE's WhatsApp sender is live
// (the booking functions refuse it with `whatsapp_unavailable` until then).
const WHATSAPP_DELIVERY_ON = import.meta.env.VITE_WHATSAPP_DELIVERY === "true";
const CHECKOUT_HOLD_MIN = 15;
const LEGAL = "https://welovetrove.co.za/legal";

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
  const [errors, setErrors] = useState<DetailErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Demo-account mock payment fields (never shown to real guests)
  const [method, setMethod] = useState<PayMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
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
    if (profile?.phone) setPhone((p) => p || profile.phone!);
    if (user?.email) setEmail((e) => e || user.email!);
  }, [profile?.full_name, profile?.phone, user?.email]);

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading checkout</span>
      </div>
    );
  }
  if (!spot) return <NotFoundState />;
  if (!isAuthenticated) return <AuthRequired onSignIn={openAuthModal} spotId={id} />;
  if (!intent) return <div className="p-10 text-center text-muted-foreground" role="status">Loading checkout…</div>;

  // Three flows: paid live listings settle through TradeSafe's hosted checkout;
  // free live listings are reserved straight away (no payment step); the demo
  // account keeps the in-app mock payment screen.
  const isTradeSafe = !demo && intent.total > 0;
  const isFree = !demo && intent.total === 0;
  const questions = spot.customQuestions ?? [];
  // Free/demo bookings have no payment rail for a standalone fee — the R5
  // WhatsApp delivery fee only actually applies to paid TradeSafe checkouts.
  const deliveryFee = isTradeSafe && delivery === "whatsapp" ? WHATSAPP_DELIVERY_FEE_RAND : 0;
  const total = intent.total + deliveryFee;
  const phoneDigits = phone.replace(/\D/g, "");

  function validateDetails(): DetailErrors {
    const e: DetailErrors = {};
    if (!firstName.trim()) e.firstName = "Enter your first name.";
    if (!lastName.trim()) e.lastName = "Enter your last name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email address.";
    if (phoneDigits.length < 9 || phoneDigits.length > 15) e.phone = "Enter a valid mobile number, e.g. 071 234 5678.";
    if (isTradeSafe) {
      if (idType === "ID" && !/^\d{13}$/.test(idNumber.replace(/\s/g, ""))) e.idNumber = "A South African ID number has 13 digits.";
      if (idType === "PASSPORT" && idNumber.trim().length < 6) e.idNumber = "Enter your passport number.";
    }
    for (const q of questions) {
      if (q.required && !(customAnswers[q.id] ?? "").trim()) e[`q:${q.id}`] = "This question needs an answer.";
    }
    if (isFree && !termsAccepted) e.terms = "Accept the Terms & Conditions to continue.";
    return e;
  }

  function focusFirstError() {
    setTimeout(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }

  function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateDetails();
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError();
    if (isFree) return void processPayment();
    setStep("loading");
    window.setTimeout(() => setStep("payment"), 550);
  }

  const paymentValid =
    termsAccepted &&
    (isTradeSafe ||
      method !== "card" ||
      (cardNumber.replace(/\s/g, "").length >= 12 && /^\d{2}\/\d{2}$/.test(expiry) && cvc.length >= 3));

  async function processPayment() {
    if (!spot || !intent) return;
    setErrorMsg(null);
    setStep("processing");
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (isTradeSafe) {
        const { authorizationUrl, bookingId, checkoutExpiresAt } = await initPayment.mutateAsync({
          listingId: spot.id,
          qty: intent.qty,
          option: intent.option,
          attestedAge: true,
          buyer: { name: fullName, phone, idNumber: idNumber.replace(/\s/g, ""), idType },
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
        option: intent.option,
        total: intent.total,
        attestedAge: true,
        buyer: { name: fullName, email, phone },
        paymentMethod: demo ? method : undefined,
        split: intent.split,
        deliveryMethod: delivery,
        termsAccepted,
        customAnswers,
      });
      clearCheckoutIntent();
      navigate({ to: "/booking/$id", params: { id: bookingId } });
    } catch (e) {
      setErrorMsg(friendlyError(e, "We couldn't complete your booking. Nothing was charged."));
      setStep("failed");
    }
  }

  const steps = isFree ? (["details", "confirm"] as const) : (["details", "payment", "confirm"] as const);

  return (
    <div className="mx-auto min-h-screen max-w-md pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="flex items-center justify-between">
          <Link to="/spot/$id" params={{ id: spot.id }} aria-label="Back to event" className="grid h-10 w-10 place-items-center rounded-full bg-surface ring-1 ring-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-base">{isFree ? "Reserve your spot" : "Checkout"}</h1>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Secure
          </div>
        </div>
        {/* Progress */}
        <ol className="mt-3 flex items-center gap-1.5 text-xs uppercase tracking-wider" aria-label="Checkout steps">
          {steps.map((s, i) => {
            const active =
              (s === "details" && step === "details") ||
              (s === "payment" && (step === "loading" || step === "payment")) ||
              (s === "confirm" && (step === "processing" || step === "failed"));
            const done =
              (s === "details" && step !== "details") ||
              (s === "payment" && (step === "processing" || step === "failed"));
            return (
              <li key={s} className="flex flex-1 items-center gap-1.5" aria-current={active ? "step" : undefined}>
                <div className={`h-1.5 flex-1 rounded-full ${done || active ? "bg-gradient-brand" : "bg-surface-elevated"}`} />
                <span className={`${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {i + 1}. {s}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <main className="px-5 pt-5 space-y-5">
        {/* Order summary card */}
        <section aria-label="Order summary" className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
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
              <p className="text-xs uppercase tracking-wider text-accent">{formatDate(spot.date)} · {formatTime(spot.date)}</p>
              <p className="font-display text-base truncate">{spot.name}</p>
              <p className="text-xs text-muted-foreground truncate">{[spot.area, spot.city].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="border-t border-border px-4 py-3 text-sm space-y-1.5">
            <Row
              label={`${intent.option ? `${intent.option.label} · ` : ""}${isFree ? "Spots" : "Tickets"} × ${intent.qty}`}
              value={formatPrice(intent.total)}
            />
            {deliveryFee > 0 && <Row label="WhatsApp delivery" value={formatPrice(deliveryFee)} muted />}
            <div className="border-t border-dashed border-border pt-2">
              <Row label="Total" value={formatPrice(total)} bold />
              {intent.split && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Split with {intent.split.participants.length - 1} friend(s) · {formatPrice(intent.split.perPerson)} each
                </p>
              )}
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {/* DETAILS */}
          {step === "details" && (
            <motion.form
              key="details"
              id="checkout-details"
              ref={formRef}
              onSubmit={submitDetails}
              noValidate
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h2 className="font-display text-lg">Your details</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" error={errors.firstName}>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sipho" autoComplete="given-name" maxLength={60} className={fieldInputCls} />
                </Field>
                <Field label="Last name" error={errors.lastName}>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dlamini" autoComplete="family-name" maxLength={60} className={fieldInputCls} />
                </Field>
              </div>
              <Field label="Email" error={errors.email}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder="you@email.com" autoComplete="email" maxLength={254} className={fieldInputCls} />
              </Field>
              <Field label="Mobile (WhatsApp)" error={errors.phone}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="071 234 5678" autoComplete="tel" maxLength={20} className={fieldInputCls} />
              </Field>

              {isTradeSafe && (
                <>
                  <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
                    <Field label="ID type">
                      <select value={idType} onChange={(e) => setIdType(e.target.value as "ID" | "PASSPORT")} className={fieldInputCls}>
                        <option value="ID">SA ID</option>
                        <option value="PASSPORT">Passport</option>
                      </select>
                    </Field>
                    <Field label={idType === "ID" ? "ID number" : "Passport number"} error={errors.idNumber}>
                      <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} inputMode={idType === "ID" ? "numeric" : "text"} autoComplete="off" maxLength={20} className={fieldInputCls} />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required by TradeSafe, our secure payment provider, to verify who's paying.
                  </p>
                </>
              )}

              {/* Host-defined extra questions */}
              {questions.map((q) => (
                <Field key={q.id} label={q.required ? `${q.label} *` : q.label} error={errors[`q:${q.id}`]}>
                  {q.type === "select" ? (
                    <select
                      value={customAnswers[q.id] ?? ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className={fieldInputCls}
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
                      maxLength={500}
                      className={`${fieldInputCls} resize-none`}
                    />
                  ) : (
                    <input
                      value={customAnswers[q.id] ?? ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      maxLength={200}
                      className={fieldInputCls}
                    />
                  )}
                </Field>
              ))}

              {/* Ticket delivery */}
              {WHATSAPP_DELIVERY_ON && (
              <fieldset className="space-y-1.5">
                <legend className="block px-1 pb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  Ticket delivery
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton active={delivery === "email"} onClick={() => setDelivery("email")}>
                    <Mail className="h-3.5 w-3.5" /> Email · Free
                  </ChoiceButton>
                  <ChoiceButton active={delivery === "whatsapp"} onClick={() => setDelivery("whatsapp")}>
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp · {isTradeSafe ? formatPrice(WHATSAPP_DELIVERY_FEE_RAND) : "Free"}
                  </ChoiceButton>
                </div>
              </fieldset>
              )}

              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-success" />
                We'll send your QR ticket to your {delivery === "whatsapp" ? "WhatsApp" : "email"}.
              </p>

              {isFree && <Terms checked={termsAccepted} onChange={setTermsAccepted} error={errors.terms} />}
            </motion.form>
          )}

          {/* LOADING (brief transition between steps) */}
          {step === "loading" && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-20 text-center"
              role="status"
            >
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              <span className="sr-only">Loading payment options</span>
            </motion.section>
          )}

          {/* PAYMENT (paid TradeSafe listings, and the demo account) */}
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
                        <p className="text-xs text-muted-foreground">
                          You'll be redirected to TradeSafe to pay {formatPrice(total)} securely. We hold it until your booking is done.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Lock className="h-3 w-3 text-success" /> Your card details never touch TROVE.
                  </p>
                </div>
              )}

              {demo && (
                <>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
                    <PayTab icon={<CreditCard className="h-4 w-4" />} label="Card" active={method === "card"} onClick={() => setMethod("card")} />
                    <PayTab icon={<Building2 className="h-4 w-4" />} label="EFT" active={method === "eft"} onClick={() => setMethod("eft")} />
                    <PayTab icon={<Wallet className="h-4 w-4" />} label="Wallet" active={method === "wallet"} onClick={() => setMethod("wallet")} />
                  </div>
                  {method === "card" && (
                    <div className="space-y-3">
                      <Field label="Card number">
                        <input value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))} inputMode="numeric" autoComplete="off" className={`${fieldInputCls} font-mono tracking-wider`} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Expiry">
                          <input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" inputMode="numeric" autoComplete="off" className={`${fieldInputCls} font-mono`} />
                        </Field>
                        <Field label="CVC">
                          <input value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="off" className={`${fieldInputCls} font-mono`} />
                        </Field>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Demo account: no real charge is made.
                  </p>
                </>
              )}

              <p className="rounded-xl bg-surface-elevated px-3 py-2 text-xs text-muted-foreground">
                Your spot is held for {CHECKOUT_HOLD_MIN} minutes. Complete payment before then or it's released.
              </p>

              <Terms checked={termsAccepted} onChange={setTermsAccepted} />
            </motion.section>
          )}

          {/* PROCESSING */}
          {step === "processing" && (
            <motion.section
              key="processing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-16 text-center space-y-4"
              role="status"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-brand shadow-glow animate-pulse">
                <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-xl">{isTradeSafe ? "Taking you to TradeSafe" : "Reserving your spot"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Securing your spot…</p>
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
              <div role="alert" className="rounded-2xl bg-destructive/10 ring-1 ring-destructive/40 p-5 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/20">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <p className="mt-3 font-display text-lg">{isFree ? "Booking failed" : "Payment failed"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{errorMsg ?? "Something went wrong."}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(isFree ? "details" : "payment")}
                className="w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Try again
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
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-display text-lg text-gradient">{formatPrice(total)}</div>
              </div>
              {step === "details" ? (
                <button
                  type="submit"
                  form="checkout-details"
                  className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
                >
                  {isFree ? <><Ticket className="h-4 w-4" /> Reserve my spot</> : <>Continue <ChevronRight className="h-4 w-4" /></>}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!paymentValid}
                  onClick={processPayment}
                  className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
                >
                  <Lock className="h-4 w-4" /> Pay {formatPrice(total)}
                </button>
              )}
            </div>
            {step === "payment" && !termsAccepted && (
              <p className="mt-1.5 text-center text-xs text-muted-foreground">Accept the Terms &amp; Conditions to pay.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Terms({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div>
      <label className="flex items-start gap-2.5 px-1 py-1 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "terms-error" : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
        />
        <span>
          I agree to TROVE's{" "}
          <a href={`${LEGAL}/terms`} target="_blank" rel="noopener noreferrer" className="text-foreground underline">Terms &amp; Conditions</a>
          {" "}and{" "}
          <a href={`${LEGAL}/privacy`} target="_blank" rel="noopener noreferrer" className="text-foreground underline">Privacy Policy</a>.
        </span>
      </label>
      {error && <p id="terms-error" role="alert" className="mt-1 px-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function AuthRequired({ onSignIn, spotId }: { onSignIn: () => void; spotId: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="flex items-center justify-between">
          <Link to="/spot/$id" params={{ id: spotId }} aria-label="Back to event" className="grid h-10 w-10 place-items-center rounded-full bg-surface ring-1 ring-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <p className="font-display text-base">Checkout</p>
          <span className="w-10" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
          <Lock className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="mt-5 font-display text-2xl">Sign in to book</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need a TROVE account to secure your spot. Your ticket and QR code get tied to it, and we'll keep your selection.
        </p>
        <button
          type="button"
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
      <span className={bold ? "font-semibold" : ""}>{label}</span>
      <span className={bold ? "font-display text-base text-gradient" : "font-mono"}>{value}</span>
    </div>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold transition ${
        active ? "bg-gradient-brand text-primary-foreground shadow-glow-soft" : "bg-surface ring-1 ring-border text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PayTab({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
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
