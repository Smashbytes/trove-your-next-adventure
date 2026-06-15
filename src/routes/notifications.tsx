import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, Check, X, UserPlus, CalendarCheck, CreditCard, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { useAuth } from "@/lib/auth";
import {
  useNotifications,
  useMarkAllRead,
  describeNotification,
  type AppNotification,
} from "@/lib/notifications-api";
import { useFriends, useRespondFriend } from "@/lib/friends-api";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — TROVE" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { isAuthenticated, openAuthModal } = useAuth();

  if (!isAuthenticated) {
    return (
      <ResponsiveShell title="Notifications">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-border">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <p className="max-w-[260px] text-sm text-muted-foreground">
            Sign in to see booking updates, friend requests and more.
          </p>
          <button
            onClick={openAuthModal}
            className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Sign in
          </button>
        </div>
      </ResponsiveShell>
    );
  }

  return <NotificationsInner />;
}

function NotificationsInner() {
  const { data: notifs = [], isLoading } = useNotifications();
  const { data: friends = [] } = useFriends();
  const respond = useRespondFriend();
  const markAll = useMarkAllRead();

  const requests = friends.filter((f) => f.status === "pending" && !f.requestedByMe);
  const hasUnread = notifs.some((n) => !n.read_at);

  // Mark notifications read on view (friend requests stay actionable).
  useEffect(() => {
    if (hasUnread) markAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  const empty = !isLoading && notifs.length === 0 && requests.length === 0;

  return (
    <ResponsiveShell title="Notifications">
      {empty ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-border">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">You're all caught up</p>
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Booking updates and friend requests will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Friend requests — actionable */}
          {requests.map((f) => (
            <div
              key={f.friendId}
              className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-soft ring-1 ring-primary/30">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{f.name}</p>
                <p className="text-xs text-muted-foreground">sent you a friend request</p>
              </div>
              <button
                onClick={() => respond.mutate({ friendId: f.friendId, accept: true })}
                className="grid h-9 w-9 place-items-center rounded-full bg-success/20 text-success"
                aria-label="Accept"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => respond.mutate({ friendId: f.friendId, accept: false })}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface-elevated text-muted-foreground"
                aria-label="Decline"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* System notifications */}
          {notifs.map((n) => (
            <NotificationRow key={n.id} n={n} />
          ))}

          {isLoading && <div className="h-20 animate-pulse rounded-2xl bg-surface" />}
        </div>
      )}
    </ResponsiveShell>
  );
}

const TYPE_ICON: Record<string, LucideIcon> = {
  booking_confirmed: CalendarCheck,
  booking_cancelled: CalendarCheck,
  payment_success: CreditCard,
  payment_failed: CreditCard,
  refund_processed: RotateCcw,
};

function NotificationRow({ n }: { n: AppNotification }) {
  const { title, body } = describeNotification(n);
  const Icon = TYPE_ICON[n.type] ?? Bell;
  const when = new Date(n.created_at).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${
        n.read_at ? "bg-surface/60 ring-border/60" : "bg-surface ring-primary/20"
      }`}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-elevated ring-1 ring-border">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {body && <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground/70">{when}</p>
      </div>
      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );
}
