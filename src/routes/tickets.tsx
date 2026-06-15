import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket, ChevronRight } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { useMyBookings, type BookingView } from "@/lib/bookings-api";
import { formatDate, formatTime, formatPrice } from "@/lib/spots";

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
  const cancelled = booking.status === "cancelled" || booking.status === "refunded";
  const refundPending = booking.status === "refund_pending";
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
          <p className="text-[10px] uppercase text-muted-foreground">{formatDate(spot.date)} · {formatTime(spot.date)}</p>
          {cancelled && <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-destructive">Cancelled</span>}
          {refundPending && <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-warning">Refund pending</span>}
        </div>
        <p className="font-display text-base truncate">{spot.name}</p>
        <p className="text-xs text-muted-foreground">{booking.qty} × · {formatPrice(booking.total)}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
