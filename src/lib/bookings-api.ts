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
  | "completed"
  | "pending"
  | "payment_failed"
  | "cancelled"
  | "refund_requested"
  | "refund_processing"
  | "refund_pending" // demo store only
  | "partially_refunded"
  | "refunded"
  | "no_show"
  | "unknown";

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

// Every value of the booking_status enum, mapped explicitly. Anything new must
// never default to "confirmed" (a ticket would look valid when it isn't).
function dbStatusToView(s: string): BookingStatusView {
  switch (s) {
    case "confirmed":
    case "completed":
    case "payment_failed":
    case "cancelled":
    case "refund_requested":
    case "refund_processing":
    case "partially_refunded":
    case "refunded":
    case "no_show":
      return s;
    case "pending":
    case "pending_payment":
      return "pending";
    default:
      return "unknown";
  }
}

/** The booking can be used at the door (ticket shown as valid). */
export function isActiveBooking(status: BookingStatusView): boolean {
  return status === "confirmed" || status === "completed" || status === "partially_refunded";
}

/** Pull the `{ error }` sentence out of a failed edge-function call. */
async function edgeError(error: unknown): Promise<Error> {
  const ctx = (error as { context?: Response }).context;
  let msg = (error as Error)?.message ?? "Something went wrong";
  try {
    if (ctx) {
      const body = await ctx.json();
      if (body?.error) msg = body.error;
    }
  } catch { /* not JSON */ }
  return new Error(msg);
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
  deliveryMethod?: "email" | "whatsapp";
  termsAccepted?: boolean;
  customAnswers?: Record<string, string>;
  option?: BookingChoice;
}

/** The tier / slot / room picked on the spot page; the server prices it. */
export interface BookingChoice {
  ticketTypeId?: string;
  slotId?: string;
  room?: string;
}

function choiceBody(option: BookingChoice | undefined) {
  return {
    ticket_type_id: option?.ticketTypeId,
    slot_id: option?.slotId,
    room: option?.room,
  };
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
          ...choiceBody(args.option),
          party_size: args.qty,
          attested_age: args.attestedAge ?? false,
          invites: args.invites,
          delivery_method: args.deliveryMethod ?? "email",
          guest_phone: args.buyer?.phone,
          terms_accepted: args.termsAccepted ?? false,
          custom_answers: args.customAnswers ?? {},
        },
      });
      if (error) throw await edgeError(error);
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
  deliveryMethod?: "email" | "whatsapp";
  termsAccepted?: boolean;
  customAnswers?: Record<string, string>;
  option?: BookingChoice;
}

/**
 * Start a TradeSafe transaction for a paid listing. Returns the
 * hosted-checkout URL; the caller redirects the browser there. Confirmation
 * happens server-side (tradesafe-callback / tradesafe-reconcile).
 */
export function useInitializePayment() {
  return useMutation<
    { authorizationUrl: string; bookingId: string; checkoutExpiresAt: string },
    Error,
    InitPaymentArgs
  >({
    mutationFn: async (args) => {
      const { data, error } = await supabase.functions.invoke("tradesafe-initialize", {
        body: {
          listing_id: args.listingId,
          ...choiceBody(args.option),
          party_size: args.qty,
          attested_age: args.attestedAge ?? false,
          buyer_name: args.buyer.name,
          buyer_phone: args.buyer.phone,
          buyer_id_number: args.buyer.idNumber,
          buyer_id_type: args.buyer.idType,
          delivery_method: args.deliveryMethod ?? "email",
          terms_accepted: args.termsAccepted ?? false,
          custom_answers: args.customAnswers ?? {},
        },
      });
      if (error) throw await edgeError(error);
      const d = data as { checkout_url: string; booking_id: string; checkout_expires_at: string };
      return { authorizationUrl: d.checkout_url, bookingId: d.booking_id, checkoutExpiresAt: d.checkout_expires_at };
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
      if (error) throw await edgeError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Refund requests (paid bookings). request_refund() checks the host's policy,
// that the money is still in TradeSafe escrow, and puts the ticket on hold;
// TROVE then approves (TradeSafe returns the money) or declines.
// ---------------------------------------------------------------------------

const REFUND_ERRORS: Record<string, string> = {
  NO_REFUNDS: "This event doesn't offer refunds.",
  WINDOW_CLOSED: "The refund window for this event has closed.",
  ALREADY_REQUESTED: "You've already asked for a refund on this booking.",
  NOT_REFUNDABLE: "This booking can't be refunded.",
  FREE_BOOKING: "This booking was free, so there's nothing to refund. Cancel it instead.",
  ALREADY_USED: "This ticket has already been used.",
  NOT_IN_ESCROW: "We can't refund this payment in the app. Contact support and we'll sort it out.",
  REASON_TOO_LONG: "Keep the reason under 500 characters.",
  NOTHING_TO_WITHDRAW: "There's no open refund request to withdraw.",
};

function rpcError(error: { message?: string }): Error {
  const code = (error.message ?? "").trim();
  return new Error(REFUND_ERRORS[code] ?? error.message ?? "Something went wrong");
}

export function useRequestRefund() {
  const qc = useQueryClient();
  return useMutation<void, Error, { bookingId: string; reason: string }>({
    mutationFn: async ({ bookingId, reason }) => {
      const { error } = await supabase.rpc("request_refund" as never, { p_booking_id: bookingId, p_reason: reason } as never);
      if (error) throw rpcError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}

export function useWithdrawRefund() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (bookingId) => {
      const { error } = await supabase.rpc("withdraw_refund_request" as never, { p_booking_id: bookingId } as never);
      if (error) throw rpcError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}

/** Days before the event that refunds close, by listings.refund_policy. */
const POLICY_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };

export function refundPolicyText(policy: string | undefined): string {
  if (policy === "none") return "No refunds";
  const days = POLICY_DAYS[policy ?? "7d"] ?? 7;
  return `Refunds up to ${days} day${days === 1 ? "" : "s"} before the event`;
}

/** When the guest can no longer ask for a refund (null = no refunds at all). */
export function refundDeadline(policy: string | undefined, eventDate: string | undefined): Date | null {
  if (policy === "none") return null;
  const days = POLICY_DAYS[policy ?? "7d"] ?? 7;
  const start = eventDate ? new Date(eventDate).getTime() : NaN;
  if (Number.isNaN(start)) return null;
  return new Date(start - days * 86_400_000);
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
