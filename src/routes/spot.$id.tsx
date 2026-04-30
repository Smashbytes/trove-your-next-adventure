import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Share2, Star, Clock, MapPin, Send, Users2, X, Check, Navigation } from "lucide-react";
import { CapacityBar, CapacityPill } from "@/components/CapacityBar";
import { FriendStack } from "@/components/FriendStack";
import { SpotMap } from "@/components/SpotMap";
import { formatDate, formatPrice, formatTime, getSpot, hostSlug } from "@/lib/spots";
import { getSaved, setCheckoutIntent, toggleSaved, useStore, type SplitParticipant } from "@/lib/store";
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
  const spot = getSpot(id);
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [splitOpen, setSplitOpen] = useState(false);
  const [pickedFriends, setPickedFriends] = useState<string[]>([]);
  const saved = useStore(() => getSaved()).includes(id);

  const total = spot ? spot.price * qty : 0;
  const splitCount = pickedFriends.length + 1; // include me
  const perPerson = useMemo(() => Math.ceil(total / splitCount), [total, splitCount]);

  if (!spot) return <div className="p-10 text-center">Spot not found.</div>;

  function book() {
    if (!spot) return;
    let split: { participants: SplitParticipant[]; perPerson: number } | undefined;
    if (pickedFriends.length > 0) {
      const participants: SplitParticipant[] = [
        { friendId: "me", name: "You", initial: "Y", hue: 320, paid: true },
        ...spot.friendsGoing
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
    setCheckoutIntent({ spotId: spot.id, qty, total, split });
    navigate({ to: "/checkout/$id", params: { id: spot.id } });
  }

  function toggleFriend(fid: string) {
    setPickedFriends((cur) => (cur.includes(fid) ? cur.filter((x) => x !== fid) : [...cur, fid]));
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-32">
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
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/20" />
        </div>

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full glass-strong">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-full glass-strong">
              <Share2 className="h-4 w-4" />
            </button>
            <button onClick={() => toggleSaved(spot.id)} className="grid h-10 w-10 place-items-center rounded-full glass-strong">
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
          <p className="text-sm text-muted-foreground">{spot.tagline}</p>
        </div>
      </div>

      <main className="px-5 pt-5 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-surface ring-1 ring-border p-3">
            <Star className="mx-auto h-4 w-4 fill-warning text-warning" />
            <div className="mt-1 font-display text-lg">{spot.rating}</div>
            <div className="text-[10px] text-muted-foreground">{spot.reviews} reviews</div>
          </div>
          <div className="rounded-xl bg-surface ring-1 ring-border p-3">
            <MapPin className="mx-auto h-4 w-4 text-primary" />
            <div className="mt-1 font-display text-lg">{spot.distanceKm}km</div>
            <div className="text-[10px] text-muted-foreground">{spot.area}</div>
          </div>
          <div className="rounded-xl bg-surface ring-1 ring-border p-3">
            <Clock className="mx-auto h-4 w-4 text-accent" />
            <div className="mt-1 font-display text-sm">{formatTime(spot.date)}</div>
            <div className="text-[10px] text-muted-foreground">{formatDate(spot.date)}</div>
          </div>
        </div>

        {/* Capacity */}
        <div className="rounded-2xl bg-surface ring-1 ring-border p-4">
          <CapacityBar spot={spot} />
        </div>

        {/* About */}
        <section>
          <h2 className="font-display text-xl mb-2">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{spot.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {spot.vibes.map((v) => (
              <span key={v} className="rounded-full bg-surface-elevated px-2.5 py-1 text-[11px] text-muted-foreground">#{v}</span>
            ))}
          </div>
        </section>

        {/* Spark / friends */}
        {spot.friendsGoing.length > 0 && (
          <section className="rounded-2xl bg-gradient-soft p-4 ring-1 ring-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-primary">Spark</p>
                <h3 className="font-display text-lg mt-0.5">Your crew is going</h3>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-medium">
                <Send className="h-3 w-3" /> Invite
              </button>
            </div>
            <div className="mt-3"><FriendStack friends={spot.friendsGoing} max={5} size={32} /></div>
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

        {/* Map */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-display text-xl inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Where it's at
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{spot.address}</p>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lng}#map=17/${spot.lat}/${spot.lng}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1.5 text-[11px] font-semibold"
            >
              <Navigation className="h-3 w-3" /> Directions
            </a>
          </div>
          <SpotMap
            points={[{ lat: spot.lat, lng: spot.lng, label: spot.name, sublabel: spot.area }]}
            height={220}
            zoom={15}
          />
        </section>

        {/* Split bill toggle */}
        {spot.friendsGoing.length > 0 && (
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
                      : "Share the cost with your crew"}
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

              {/* Friend picker */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {spot.friendsGoing.map((f) => {
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
                })}
              </div>

              <button
                onClick={() => setSplitOpen(false)}
                className="w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Confirm split
              </button>
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
                {pickedFriends.length > 0 ? `Your share` : "Total"}
              </div>
              <div className="font-display text-lg text-gradient">
                {formatPrice(pickedFriends.length > 0 ? perPerson : total)}
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
  );
}
