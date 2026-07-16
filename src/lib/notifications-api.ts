// In-app notifications for the signed-in user. Backed by the shared
// `notifications` table (booking/payment/refund events written by edge
// functions). Friend requests are surfaced separately from the friends graph,
// so the bell badge combines both unread notifications and pending requests.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useFriends } from "./friends-api";

export interface AppNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export const notifKeys = {
  list: (uid?: string) => ["notifications", uid] as const,
};

export function useNotifications() {
  const { user } = useAuth();
  return useQuery<AppNotification[]>({
    queryKey: notifKeys.list(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, payload, read_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((n) => ({
        ...n,
        payload: (n.payload ?? {}) as Record<string, unknown>,
      })) as AppNotification[];
    },
  });
}

/** Combined unread badge count: unread notifications + incoming friend requests. */
export function useUnreadCount(): number {
  const { data: notifs = [] } = useNotifications();
  const { data: friends = [] } = useFriends();
  const unread = notifs.filter((n) => !n.read_at).length;
  const requests = friends.filter((f) => f.status === "pending" && !f.requestedByMe).length;
  return unread + requests;
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** Human-readable title/body for a notification, tolerant of varied payloads. */
export function describeNotification(n: AppNotification): { title: string; body: string } {
  const p = n.payload;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);

  const title =
    str("title") ??
    {
      booking_confirmed: "Booking confirmed",
      booking_cancelled: "Booking cancelled",
      payment_success: "Payment received",
      payment_failed: "Payment failed",
      refund_processed: "Refund processed",
      friend_request: "New friend request",
      group_invite: "Group invite",
      split_request: "Split payment request",
      split_reoffer: "Split updated",
      split_ready: "Split ready — pay your share",
      split_completed: "Split complete",
      split_declined: "Split declined",
      split_cancelled: "Split cancelled",
      split_expired: "Split expired",
    }[n.type] ??
    n.type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  const body = str("message") ?? str("body") ?? str("description") ?? "";
  return { title, body };
}
