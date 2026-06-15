import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  Clock,
  MapPin,
  Navigation,
  Users2,
  Send,
  X,
  Check,
} from "lucide-react";
import { DesktopShell } from "./DesktopShell";
import { CapacityBar, CapacityPill } from "@/components/CapacityBar";
import { FriendStack } from "@/components/FriendStack";
import { openDirections } from "@/lib/maps";
import { useAuth } from "@/lib/auth";
import { useSavedIds, useToggleSave } from "@/lib/social";
import { setCheckoutIntent, type SplitParticipant } from "@/lib/store";
import { formatDate, formatPrice, formatTime, hostSlug, type Spot } from "@/lib/spots";
import type { Friend } from "@/lib/spots";

export function SpotDetailDesktop({
  spot,
  friendsGoing,
  onShare,
}: {
  spot: Spot;
  friendsGoing: Friend[];
  onShare: () => void;
}) {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { data: savedIds = [] } = useSavedIds();
  const toggleSave = useToggleSave();
  const saved = savedIds.includes(spot.id);

  const [qty, setQty] = useState(1);
  const [splitOpen, setSplitOpen] = useState(false);
  const [pickedFriends, setPickedFriends] = useState<string[]>([]);

  const total = spot.price * qty;
  const splitCount = pickedFriends.length + 1;
  const perPerson = useMemo(() => Math.ceil(total / splitCount), [total, splitCount]);

  function toggleFriend(fid: string) {
    setPickedFriends((cur) => (cur.includes(fid) ? cur.filter((x) => x !== fid) : [...cur, fid]));
  }

  function book() {
    let split: { participants: SplitParticipant[]; perPerson: number } | undefined;
    if (pickedFriends.length > 0) {
      const participants: SplitParticipant[] = [
        { friendId: "me", name: "You", initial: "Y", hue: 320, paid: true },
        ...friendsGoing
          .filter((f) => pickedFriends.includes(f.id))
          .map((f) => ({ friendId: f.id, name: f.name, initial: f.initial, hue: f.hue, paid: false })),
      ];
      split = { participants, perPerson };
    }
    setCheckoutIntent({ spotId: spot.id, qty, total, split });
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    navigate({ to: "/checkout/$id", params: { id: spot.id } });
  }

  return (
    <DesktopShell>
      <div className="pb-12">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Discover
        </Link>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
          {/* Left column */}
          <div className="min-w-0 space-y-6">
            {/* Hero */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl ring-1 ring-border/50">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute inset-x-5 top-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full glass-strong px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {spot.category}
                  </span>
                  <CapacityPill spot={spot} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onShare}
                    aria-label="Share"
                    className="grid h-10 w-10 place-items-center rounded-full glass-strong transition hover:scale-105"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleSave.mutate(spot.id)}
                    aria-label="Save"
                    className="grid h-10 w-10 place-items-center rounded-full glass-strong transition hover:scale-105"
                  >
                    <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>
              </div>
              <div className="absolute inset-x-6 bottom-5">
                <h1 className="font-display text-4xl leading-tight text-white drop-shadow">{spot.name}</h1>
                <p className="mt-1.5 text-sm font-medium text-white/80">{spot.tagline}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
              <Stat icon={<Star className="h-4 w-4 fill-warning text-warning" />} value={String(spot.rating)} label={`${spot.reviews} reviews`} />
              <Divider />
              <Stat icon={<MapPin className="h-4 w-4 text-primary" />} value={spot.area || spot.city} label={spot.city} />
              <Divider />
              <Stat icon={<Clock className="h-4 w-4 text-accent" />} value={formatTime(spot.date)} label={formatDate(spot.date)} />
            </div>

            {/* Capacity */}
            <div className="rounded-2xl bg-surface p-5 ring-1 ring-border">
              <CapacityBar spot={spot} />
            </div>

            {/* About */}
            <section>
              <h2 className="mb-2 font-display text-xl">About</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{spot.description}</p>
              {spot.vibes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {spot.vibes.map((v) => (
                    <span key={v} className="rounded-full bg-surface-elevated px-2.5 py-1 text-[11px] text-muted-foreground">
                      #{v}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Friends going */}
            {friendsGoing.length > 0 && (
              <section className="rounded-2xl bg-gradient-soft p-5 ring-1 ring-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-primary">Spark</p>
                    <h3 className="mt-0.5 font-display text-lg">Your crew is going</h3>
                  </div>
                  <button
                    onClick={onShare}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-medium"
                  >
                    <Send className="h-3 w-3" /> Invite
                  </button>
                </div>
                <div className="mt-3">
                  <FriendStack friends={friendsGoing} max={6} size={34} />
                </div>
              </section>
            )}

            {/* Location */}
            <section>
              <h2 className="mb-3 font-display text-xl">Where it's at</h2>
              <button
                onClick={() =>
                  openDirections({ lat: spot.lat, lng: spot.lng, label: spot.name, address: spot.address })
                }
                className="group flex w-full items-center gap-4 rounded-2xl bg-surface p-4 text-left ring-1 ring-border transition hover:ring-primary/40"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-soft ring-1 ring-primary/30">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{spot.area || spot.city}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {spot.address || "Tap for directions"}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-[11px] font-bold text-primary-foreground shadow-glow-soft">
                  <Navigation className="h-3.5 w-3.5" /> Directions
                </span>
              </button>
            </section>
          </div>

          {/* Right column — sticky booking card */}
          <div>
            <div className="sticky top-[88px] space-y-4">
              <div className="rounded-3xl bg-surface p-5 ring-1 ring-border">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl text-gradient">{formatPrice(spot.price)}</span>
                  <span className="text-xs text-muted-foreground">per ticket</span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-elevated p-2 ring-1 ring-border">
                  <span className="pl-2 text-sm font-medium text-muted-foreground">Tickets</span>
                  <div className="flex items-center rounded-full bg-surface ring-1 ring-border">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-9 w-9 text-lg">−</button>
                    <span className="w-7 text-center text-sm font-semibold">{qty}</span>
                    <button onClick={() => setQty(Math.min(10, qty + 1))} className="h-9 w-9 text-lg">+</button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {pickedFriends.length > 0 ? "Your share" : "Total"}
                  </span>
                  <span className="font-display text-xl">
                    {formatPrice(pickedFriends.length > 0 ? perPerson : total)}
                  </span>
                </div>

                <button
                  onClick={book}
                  className="mt-4 w-full rounded-full bg-gradient-brand py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition active:scale-[0.98]"
                >
                  Book now
                </button>

                {friendsGoing.length > 0 && (
                  <button
                    onClick={() => setSplitOpen(true)}
                    className="mt-2 w-full rounded-full bg-surface-elevated py-3 text-sm font-semibold ring-1 ring-border"
                  >
                    {pickedFriends.length > 0
                      ? `Splitting with ${pickedFriends.length} · edit`
                      : "Split the bill"}
                  </button>
                )}
              </div>

              {/* Host */}
              <Link
                to="/host/$slug"
                params={{ slug: hostSlug(spot.hostName) }}
                className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border transition hover:ring-primary/40"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-brand font-display text-sm text-primary-foreground">
                  {spot.hostName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground">Hosted by</p>
                  <p className="truncate text-sm font-semibold text-primary">{spot.hostName}</p>
                </div>
              </Link>

              {spot.hours && (
                <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                  <p className="text-[10px] uppercase text-muted-foreground">Hours</p>
                  <p className="mt-1 text-sm">{spot.hours}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Split modal */}
      <AnimatePresence>
        {splitOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm"
            onClick={() => setSplitOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-surface p-6 ring-1 ring-border"
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

              <div className="mt-4 rounded-2xl bg-gradient-soft p-4 text-center ring-1 ring-primary/30">
                <p className="text-[10px] uppercase tracking-wider text-primary">Per person</p>
                <p className="mt-1 font-display text-3xl text-gradient">{formatPrice(perPerson)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatPrice(total)} ÷ {splitCount} {splitCount === 1 ? "person" : "people"}
                </p>
              </div>

              <div className="mt-4 max-h-[40vh] space-y-2 overflow-y-auto">
                {friendsGoing.map((f) => {
                  const picked = pickedFriends.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFriend(f.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 ring-1 transition ${
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
                        className={`grid h-6 w-6 place-items-center rounded-full ${
                          picked ? "bg-gradient-brand" : "bg-background ring-1 ring-border"
                        }`}
                      >
                        {picked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setSplitOpen(false)}
                className="mt-4 w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Confirm split
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DesktopShell>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-3 py-4 text-center">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="truncate font-display text-base">{value}</span>
      </div>
      <span className="truncate text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-3 w-px bg-border/60" />;
}
