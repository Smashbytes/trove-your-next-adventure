// In-app notifications for the signed-in user.
//
// Backed by the shared `notifications` table. Everything that writes to it is
// server-side (edge functions on settlement, database triggers on the friends
// graph and split shares, pg_cron for reminders and expiry) — see
// supabase/migrations/0026_notification_engine.sql.
//
// Delivery is realtime: the table is in the `supabase_realtime` publication, so
// a row written while the app is open arrives over the socket and pops up
// immediately. Polling stays on as a fallback for a dropped socket, and any
// notification written while the app was closed is picked up on the next mount.
//
// Friend requests are ALSO surfaced from the friends graph, because rows
// predating the trigger have no notification of their own — the bell badge
// combines both.

import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Hourglass,
  RotateCcw,
  ShieldAlert,
  Ticket,
  UserCheck,
  UserPlus,
  Users2,
  XCircle,
  Zap,
} from "lucide-react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useFriendRequestCount } from "./friends-api";

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

const SELECT = "id, type, payload, read_at, created_at";

function normalize(row: {
  id: string;
  type: string;
  payload: unknown;
  read_at: string | null;
  created_at: string;
}): AppNotification {
  return {
    id: row.id,
    type: row.type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  return useQuery<AppNotification[]>({
    queryKey: notifKeys.list(user?.id),
    enabled: !!user,
    // Realtime is the primary channel; this is the safety net for a socket that
    // dropped silently (backgrounded tab, flaky mobile data).
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(SELECT)
        .eq("user_id", user!.id)
        // Host notifications (new bookings, followers…) belong to the Engine.
        .eq("audience", "guest")
        .order("created_at", { ascending: false })
        .limit(LIVE_LIMIT);
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
  });
}

/** Rows kept live (badge, pop-ups); older ones load on request. */
export const LIVE_LIMIT = 50;
const OLDER_PAGE = 30;

/**
 * Notifications older than `before` (the oldest live row), newest first, for
 * the Notifications page (GST-L03-09). Keyed by time, not offset, so rows
 * arriving meanwhile don't shift the pages.
 */
export function useOlderNotifications(before: string | undefined, enabled: boolean) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: [...notifKeys.list(user?.id), "older", before],
    enabled: enabled && !!user && !!before,
    initialPageParam: before!,
    queryFn: async ({ pageParam }): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select(SELECT)
        .eq("user_id", user!.id)
        .eq("audience", "guest")
        .lt("created_at", pageParam)
        .order("created_at", { ascending: false })
        .limit(OLDER_PAGE);
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
    getNextPageParam: (last) => (last.length === OLDER_PAGE ? last[last.length - 1].created_at : undefined),
  });
}

/**
 * Subscribe to this user's notification inserts and push them straight into the
 * query cache. Mount exactly once, high in the tree.
 *
 * Returns nothing: the pop-up surface reads the cache like everything else, so
 * there is a single source of truth whether a notification arrived over the
 * socket, on a poll, or on first load.
 */
