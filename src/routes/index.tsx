import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Bell, Plus, Search, Flame, Sparkles, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { SpotCard } from "@/components/SpotCard";
import {
  spots,
  CATEGORIES,
  CITIES,
  editorsPicks,
  type Category,
  type City,
} from "@/lib/spots";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover Tonight — TROVE" },
      { name: "description", content: "Discover and book South Africa's best nightlife, food, music, adventures and more — in seconds." },
    ],
  }),
  component: Discover,
});

const tabs = ["For You", "Community", "Trending"] as const;
const categories: Array<"All" | Category> = ["All", ...CATEGORIES];
const cityFilters: Array<"All" | City> = ["All", ...CITIES];

function Discover() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("For You");
  const [activeCat, setActiveCat] = useState<"All" | Category>("All");
  const [activeCity, setActiveCity] = useState<"All" | City>("All");

  const stories = useMemo(() => spots.slice(0, 8), []);
  const picks = useMemo(() => editorsPicks(), []);

  const filtered = useMemo(() => {
    let r = spots;
    if (activeCat !== "All") r = r.filter((s) => s.category === activeCat);
    if (activeCity !== "All") r = r.filter((s) => s.city === activeCity);
    return r;
  }, [activeCat, activeCity]);

  const feed = useMemo(() => {
    if (tab === "Trending")
      return [...filtered].sort(
        (a, b) => b.capacityBooked / b.capacityMax - a.capacityBooked / a.capacityMax,
      );
    if (tab === "Community") return filtered.filter((s) => s.friendsGoing.length > 0);
    return filtered;
  }, [tab, filtered]);

  const heroCity = activeCity === "All" ? "South Africa" : activeCity;
  const heroCount = filtered.length;

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
                <span className={isActive ? "text-foreground" : "text-muted-foreground"}>{t}</span>
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

        {/* Hero strip — bold editorial */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-soft p-5 ring-1 ring-primary/30"
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary inline-flex items-center gap-1.5">
              <Flame className="h-3 w-3" /> {heroCount} spots in {heroCity}
            </p>
            <h1 className="mt-1.5 font-display text-[2rem] leading-[0.95]">
              Decide. <span className="text-gradient">Book.</span> Show up.
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Nightlife, food, music, adventures, wellness — sorted in 30 seconds.
            </p>
          </div>
        </motion.section>

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
                      ? "bg-foreground text-background"
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
        <section>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {cityFilters.map((c) => {
              const isActive = activeCity === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCity(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-gradient-brand text-primary-foreground shadow-glow-soft"
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
              <h2 className="font-display text-lg inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Editor's Picks
              </h2>
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
                    <h3 className="font-display text-xl leading-[0.95] text-white">{s.name}</h3>
                    <p className="mt-1 text-[11px] text-white/70 line-clamp-1">{s.tagline}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-white/60">
                      {s.city} · {s.area}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Vertical social feed */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">
              {activeCat === "All" ? "Tonight's feed" : activeCat}
            </h2>
            <p className="text-[11px] text-muted-foreground">{feed.length} spots</p>
          </div>
          {feed.map((s, i) => (
            <SpotCard key={s.id} spot={s} index={i} />
          ))}
          {!feed.length && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet. Try a different city or category.
            </div>
          )}
        </section>

        <p className="pt-4 text-center text-xs text-muted-foreground">You're all caught up. Go outside. ✨</p>
      </main>
    </AppShell>
  );
}
