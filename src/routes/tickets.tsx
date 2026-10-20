import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket, ChevronRight } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { isActiveBooking, useMyBookings, type BookingStatusView, type BookingView } from "@/lib/bookings-api";

const WARN = "bg-warning/15 text-warning";
const BAD = "bg-destructive/15 text-destructive";
const MUTED = "bg-surface-elevated text-muted-foreground";
/** Every booking that isn't a plain valid ticket says so in the list. */
const STATUS_BADGE: Partial<Record<BookingStatusView, { label: string; cls: string }>> = {
  pending: { label: "Confirming payment", cls: WARN },
  payment_failed: { label: "Not paid", cls: BAD },
  cancelled: { label: "Cancelled", cls: BAD },
  refund_requested: { label: "Cancellation requested", cls: WARN },
  refund_processing: { label: "Refund on its way", cls: WARN },
  refund_pending: { label: "Refund pending", cls: WARN },
  partially_refunded: { label: "Partly refunded", cls: MUTED },
  refunded: { label: "Refunded", cls: MUTED },
  no_show: { label: "Missed", cls: MUTED },
  unknown: { label: "Check with support", cls: MUTED },
};
import { formatDate, formatTime, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "My Tickets — TROVE" }] }),
  component: TicketsPage,
});

function TicketsPage() {
  const { data: bookings = [], isLoading } = useMyBookings();
  const now = Date.now();
  const upcoming = bookings.filter((b) => b.spot && new Date(b.spot.date).getTime() >= now);
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <ResponsiveShell title="My Tickets">
      <p className="mb-4 text-xs text-muted-foreground">{bookings.length} bookings</p>
      <div className="space-y-6">
        {isLoading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-[88px] w-full animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        )}

        {!isLoading && bookings.length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface ring-1 ring-border">
              <Ticket className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-xl">No tickets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your bookings will live here.</p>
            <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              Discover spots
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <Section title="Upcoming">
            {upcoming.map((b) => <BookingRow key={b.id} booking={b} />)}
          </Section>
        )}
        {past.length > 0 && (
          <Section title="Past">
            {past.map((b) => <BookingRow key={b.id} booking={b} dim />)}
          </Section>
        )}
      </div>
    </ResponsiveShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BookingRow({ booking, dim }: { booking: BookingView; dim?: boolean }) {
  const spot = booking.spot;
  if (!spot) return null;
  const cancelled = !isActiveBooking(booking.status) && booking.status !== "pending";
  const badge = booking.cancelledBy === "host" ? { label: "Event cancelled", cls: BAD } : STATUS_BADGE[booking.status];
  return (
    <Link
      to="/booking/$id" params={{ id: booking.id }}
      className={`flex items-center gap-3 rounded-2xl bg-surface ring-1 ring-border p-3 transition hover:ring-primary/40 ${dim || cancelled ? "opacity-60" : ""}`}
    >
      <img
        src={spot.image}
        alt={spot.name}
        loading="lazy"
        data-fallback={spot.imageFallback}
        onError={(e) => {
          const t = e.currentTarget;
          const fb = t.dataset.fallback;
          if (fb && t.src !== fb) t.src = fb;
        }}
        className={`h-16 w-16 rounded-xl object-cover ${cancelled ? "grayscale" : ""}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-2xs uppercase text-muted-foreground">{formatDate(spot.date)} · {formatTime(spot.date)}</p>
          {badge && <span className={`rounded-full px-1.5 py-0.5 text-2xs font-semibold uppercase ${badge.cls}`}>{badge.label}</span>}
        </div>
        <p className="font-display text-base truncate">{spot.name}</p>
        <p className="text-xs text-muted-foreground">{booking.qty} × · {formatPrice(booking.total)}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
