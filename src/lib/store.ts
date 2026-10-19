// Tiny localStorage-backed reactive store for saved spots & bookings.
import { useEffect, useState } from "react";

const SAVED_KEY = "trove:saved";
const BOOKINGS_KEY = "trove:bookings";
const FOLLOWS_KEY = "trove:follows";
const CHECKOUT_KEY = "trove:checkout";
const PENDING_PAYMENT_KEY = "trove:pending-payment";

export interface SplitParticipant {
  friendId: string;
  name: string;
  initial: string;
  hue: number;
  paid: boolean;
}

export type BookingStatus = "confirmed" | "cancelled" | "refund_pending" | "refunded";

export interface Booking {
  id: string;
  spotId: string;
  qty: number;
  total: number;
  createdAt: string;
  ticketCode: string;
  status: BookingStatus;
  buyer: { name: string; email: string; phone: string };
  paymentMethod: "card" | "eft" | "wallet";
  paymentRef: string;
  split?: {
    participants: SplitParticipant[];
    perPerson: number;
  };
}

export interface CheckoutIntent {
  spotId: string;
  qty: number;
  total: number;
  split?: { participants: SplitParticipant[]; perPerson: number };
  /** The tier / slot / room picked on the spot page (sent to the server). */
  option?: {
    ticketTypeId?: string;
    slotId?: string;
    room?: string;
    label: string;
    unitPrice: number;
  };
}

export interface PendingPayment {
  bookingId: string;
  spotId: string;
  /** Rand, for the "paying X" copy on the return screen. */
  total: number;
  /** ISO — the 15-minute reservation hold from tradesafe-initialize. */
  expiresAt?: string;
  startedAt: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  emit();
}

export function getSaved(): string[] { return read<string[]>(SAVED_KEY, []); }
export function toggleSaved(id: string) {
  const cur = getSaved();
  write(SAVED_KEY, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}
export function isSaved(id: string) { return getSaved().includes(id); }

export function getBookings(): Booking[] { return read<Booking[]>(BOOKINGS_KEY, []); }
export function addBooking(b: Omit<Booking, "id" | "createdAt" | "ticketCode">): Booking {
  const booking: Booking = {
    ...b,
    id: `bk_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    ticketCode: `TRV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  };
  write(BOOKINGS_KEY, [booking, ...getBookings()]);
  return booking;
}
export function getBooking(id: string) { return getBookings().find((b) => b.id === id); }
export function markSplitPaid(bookingId: string, friendId: string) {
  const all = getBookings();
  const next = all.map((b) => {
    if (b.id !== bookingId || !b.split) return b;
    return {
      ...b,
      split: {
        ...b.split,
        participants: b.split.participants.map((p) =>
          p.friendId === friendId ? { ...p, paid: !p.paid } : p,
        ),
      },
    };
  });
  write(BOOKINGS_KEY, next);
}

export function getFollows(): string[] { return read<string[]>(FOLLOWS_KEY, []); }
export function toggleFollow(hostSlug: string) {
  const cur = getFollows();
  write(FOLLOWS_KEY, cur.includes(hostSlug) ? cur.filter((x) => x !== hostSlug) : [...cur, hostSlug]);
}
export function isFollowing(hostSlug: string) { return getFollows().includes(hostSlug); }

// Checkout intent (transient — sessionStorage)
export function setCheckoutIntent(intent: CheckoutIntent) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(intent));
}
export function getCheckoutIntent(): CheckoutIntent | null {
  if (typeof window === "undefined") return null;
  try { const v = sessionStorage.getItem(CHECKOUT_KEY); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
export function clearCheckoutIntent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHECKOUT_KEY);
}

// Pending TradeSafe payment.
//
// TradeSafe's hosted checkout returns the payer to a single static Success /
// Failure URL configured in the TradeSafe dashboard — there is no way to pass
// the booking through (`checkoutLink` takes no return-URL argument), and no
// booking id comes back in the query string. So the booking has to be stashed
// here *before* we hand the browser to TradeSafe, and read back by
// /payment/return once the payer lands again.
//
// localStorage, not sessionStorage: the payer may well finish on a different
// tab (3-D Secure and some bank apps break out of the original one), and
// sessionStorage would be empty there.
export function setPendingPayment(p: PendingPayment) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(p));
}
export function getPendingPayment(): PendingPayment | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!v) return null;
    const p = JSON.parse(v) as PendingPayment;
    // A stash older than a day is abandoned, not in-flight.
    if (!p?.bookingId || Date.now() - (p.startedAt ?? 0) > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      return null;
    }
    return p;
  } catch { return null; }
}
export function clearPendingPayment() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_PAYMENT_KEY);
}

// Cancellation / refund (mock)
export function cancelBooking(id: string) {
  const all = getBookings();
  const next = all.map((b) =>
    b.id === id ? { ...b, status: "refund_pending" as BookingStatus } : b,
  );
  write(BOOKINGS_KEY, next);
  // Simulate refund settling after a few seconds
  setTimeout(() => {
    const all2 = getBookings();
    const next2 = all2.map((b) =>
      b.id === id && b.status === "refund_pending"
        ? { ...b, status: "refunded" as BookingStatus }
        : b,
    );
    write(BOOKINGS_KEY, next2);
  }, 4000);
}

export function useStore<T>(selector: () => T): T {
  const [, setTick] = useState(0);
  const [value, setValue] = useState<T>(selector);
  useEffect(() => {
    const l = () => { setValue(selector()); setTick((n) => n + 1); };
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
