// Bookings — unified view-model over the demo (localStorage) flow and the live
// (Supabase edge function) flow, so the ticket/booking UI speaks one shape.
//
//   - demo account: existing mock store (localStorage), full split-bill flow
//   - live users:   create-booking / cancel-booking edge functions + DB reads
//
// Paid bookings use TradeSafe hosted checkout; free/RSVP bookings stay in-app.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useIsDemo, loadSpotsByIds, koboToRand } from "./listings-api";
import type { Spot } from "./spots";
import {
  getBookings,
  getBooking as getMockBooking,
  addBooking as addMockBooking,
  cancelBooking as cancelMockBooking,
  markSplitPaid as markMockSplitPaid,
  type SplitParticipant,
  type Booking as MockBooking,
} from "./store";

export type BookingStatusView =
  | "confirmed"
  | "cancelled"
  | "refunded"
  | "refund_pending"
  | "payment_failed"
  | "pending";

export interface BookingView {
  id: string;
  listingId: string;
  spot: Spot | null;
  qty: number;
  total: number;
  status: BookingStatusView;
  ticketCode: string;
  createdAt: string;
  buyer?: { name: string; email: string; phone: string };
  paymentRef?: string;
  split?: { participants: SplitParticipant[]; perPerson: number };
}

function mockToView(b: MockBooking, spot: Spot | null): BookingView {
  return {
    id: b.id,
    listingId: b.spotId,
    spot,
    qty: b.qty,
    total: b.total,
    status: b.status,
    ticketCode: b.ticketCode,
    createdAt: b.createdAt,
    buyer: b.buyer,
    paymentRef: b.paymentRef,
    split: b.split,
  };
}

function dbStatusToView(s: string): BookingStatusView {
  if (s === "cancelled") return "cancelled";
  if (s === "refunded") return "refunded";
  if (["pending", "pending_payment"].includes(s)) return "pending";
  if (s === "payment_failed") return "payment_failed";
  return "confirmed";
}

interface DbBookingRow {
  id: string;
  listing_id: string;
  party_size: number;
  total_kobo: number;
  status: string;
  created_at: string;
  tickets: { code: string }[] | null;
}

async function loadLiveBookings(rows: DbBookingRow[]): Promise<BookingView[]> {
  const spotMap = await loadSpotsByIds([...new Set(rows.map((r) => r.listing_id))], false);
  return rows.map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    spot: spotMap.get(r.listing_id) ?? null,
    qty: r.party_size,
    total: koboToRand(r.total_kobo),
    status: dbStatusToView(r.status),
    ticketCode: r.tickets?.[0]?.code ?? "—",
    createdAt: r.created_at,
  }));
}

const BOOKING_SELECT = "id, listing_id, party_size, total_kobo, status, created_at, tickets(code)";

export function useMyBookings() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  return useQuery<BookingView[]>({
    queryKey: ["bookings", local, user?.id],
    queryFn: async () => {
      if (local) {
        const { getSpot } = await import("./spots");
        return getBookings().map((b) => mockToView(b, getSpot(b.spotId) ?? null));
      }
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("guest_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return loadLiveBookings((data ?? []) as DbBookingRow[]);
    },
  });
}

export function useBooking(id: string | undefined) {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  return useQuery<BookingView | null>({
    queryKey: ["booking", local, user?.id, id],
    enabled: !!id,
    // While a TradeSafe payment settles the booking sits in `pending`; poll until
    // the verified callback flips it to confirmed.
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 4000 : false),
    queryFn: async () => {
      if (local) {
        const b = getMockBooking(id!);
        if (!b) return null;
        const { getSpot } = await import("./spots");
        return mockToView(b, getSpot(b.spotId) ?? null);
      }
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [view] = await loadLiveBookings([data as DbBookingRow]);
      return view ?? null;
    },
  });
}

export interface CreateBookingArgs {
  listingId: string;
  qty: number;
  total: number; // rand, for the demo store
  attestedAge?: boolean;
  buyer?: { name: string; email: string; phone: string };
  paymentMethod?: "card" | "eft" | "wallet";
  split?: { participants: SplitParticipant[]; perPerson: number };
  invites?: Array<{ user_id?: string; email?: string; phone?: string }>;
}

export function useCreateBooking() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  const qc = useQueryClient();

  return useMutation<{ bookingId: string }, Error, CreateBookingArgs>({
    mutationFn: async (args) => {
      if (local) {
        const booking = addMockBooking({
          spotId: args.listingId,
          qty: args.qty,
          total: args.total,
          split: args.split,
          status: "confirmed",
          buyer: args.buyer ?? { name: "", email: "", phone: "" },
          paymentMethod: args.paymentMethod ?? "card",
          paymentRef: `mock_${Math.random().toString(36).slice(2, 10)}`,
        });
        return { bookingId: booking.id };
      }
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          listing_id: args.listingId,
          party_size: args.qty,
          attested_age: args.attestedAge ?? false,
          invites: args.invites,
        },
      });
      if (error) {
        // Edge function returns a JSON error body; surface its message.
        const ctx = (error as { context?: Response }).context;
        let msg = error.message;
        try {
          if (ctx) {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return { bookingId: (data as { booking_id: string }).booking_id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export interface InitPaymentArgs {
  listingId: string;
  qty: number;
  attestedAge?: boolean;
  buyer: { name: string; phone: string; idNumber: string; idType: "ID" | "PASSPORT" };
}

/**
 * Start a TradeSafe transaction for a paid listing. Returns the
 * hosted-checkout URL; the caller redirects the browser there. Confirmation
 * happens server-side via the paystack-webhook.
 */
export function useInitializePayment() {
  return useMutation<{ authorizationUrl: string; bookingId: string }, Error, InitPaymentArgs>({
    mutationFn: async (args) => {
      const { data, error } = await supabase.functions.invoke("tradesafe-initialize", {
        body: {
          listing_id: args.listingId,
          party_size: args.qty,
          attested_age: args.attestedAge ?? false,
          buyer_name: args.buyer.name,
          buyer_phone: args.buyer.phone,
          buyer_id_number: args.buyer.idNumber,
          buyer_id_type: args.buyer.idType,
        },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let msg = error.message;
        try {
          if (ctx) {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const d = data as { checkout_url: string; booking_id: string };
      return { authorizationUrl: d.checkout_url, bookingId: d.booking_id };
    },
  });
}

export function useCancelBooking() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (bookingId) => {
      if (local) {
        cancelMockBooking(bookingId);
        return;
      }
      const { error } = await supabase.functions.invoke("cancel-booking", {
        body: { booking_id: bookingId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}

/** Demo-only split "mark paid" (mutates localStorage, then refreshes the view). */
export function useMarkSplitPaid() {
  const qc = useQueryClient();
  return useMutation<void, Error, { bookingId: string; friendId: string }>({
    mutationFn: async ({ bookingId, friendId }) => {
      markMockSplitPaid(bookingId, friendId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking"] }),
  });
}
