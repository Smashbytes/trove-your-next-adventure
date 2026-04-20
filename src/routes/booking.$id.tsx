import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft, MessageCircle } from "lucide-react";
import { getBooking } from "@/lib/store";
import { formatDate, formatPrice, formatTime, getSpot } from "@/lib/spots";

export const Route = createFileRoute("/booking/$id")({
  head: () => ({ meta: [{ title: "Your Ticket — TROVE" }] }),
  component: BookingPage,
});

function BookingPage() {
  const { id } = useParams({ from: "/booking/$id" });
  const booking = getBooking(id);
  const spot = booking ? getSpot(booking.spotId) : null;

  if (!booking || !spot) {
    return (
      <div className="p-10 text-center">
        Ticket not found. <Link to="/tickets" className="text-primary">View tickets</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md p-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Done
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mt-6 text-center"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h1 className="mt-4 font-display text-3xl">You're in.</h1>
        <p className="mt-1 text-sm text-muted-foreground">Confirmation sent via WhatsApp</p>
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

          <div className="mx-auto w-fit rounded-2xl bg-white p-4">
            <QRCodeSVG value={`TROVE:${booking.ticketCode}`} size={160} bgColor="#ffffff" fgColor="#0a0612" level="H" />
          </div>
          <p className="mt-3 text-center font-mono text-xs tracking-widest text-muted-foreground">{booking.ticketCode}</p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">Show at entry · Total {formatPrice(booking.total)}</p>
        </div>
      </motion.div>

      <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-success/15 py-3 text-sm font-semibold text-success">
        <MessageCircle className="h-4 w-4" /> Reminder sent on WhatsApp
      </button>
    </div>
  );
}
