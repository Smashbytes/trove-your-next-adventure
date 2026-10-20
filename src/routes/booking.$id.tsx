import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
  CheckCircle2, ArrowLeft, MessageCircle, Users2, Send, XCircle, RotateCcw, Star, Share2,
  Hourglass, AlertTriangle, LifeBuoy,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import {
  isActiveBooking, refundPolicyText, useBooking, useCancelBooking, useMarkSplitPaid,
  useRefundQuote, useRequestRefund, useWithdrawRefund, type BookingView,
} from "@/lib/bookings-api";
import { useIsDemo } from "@/lib/listings-api";
import { useBookingReview, useSubmitReview } from "@/lib/reviews-api";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import { attributeBookingShare, guestShareUrl, shareLink } from "@/lib/share";
import { useEffect, useState, type ReactNode } from "react";

export const Route = createFileRoute("/booking/$id")({
  head: () => ({ meta: [{ title: "Your Ticket — TROVE" }] }),
  component: BookingPage,
});

type Tone = "success" | "warning" | "danger" | "neutral";

/** What the guest is told for each booking state (never "You're in" unless it's true). */
function statusCopy(b: BookingView): { tone: Tone; title: string; body: string; ticketNote: string; spin?: boolean } {
  const amount = formatPrice(b.total);
  const why = b.cancelReason ? ` Reason: ${b.cancelReason.replace(/\.$/, "")}.` : "";
  // The host called it off: always a full refund, booking fee included.
  if (b.cancelledBy === "host") {
    if (b.status === "refunded") {
      return { tone: "neutral", title: "Event cancelled", body: `The host cancelled this event.${why} ${amount} was refunded to your original payment method.`, ticketNote: "Event cancelled · refunded in full" };
    }
    if (b.status === "cancelled") {
      return { tone: "danger", title: "Event cancelled", body: `The host cancelled this event.${why}`, ticketNote: "Event cancelled" };
    }
    return { tone: "warning", title: "Event cancelled", body: `The host cancelled this event.${why} Your full payment of ${amount}, booking fee included, is being refunded to your original payment method. Allow 3–5 working days.`, ticketNote: "Event cancelled · full refund on its way" };
  }
  // The guest cancelled under the refund policy.
  if (b.cancelledBy === "guest" && b.status === "cancelled") {
    return b.refunded
      ? { tone: "neutral", title: "Cancelled", body: `You cancelled this booking. ${formatPrice(b.refunded)} was refunded under the event's refund policy.`, ticketNote: "Ticket cancelled · refunded" }
      : { tone: "danger", title: "Cancelled", body: "You cancelled this booking.", ticketNote: "Ticket cancelled" };
  }
  switch (b.status) {
    case "confirmed":
    case "completed":
      return { tone: "success", title: "You're in.", body: `Confirmation sent to ${b.buyer?.email ?? "your email"}`, ticketNote: `Show at entry · Total ${amount}` };
    case "partially_refunded":
      return { tone: "success", title: "You're in.", body: "Part of your payment was refunded. Your ticket is still valid.", ticketNote: "Show at entry · Partly refunded" };
    case "pending":
      return { tone: "warning", title: "Confirming payment…", body: "This updates automatically once TradeSafe confirms your payment.", ticketNote: "Awaiting payment confirmation…", spin: true };
    case "refund_requested":
      return { tone: "warning", title: "Cancellation requested", body: "Your ticket is on hold while TROVE processes your refund. We'll let you know.", ticketNote: "On hold · cancellation requested" };
    case "refund_processing":
    case "refund_pending":
      return { tone: "warning", title: "Refund on its way", body: "TradeSafe is returning your refund to your original payment method. Allow 3–5 working days.", ticketNote: "Ticket cancelled · refund processing" };
    case "refunded":
      return { tone: "neutral", title: "Refunded", body: `${amount} was returned to your original payment method.`, ticketNote: "Ticket cancelled · refunded" };
    case "cancelled":
      return { tone: "danger", title: "Cancelled", body: "This booking was cancelled.", ticketNote: "Ticket cancelled" };
    case "payment_failed":
      return { tone: "danger", title: "Payment didn't go through", body: "You weren't charged and the spot was released. Book again if you still want to go.", ticketNote: "No ticket · payment not received" };
    case "no_show":
      return { tone: "neutral", title: "Missed", body: "This ticket wasn't used at the event.", ticketNote: "Ticket not used" };
    default:
      return { tone: "neutral", title: "Check with support", body: "We couldn't read this booking's status. Our support team can help.", ticketNote: "Status unavailable" };
  }
}

const TONE_RING: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  neutral: "bg-surface-elevated text-muted-foreground",
};

