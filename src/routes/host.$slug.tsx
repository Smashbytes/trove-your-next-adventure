import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, MapPin, Share2, Users, Calendar, Sparkles } from "lucide-react";
import { formatDate, formatTime, formatPrice } from "@/lib/spots";
import { useHostBySlug } from "@/lib/listings-api";
import { useFollowedIds, useToggleFollow } from "@/lib/social";
import { SpotMap } from "@/components/SpotMap";

export const Route = createFileRoute("/host/$slug")({
  head: () => ({ meta: [{ title: "Spot — TROVE" }] }),
  component: HostPage,
  notFoundComponent: () => <div className="p-10 text-center">Spot not found.</div>,
});

function HostPage() {
  const { slug } = useParams({ from: "/host/$slug" });
  const { data: host, isLoading } = useHostBySlug(slug);
  const { data: followedIds = [] } = useFollowedIds();
  const toggleFollow = useToggleFollow();
  const following = !!host && followedIds.includes(host.userId);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!host) {
    return (
      <div className="p-10 text-center">
        Spot not found. <Link to="/" className="text-primary">Go home</Link>
      </div>
    );
  }

  const cover = host.heroUrl ?? host.spots[0]?.image;
  const mapPoints = host.spots
    .filter((e) => e.lat && e.lng)
    .map((e) => ({ lat: e.lat, lng: e.lng, label: e.name, sublabel: e.area || e.city }));

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20">
      {/* Cover */}
      <div className="relative h-48 overflow-hidden">
        {cover && <img src={cover} alt="" className="h-full w-full object-cover opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full glass-strong">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button className="grid h-10 w-10 place-items-center rounded-full glass-strong">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="-mt-14 px-5 space-y-6 relative">
        {/* Identity */}
        <section className="flex items-start gap-4">
          <div className="rounded-2xl p-[2px] bg-gradient-brand shadow-glow">
            <div className="grid h-20 w-20 place-items-center rounded-[14px] bg-background font-display text-2xl text-gradient">
              {host.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
          </div>
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-2xl leading-tight">{host.name}</h1>
              {host.verified && <BadgeCheck className="h-4 w-4 text-accent" />}
            </div>
            {host.city && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {host.city}
              </p>
            )}
          </div>
        </section>

        {/* Bio */}
        {host.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{host.bio}</p>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 gap-2 text-center">
          <Stat label="Events" value={host.spots.length} />
          <Stat label="City" value={host.city ?? "—"} />
        </section>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleFollow.mutate(host.userId)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
              following
                ? "bg-surface ring-1 ring-border text-foreground"
                : "bg-gradient-brand text-primary-foreground shadow-glow"
            }`}
          >
            {following ? "Following ✓" : "Join community"}
          </button>
          <button className="rounded-full bg-surface ring-1 ring-border px-4 text-sm font-semibold inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Invite
          </button>
        </div>

        {/* Events */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Upcoming events
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {host.spots.length} posts
            </span>
          </div>

          {host.spots.length === 0 ? (
            <div className="rounded-2xl bg-surface ring-1 ring-border p-8 text-center text-sm text-muted-foreground inline-flex flex-col items-center gap-2 w-full">
              <Sparkles className="h-5 w-5 text-primary" />
              No live events right now. Follow to get notified.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {host.spots.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to="/spot/$id"
                    params={{ id: e.id }}
                    className="group block relative aspect-square overflow-hidden rounded-2xl ring-1 ring-border"
                  >
                    <img
                      src={e.image}
                      alt={e.name}
                      loading="lazy"
                      data-fallback={e.imageFallback}
                      onError={(ev) => {
                        const t = ev.currentTarget;
                        const fb = t.dataset.fallback;
                        if (fb && t.src !== fb) t.src = fb;
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                      {e.date && (
                        <p className="text-[10px] font-mono uppercase tracking-wider text-accent">
                          {formatDate(e.date)} · {formatTime(e.date)}
                        </p>
                      )}
                      <p className="font-display text-sm leading-tight line-clamp-2">{e.name}</p>
                      <p className="mt-0.5 text-[10px] text-white/70">{formatPrice(e.price)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Map */}
        {mapPoints.length > 0 && (
          <section>
            <h2 className="font-display text-xl mb-3 inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> On the map
            </h2>
            <SpotMap points={mapPoints} height={240} zoom={13} />
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-surface ring-1 ring-border py-3">
      <div className="font-display text-lg text-gradient">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
