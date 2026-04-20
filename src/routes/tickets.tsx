import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getBookings, useStore } from "@/lib/store";
import { getSpot, formatDate, formatTime, formatPrice } from "@/lib/spots";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "My Tickets — TROVE" }] }),
  component: TicketsPage,
});

function TicketsPage() {
  const bookings = useStore(() => getBookings());
  const now = Date.now();
  const upcoming = bookings.filter((b) => {
    const s = getSpot(b.spotId);
    return s && new Date(s.date).getTime() >= now;
  });
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <AppShell>
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <h1 className="font-display text-2xl">My Tickets</h1>
        <p className="text-xs text-muted-foreground">{bookings.length} bookings</p>
      </header>
      <main className="px-5 pt-5 space-y-6">
        {bookings.length === 0 && (
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
            {upcoming.map((b) => <BookingRow key={b.id} bookingId={b.id} spotId={b.spotId} qty={b.qty} total={b.total} ticketCode={b.ticketCode} />)}
          </Section>
        )}
        {past.length > 0 && (
          <Section title="Past">
            {past.map((b) => <BookingRow key={b.id} bookingId={b.id} spotId={b.spotId} qty={b.qty} total={b.total} ticketCode={b.ticketCode} dim />)}
          </Section>
        )}
      </main>
    </AppShell>
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

function BookingRow({ bookingId, spotId, qty, total, dim }: { bookingId: string; spotId: string; qty: number; total: number; ticketCode: string; dim?: boolean }) {
  const spot = getSpot(spotId);
  if (!spot) return null;
  return (
    <Link
      to="/booking/$id" params={{ id: bookingId }}
      className={`flex items-center gap-3 rounded-2xl bg-surface ring-1 ring-border p-3 transition hover:ring-primary/40 ${dim ? "opacity-60" : ""}`}
    >
      <img src={spot.image} alt={spot.name} className="h-16 w-16 rounded-xl object-cover" loading="lazy" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase text-muted-foreground">{formatDate(spot.date)} · {formatTime(spot.date)}</p>
        <p className="font-display text-base truncate">{spot.name}</p>
        <p className="text-xs text-muted-foreground">{qty} × · {formatPrice(total)}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