function StatusIcon({ tone, spin }: { tone: Tone; spin?: boolean }) {
  const cls = "h-8 w-8";
  if (spin) return <RotateCcw className={`${cls} animate-spin`} />;
  if (tone === "success") return <CheckCircle2 className={cls} />;
  if (tone === "warning") return <Hourglass className={cls} />;
  if (tone === "danger") return <XCircle className={cls} />;
  return <AlertTriangle className={cls} />;
}

function BookingPage() {
  const { id } = useParams({ from: "/booking/$id" });
  const { data: booking, isLoading } = useBooking(id);
  const markPaid = useMarkSplitPaid();
  const demo = useIsDemo();
  const spot = booking?.spot ?? null;

  // Credit the share link that brought this guest here (no-op without one).
  const listingId = spot?.id;
  useEffect(() => {
    if (demo || !listingId) return;
    void attributeBookingShare(id, listingId);
  }, [demo, id, listingId]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!booking || !spot) {
    return (
      <div className="p-10 text-center">
        Ticket not found. <Link to="/tickets" className="text-primary">View tickets</Link>
      </div>
    );
  }

  const split = booking.split;
  const paidCount = split?.participants.filter((p) => p.paid).length ?? 0;
  const collected = split ? paidCount * split.perPerson : 0;
  const progress = split ? (paidCount / split.participants.length) * 100 : 0;

  const isActive = isActiveBooking(booking.status);
  const copy = statusCopy(booking);
  const eventOver = new Date(spot.date).getTime() < Date.now();

  return (
    <div className="mx-auto min-h-screen max-w-md p-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Done
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mt-6 text-center"
      >
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${TONE_RING[copy.tone]}`}>
          <StatusIcon tone={copy.tone} spin={copy.spin} />
        </div>
        <h1 className="mt-4 font-display text-3xl">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
        {booking.status === "payment_failed" && (
          <Link to="/spot/$id" params={{ id: spot.id }} className="mt-4 inline-flex rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-soft">
            Book again
          </Link>
        )}
      </motion.div>

      {/* Share loop — confirmed bookings only */}
      {isActive && !demo && !eventOver && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          onClick={async () => {
            const url = await guestShareUrl(spot.id, true);
            const outcome = await shareLink({
              title: spot.name,
              text: `I'm going to ${spot.name} — come through! 🎟️`,
              url,
            });
            if (outcome === "copied") toast.success("Link copied — paste it in the group chat");
          }}
          className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/15 p-4 text-left ring-1 ring-primary/30"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Share2 className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Tell your crew</span>
            <span className="block text-xs text-muted-foreground">Share to WhatsApp, IG or anywhere — they'll see the full event card.</span>
          </span>
        </motion.button>
      )}

      {/* Ticket */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
        className="mt-8 overflow-hidden rounded-3xl bg-surface ring-1 ring-border shadow-glow-soft"
      >
        <div className="relative h-32">
          <img
            src={spot.image}
            alt={spot.name}
            data-fallback={spot.imageFallback}
            onError={(e) => {
              const t = e.currentTarget;
              const fb = t.dataset.fallback;
              if (fb && t.src !== fb) t.src = fb;
            }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        </div>
        <div className="-mt-10 px-6 pb-6 relative">
          <h2 className="font-display text-2xl">{spot.name}</h2>
          <p className="text-sm text-muted-foreground">{spot.area} · {spot.city}</p>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xs uppercase text-muted-foreground">Date</div>
              <div className="mt-0.5 text-sm font-semibold">{formatDate(spot.date)}</div>
            </div>
            <div>
              <div className="text-2xs uppercase text-muted-foreground">Doors</div>
              <div className="mt-0.5 text-sm font-semibold">{formatTime(spot.date)}</div>
            </div>
            <div>
              <div className="text-2xs uppercase text-muted-foreground">Tickets</div>
              <div className="mt-0.5 text-sm font-semibold">{booking.qty}</div>
            </div>
          </div>

          {/* Perforated divider */}
          <div className="relative my-6">
            <div className="absolute -left-9 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
            <div className="absolute -right-9 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
            <div className="border-t border-dashed border-border" />
          </div>

          <div className={`mx-auto w-fit rounded-2xl bg-white p-4 transition ${!isActive ? "grayscale opacity-50" : ""}`}>
            <QRCodeSVG value={`TROVE:${booking.ticketCode}`} size={160} bgColor="#ffffff" fgColor="#0a0612" level="H" />
          </div>
          <p className="mt-3 text-center font-mono text-xs tracking-widest text-muted-foreground">{booking.ticketCode}</p>
          <p className="mt-1 text-center text-2xs text-muted-foreground">{copy.ticketNote}</p>
          {booking.paymentRef && (
            <p className="mt-1 text-center text-2xs text-muted-foreground/60 font-mono">
              Ref · {booking.paymentRef}
            </p>
          )}
        </div>
      </motion.div>

      {/* Split bill tracker (demo account) */}
      {split && (
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="mt-6 rounded-3xl bg-surface ring-1 ring-border p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand shadow-glow-soft">
                <Users2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-lg">Split with friends</h3>
                <p className="text-2xs text-muted-foreground">
                  {formatPrice(split.perPerson)} per person
                </p>
              </div>
            </div>
            <button className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1.5 text-2xs font-semibold">
              <Send className="h-3 w-3" /> Remind
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-2xs text-muted-foreground">
              <span>{paidCount} of {split.participants.length} paid</span>
              <span className="text-foreground font-semibold">
                {formatPrice(collected)} / {formatPrice(booking.total)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-gradient-brand shadow-glow"
              />
            </div>
          </div>

          <ul className="space-y-2">
            {split.participants.map((p) => (
              <li
                key={p.friendId}
                className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-3"
              >
                <div
                  className="grid h-9 w-9 place-items-center rounded-full font-display text-sm text-white"
                  style={{ background: `oklch(0.65 0.22 ${p.hue})` }}
                >
                  {p.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-2xs text-muted-foreground">{formatPrice(split.perPerson)}</p>
                </div>
                {p.friendId === "me" ? (
                  <span className="rounded-full bg-success/15 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-success">
                    Paid
                  </span>
                ) : (
                  <button
                    onClick={() => markPaid.mutate({ bookingId: booking.id, friendId: p.friendId })}
                    className={`rounded-full px-3 py-1 text-2xs font-semibold uppercase tracking-wider transition ${
                      p.paid
                        ? "bg-success/15 text-success"
                        : "bg-foreground/10 text-foreground"
                    }`}
                  >
                    {p.paid ? "Paid" : "Mark paid"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Actions */}
      {isActive && !eventOver && (
        <div className="mt-6 space-y-2">
          {/* No reminder is sent yet, so don't say one was (GST-L02-12). */}
          <p className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-surface py-2.5 text-xs text-muted-foreground ring-1 ring-border">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp reminders are coming soon
          </p>
          {booking.status === "confirmed" && (booking.total > 0 && !demo
            ? <RefundPanel booking={booking} policy={spot.refundPolicy} />
            : <CancelPanel booking={booking} />)}
        </div>
      )}

      {booking.status === "refund_requested" && booking.cancelledBy !== "host" && <WithdrawPanel bookingId={booking.id} />}

      {/* Review: only after the experience (the server checks this too) */}
      {isActive && !demo && eventOver && <ReviewPanel bookingId={booking.id} listingId={booking.listingId} />}

      <Link
        to="/tickets"
        className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Back to all tickets →
      </Link>
    </div>
  );
}

function Panel({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <div className={`rounded-2xl p-4 space-y-2 ring-1 ${tone === "danger" ? "bg-destructive/10 ring-destructive/40" : "bg-surface ring-border"}`}>
      {children}
    </div>
  );
}

/** Free bookings: cancel straight away (cancel-booking). */
function CancelPanel({ booking }: { booking: BookingView }) {
  const cancel = useCancelBooking();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full rounded-full bg-surface ring-1 ring-border py-3 text-sm font-semibold text-muted-foreground hover:text-destructive hover:ring-destructive/40 transition"
      >
        Cancel booking
      </button>
    );
  }
  return (
    <Panel tone="danger">
      <p className="text-sm font-semibold">Cancel this booking?</p>
      <p className="text-2xs text-muted-foreground">Your spot is released and your ticket stops working.</p>
      <div className="flex gap-2">
        <button onClick={() => setConfirming(false)} className="flex-1 rounded-full bg-surface ring-1 ring-border py-2 text-xs font-semibold">
          Keep it
        </button>
        <button
          disabled={cancel.isPending}
          onClick={() =>
            cancel.mutate(booking.id, {
              onSuccess: () => { setConfirming(false); toast.success("Booking cancelled."); },
              onError: (e) => toast.error(friendlyError(e, "We couldn't cancel this booking. Try again.")),
            })
          }
          className="flex-1 rounded-full bg-destructive py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
        >
          {cancel.isPending ? "Cancelling…" : "Confirm cancel"}
        </button>
      </div>
    </Panel>
  );
}

const sast = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" }).format(new Date(iso));

/** Paid bookings: cancel for a refund under the listing's policy (request_refund). */
function RefundPanel({ booking, policy }: { booking: BookingView; policy?: string }) {
  const request = useRequestRefund();
  const quote = useRefundQuote(booking.id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const q = quote.data;

  if (quote.isLoading) {
    return <p className="text-center text-2xs text-muted-foreground" role="status">Checking your refund options…</p>;
  }
  if (quote.isError || !q) {
    return (
      <Panel>
        <p className="text-2xs text-muted-foreground">We couldn't load your refund options.</p>
        <button onClick={() => quote.refetch()} className="text-xs font-semibold underline">Try again</button>
      </Panel>
    );
  }

  const refund = formatPrice(q.amountKobo / 100);
  const fee = q.bookingFeeKobo > 0 ? formatPrice(q.bookingFeeKobo / 100) : null;

  if (q.percent === 0) {
    return (
      <Panel>
        <p className="text-sm font-semibold">{refundPolicyText(policy)}</p>
        <p className="text-2xs text-muted-foreground">
          {q.policy === "none"
            ? "This event doesn't offer refunds if you cancel."
            : "It's too close to the event for a refund now."}{" "}
          If the host cancels, you'll get everything back. If something's gone wrong, our support team can help.
        </p>
        <Link to="/support" className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground underline">
          <LifeBuoy className="h-3.5 w-3.5" /> Contact support
        </Link>
      </Panel>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-surface ring-1 ring-border py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
      >
        Cancel for a {refund} refund
      </button>
    );
  }

  return (
    <Panel>
      <p className="text-sm font-semibold">Cancel and get {refund} back?</p>
      <p className="text-2xs text-muted-foreground">
        That's {q.percent}% of the ticket price under this event's refund policy
        {fee ? `; the ${fee} booking fee isn't refundable` : ""}.
        {q.nextChangeAt ? ` After ${sast(q.nextChangeAt)} it drops to ${q.nextPercent === 0 ? "no refund" : `${q.nextPercent}%`}.` : ""}{" "}
        Your ticket goes on hold while TROVE processes it, then TradeSafe returns the money to your original payment method.
      </p>
      <label className="block">
        <span className="sr-only">Reason (optional)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Why do you need a refund? (optional)"
          className="w-full rounded-xl bg-surface-elevated p-3 text-sm ring-1 ring-border focus:outline-none focus:ring-primary resize-none"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-full bg-surface ring-1 ring-border py-2 text-xs font-semibold">
          Keep my ticket
        </button>
        <button
          disabled={request.isPending}
          onClick={() =>
            request.mutate({ bookingId: booking.id, reason }, {
              onSuccess: () => { setOpen(false); toast.success("Cancellation requested. We'll let you know."); },
              onError: (e) => toast.error(friendlyError(e, "We couldn't send your request. Try again.")),
            })
          }
          className="flex-1 rounded-full bg-destructive py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
        >
          {request.isPending ? "Sending…" : "Cancel booking"}
        </button>
      </div>
    </Panel>
  );
}

function WithdrawPanel({ bookingId }: { bookingId: string }) {
  const withdraw = useWithdrawRefund();
  return (
    <div className="mt-6">
      <Panel>
        <p className="text-xs text-muted-foreground">Changed your mind? Withdraw the request and your ticket works again.</p>
        <button
          disabled={withdraw.isPending}
          onClick={() =>
            withdraw.mutate(bookingId, {
              onSuccess: () => toast.success("Request withdrawn. Your ticket is valid again."),
              onError: (e) => toast.error(friendlyError(e, "We couldn't withdraw the request. Try again.")),
            })
          }
          className="w-full rounded-full bg-surface ring-1 ring-border py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          {withdraw.isPending ? "Withdrawing…" : "Withdraw refund request"}
        </button>
      </Panel>
    </div>
  );
}

function ReviewPanel({ bookingId, listingId }: { bookingId: string; listingId: string }) {
  const { data: existingReview } = useBookingReview(bookingId);
  const submitReview = useSubmitReview();
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  return (
    <section className="mt-6 rounded-2xl bg-surface ring-1 ring-border p-5">
      <h3 className="font-display text-lg">Rate your experience</h3>
      {existingReview ? (
        <p className="mt-2 text-sm text-muted-foreground">
          You rated this {existingReview.rating}★. Thanks for the feedback!
        </p>
      ) : (
        <>
          <div className="mt-3 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} aria-pressed={n === rating}>
                <Star className={`h-7 w-7 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            placeholder="How was it? (optional)"
            aria-label="Your review (optional)"
            maxLength={1000}
            rows={3}
            className="mt-3 w-full rounded-xl bg-surface-elevated p-3 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
          />
          <button
            disabled={submitReview.isPending}
            onClick={async () => {
              try {
                await submitReview.mutateAsync({ bookingId, listingId, rating, body: reviewBody });
                toast.success("Review posted — thank you!");
              } catch (e) {
                toast.error(friendlyError(e, "Couldn't post review."));
              }
            }}
            className="mt-3 w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            Post review
          </button>
        </>
      )}
    </section>
  );
}
