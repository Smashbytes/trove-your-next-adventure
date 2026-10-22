// Bookings — unified view-model over the demo (localStorage) flow and the live
// (Supabase edge function) flow, so the ticket/booking UI speaks one shape.
//
//   - demo account: existing mock store (localStorage), full split-bill flow
//   - live users:   create-booking / cancel-booking edge functions + DB reads
//
// Paid bookings use TradeSafe hosted checkout; free/RSVP bookings stay in-app.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useIsDemo, loadSpotsByIds } from "./listings-api";
import { centsToRand } from "./format";
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
  /** Who called it off: the guest (refund policy) or the host (full refund). */
  cancelledBy?: "guest" | "host" | "trove";
  cancelReason?: string;
  /** TROVE's booking fee in rand (part of `total`). */
  bookingFee?: number;
  /** Money already returned to the guest, in rand. */
  refunded?: number;
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

/** An edge-function failure: the server's sentence plus its machine `code`. */
export type EdgeError = Error & { code?: string };

/** Pull the `{ error, code }` out of a failed edge-function call. */
async function edgeError(error: unknown): Promise<EdgeError> {
  const ctx = (error as { context?: Response }).context;
  let msg = (error as Error)?.message ?? "Something went wrong";
  let code: string | undefined;
  // A request our client gave up on (supabase.ts time limit) arrives wrapped
  // as "Failed to send a request"; say what actually happened.
  if ((ctx as unknown as { name?: string } | undefined)?.name === "TimeoutError") {
    return Object.assign(new Error("The request timed out."), { code: "timeout" });
  }
  try {
    if (ctx) {
      const body = await ctx.json();
      if (body?.error) msg = body.error;
      if (typeof body?.code === "string") code = body.code;
    }
  } catch { /* not JSON */ }
  return Object.assign(new Error(msg), { code });
}

/** Checkout errors that retrying won't fix: send the guest back to the spot. */
export const DEAD_END_CHECKOUT_CODES = new Set([
  "sold_out", "slot_not_available", "tier_not_available", "listing_not_live",
  "host_unavailable", "seller_escrow_not_ready", "event_ended",
]);

interface DbBookingRow {
  id: string;
  listing_id: string;
  party_size: number;
  total_cents: number;
  status: string;
  created_at: string;
  booking_fee_cents: number | null;
  /** text + CHECK in the database: guest | host | trove. */
  cancelled_by: string | null;
  cancel_reason: string | null;
  tickets: { code: string }[] | null;
  refunds: { amount_cents: number; status: string }[] | null;
}

async function loadLiveBookings(rows: DbBookingRow[]): Promise<BookingView[]> {
  const spotMap = await loadSpotsByIds([...new Set(rows.map((r) => r.listing_id))], false);
  return rows.map((r) => ({
    id: r.id,
    listingId: r.listing_id,
    spot: spotMap.get(r.listing_id) ?? null,
    qty: r.party_size,
    total: centsToRand(r.total_cents),
    status: dbStatusToView(r.status),
    ticketCode: r.tickets?.[0]?.code ?? "—",
    createdAt: r.created_at,
    cancelledBy: (r.cancelled_by ?? undefined) as BookingView["cancelledBy"],
    cancelReason: r.cancel_reason ?? undefined,
    bookingFee: centsToRand(r.booking_fee_cents ?? 0),
    refunded: centsToRand(
      (r.refunds ?? []).filter((x) => x.status === "succeeded").reduce((s, x) => s + x.amount_cents, 0),
    ),
  }));
}

const BOOKING_SELECT =
  "id, listing_id, party_size, total_cents, booking_fee_cents, status, created_at, cancelled_by, cancel_reason, tickets(code), refunds(amount_cents, status)";

const BOOKINGS_PAGE = 20;

/** My Tickets: newest bookings first, a page at a time (GST-L03-03). */
export function useMyBookings() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  return useInfiniteQuery({
    queryKey: ["bookings", local, user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ bookings: BookingView[]; total: number }> => {
      if (local) {
        const { getSpot } = await import("./spots");
        const all = getBookings().map((b) => mockToView(b, getSpot(b.spotId) ?? null));
        return { bookings: pageParam === 0 ? all : [], total: all.length };
      }
      const { data, error, count } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT, { count: "exact" })
        .eq("guest_id", user!.id)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + BOOKINGS_PAGE - 1);
      if (error) throw error;
      const bookings = await loadLiveBookings(data ?? []);
      return { bookings, total: count ?? bookings.length };
    },
    getNextPageParam: (last, pages) => {
      const next = pages.length * BOOKINGS_PAGE;
      return next < last.total ? next : undefined;
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
      const [view] = await loadLiveBookings([data]);
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
// Refund requests (paid bookings). request_refund() applies the listing's
// refund policy (migration 0038: % of the ticket price; the booking fee is
// never refunded), checks the money is still in TradeSafe escrow and puts the
// ticket on hold; TROVE then approves (TradeSafe returns the money) or declines.
// ---------------------------------------------------------------------------

export interface RefundQuote {
  policy: string;
  percent: number;
  amountCents: number;
  paidCents: number;
  bookingFeeCents: number;
  nextChangeAt: string | null;
  nextPercent: number | null;
}

/** What the guest would get back if they cancelled now (server-calculated). */
export function useRefundQuote(bookingId: string | undefined, enabled = true) {
  return useQuery<RefundQuote>({
    queryKey: ["refund-quote", bookingId],
    enabled: enabled && !!bookingId,
    // Tiers change with time; don't show a stale amount.
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("refund_quote", { p_booking_id: bookingId! });
      if (error) throw rpcError(error);
      const q = data as unknown as Record<string, unknown>;
      return {
        policy: String(q.policy ?? "standard"),
        percent: Number(q.percent ?? 0),
        amountCents: Number(q.amount_cents ?? 0),
        paidCents: Number(q.paid_cents ?? 0),
        bookingFeeCents: Number(q.booking_fee_cents ?? 0),
        nextChangeAt: (q.next_change_at as string | null) ?? null,
        nextPercent: q.next_percent == null ? null : Number(q.next_percent),
      };
    },
  });
}

/** TROVE's booking fee (rand) added to paid checkouts; the server charges it. */
export function useCheckoutFees() {
  return useQuery<{ bookingFee: number }>({
    queryKey: ["checkout-fees"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("checkout_fees");
      if (error) throw error;
      return { bookingFee: centsToRand(Number((data as unknown as { booking_fee_cents?: number })?.booking_fee_cents ?? 0)) };
    },
  });
}

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
      const { error } = await supabase.rpc("request_refund", { p_booking_id: bookingId, p_reason: reason });
      if (error) throw rpcError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
      qc.invalidateQueries({ queryKey: ["refund-quote"] });
    },
  });
}

export function useWithdrawRefund() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (bookingId) => {
      const { error } = await supabase.rpc("withdraw_refund_request", { p_booking_id: bookingId });
      if (error) throw rpcError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}

/** The listing's refund policy in one line (listings.refund_policy, 0038). */
export function refundPolicyText(policy: string | undefined): string {
  switch (policy) {
    case "none":
      return "No refunds if you cancel";
    case "7d":
      return "90% back if you cancel 7+ days before";
    case "30d":
      return "90% back if you cancel 30+ days before";
    default:
      return "90% back if you cancel 72+ hours before, 50% at 24–72 hours";
  }
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
