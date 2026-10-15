import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useBooking } from "@/lib/bookings-api";
import { formatPrice } from "@/lib/spots";
import { clearPendingPayment, getPendingPayment, type PendingPayment } from "@/lib/store";

/**
 * Landing pad for payers coming back from TradeSafe's hosted checkout.
 *
 * TradeSafe redirects to a single static Success / Failure URL set in its
 * dashboard — `checkoutLink` takes no return-URL argument and no booking id
 * comes back in the query string. So the booking id is read from the stash
 * that checkout wrote before handing the browser over.
 *
 * Set in the TradeSafe dashboard (TROVE. App):
 *   Success URL  →  https://<guest-app>/payment/return?status=success
 *   Failure URL  →  https://<guest-app>/payment/return?status=failed
 *
 * `status` is a hint from TradeSafe, not the truth — settlement is decided
 * server-side off verified provider state by tradesafe-callback (or the
 * tradesafe-reconcile cron). A "success" hint still has to wait for the
 * booking row to flip. Only the explicit "failed" hint short-circuits.
 */

type ReturnStatus = "success" | "failed" | "unknown";

export const Route = createFileRoute("/payment/return")({
  head: () => ({ meta: [{ title: "Confirming payment — TROVE" }] }),
  validateSearch: (search: Record<string, unknown>): { status: ReturnStatus } => {
    const raw = String(search.status ?? "").toLowerCase();
    return { status: raw === "success" || raw === "failed" ? raw : "unknown" };
  },
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();

  // Read the stash once: it gets cleared below, and re-reading would yank the
  // booking out from under the render.
  const [pending] = useState<PendingPayment | null>(() => getPendingPayment());

  // Polls every 4s while the booking is still `pending`/`pending_payment`.
  const { data: booking, isLoading } = useBooking(pending?.bookingId);

  const settled = booking?.status === "confirmed";
  const failed =
    status === "failed" ||
    booking?.status === "payment_failed" ||
    booking?.status === "cancelled";

  // Once the backend has actually settled it, the ticket lives on the booking
  // page — hand over and drop the stash.
  useEffect(() => {
    if (!pending || !settled) return;
    clearPendingPayment();
    navigate({ to: "/booking/$id", params: { id: pending.bookingId }, replace: true });
  }, [pending, settled, navigate]);

  useEffect(() => {
    if (failed) clearPendingPayment();
  }, [failed]);

  // Nothing in flight — a bare visit, or a stash we already consumed.
  if (!pending) {
    return (
      <Shell>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface ring-1 ring-border">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-display text-3xl">Nothing to confirm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We don't have a payment in progress on this device.
        </p>
        <Link
          to="/tickets"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gradient-brand px-6 text-sm font-semibold text-primary-foreground shadow-glow-soft"
        >
          View my tickets
        </Link>
      </Shell>
    );
  }

  if (failed) {
    return (
      <Shell>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mt-4 font-display text-3xl">Payment didn't go through</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You haven't been charged. Your spot is held for a few more minutes — give it another go.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/spot/$id"
            params={{ id: pending.spotId }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-brand px-6 text-sm font-semibold text-primary-foreground shadow-glow-soft"
          >
            Try again
          </Link>
          <Link to="/support" className="text-xs text-muted-foreground underline">
            Something looks wrong — get help
          </Link>
        </div>
      </Shell>
    );
  }

  // Still settling. The booking page shows the same thing once it has a
  // ticket, but until the callback lands there's nothing to show there.
  return (
    <Shell>
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warning/15">
        <RotateCcw className="h-8 w-8 animate-spin text-warning" />
      </div>
      <h1 className="mt-4 font-display text-3xl">Confirming payment…</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isLoading
          ? "Checking on your booking."
          : `We're waiting for TradeSafe to confirm ${formatPrice(pending.total)}. This page updates on its own.`}
      </p>
      <p className="mt-6 text-[11px] text-muted-foreground">
        Safe to close this page — your ticket lands in My tickets as soon as it's confirmed.
      </p>
      <Link to="/tickets" className="mt-4 inline-flex text-xs text-muted-foreground underline">
        Go to My tickets
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md p-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 text-center"
      >
        {children}
      </motion.div>
    </div>
  );
}
