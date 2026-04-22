// Tiny localStorage-backed reactive store for saved spots & bookings.
import { useEffect, useState } from "react";

const SAVED_KEY = "trove:saved";
const BOOKINGS_KEY = "trove:bookings";
const FOLLOWS_KEY = "trove:follows";

export interface SplitParticipant {
  friendId: string;
  name: string;
  initial: string;
  hue: number;
  paid: boolean;
}

export interface Booking {
  id: string;
  spotId: string;
  qty: number;
  total: number;
  createdAt: string;
  ticketCode: string;
  split?: {
    participants: SplitParticipant[];
    perPerson: number;
  };
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
