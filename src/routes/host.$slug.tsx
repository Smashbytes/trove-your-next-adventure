import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, MapPin, Share2, Users, Calendar, Clock, Phone, Mail, Instagram, Sparkles, Award, CheckCircle2, Navigation } from "lucide-react";
import { getHost, formatDate, formatTime, formatPrice } from "@/lib/spots";
import { toggleFollow, useStore, getFollows } from "@/lib/store";
import { SpotMap } from "@/components/SpotMap";

export const Route = createFileRoute("/host/$slug")({
  head: ({ params }) => {
    const h = getHost(params.slug);
    return {
      meta: [
        { title: h ? `${h.name} — TROVE` : "Spot — TROVE" },
        { name: "description", content: h?.bio ?? "" },
      ],
    };
  },
  component: HostPage,
  notFoundComponent: () => <div className="p-10 text-center">Spot not found.</div>,
});

function HostPage() {
  const { slug } = useParams({ from: "/host/$slug" });
  const host = getHost(slug);
  const following = useStore(() => getFollows()).includes(slug);

  if (!host) {
    return (
      <div className="p-10 text-center">
        Spot not found. <Link to="/" className="text-primary">Go home</Link>
      </div>
    );
  }

  const cover = host.events[0]?.image;
  const followerCount = host.followers + (following ? 1 : 0);

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
              <BadgeCheck className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {host.area} · {host.city}
            </p>
          </div>
        </section>

        {/* Bio */}
        <p className="text-sm text-muted-foreground leading-relaxed">{host.bio}</p>

        {/* Specialties chips */}
        {host.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {host.specialties.map((s) => (
              <span key={s} className="rounded-full bg-primary/10 ring-1 ring-primary/30 px-2.5 py-1 text-[11px] text-primary">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Events" value={host.events.length} />
          <Stat label="Followers" value={followerCount.toLocaleString("en-ZA")} />
          <Stat label="Since" value={host.founded} />
          <Stat label="Price" value={host.priceRange.split(" ")[0]} />
        </section>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleFollow(slug)}
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

        {/* Highlights */}
        {host.highlights.length > 0 && (
          <section className="rounded-2xl bg-gradient-soft ring-1 ring-primary/30 p-4">
            <h3 className="font-display text-sm inline-flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" /> Good to know
            </h3>
            <ul className="mt-2 space-y-1.5">
              {host.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Opening hours + Amenities */}
        <section className="grid grid-cols-2 gap-3">
          {host.openingHours.length > 0 && (
            <div className="rounded-2xl bg-surface ring-1 ring-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Hours
              </p>
              <ul className="mt-2 space-y-1">
                {host.openingHours.map((h) => (
                  <li key={h.day} className="text-[11px] flex justify-between gap-2">
                    <span className="text-muted-foreground">{h.day}</span>
                    <span className="font-medium text-foreground/90 text-right">{h.hours}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {host.amenities.length > 0 && (
            <div className="rounded-2xl bg-surface ring-1 ring-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Award className="h-3 w-3" /> Amenities
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {host.amenities.map((a) => (
                  <span key={a} className="rounded-md bg-surface-elevated px-1.5 py-0.5 text-[10px] text-foreground/80">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Posts / Events */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Upcoming events
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {host.events.length} posts
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {host.events.map((e, i) => (
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
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-accent">
                      {formatDate(e.date)} · {formatTime(e.date)}
                    </p>
                    <p className="font-display text-sm leading-tight line-clamp-2">{e.name}</p>
                    <p className="mt-0.5 text-[10px] text-white/70">{formatPrice(e.price)}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Map of host's events */}
        <section>
          <h2 className="font-display text-xl mb-3 inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> On the map
          </h2>
          <SpotMap
            points={host.events.map((e) => ({
              lat: e.lat,
              lng: e.lng,
              label: e.name,
              sublabel: `${e.area} · ${formatDate(e.date)}`,
            }))}
            height={240}
            zoom={13}
          />
        </section>
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
