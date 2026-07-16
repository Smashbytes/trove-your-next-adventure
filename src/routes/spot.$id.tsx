import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Share2, Star, Clock, MapPin, Send, Users2, X, Check, Navigation } from "lucide-react";
import { toast } from "sonner";
import { CapacityBar, CapacityPill } from "@/components/CapacityBar";
import { FriendStack } from "@/components/FriendStack";
import { SpotDetailDesktop } from "@/components/desktop/SpotDetailDesktop";
import { openDirections } from "@/lib/maps";
import { formatDate, formatPrice, formatTime, getSpot, hostSlug } from "@/lib/spots";
import { useIsDemo, useListing } from "@/lib/listings-api";
import { useAuth } from "@/lib/auth";
import { useFriends, useFriendsGoing } from "@/lib/friends-api";
import { useCreateSplit, useGroupMembers, useMyGroups } from "@/lib/spark-api";
import { useSavedIds, useToggleSave } from "@/lib/social";
import { setCheckoutIntent, type SplitParticipant } from "@/lib/store";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/spot/$id")({
  head: ({ params }) => {
    const s = getSpot(params.id);
    return { meta: [{ title: s ? `${s.name} — TROVE` : "Spot — TROVE" }, { name: "description", content: s?.tagline ?? "" }] };
  },
  component: SpotPage,
  notFoundComponent: () => <div className="p-10 text-center">Spot not found.</div>,
});

