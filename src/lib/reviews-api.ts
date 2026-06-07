// Reviews — guests review a listing once per booking. RLS allows a user to
// insert their own review (by_user = auth.uid()); reads are public. Live only
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

export function useSubmitReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { bookingId: string; listingId: string; rating: number; body: string }>({
    mutationFn: async ({ bookingId, listingId, rating, body }) => {
      if (!user) throw new Error("Sign in to leave a review.");
      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        by_user: user.id,
        of_listing: listingId,
        rating,
        body: body.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["booking-review", v.bookingId] });
      qc.invalidateQueries({ queryKey: ["listings", "reviews", v.listingId] });
    },
  });
}