export function useNotificationStream() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  useEffect(() => {
    if (!uid) return;
    const key = notifKeys.list(uid);

    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        (msg) => {
          // Same user, but a host notification for the Engine: not shown here.
          if ((msg.new as { audience?: string }).audience !== "guest") return;
          const row = normalize(msg.new as Parameters<typeof normalize>[0]);
          qc.setQueryData<AppNotification[]>(key, (prev = []) =>
            prev.some((n) => n.id === row.id) ? prev : [row, ...prev].slice(0, LIVE_LIMIT),
          );
          // A split notification almost always means the split itself moved.
          if (row.type.startsWith("split")) {
            qc.invalidateQueries({ queryKey: ["split-inbox"] });
            const splitId = row.payload.split_id;
            if (typeof splitId === "string") {
              qc.invalidateQueries({ queryKey: ["split", splitId] });
            }
          }
          if (row.type.startsWith("friend")) {
            qc.invalidateQueries({ queryKey: ["friends"] });
          }
          if (row.type.startsWith("payment") || row.type.startsWith("booking")) {
            qc.invalidateQueries({ queryKey: ["bookings"] });
          }
        },
      )
      // Reads of the same row by another device mark it read; keep the badge honest.
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        (msg) => {
          const row = normalize(msg.new as Parameters<typeof normalize>[0]);
          qc.setQueryData<AppNotification[]>(key, (prev = []) =>
            prev.map((n) => (n.id === row.id ? row : n)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);
}

/** Combined unread badge count: unread notifications + incoming friend requests. */
export function useUnreadCount(): number {
  const { data: notifs = [] } = useNotifications();
  const { data: requests = 0 } = useFriendRequestCount();
  const unread = notifs.filter((n) => !n.read_at).length;
  // A friend request that already has a notification row would otherwise count
  // twice now that the trigger writes one.
  const requestNotifs = notifs.filter((n) => n.type === "friend_request" && !n.read_at).length;
  return unread + Math.max(0, requests - requestNotifs);
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
        .eq("audience", "guest")
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** Acknowledge one notification — used when a pop-up is dismissed or acted on. */
export function useMarkRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const key = notifKeys.list(user?.id);
      qc.setQueryData<AppNotification[]>(key, (prev = []) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ---------------------------------------------------------------------------
// Presentation catalogue
// ---------------------------------------------------------------------------

/**
 * How a notification behaves in the UI.
 *
 * `action` — what the pop-up's primary button does. "friend" renders inline
 *            accept/decline; the rest navigate.
 * `urgent` — money is about to be lost. Styled loud and never auto-dismissed.
 * `sticky` — needs a decision, so it stays until dismissed or acted on.
 *            Everything else auto-dismisses after a few seconds.
 */
export interface NotificationSpec {
  title: string;
  icon: LucideIcon;
  tone: "brand" | "success" | "warning" | "danger" | "neutral";
  action?: "split" | "booking" | "tickets" | "friend" | "spot";
  actionLabel?: string;
  sticky?: boolean;
  urgent?: boolean;
}

const CATALOGUE: Record<string, NotificationSpec> = {
  // ── Social ───────────────────────────────────────────────────────────────
  friend_request: {
    title: "New friend request",
    icon: UserPlus,
    tone: "brand",
    action: "friend",
    sticky: true,
  },
  friend_accepted: { title: "You're linked up", icon: UserCheck, tone: "success" },
  group_invite: {
    title: "Group invite",
    icon: Users2,
    tone: "brand",
    sticky: true,
  },

  // ── Splits ───────────────────────────────────────────────────────────────
  split_request: {
    title: "Split payment request",
    icon: Zap,
    tone: "brand",
    action: "split",
    actionLabel: "View",
    sticky: true,
  },
  split_reoffer: {
    title: "Split updated",
    icon: Zap,
    tone: "warning",
    action: "split",
    actionLabel: "Review",
    sticky: true,
  },
  split_reminder: {
    title: "Still waiting on you",
    icon: Hourglass,
    tone: "warning",
    action: "split",
    actionLabel: "Respond",
    sticky: true,
  },
  split_ready: {
    title: "Everyone's in — pay your share",
    icon: Zap,
    tone: "brand",
    action: "split",
    actionLabel: "Pay",
    sticky: true,
    urgent: true,
  },
  split_payment_due: {
    title: "Pay now or the tickets go",
    icon: AlertTriangle,
    tone: "danger",
    action: "split",
    actionLabel: "Pay now",
    sticky: true,
    urgent: true,
  },
  split_paid: {
    title: "A friend paid their share",
    icon: CheckCircle2,
    tone: "success",
    action: "split",
    actionLabel: "View",
  },
  split_completed: {
    title: "Split complete",
    icon: Ticket,
    tone: "success",
    action: "tickets",
    actionLabel: "View ticket",
  },
  split_declined: {
    title: "Split declined",
    icon: XCircle,
    tone: "warning",
    action: "split",
    actionLabel: "View",
    sticky: true,
  },
  split_cancelled: { title: "Split cancelled", icon: XCircle, tone: "neutral", sticky: true },
  split_expired: { title: "Split expired", icon: Hourglass, tone: "warning", sticky: true },

  // ── Payments & bookings ──────────────────────────────────────────────────
  payment_success: {
    title: "Payment received",
    icon: CheckCircle2,
    tone: "success",
    action: "booking",
    actionLabel: "View ticket",
  },
  payment_failed: {
    title: "Payment didn't go through",
    icon: XCircle,
    tone: "danger",
    action: "tickets",
    actionLabel: "View",
    sticky: true,
  },
  payment_review: {
    title: "We're checking your payment",
    icon: ShieldAlert,
    tone: "warning",
    action: "tickets",
    actionLabel: "View",
    sticky: true,
  },
  payment_disputed: {
    title: "Payment in dispute",
    icon: ShieldAlert,
    tone: "danger",
    sticky: true,
  },
  refund_processed: { title: "Refund on its way", icon: RotateCcw, tone: "success" },
  event_cancelled: {
    title: "Event cancelled",
    icon: XCircle,
    tone: "danger",
    action: "booking",
    actionLabel: "View booking",
    sticky: true,
  },
  refund_requested: {
    title: "Cancellation requested",
    icon: RotateCcw,
    tone: "neutral",
    action: "booking",
    actionLabel: "View booking",
  },
  refund_declined: {
    title: "Refund request declined",
    icon: XCircle,
    tone: "warning",
    action: "booking",
    actionLabel: "View ticket",
    sticky: true,
  },
  booking_confirmed: {
    title: "Booking confirmed",
    icon: CalendarCheck,
    tone: "success",
    action: "booking",
    actionLabel: "View ticket",
  },
  booking_cancelled: {
    title: "Booking cancelled",
    icon: CalendarCheck,
    tone: "warning",
    sticky: true,
  },
  booking_reminder: {
    title: "Coming up",
    icon: CalendarClock,
    tone: "brand",
    action: "booking",
    actionLabel: "View ticket",
  },
};

const FALLBACK: NotificationSpec = { title: "Notification", icon: Bell, tone: "neutral" };

/** UI behaviour for a notification type, tolerant of types we don't know yet. */
export function notificationSpec(n: AppNotification): NotificationSpec {
  const spec = CATALOGUE[n.type];
  if (spec) {
    // The server's own title wins — it is written closer to the event.
    const title = typeof n.payload.title === "string" ? n.payload.title : spec.title;
    const urgent = n.payload.urgent === true || spec.urgent;
    return { ...spec, title, urgent, sticky: spec.sticky || urgent };
  }
  return {
    ...FALLBACK,
    title:
      (typeof n.payload.title === "string" ? n.payload.title : undefined) ??
      n.type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
  };
}

/** Human-readable title/body, tolerant of varied payloads. */
export function describeNotification(n: AppNotification): { title: string; body: string } {
  const p = n.payload;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
  return {
    title: notificationSpec(n).title,
    body: str("message") ?? str("body") ?? str("description") ?? "",
  };
}

/** Typed accessors for the ids the pop-up needs to deep-link. */
export function notificationTargets(n: AppNotification) {
  const id = (k: string) =>
    typeof n.payload[k] === "string" ? (n.payload[k] as string) : undefined;
  return {
    splitId: id("split_id"),
    bookingId: id("booking_id"),
    listingId: id("listing_id"),
    fromUserId: id("from_user_id"),
    fromName: id("from_name"),
    groupId: id("group_id"),
  };
}

// ---------------------------------------------------------------------------
// Pop-up queue
// ---------------------------------------------------------------------------

const POPUP_DISMISS_KEY = "trove:notif-popped";

function poppedThisSession(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(POPUP_DISMISS_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markPopped(id: string) {
  try {
    const next = [...poppedThisSession(), id].slice(-80);
    sessionStorage.setItem(POPUP_DISMISS_KEY, JSON.stringify(next));
  } catch {
    /* private mode — the pop-up just shows again next navigation */
  }
}

/** How stale a notification can be and still pop up on app open. */
const POPUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The next notification to show as a pop-up, or null.
 *
 * Unread only, recent only, and never one already shown this session. Urgent
 * items jump the queue — a closing payment window outranks a friend request.
 *
 * `tick` is bumped by the caller after a dismissal: the session-dismissal set
 * lives in sessionStorage (so it survives a route change but not a reload) and
 * a change there is invisible to React on its own.
 */
export function useNextPopup(tick: number): AppNotification | null {
  const { data: notifs = [] } = useNotifications();

  return useMemo(() => {
    const popped = poppedThisSession();
    const cutoff = Date.now() - POPUP_MAX_AGE_MS;
    const candidates = notifs.filter(
      (n) => !n.read_at && !popped.has(n.id) && new Date(n.created_at).getTime() > cutoff,
    );
    if (candidates.length === 0) return null;
    const urgent = candidates.find((n) => notificationSpec(n).urgent);
    return urgent ?? candidates[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs, tick]);
}
