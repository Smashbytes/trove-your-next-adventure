import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, UserPlus, X } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { useAuth } from "@/lib/auth";
import {
  useNotifications,
  useOlderNotifications,
  LIVE_LIMIT,
  useMarkAllRead,
  describeNotification,
  notificationSpec,
  notificationTargets,
  type AppNotification,
} from "@/lib/notifications-api";
import { useFriends, useRespondFriend } from "@/lib/friends-api";
import { toastError } from "@/lib/errors";
import { LoadMore } from "@/components/LoadMore";

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
  const pending = useFriends("pending");
  const respond = useRespondFriend();
  const markAll = useMarkAllRead();

  const requests = pending.friends.filter((f) => !f.requestedByMe);
  // Past the live newest 50, older rows load on request.
  const [showOlder, setShowOlder] = useState(false);
  const older = useOlderNotifications(notifs[notifs.length - 1]?.created_at, showOlder);
  const olderRows = older.data?.pages.flat() ?? [];
  const hasUnread = notifs.some((n) => !n.read_at);

  // Mark notifications read on view (friend requests stay actionable).
  useEffect(() => {
    if (hasUnread) markAll.mutate(undefined, { onError: toastError("Couldn't mark your notifications as read.") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  // A pending request is rendered as an actionable card from the friends graph,
  // so its notification row would be a duplicate of the same thing.
  const pendingFrom = new Set(requests.map((r) => r.friendId));
  const rows = [...notifs, ...olderRows].filter((n) => {
    if (n.type !== "friend_request") return true;
    const { fromUserId } = notificationTargets(n);
    return !fromUserId || !pendingFrom.has(fromUserId);
  });

  const empty = !isLoading && rows.length === 0 && requests.length === 0;

  return (
    <ResponsiveShell title="Notifications">
      {empty ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-border">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">You're all caught up</p>
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Booking updates, split requests and friend requests will show up here.
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
                onClick={() => respond.mutate({ friendId: f.friendId, accept: true }, { onError: toastError("Couldn't accept the request. Try again.") })}
                className="grid h-9 w-9 place-items-center rounded-full bg-success/20 text-success"
                aria-label="Accept"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => respond.mutate({ friendId: f.friendId, accept: false }, { onError: toastError("Couldn't decline the request. Try again.") })}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface-elevated text-muted-foreground"
                aria-label="Decline"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* System notifications */}
          {rows.map((n) => (
            <NotificationRow key={n.id} n={n} />
          ))}

          {isLoading && <div className="h-20 animate-pulse rounded-2xl bg-surface" />}
          {!showOlder ? (
            <LoadMore hasMore={notifs.length === LIVE_LIMIT} loading={false} onClick={() => setShowOlder(true)} label="Older notifications" />
          ) : (
            <LoadMore
              hasMore={older.isLoading || older.hasNextPage}
              loading={older.isLoading || older.isFetchingNextPage}
              onClick={() => older.fetchNextPage()}
              label="Older notifications"
            />
          )}
          <LoadMore hasMore={pending.hasMore} loading={pending.loadingMore} onClick={pending.loadMore} label="More friend requests" />
        </div>
      )}
    </ResponsiveShell>
  );
}

const TONE_ICON: Record<string, string> = {
  brand: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};

function NotificationRow({ n }: { n: AppNotification }) {
  const spec = notificationSpec(n);
  const { body } = describeNotification(n);
  const targets = notificationTargets(n);
  const navigate = useNavigate();
  const Icon = spec.icon;

  const when = new Date(n.created_at).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });

  // Rows deep-link wherever the pop-up would have taken you.
  const target = (() => {
    if (spec.action === "split" && targets.splitId) {
      return () => navigate({ to: "/split/$id", params: { id: targets.splitId! } });
    }
    if (spec.action === "booking" && targets.bookingId) {
      return () => navigate({ to: "/booking/$id", params: { id: targets.bookingId! } });
    }
    if (spec.action === "tickets") return () => navigate({ to: "/tickets" });
    return null;
  })();

  const Wrapper = target ? "button" : "div";

  return (
    <Wrapper
      {...(target ? { onClick: target, type: "button" as const } : {})}
      className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-1 ${
        n.read_at ? "bg-surface/60 ring-border/60" : "bg-surface ring-primary/20"
      } ${target ? "transition hover:ring-primary/40" : ""}`}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-elevated ring-1 ring-border">
        <Icon className={`h-4 w-4 ${TONE_ICON[spec.tone]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{spec.title}</p>
        {body && <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>}
        <p className="mt-1 text-2xs text-muted-foreground/70">{when}</p>
      </div>
      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </Wrapper>
  );
}
