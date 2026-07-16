// In-app popup shown when the user has split payments that need attention:
// a share to accept/decline, or a ready split waiting on their payment.
// Shows once per split per session (dismissals tracked in sessionStorage).

import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/spots";
import { koboToRand } from "@/lib/listings-api";
import { splitNeedsAction, useSplitInbox } from "@/lib/spark-api";

const DISMISS_KEY = "trove:split-prompt-dismissed";

function getDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function dismiss(splitId: string) {
  sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...getDismissed(), splitId]));
}

export function SplitPrompt() {
  const { isAuthenticated } = useAuth();
  const { data: inbox = [] } = useSplitInbox();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [, setTick] = useState(0);

  const item = useMemo(() => {
    if (!isAuthenticated) return null;
    const dismissed = new Set(getDismissed());
    return inbox.find((i) => splitNeedsAction(i) && !dismissed.has(i.splitId)) ?? null;
  }, [inbox, isAuthenticated]);

  // Never stack the popup on top of the split page itself (or mid-checkout).
  if (!item || pathname.startsWith("/split/") || pathname.startsWith("/checkout/")) return null;

  const needsPayment = item.splitStatus === "ready";

  return (
    <AnimatePresence>
      <motion.div
        key={item.splitId}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed inset-x-0 bottom-24 z-50 px-4"
      >
        <div className="mx-auto max-w-md">
          <div className="glass-strong flex items-center gap-3 rounded-2xl p-3.5 shadow-glow ring-1 ring-primary/40">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-brand shadow-glow-soft">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {needsPayment ? "Pay your share" : "Split payment request"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {needsPayment
                  ? `${item.listingTitle} — ${formatPrice(koboToRand(item.shareKobo + item.feeKobo))} locks in the tickets`
                  : `${item.initiatorName} · ${item.listingTitle} · ${formatPrice(koboToRand(item.shareKobo))} + R5 fee`}
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/split/$id", params: { id: item.splitId } })}
              className="shrink-0 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              {needsPayment ? "Pay" : "View"}
            </button>
            <button
              onClick={() => {
                dismiss(item.splitId);
                setTick((n) => n + 1);
              }}
              aria-label="Dismiss"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
