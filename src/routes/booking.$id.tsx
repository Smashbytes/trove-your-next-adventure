import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft, MessageCircle, Users2, Send, XCircle, RotateCcw } from "lucide-react";
import { cancelBooking, getBooking, markSplitPaid, useStore } from "@/lib/store";
import { formatDate, formatPrice, formatTime, getSpot } from "@/lib/spots";
import { useState } from "react";

export const Route = createFileRoute("/booking/$id")({
  head: () => ({ meta: [{ title: "Your Ticket — TROVE" }] }),
  component: BookingPage,
});

function BookingPage() {
  const { id } = useParams({ from: "/booking/$id" });
  const booking = useStore(() => getBooking(id));
  const spot = booking ? getSpot(booking.spotId) : null;
  const [confirmCancel, setConfirmCancel] = useState(false);

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

  const isCancelled = booking.status === "cancelled" || booking.status === "refunded";
  const isRefundPending = booking.status === "refund_pending";
  const isActive = booking.status === "confirmed";

  return (
    <div className="mx-auto min-h-screen max-w-md p-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Done
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mt-6 text-center"
      >
        {isActive ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="mt-4 font-display text-3xl">You're in.</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirmation sent to {booking.buyer?.email ?? "your email"}
            </p>
          </>
        ) : isRefundPending ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warning/15">
              <RotateCcw className="h-8 w-8 text-warning" />
            </div>
            <h1 className="mt-4 font-display text-3xl">Refund pending</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPrice(booking.total)} will return to your card in 1–3 days.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mt-4 font-display text-3xl">Cancelled</h1>
            <p className="mt-1 text-sm text-muted-foreground">Refund of {formatPrice(booking.total)} processed.</p>
          </>
        )}
      </motion.div>

      {/* Ticket */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
        className="mt-8 overflow-hidden rounded-3xl bg-surface ring-1 ring-border shadow-glow-soft"
      >
        <div className="relative h-32">
          <img src={spot.image} alt={spot.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        </div>
        <div className="-mt-10 px-6 pb-6 relative">
          <h2 className="font-display text-2xl">{spot.name}</h2>
          <p className="text-sm text-muted-foreground">{spot.area} · {spot.city}</p>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Date</div>
              <div className="mt-0.5 text-sm font-semibold">{formatDate(spot.date)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Doors</div>
              <div className="mt-0.5 text-sm font-semibold">{formatTime(spot.date)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Tickets</div>
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
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            {isActive ? `Show at entry · Total ${formatPrice(booking.total)}` :
              isRefundPending ? "Ticket invalidated · Refund processing" : "Ticket cancelled"}
          </p>
          {booking.paymentRef && (
            <p className="mt-1 text-center text-[10px] text-muted-foreground/60 font-mono">
              Ref · {booking.paymentRef}
            </p>
          )}
        </div>
      </motion.div>

      {/* Split bill tracker */}
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
                <p className="text-[11px] text-muted-foreground">
                  {formatPrice(split.perPerson)} per person
                </p>
              </div>
            </div>
            <button className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1.5 text-[11px] font-semibold">
              <Send className="h-3 w-3" /> Remind
            </button>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
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

          {/* Participants */}
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
                  <p className="text-[11px] text-muted-foreground">{formatPrice(split.perPerson)}</p>
                </div>
                {p.friendId === "me" ? (
                  <span className="rounded-full bg-success/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-success">
                    Paid
                  </span>
                ) : (
                  <button
                    onClick={() => markSplitPaid(booking.id, p.friendId)}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
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
      {isActive && (
        <div className="mt-6 space-y-2">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-success/15 py-3 text-sm font-semibold text-success">
            <MessageCircle className="h-4 w-4" /> Reminder sent on WhatsApp
          </button>
          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full rounded-full bg-surface ring-1 ring-border py-3 text-sm font-semibold text-muted-foreground hover:text-destructive hover:ring-destructive/40 transition"
            >
              Cancel booking
            </button>
          ) : (
            <div className="rounded-2xl bg-destructive/10 ring-1 ring-destructive/40 p-4 space-y-2">
              <p className="text-sm font-semibold">Cancel this booking?</p>
              <p className="text-[11px] text-muted-foreground">
                {formatPrice(booking.total)} will be refunded to your original payment method.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 rounded-full bg-surface ring-1 ring-border py-2 text-xs font-semibold"
                >
                  Keep it
                </button>
                <button
                  onClick={() => { cancelBooking(booking.id); setConfirmCancel(false); }}
                  className="flex-1 rounded-full bg-destructive py-2 text-xs font-semibold text-destructive-foreground"
                >
                  Confirm cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isRefundPending && (
        <div className="mt-6 rounded-2xl bg-warning/10 ring-1 ring-warning/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Refund of <span className="font-semibold text-foreground">{formatPrice(booking.total)}</span> is processing…
          </p>
        </div>
      )}

      <Link
        to="/tickets"
        className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Back to all tickets →
      </Link>
    </div>
  );
}
