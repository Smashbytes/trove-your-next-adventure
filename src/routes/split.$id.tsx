import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Clock, Loader2, Lock, PartyPopper, ShieldCheck,
  Ticket, Users2, X, Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useListing, koboToRand } from "@/lib/listings-api";
import { formatPrice, formatDate, formatTime } from "@/lib/spots";
import { setCheckoutIntent } from "@/lib/store";
import {
  usePaySplitShare,
  useRespondSplit,
  useSplit,
  type SplitDetail,
  type SplitParticipantRow,
} from "@/lib/spark-api";

export const Route = createFileRoute("/split/$id")({
  head: () => ({ meta: [{ title: "Split payment — TROVE" }] }),
  component: SplitPage,
});

function SplitPage() {
  const { id } = useParams({ from: "/split/$id" });
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { data: split, isLoading } = useSplit(id);
  const { data: spot } = useListing(split?.listingId);

  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Sign in to view this split payment.</p>
          <button
            onClick={openAuthModal}
            className="mt-4 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Sign in
          </button>
        </div>
      </Shell>
    );
  }
  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-3 pt-4">
          <div className="h-24 animate-pulse rounded-2xl bg-surface" />
          <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        </div>
      </Shell>
    );
  }
  if (!split) {
    return (
      <Shell>
        <p className="py-16 text-center text-sm text-muted-foreground">
          Split not found — it may have been cancelled.
        </p>
      </Shell>
    );
  }

  const mine = split.participants.find((p) => p.userId === user?.id);
  const isInitiator = split.initiatorId === user?.id;

  return (
    <Shell>
      <div className="space-y-5 pt-4 pb-32">
        {/* Spot summary */}
        {spot && (
          <Link
            to="/spot/$id"
            params={{ id: spot.id }}
            className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border"
          >
            <img
              src={spot.image}
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
              onError={(e) => {
                const fb = spot.imageFallback;
                if (fb && e.currentTarget.src !== fb) e.currentTarget.src = fb;
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-accent">
                {formatDate(spot.date)} · {formatTime(spot.date)}
              </p>
              <p className="truncate font-display text-base">{spot.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {split.qty} ticket{split.qty > 1 ? "s" : ""} · total {formatPrice(koboToRand(split.ticketTotalKobo))}
              </p>
            </div>
          </Link>
        )}

        <StatusBanner split={split} isInitiator={isInitiator} />

        {/* Participants */}
        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <h2 className="mb-3 inline-flex items-center gap-2 font-display text-base">
            <Users2 className="h-4 w-4 text-primary" /> The split
          </h2>
          <div className="space-y-2">
            {split.participants.map((p) => (
              <ParticipantRow key={p.shareId} p={p} isMe={p.userId === user?.id} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Each person pays their share + {formatPrice(koboToRand(split.feePerShareKobo))} split processing fee.
          </p>
        </section>

        <Actions split={split} mine={mine} isInitiator={isInitiator} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-5">
      <header className="sticky top-0 z-30 -mx-5 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="flex items-center justify-between">
          <Link to="/spark" className="grid h-10 w-10 place-items-center rounded-full bg-surface ring-1 ring-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="inline-flex items-center gap-2 font-display text-base">
            <Zap className="h-4 w-4 text-primary" /> Split payment
          </h1>
          <span className="w-10" />
        </div>
      </header>
      {children}
    </div>
  );
}

function StatusBanner({ split, isInitiator }: { split: SplitDetail; isInitiator: boolean }) {
  const map: Record<SplitDetail["status"], { icon: React.ReactNode; title: string; body: string; tone: string }> = {
    pending: {
      icon: <Clock className="h-5 w-5" />,
      title: "Waiting on responses",
      body: isInitiator
        ? "Your friends have been asked to accept their share."
        : "Accept or decline your share below.",
      tone: "ring-border bg-surface",
    },
    ready: {
      icon: <ShieldCheck className="h-5 w-5 text-success" />,
      title: "Everyone's in — time to pay",
      body: "The tickets are reserved. Each person pays their share within 45 minutes.",
      tone: "ring-primary/40 bg-gradient-soft",
    },
    completed: {
      icon: <PartyPopper className="h-5 w-5 text-success" />,
      title: "Split complete — you're in! 🎉",
      body: isInitiator
        ? "All shares are paid. Your group ticket QR is in Tickets."
        : "All shares are paid. The organiser holds the group ticket.",
      tone: "ring-success/40 bg-success/10",
    },
    declined: {
      icon: <X className="h-5 w-5 text-destructive" />,
      title: "Split declined",
      body: isInitiator
        ? "Your friends passed on this one. You can buy the tickets yourself or change the quantity."
        : "This split was declined.",
      tone: "ring-destructive/40 bg-destructive/10",
    },
    cancelled: {
      icon: <X className="h-5 w-5 text-muted-foreground" />,
      title: "Split cancelled",
      body: "Nobody was charged.",
      tone: "ring-border bg-surface",
    },
    expired: {
      icon: <Clock className="h-5 w-5 text-destructive" />,
      title: "Payment window expired",
      body: "Not everyone paid in time. If you paid your share, TROVE support will refund you.",
      tone: "ring-destructive/40 bg-destructive/10",
    },
  };
  const s = map[split.status];
  return (
    <div className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${s.tone}`}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div>
        <p className="text-sm font-semibold">{s.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{s.body}</p>
      </div>
    </div>
  );
}

function ParticipantRow({ p, isMe }: { p: SplitParticipantRow; isMe: boolean }) {
  const display = (p.fullName?.trim() || (p.username ? `@${p.username}` : "Friend")) + (isMe ? " (you)" : "");
  const badge: Record<SplitParticipantRow["status"], { label: string; cls: string }> = {
    pending: { label: "Waiting", cls: "bg-surface text-muted-foreground ring-1 ring-border" },
    accepted: { label: "Accepted", cls: "bg-primary/15 text-primary" },
    declined: { label: "Declined", cls: "bg-destructive/15 text-destructive" },
    paid: { label: "Paid ✓", cls: "bg-success/15 text-success" },
  };
  const b = badge[p.status];
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-brand font-display text-sm text-primary-foreground">
        {p.avatarUrl
          ? <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
          : display.replace(/^@/, "").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {display}
          {p.isInitiator && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-accent">Organiser</span>}
        </p>
        {p.status !== "declined" && (
          <p className="text-[11px] text-muted-foreground">
            {formatPrice(koboToRand(p.shareKobo))} + {formatPrice(koboToRand(p.feeKobo))} fee
          </p>
        )}
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${b.cls}`}>{b.label}</span>
    </div>
  );
}

function Actions({ split, mine, isInitiator }: {
  split: SplitDetail;
  mine: SplitParticipantRow | undefined;
  isInitiator: boolean;
}) {
  const navigate = useNavigate();
  const respond = useRespondSplit();
  const pay = usePaySplitShare();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<"accept" | "decline" | "cancel" | "pay" | null>(null);

  async function act(action: "accept" | "decline" | "cancel") {
    setBusy(action);
    try {
      const res = await respond.mutateAsync({ splitId: split.id, action, agreed });
      if (action === "accept") {
        toast.success(res.status === "ready" ? "Everyone's in — time to pay!" : "Share accepted.");
      } else if (action === "decline") {
        toast("You declined the split.");
      } else {
        toast("Split cancelled.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function payShare() {
    setBusy("pay");
    try {
      const { authorization_url } = await pay.mutateAsync(split.id);
      window.location.href = authorization_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start payment.");
      setBusy(null);
    }
  }

  function buySolo() {
    // Fall back to a normal checkout for the full amount.
    setCheckoutIntent({
      spotId: split.listingId,
      qty: split.qty,
      total: koboToRand(split.ticketTotalKobo),
    });
    navigate({ to: "/checkout/$id", params: { id: split.listingId } });
  }

  // ── My share needs a response ────────────────────────────────────────────────
  if (split.status === "pending" && mine?.status === "pending") {
    return (
      <section className="space-y-3">
        <label className="flex items-start gap-3 rounded-2xl bg-surface p-4 text-xs text-muted-foreground ring-1 ring-border">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            I agree to the <span className="font-semibold text-foreground">split payment agreement</span>: I'll pay my
            share of {formatPrice(koboToRand(mine.shareKobo))} plus the {formatPrice(koboToRand(mine.feeKobo))} split
            processing fee once everyone accepts. Tickets are only issued after all shares are paid.
          </span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => act("accept")}
            disabled={!agreed || busy !== null}
            className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40"
          >
            {busy === "accept" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <>Accept · {formatPrice(koboToRand(mine.shareKobo))}</>}
          </button>
          <button
            onClick={() => act("decline")}
            disabled={busy !== null}
            className="rounded-full bg-surface px-6 py-3 text-sm font-semibold ring-1 ring-border disabled:opacity-40"
          >
            {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
          </button>
        </div>
      </section>
    );
  }

  // ── Ready: pay my share ──────────────────────────────────────────────────────
  if (split.status === "ready" && mine?.status === "accepted") {
    const amount = koboToRand(mine.shareKobo + mine.feeKobo);
    return (
      <button
        onClick={payShare}
        disabled={busy !== null}
        className="w-full rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
      >
        {busy === "pay"
          ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          : <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4" /> Pay your share · {formatPrice(amount)}</span>}
      </button>
    );
  }

  if (split.status === "ready" && mine?.status === "paid") {
    return (
      <p className="rounded-2xl bg-success/10 p-4 text-center text-xs text-success ring-1 ring-success/30">
        <Check className="mr-1 inline h-3.5 w-3.5" />
        Your share is paid — waiting for the rest of the crew.
      </p>
    );
  }

  // ── Completed: initiator can open the ticket ────────────────────────────────
  if (split.status === "completed" && isInitiator && split.bookingId) {
    return (
      <Link
        to="/booking/$id"
        params={{ id: split.bookingId }}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        <Ticket className="h-4 w-4" /> View your ticket
      </Link>
    );
  }

  // ── Declined: initiator fallback options ────────────────────────────────────
  if (split.status === "declined" && isInitiator) {
    return (
      <div className="space-y-2">
        <button
          onClick={buySolo}
          className="w-full rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Buy all {split.qty} ticket{split.qty > 1 ? "s" : ""} myself · {formatPrice(koboToRand(split.ticketTotalKobo))}
        </button>
        <Link
          to="/spot/$id"
          params={{ id: split.listingId }}
          className="block w-full rounded-full bg-surface py-3.5 text-center text-sm font-semibold ring-1 ring-border"
        >
          Change ticket quantity
        </Link>
      </div>
    );
  }

  // ── Pending + initiator: cancel option ──────────────────────────────────────
  if (split.status === "pending" && isInitiator) {
    return (
      <button
        onClick={() => act("cancel")}
        disabled={busy !== null}
        className="w-full rounded-full bg-surface py-3 text-sm font-semibold text-muted-foreground ring-1 ring-border transition hover:text-destructive disabled:opacity-40"
      >
        {busy === "cancel" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Cancel split request"}
      </button>
    );
  }

  return null;
}
