import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  MapPin,
  Star,
  Heart,
  Wine,
  UtensilsCrossed,
  Music,
  Mountain,
  Sparkles,
  Palette,
  Users,
  HandHeart,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DesktopShell } from "./DesktopShell";
import { RightRail } from "./RightRail";
import { useEditorsPicks, useListings } from "@/lib/listings-api";
import { useFriends } from "@/lib/friends-api";
import { useAuth } from "@/lib/auth";
import { getGuestPrefs } from "@/lib/guest-prefs";
import { CITIES, formatDate, formatTime, formatPrice, type Spot } from "@/lib/spots";

const CITY_TABS = CITIES.slice(0, 4); // Joburg, Pretoria, Cape Town, Durban

/** Map real SA top-level categories → icons; falls back to a tag glyph. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Nightlife: Wine,
  "Food & Drink": UtensilsCrossed,
  Music: Music,
  Adventure: Mountain,
  Wellness: Sparkles,
  "Arts & Culture": Palette,
  "Family & Social": Users,
  Community: HandHeart,
};

function trendingScore(s: Spot) {
  return s.capacityMax ? s.capacityBooked / s.capacityMax : 0;
}

export function DiscoverDesktop() {
  const { isAuthenticated } = useAuth();

  const [activeCity, setActiveCity] = useState<string>(CITY_TABS[0]);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    const c = getGuestPrefs().city;
    if (c && CITY_TABS.includes(c)) setActiveCity(c);
  }, []);

  const { data: allListings = [] } = useListings({});
  const { data: picks = [] } = useEditorsPicks();
  const { data: cityListings = [], isLoading: cityLoading } = useListings({
    city: activeCity,
    category: activeCat ?? undefined,
  });
  const { data: friends = [] } = useFriends();
  const crew = friends.filter((f) => f.status === "accepted");

  const categories = useMemo(
    () => Object.keys(CATEGORY_ICONS).filter((c) => allListings.some((s) => s.category === c)),
    [allListings],
  );
  // Fall back to the full set before listings load so the chip row is never empty.
  const chipCats = categories.length ? categories : Object.keys(CATEGORY_ICONS);

  const trending = useMemo(
    () => [...allListings].sort((a, b) => trendingScore(b) - trendingScore(a)),
    [allListings],
  );
  const heroItems = picks.length ? picks : allListings.slice(0, 5);

  return (
    <DesktopShell
      activeCity={activeCity}
      onSelectCity={setActiveCity}
      rightRail={<RightRail trending={trending} />}
    >
      <div className="space-y-10 pb-16">
        <Hero items={heroItems} city={activeCity} total={allListings.length} />

        {/* Category chips */}
        <section className="-mt-2">
          <div className="flex flex-wrap gap-2.5">
            {chipCats.map((c) => {
              const Icon = CATEGORY_ICONS[c] ?? Tag;
              const active = activeCat === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(active ? null : c)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-gradient-soft text-foreground ring-1 ring-primary/40"
                      : "bg-surface/50 text-muted-foreground ring-1 ring-border/50 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} strokeWidth={1.8} />
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* Your Crew activity — real friends only */}
        {isAuthenticated && crew.length > 0 && (
          <Section title="Your Crew" href="/profile" linkLabel="See all">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {crew.slice(0, 4).map((f) => (
                <div
                  key={f.friendId}
                  className="flex items-center gap-3 rounded-2xl bg-surface/50 p-3.5 ring-1 ring-border/50"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
                    {f.avatarUrl ? (
                      <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      f.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">On TROVE</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Editor's Picks */}
        {picks.length > 0 && (
          <Section title="Editor's Picks" href="/search" linkLabel="See all">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {picks.slice(0, 4).map((s) => (
                <PickCard key={s.id} spot={s} />
              ))}
            </div>
          </Section>
        )}

        {/* Trending Near You — city tabs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Trending Near You</h2>
            <Link
              to="/search"
              className="inline-flex items-center text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {CITY_TABS.map((c) => {
              const active = activeCity === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCity(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-gradient-brand text-primary-foreground shadow-glow-soft"
                      : "bg-surface/50 text-muted-foreground ring-1 ring-border/50 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {cityLoading &&
              [0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface/60" />
              ))}
            {!cityLoading &&
              cityListings.slice(0, 5).map((s) => <TrendingCard key={s.id} spot={s} />)}
            {!cityLoading && cityListings.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-foreground/80">
                  Nothing live in {activeCity} yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try another city{activeCat ? " or category" : ""}.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </DesktopShell>
  );
}

// ---------------------------------------------------------------------------
// Hero — auto-rotating "THIS WEEKEND" banner
// ---------------------------------------------------------------------------

function Hero({ items, city, total }: { items: Spot[]; city: string; total: number }) {
  const [i, setI] = useState(0);
  const safe = items.length ? items : [];

  useEffect(() => {
    if (safe.length <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % safe.length), 6000);
    return () => clearInterval(id);
  }, [safe.length]);

  const active = safe[i];

  return (
    <section className="relative h-[300px] overflow-hidden rounded-[28px] ring-1 ring-border/50">
      <AnimatePresence mode="sync">
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={active.image}
              alt=""
              data-fallback={active.imageFallback}
              onError={(e) => {
                const t = e.currentTarget;
                const fb = t.dataset.fallback;
                if (fb && t.src !== fb) t.src = fb;
              }}
              className="h-full w-full object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />

      <div className="relative flex h-full flex-col justify-center px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
          {city}
        </p>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] text-white">
          THIS
          <br />
          <span className="text-gradient">WEEKEND</span>
        </h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-white/80">
          {total > 0 ? `${total}+ events near you` : "Discover what's on"}
        </p>
        <Link
          to="/search"
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition active:scale-[0.98]"
        >
          Explore Events
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {safe.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {safe.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">{title}</h2>
        <Link
          to={href}
          className="inline-flex items-center text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function PickCard({ spot }: { spot: Spot }) {
  return (
    <Link
      to="/spot/$id"
      params={{ id: spot.id }}
      className="group relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-border/50"
    >
      <img
        src={spot.image}
        alt={spot.name}
        loading="lazy"
        data-fallback={spot.imageFallback}
        onError={(e) => {
          const t = e.currentTarget;
          const fb = t.dataset.fallback;
          if (fb && t.src !== fb) t.src = fb;
        }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-x-3 top-3">
        <span className="rounded-full glass-strong px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/90">
          {spot.subcategory || spot.category}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-display text-lg leading-tight text-white">{spot.name}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/80">
          <MapPin className="h-3 w-3" />
          {spot.area || spot.city}
        </p>
      </div>
    </Link>
  );
}

function TrendingCard({ spot }: { spot: Spot }) {
  return (
    <Link
      to="/spot/$id"
      params={{ id: spot.id }}
      className="group overflow-hidden rounded-2xl bg-surface/50 ring-1 ring-border/50 transition hover:ring-primary/30"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={spot.image}
          alt={spot.name}
          loading="lazy"
          data-fallback={spot.imageFallback}
          onError={(e) => {
            const t = e.currentTarget;
            const fb = t.dataset.fallback;
            if (fb && t.src !== fb) t.src = fb;
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          aria-label="Save"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="truncate text-sm font-semibold">{spot.name}</h3>
        <p className="text-[11px] text-muted-foreground">
          {formatDate(spot.date)} · {formatTime(spot.date)}
        </p>
        <div className="flex items-center justify-between pt-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            {spot.subcategory || spot.category}
          </span>
          {spot.rating > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {spot.rating}
            </span>
          )}
        </div>
        <p className="pt-0.5 text-xs font-bold">{formatPrice(spot.price)}</p>
      </div>
    </Link>
  );
}
