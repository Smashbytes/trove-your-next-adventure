import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Bell, Sparkles, MapPin } from "lucide-react";
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

const categories: Array<"All" | Category> = ["All", "Nightlife", "Comedy", "Adventure", "Chill"];
const stories = spots.slice(0, 6);

function Discover() {
  const [active, setActive] = useState<"All" | Category>("All");
  const filtered = active === "All" ? spots : spots.filter((s) => s.category === active);
  const trending = [...spots].sort((a, b) => b.capacityBooked / b.capacityMax - a.capacityBooked / a.capacityMax).slice(0, 4);

  return (
    <AppShell>
      {/* Top bar */}
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-full bg-surface ring-1 ring-border">
              <MapPin className="h-4 w-4" />
            </button>
            <button className="relative grid h-9 w-9 place-items-center rounded-full bg-surface ring-1 ring-border">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>Joburg · Tonight, {new Date().toLocaleDateString("en-ZA", { weekday: "long" })}</span>
        </div>
      </header>

      <main className="px-5 pt-5 space-y-7">
        {/* Hero */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">What's popping</p>
          <h1 className="font-display text-[2.5rem] leading-[0.95] mt-1">
            Decide.<br />
            <span className="text-gradient">Book.</span><br />
            Show up.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            From rooftops in Braam to caves in Magaliesberg — your night, sorted in 30 seconds.
          </p>
        </motion.section>

        {/* Stories rail */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5 snap-x snap-mandatory">
            {stories.map((s) => (
              <Link key={s.id} to="/spot/$id" params={{ id: s.id }} className="snap-start shrink-0">
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-2 ring-primary/60 shadow-glow-soft">
                  <img src={s.image} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <p className="mt-1.5 max-w-[5rem] truncate text-[11px] text-center">{s.name.split(" ")[0]}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Category pills */}
        <section>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {categories.map((c) => {
              const isActive = active === c;
              return (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-gradient-brand text-primary-foreground shadow-glow"
                      : "bg-surface ring-1 ring-border text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* Trending */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl">Trending tonight 🔥</h2>
            <Link to="/search" className="text-xs text-primary">See all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 no-scrollbar snap-x snap-mandatory">
            {trending.map((s, i) => (
              <div key={s.id} className="w-[78%] shrink-0 snap-start">
                <SpotCard spot={s} index={i} />
              </div>
            ))}
          </div>
        </section>

        {/* Feed */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl">For you</h2>
            <span className="text-xs text-muted-foreground">{filtered.length} spots</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((s, i) => (
              <SpotCard key={s.id} spot={s} index={i} />
            ))}
          </div>
        </section>

        <p className="pt-4 text-center text-xs text-muted-foreground">You've reached the end. Go outside. ✨</p>
      </main>
    </AppShell>
  );
}
