// The in-app pop-up surface.
//
// One card at a time, anchored above the bottom nav, in the same visual
// language as SplitPrompt. It is driven entirely by the `notifications` query
// cache, which realtime keeps current — so a friend request, a split request or
// a settled payment appears within about a second while the app is open, and
// waits in the queue if it arrived while the app was closed.
//
// Behaviour by type comes from the catalogue in notifications-api:
//   · actionable (friend request, split request, payment due) — sticky, with
//     buttons; stays until acted on or dismissed
//   · informational (payment received, refund, a friend paid) — auto-dismisses
//     after a few seconds and marks itself read
//   · urgent (closing payment window) — jumps the queue, never auto-dismisses
//
// Dismissing marks the notification read, so it does not come back on the next
// route change; it stays in the bell feed either way.

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { SplitPrompt } from "@/components/SplitPrompt";
import { useRespondFriend } from "@/lib/friends-api";
import {
  describeNotification,
  markPopped,
  notificationSpec,
  notificationTargets,
  useMarkRead,
  useNextPopup,
  useNotificationStream,
  type AppNotification,
} from "@/lib/notifications-api";

/** Routes where a pop-up would get in the way of the thing it is about. */
const MUTED_PREFIXES = ["/checkout/", "/payment/", "/onboarding", "/notifications"];

const AUTO_DISMISS_MS = 7000;

const TONE: Record<
  ReturnType<typeof notificationSpec>["tone"],
  { ring: string; iconBg: string; iconFg: string }
> = {
  brand: {
    ring: "ring-primary/40",
    iconBg: "bg-gradient-brand",
    iconFg: "text-primary-foreground",
  },
  success: { ring: "ring-success/40", iconBg: "bg-success/20", iconFg: "text-success" },
  warning: { ring: "ring-warning/40", iconBg: "bg-warning/20", iconFg: "text-warning" },
  danger: { ring: "ring-destructive/50", iconBg: "bg-destructive/20", iconFg: "text-destructive" },
  neutral: { ring: "ring-border", iconBg: "bg-surface-elevated", iconFg: "text-muted-foreground" },
};

export function NotificationCenter() {
  const { isAuthenticated } = useAuth();

  // The subscription has to run whenever signed in, pop-up visible or not:
  // it is what keeps the bell badge and the split pages live.
  useNotificationStream();

  const [tick, setTick] = useState(0);
  const item = useNextPopup(tick);
  const { pathname } = useLocation();
  const markRead = useMarkRead();

  const close = useCallback(
    (n: AppNotification) => {
      markPopped(n.id);
      markRead.mutate(n.id);
      setTick((t) => t + 1);
    },
    [markRead],
  );

  const muted = MUTED_PREFIXES.some((p) => pathname.startsWith(p));
  const spec = item ? notificationSpec(item) : null;

  // Informational pop-ups clear themselves; sticky ones wait for the user.
  useEffect(() => {
    if (!item || !spec || spec.sticky || muted) return;
    const t = setTimeout(() => close(item), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [item, spec, muted, close]);

  if (!isAuthenticated || muted) return null;

  // The split pages already show the split in full — a card on top is noise,
  // unless the payment window is actually closing.
  const onSplitPage = pathname.startsWith("/split/");
  const show = item && spec && !(onSplitPage && !spec.urgent);

  // SplitPrompt is the fallback, not a second pop-up: it reads the split inbox
  // directly, so it still catches a split whose notification was already read
  // or dismissed (or that predates this delivery layer). Only ever one card on
  // screen at a time.
  if (!show) return <SplitPrompt />;

  return (
    <AnimatePresence mode="wait">
      <NotificationCard key={item!.id} n={item!} onClose={() => close(item!)} />
    </AnimatePresence>
  );
}

function NotificationCard({ n, onClose }: { n: AppNotification; onClose: () => void }) {
  const spec = notificationSpec(n);
  const { body } = describeNotification(n);
  const targets = notificationTargets(n);
  const navigate = useNavigate();
  const respondFriend = useRespondFriend();
  const tone = TONE[spec.tone];
  const Icon = spec.icon;

  function go() {
    switch (spec.action) {
      case "split":
        if (targets.splitId) navigate({ to: "/split/$id", params: { id: targets.splitId } });
        break;
      case "booking":
        if (targets.bookingId) navigate({ to: "/booking/$id", params: { id: targets.bookingId } });
        else navigate({ to: "/tickets" });
        break;
      case "spot":
        if (targets.listingId) navigate({ to: "/spot/$id", params: { id: targets.listingId } });
        break;
      case "tickets":
      default:
        navigate({ to: "/tickets" });
    }
    onClose();
  }

  function respond(accept: boolean) {
    if (!targets.fromUserId) return onClose();
    respondFriend.mutate(
      { friendId: targets.fromUserId, accept },
      {
        onSuccess: () =>
          toast.success(
            accept
              ? `You're linked up with ${targets.fromName ?? "your friend"}.`
              : "Request declined.",
          ),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't respond."),
      },
    );
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="fixed inset-x-0 bottom-24 z-50 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[380px] lg:px-0"
      role="status"
      aria-live={spec.urgent ? "assertive" : "polite"}
    >
      <div className="mx-auto max-w-md">
        <div
          className={`glass-strong flex items-start gap-3 rounded-2xl p-3.5 shadow-glow ring-1 ${tone.ring}`}
        >
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone.iconBg} ${
              spec.tone === "brand" ? "shadow-glow-soft" : ""
            }`}
          >
            <Icon className={`h-5 w-5 ${tone.iconFg}`} />
          </div>

          {/* The action sits on its own row, not beside the text: a split
              request's whole point is the amount, and an inline button steals
              enough width at phone sizes to truncate it away. */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{spec.title}</p>
            {body && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{body}</p>}

            {spec.action === "friend" ? (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => respond(true)}
                  disabled={respondFriend.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button
                  onClick={() => respond(false)}
                  disabled={respondFriend.isPending}
                  className="rounded-full bg-surface-elevated px-4 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-border disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            ) : (
              spec.action && (
                <button
                  onClick={go}
                  className={`mt-2.5 rounded-full px-4 py-2 text-xs font-semibold ${
                    spec.urgent
                      ? "bg-destructive text-white"
                      : "bg-gradient-brand text-primary-foreground"
                  }`}
                >
                  {spec.actionLabel ?? "View"}
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