function SpotPage() {
  const { id } = useParams({ from: "/spot/$id" });
  const { data: spot, isLoading } = useListing(id);
  const { data: friendsGoing = [] } = useFriendsGoing(id);
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [splitOpen, setSplitOpen] = useState(false);
  const [pickedFriends, setPickedFriends] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const { data: savedIds = [] } = useSavedIds();
  const toggleSave = useToggleSave();
  const saved = savedIds.includes(id);
  const { isAuthenticated, openAuthModal } = useAuth();
  const demo = useIsDemo();

  // Live split flow — real linked friends, filterable by friend group.
  const { data: friendRows = [] } = useFriends();
  const linkedFriends = useMemo(
    () => friendRows.filter((f) => f.status === "accepted"),
    [friendRows],
  );
  const { data: myGroups = [] } = useMyGroups();
  const memberGroups = myGroups.filter((g) => g.myStatus === "member");
  const { data: groupMembers = [] } = useGroupMembers(groupFilter ?? undefined);
  const groupMemberIds = useMemo(
    () => new Set(groupMembers.map((m) => m.userId)),
    [groupMembers],
  );
  const pickableFriends = groupFilter
    ? linkedFriends.filter((f) => groupMemberIds.has(f.friendId))
    : linkedFriends;
  const createSplit = useCreateSplit();
  const [sendingSplit, setSendingSplit] = useState(false);

  const total = spot ? spot.price * qty : 0;
  const splitCount = pickedFriends.length + 1; // include me
  const perPerson = useMemo(() => Math.ceil(total / splitCount), [total, splitCount]);

  // Demo keeps the mock split-at-checkout; live users send a real split request.
  const canSplit = demo
    ? friendsGoing.length > 0
    : isAuthenticated && (spot?.price ?? 0) > 0 && linkedFriends.length > 0;

  async function sendSplitRequest() {
    if (!spot || pickedFriends.length === 0) return;
    setSendingSplit(true);
    try {
      const { split_id } = await createSplit.mutateAsync({
        listingId: spot.id,
        qty,
        friendIds: pickedFriends,
      });
      setSplitOpen(false);
      setPickedFriends([]);
      toast.success("Split request sent — we'll ping you when everyone responds.");
      navigate({ to: "/split/$id", params: { id: split_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the split request.");
    } finally {
      setSendingSplit(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto min-h-dvh max-w-md">
        <div className="h-[60vh] w-full animate-pulse bg-surface" />
        <div className="px-5 pt-5 space-y-5">
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 h-20 rounded-2xl animate-pulse bg-surface" />
            ))}
          </div>
          <div className="h-16 rounded-2xl animate-pulse bg-surface" />
          <div className="space-y-2.5">
            <div className="h-7 w-32 rounded-full animate-pulse bg-surface" />
            <div className="h-4 w-full rounded-full animate-pulse bg-surface" />
            <div className="h-4 w-4/5 rounded-full animate-pulse bg-surface" />
            <div className="h-4 w-3/5 rounded-full animate-pulse bg-surface" />
          </div>
        </div>
      </div>
    );
  }
  if (!spot) return <div className="p-10 text-center">Spot not found.</div>;

  function book() {
    if (!spot) return;
    let split: { participants: SplitParticipant[]; perPerson: number } | undefined;
    if (demo && pickedFriends.length > 0) {
      const participants: SplitParticipant[] = [
        { friendId: "me", name: "You", initial: "Y", hue: 320, paid: true },
        ...friendsGoing
          .filter((f) => pickedFriends.includes(f.id))
          .map((f) => ({
            friendId: f.id,
            name: f.name,
            initial: f.initial,
            hue: f.hue,
            paid: false,
          })),
      ];
      split = { participants, perPerson };
    }
    // Persist the intent first so it survives the auth detour, then require an
    // account before checkout.
    setCheckoutIntent({ spotId: spot.id, qty, total, split });
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    navigate({ to: "/checkout/$id", params: { id: spot.id } });
  }

  function toggleFriend(fid: string) {
    setPickedFriends((cur) => (cur.includes(fid) ? cur.filter((x) => x !== fid) : [...cur, fid]));
  }

  async function share() {
    if (!spot) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = {
      title: spot.name,
      text: `${spot.name} on TROVE — ${spot.tagline || "let's go"}`,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user dismissed the share sheet — no-op */
    }
  }

  return (
    <>
      <div className="hidden lg:block">
        <SpotDetailDesktop spot={spot} friendsGoing={friendsGoing} onShare={share} />
      </div>
      <div className="mx-auto min-h-dvh max-w-md pb-32 lg:hidden">
      {/* Hero image */}
      <div className="relative">
        <div className="relative h-[60vh] overflow-hidden">
          <img
            src={spot.image}
            alt={spot.name}
            data-fallback={spot.imageFallback}
            onError={(e) => {
              const t = e.currentTarget;
              const fb = t.dataset.fallback;
              if (fb && t.src !== fb) t.src = fb;
            }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-[#0a0a0a]/10" />
        </div>

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full glass-strong">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex gap-2">
            <button onClick={share} aria-label="Share" className="grid h-10 w-10 place-items-center rounded-full glass-strong">
              <Share2 className="h-4 w-4" />
            </button>
            <button onClick={() => toggleSave.mutate(spot.id)} className="grid h-10 w-10 place-items-center rounded-full glass-strong">
              <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
            </button>
          </div>
        </div>

        {/* Header info overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[11px] uppercase tracking-wider text-primary">{spot.category}</span>
            <CapacityPill spot={spot} />
          </div>
          <h1 className="font-display text-3xl leading-tight">{spot.name}</h1>
          <p className="text-sm font-medium text-muted-foreground">{spot.tagline}</p>
        </div>
      </div>

      <main className="px-5 pt-5 space-y-6">
        {/* Stats */}
        <div className="flex rounded-2xl bg-surface ring-1 ring-border overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-4 px-3">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="font-display text-lg">{spot.rating}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{spot.reviews} reviews</span>
          </div>
          <div className="w-px bg-border/60 my-3" />
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-4 px-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="font-display text-lg">{spot.distanceKm}km</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{spot.area}</span>
          </div>
          <div className="w-px bg-border/60 my-3" />
          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-4 px-3">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent" />
              <span className="font-display text-base">{formatTime(spot.date)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{formatDate(spot.date)}</span>
          </div>
        </div>

        {/* Capacity */}
        <div className="rounded-2xl bg-surface ring-1 ring-border p-4">
          <CapacityBar spot={spot} />
        </div>

        {/* About */}
        <section>
          <h2 className="font-display text-xl mb-2">About</h2>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">{spot.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {spot.vibes.map((v) => (
              <span key={v} className="rounded-full bg-surface-elevated px-2.5 py-1 text-[11px] text-muted-foreground">#{v}</span>
            ))}
          </div>
        </section>

        {/* Spark / friends */}
        {friendsGoing.length > 0 && (
          <section className="rounded-2xl bg-gradient-soft p-4 ring-1 ring-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-primary">Spark</p>
                <h3 className="font-display text-lg mt-0.5">Your crew is going</h3>
              </div>
              <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-medium">
                <Send className="h-3 w-3" /> Invite
              </button>
            </div>
            <div className="mt-3"><FriendStack friends={friendsGoing} max={5} size={32} /></div>
          </section>
        )}

        {/* Hours / Host */}
        <section className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface ring-1 ring-border p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Hours</p>
            <p className="mt-1">{spot.hours}</p>
          </div>
          <Link
            to="/host/$slug"
            params={{ slug: hostSlug(spot.hostName) }}
            className="rounded-xl bg-surface ring-1 ring-border p-3 transition active:scale-[0.98] hover:ring-primary/40"
          >
            <p className="text-[10px] uppercase text-muted-foreground">Hosted by</p>
            <p className="mt-1 inline-flex items-center gap-1 text-primary">
              {spot.hostName} <span className="text-xs">›</span>
            </p>
          </Link>
        </section>

        {/* Location — opens the device's native map app for directions */}
        <section>
          <h2 className="font-display text-xl mb-3">Where it's at</h2>
          <button
            onClick={() =>
              openDirections({ lat: spot.lat, lng: spot.lng, label: spot.name, address: spot.address })
            }
            className="group flex w-full items-center gap-4 rounded-2xl bg-surface ring-1 ring-border p-4 text-left transition active:scale-[0.99] hover:ring-primary/40"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-soft ring-1 ring-primary/30">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{spot.area || spot.city}</p>
              <p className="truncate text-xs text-muted-foreground">{spot.address || "Tap for directions"}</p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 py-2 text-[11px] font-bold text-primary-foreground shadow-glow-soft">
              <Navigation className="h-3.5 w-3.5" /> Directions
            </span>
          </button>
        </section>

        {/* Split bill toggle */}
        {canSplit && (
          <section className="rounded-2xl bg-surface ring-1 ring-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand shadow-glow-soft">
                  <Users2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">Split the bill</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {pickedFriends.length > 0
                      ? `Splitting with ${pickedFriends.length} · ${formatPrice(perPerson)} each`
                      : demo
                        ? "Share the cost with your crew"
                        : "Send your TROVE friends a split payment request"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSplitOpen(true)}
                className="shrink-0 rounded-full bg-foreground/10 px-3.5 py-2 text-xs font-semibold"
              >
                {pickedFriends.length > 0 ? "Edit" : "Split"}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Split bill modal */}
      <AnimatePresence>
        {splitOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setSplitOpen(false)}
          >
            <motion.div
              initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-surface ring-1 ring-border p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl">Split the bill</h3>
                  <p className="text-xs text-muted-foreground">Pick who's chipping in</p>
                </div>
                <button onClick={() => setSplitOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-elevated">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Per-person preview */}
              <div className="rounded-2xl bg-gradient-soft p-4 ring-1 ring-primary/30 text-center">
                <p className="text-[10px] uppercase tracking-wider text-primary">Per person</p>
                <p className="mt-1 font-display text-3xl text-gradient">{formatPrice(perPerson)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatPrice(total)} ÷ {splitCount} {splitCount === 1 ? "person" : "people"}
                </p>
              </div>

              {/* Group filter (live only) */}
              {!demo && memberGroups.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setGroupFilter(null)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      groupFilter === null
                        ? "bg-gradient-brand text-primary-foreground"
                        : "bg-surface-elevated text-muted-foreground ring-1 ring-border"
                    }`}
                  >
                    All friends
                  </button>
                  {memberGroups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        groupFilter === g.id
                          ? "bg-gradient-brand text-primary-foreground"
                          : "bg-surface-elevated text-muted-foreground ring-1 ring-border"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Friend picker */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {demo
                  ? friendsGoing.map((f) => {
                      const picked = pickedFriends.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleFriend(f.id)}
                          className={`w-full flex items-center gap-3 rounded-2xl p-3 ring-1 transition ${
                            picked ? "bg-primary/10 ring-primary/40" : "bg-surface-elevated ring-border"
                          }`}
                        >
                          <div
                            className="grid h-10 w-10 place-items-center rounded-full font-display text-sm text-white"
                            style={{ background: `oklch(0.65 0.22 ${f.hue})` }}
                          >
                            {f.initial}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">Friend</p>
                          </div>
                          <div
                            className={`grid h-6 w-6 place-items-center rounded-full transition ${
                              picked ? "bg-gradient-brand" : "bg-background ring-1 ring-border"
                            }`}
                          >
                            {picked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })
                  : pickableFriends.map((f) => {
                      const picked = pickedFriends.includes(f.friendId);
                      return (
                        <button
                          key={f.friendId}
                          onClick={() => toggleFriend(f.friendId)}
                          className={`w-full flex items-center gap-3 rounded-2xl p-3 ring-1 transition ${
                            picked ? "bg-primary/10 ring-primary/40" : "bg-surface-elevated ring-border"
                          }`}
                        >
                          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-brand font-display text-sm text-primary-foreground">
                            {f.avatarUrl
                              ? <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                              : f.name.replace(/^@/, "").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {f.username ? `@${f.username}` : "Linked friend"}
                            </p>
                          </div>
                          <div
                            className={`grid h-6 w-6 place-items-center rounded-full transition ${
                              picked ? "bg-gradient-brand" : "bg-background ring-1 ring-border"
                            }`}
                          >
                            {picked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })}
                {!demo && pickableFriends.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {groupFilter
                      ? "None of this group's members are your linked friends yet."
                      : "Link up with friends on the Spark page to split payments."}
                  </p>
                )}
              </div>

              {demo ? (
                <button
                  onClick={() => setSplitOpen(false)}
                  className="w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Confirm split
                </button>
              ) : (
                <>
                  <button
                    onClick={sendSplitRequest}
                    disabled={pickedFriends.length === 0 || sendingSplit}
                    className="w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40"
                  >
                    {sendingSplit ? "Sending…" : `Send split request${pickedFriends.length > 0 ? ` · ${formatPrice(perPerson)} each` : ""}`}
                  </button>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Friends accept in-app, then everyone pays their share (+R5 split fee). Tickets are issued once all shares are paid.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky book bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <motion.div
          initial={{ y: 80 }} animate={{ y: 0 }}
          className="mx-auto max-w-md px-3"
        >
          <div className="glass-strong rounded-2xl p-3 shadow-glow flex items-center gap-3">
            <div className="flex items-center rounded-full bg-surface ring-1 ring-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-9 w-9 text-lg">−</button>
              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(Math.min(10, qty + 1))} className="h-9 w-9 text-lg">+</button>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground">
                {demo && pickedFriends.length > 0 ? `Your share` : "Total"}
              </div>
              <div className="font-display text-lg text-gradient">
                {formatPrice(demo && pickedFriends.length > 0 ? perPerson : total)}
              </div>
            </div>
            <button
              onClick={book}
              className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] transition"
            >
              Book now
            </button>
          </div>
        </motion.div>
      </div>
      </div>
    </>
  );
}
