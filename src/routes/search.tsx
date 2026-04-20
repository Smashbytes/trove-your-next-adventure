import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SpotCard } from "@/components/SpotCard";
import { spots, type Vibe } from "@/lib/spots";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — TROVE" }] }),
  component: SearchPage,
});

const VIBES: Vibe[] = ["Hype", "Chill", "Romantic", "Wild", "Creative"];
const SORTS = ["Trending", "Closest", "Cheapest", "Top Rated"] as const;

function SearchPage() {
  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Trending");
  const [openFilters, setOpenFilters] = useState(false);

  const results = useMemo(() => {
    let r = spots.filter((s) =>
      (s.name + s.area + s.tagline).toLowerCase().includes(q.toLowerCase()) &&
      s.price <= maxPrice &&
      (!vibe || s.vibes.includes(vibe))
    );
    if (sort === "Closest") r = [...r].sort((a, b) => a.distanceKm - b.distanceKm);
    if (sort === "Cheapest") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "Top Rated") r = [...r].sort((a, b) => b.rating - a.rating);
    if (sort === "Trending") r = [...r].sort((a, b) => b.capacityBooked / b.capacityMax - a.capacityBooked / a.capacityMax);
    return r;
  }, [q, maxPrice, vibe, sort]);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-4 space-y-3">
        <h1 className="font-display text-2xl">Search</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search spots, vibes, areas…"
            className="w-full rounded-full bg-surface ring-1 ring-border py-3 pl-10 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
          />
          <button
            onClick={() => setOpenFilters(true)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-gradient-brand shadow-glow"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {SORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                sort === s ? "bg-foreground text-background" : "bg-surface ring-1 ring-border text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pt-5 space-y-4">
        <p className="text-xs text-muted-foreground">{results.length} spots</p>
        {results.map((s, i) => <SpotCard key={s.id} spot={s} index={i} />)}
        {!results.length && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No spots match. Loosen the filters?
          </div>
        )}
      </main>

      {openFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpenFilters(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl glass-strong p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] space-y-6 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Filters</h3>
              <button onClick={() => setOpenFilters(false)} className="grid h-8 w-8 place-items-center rounded-full bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Max price</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range" min={50} max={2000} step={50} value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="font-display text-lg text-gradient w-16 text-right">R{maxPrice}</span>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Vibe</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVibe(vibe === v ? null : v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      vibe === v ? "bg-gradient-brand text-primary-foreground" : "bg-surface ring-1 ring-border"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setOpenFilters(false)} className="w-full rounded-full bg-gradient-brand py-3 font-semibold text-primary-foreground shadow-glow">
              Show {results.length} spots
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
