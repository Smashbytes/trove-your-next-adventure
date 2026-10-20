// Reviews — guests review a listing once per booking, after the experience,
// through the submit_review() RPC (migration 0037); reads are public. Live only
// (the demo account's mock listing ids aren't real FKs), so callers gate on
// useIsDemo before showing the form.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export interface BookingReview {
  id: string;
  rating: number;
  body: string | null;
}

export function useBookingReview(bookingId: string | undefined) {
  return useQuery<BookingReview | null>({
    queryKey: ["booking-review", bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body")
        .eq("booking_id", bookingId!)
        .maybeSingle();
      if (error) throw error;
      return (data as BookingReview) ?? null;
    },
  });
}

const REVIEW_ERRORS: Record<string, string> = {
  TOO_EARLY: "You can rate this once the experience is over.",
  NOT_ELIGIBLE: "Only confirmed bookings can be reviewed.",
  ALREADY_REVIEWED: "You've already reviewed this booking.",
  INVALID_RATING: "Pick between 1 and 5 stars.",
  REVIEW_TOO_LONG: "Keep your review under 1,000 characters.",
  BOOKING_NOT_FOUND: "We couldn't find this booking on your account.",
};

/** submit_review() checks the booking is yours, paid/confirmed and in the past. */
export function useSubmitReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { bookingId: string; listingId: string; rating: number; body: string }>({
    mutationFn: async ({ bookingId, rating, body }) => {
      if (!user) throw new Error("Sign in to leave a review.");
      const { error } = await supabase.rpc("submit_review" as never, {
        p_booking_id: bookingId,
        p_rating: rating,
        p_body: body.trim() || null,
      } as never);
      if (error) throw new Error(REVIEW_ERRORS[(error.message ?? "").trim()] ?? error.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["booking-review", v.bookingId] });
      qc.invalidateQueries({ queryKey: ["listings", "reviews", v.listingId] });
    },
  });
}
