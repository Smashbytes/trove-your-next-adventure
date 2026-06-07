import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Bell, Plus, Search, ChevronRight, Users2, MapPin, Navigation } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { SpotCard } from "@/components/SpotCard";
import { FeaturedRotator } from "@/components/FeaturedRotator";
import { CITIES } from "@/lib/spots";
import { useEditorsPicks, useListings, useTopLevelCategories } from "@/lib/listings-api";
import { getGuestPrefs } from "@/lib/guest-prefs";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover Tonight — TROVE" },
      { name: "description", content: "Discover and book South Africa's best nightlife, food, music, adventures and more — in seconds." },
    ],
  }),
  component: Discover,
});

const tabs = ["For You", "With Friends", "Trending"] as const;
const cityFilters: string[] = ["All", ...CITIES];

function Discover() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("For You");
  const [activeCat, setActiveCat] = useState<string>("All");
  // Default to the city chosen during onboarding, when it's one we filter on.
  const [activeCity, setActiveCity] = useState<string>(() => {
    const c = getGuestPrefs().city;
    return c && (CITIES as string[]).includes(c) ? c : "All";
  });

  const { names: catNames } = useTopLevelCategories();
  const categories = useMemo<string[]>(() => ["All", ...catNames], [catNames]);

  const { data: listings = [], isLoading } = useListings({
    category: activeCat,
    city: activeCity,
  });

  const stories = useMemo(() => listings.slice(0, 8), [listings]);
  const { data: picks = [] } = useEditorsPicks();
  // Hero rotation: the TROVE team's curated "Featured" set when it exists, else
  // fall back to the freshest live listing so the hero is never an empty box.
  const rotation = useMemo(
    () => (picks.length ? picks : listings.slice(0, 1)),
    [picks, listings],
  );

  const feed = useMemo(() => {
    if (tab === "Trending")
      return [...listings].sort(
        (a, b) =>
          (b.capacityMax ? b.capacityBooked / b.capacityMax : 0) -
          (a.capacityMax ? a.capacityBooked / a.capacityMax : 0),
      );
    if (tab === "With Friends") return listings.filter((s) => s.friendsGoing.length > 0);
    return listings;
  }, [tab, listings]);

  const { isAuthenticated, profile } = useAuth();

  const timeGreeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] ?? "you";

  const displayCity = useMemo(() => {
    if (activeCity !== "All") return activeCity;
    return getGuestPrefs().city ?? "South Africa";
  }, [activeCity]);

  return (
    <AppShell>
      {/* Top bar */}
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/search" className="grid h-9 w-9 place-items-center rounded-full bg-surface ring-1 ring-border">
              <Search className="h-4 w-4" />
            </Link>
            <button className="relative grid h-9 w-9 place-items-center rounded-full bg-surface ring-1 ring-border">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            </button>
          </div>
        </div>

        {/* Feed tabs */}
        <div className="mt-3 flex items-center justify-center gap-6">
          {tabs.map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative pb-1.5 text-sm font-semibold"
              >
                <span className={isActive ? "text-foreground font-semibold" : "text-muted-foreground font-medium"}>{t}</span>
                {isActive && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute -bottom-0.5 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-gradient-brand shadow-glow"
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-5 pt-4 space-y-5">
        {/* Stories rail with Add */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5">
            <button className="snap-start shrink-0 flex flex-col items-center gap-1.5">
              <div className="grid h-[68px] w-[68px] place-items-center rounded-2xl bg-surface ring-1 ring-dashed ring-primary/40">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground">Host</p>
            </button>
            {stories.map((s) => (
              <Link key={s.id} to="/spot/$id" params={{ id: s.id }} className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="relative h-[68px] w-[68px] rounded-2xl overflow-hidden p-[2px] bg-gradient-brand">
                  <div className="h-full w-full overflow-hidden rounded-[14px]">
                    <img
                      src={s.image}
                      alt={s.name}
                      loading="lazy"
                      data-fallback={s.imageFallback}
                      onError={(e) => {
                        const t = e.currentTarget;
                        const fb = t.dataset.fallback;
                        if (fb && t.src !== fb) t.src = fb;
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-background px-1.5 py-0.5 text-[9px] font-bold text-primary ring-1 ring-primary/40">
                    LIVE
                  </span>
                </div>
                <p className="max-w-[68px] truncate text-[10px] text-center">{s.name.split(" ")[0]}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Personalized greeting (logged in) */}
        {isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">{timeGreeting}</p>
              <h1 className="font-display text-[2rem] leading-tight truncate">Hi, {firstName}!</h1>
            </div>
            <button
              onClick={() => {
                document.getElementById("city-filter")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className="shrink-0 flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 ring-1 ring-border text-xs font-medium transition active:scale-[0.97]"
            >
              <MapPin className="h-3 w-3 text-primary" />
              {displayCity}
            </button>
          </motion.section>
        )}

        {/* Find nearby events (logged in) */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Link
              to="/search"
              className="group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-soft p-4 ring-1 ring-border/60 transition active:scale-[0.99]"
            >
              {/* faint dotted texture, brand graphic element */}
              <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-brand shadow-glow-soft">
                <Navigation className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base leading-tight">Find Nearby Events</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  What's on near you in {displayCity}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-active:translate-x-0.5" />
            </Link>
          </motion.div>
        )}

        {/* Featured rotator (logged out) — TROVE team's curated Top 5 */}
        {!isAuthenticated && (
          <section>
            <FeaturedRotator items={rotation} />
          </section>
        )}

        {/* Category pills */}
        <section>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {categories.map((c) => {
              const isActive = activeCat === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-gradient-brand text-primary-foreground shadow-glow-soft"
                      : "bg-surface ring-1 ring-border text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* City chips */}
        <section id="city-filter">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {cityFilters.map((c) => {
              const isActive = activeCity === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCity(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-surface/60 ring-1 ring-border/60 text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* Editor's Picks rail */}
        {picks.length > 0 && activeCat === "All" && activeCity === "All" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Editor's Picks</h2>
              <Link to="/search" className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground">
                See all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5 snap-x snap-mandatory">
              {picks.map((s) => (
                <Link
                  key={s.id}
                  to="/spot/$id"
                  params={{ id: s.id }}
                  className="snap-start shrink-0 w-[78%] sm:w-[60%] relative aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-border/50"
                >
                  <img
                    src={s.image}
                    alt={s.name}
                    loading="lazy"
                    data-fallback={s.imageFallback}
                    onError={(e) => {
                      const t = e.currentTarget;
                      const fb = t.dataset.fallback;
                      if (fb && t.src !== fb) t.src = fb;
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                  <div className="absolute inset-x-3 top-3">
                    <span className="rounded-full glass-strong px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
                      {s.subcategory || s.category}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-display text-xl leading-[1.0] text-white drop-shadow-sm">{s.name}</h3>
                    <p className="mt-1.5 text-[11px] font-medium text-white/80 line-clamp-1">{s.tagline}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      {s.city} · {s.area}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Vertical social feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">
              {activeCat === "All" ? "Tonight's feed" : activeCat}
            </h2>
            <p className="text-[11px] font-semibold text-muted-foreground">{feed.length} spots</p>
          </div>
          {isLoading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] w-full animate-pulse rounded-3xl bg-surface" />
            ))}
          {!isLoading && feed.map((s, i) => <SpotCard key={s.id} spot={s} index={i} />)}
          {!isLoading && !feed.length && (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-border">
                {tab === "With Friends"
                  ? <Users2 className="h-6 w-6 text-muted-foreground" />
                  : <Search className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/80">
                  {tab === "With Friends" ? "No crew activity yet" : "Nothing found"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-[200px] mx-auto">
                  {tab === "With Friends"
                    ? "Invite friends to see where they're heading."
                    : "Try a different city or category."}
                </p>
              </div>
            </div>
          )}
        </section>

        <p className="pt-4 text-center text-xs text-muted-foreground">You're all caught up. Go outside. ✨</p>
      </main>
    </AppShell>
  );
}
