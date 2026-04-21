import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Bell, Plus, Search, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { SpotCard } from "@/components/SpotCard";
import { spots, type Category } from "@/lib/spots";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discover Tonight — TROVE" },
      { name: "description", content: "Tonight's hottest spots in Joburg, Cape Town & Durban — booked in seconds." },
    ],
  }),
  component: Discover,
});

const tabs = ["For You", "Community", "Trending"] as const;
const categories: Array<"All" | Category> = ["All", "Nightlife", "Comedy", "Adventure", "Chill"];
const stories = spots.slice(0, 6);

function Discover() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("For You");
  const [active, setActive] = useState<"All" | Category>("All");
  const filtered = active === "All" ? spots : spots.filter((s) => s.category === active);
  const feed =
    tab === "Trending"
      ? [...filtered].sort((a, b) => b.capacityBooked / b.capacityMax - a.capacityBooked / a.capacityMax)
      : tab === "Community"
        ? filtered.filter((s) => s.friendsGoing.length > 0)
        : filtered;

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
                    <img src={s.image} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
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
              <Flame className="h-3 w-3" /> Tonight in Joburg
            </p>
            <h1 className="mt-1.5 font-display text-[2rem] leading-[0.95]">
              Decide. <span className="text-gradient">Book.</span> Show up.
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Rooftops, raves & raw comedy — sorted in 30 seconds.
            </p>
          </div>
        </motion.section>

        {/* Category pills */}
        <section>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {categories.map((c) => {
              const isActive = active === c;
              return (
                <button
                  key={c}
                  onClick={() => setActive(c)}
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

        {/* Vertical social feed */}
        <section className="space-y-5">
          {feed.map((s, i) => (
            <SpotCard key={s.id} spot={s} index={i} />
          ))}
          {!feed.length && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nothing in <span className="text-foreground">{tab}</span> yet. Try another feed.
            </div>
          )}
        </section>

        <p className="pt-4 text-center text-xs text-muted-foreground">You're all caught up. Go outside. ✨</p>
      </main>
    </AppShell>
  );
}
