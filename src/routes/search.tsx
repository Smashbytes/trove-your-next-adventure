import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SpotCard } from "@/components/SpotCard";
import {
  spots,
  CATEGORIES,
  CITIES,
  type Vibe,
  type Category,
  type City,
} from "@/lib/spots";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — TROVE" }] }),
  component: SearchPage,
});

const VIBES: Vibe[] = ["Hype", "Chill", "Romantic", "Wild", "Creative"];
const SORTS = ["Trending", "Closest", "Cheapest", "Top Rated"] as const;

function SearchPage() {
  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState(7000);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [cat, setCat] = useState<Category | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Trending");
  const [openFilters, setOpenFilters] = useState(false);

  const results = useMemo(() => {
    const ql = q.toLowerCase();
    let r = spots.filter((s) => {
      const haystack = `${s.name} ${s.area} ${s.tagline} ${s.subcategory} ${(s.tags ?? []).join(" ")}`.toLowerCase();
      return (
        haystack.includes(ql) &&
        s.price <= maxPrice &&
        (!vibe || s.vibes.includes(vibe)) &&
        (!cat || s.category === cat) &&
        (!city || s.city === city)
      );
    });
    if (sort === "Closest") r = [...r].sort((a, b) => a.distanceKm - b.distanceKm);
    if (sort === "Cheapest") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "Top Rated") r = [...r].sort((a, b) => b.rating - a.rating);
    if (sort === "Trending")
      r = [...r].sort(
        (a, b) => b.capacityBooked / b.capacityMax - a.capacityBooked / a.capacityMax,
      );
    return r;
  }, [q, maxPrice, vibe, cat, city, sort]);

  const activeFilterCount = (vibe ? 1 : 0) + (cat ? 1 : 0) + (city ? 1 : 0) + (maxPrice < 7000 ? 1 : 0);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-4 space-y-3">
        <h1 className="font-display text-2xl">Search</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search spots, vibes, areas, tags…"
            className="w-full rounded-full bg-surface ring-1 ring-border py-3 pl-10 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
          />
          <button
            onClick={() => setOpenFilters(true)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-gradient-brand shadow-glow"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary-foreground" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-[9px] font-bold text-background ring-2 ring-background">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          <button
            onClick={() => setCat(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              !cat ? "bg-foreground text-background" : "bg-surface ring-1 ring-border text-muted-foreground"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(cat === c ? null : c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                cat === c ? "bg-foreground text-background" : "bg-surface ring-1 ring-border text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {SORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                sort === s ? "bg-gradient-brand text-primary-foreground shadow-glow-soft" : "bg-surface/60 ring-1 ring-border/60 text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pt-5 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground">{results.length} spots</p>
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
            className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl glass-strong p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] space-y-6 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Filters</h3>
              <button onClick={() => setOpenFilters(false)} className="grid h-8 w-8 place-items-center rounded-full bg-surface">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">City</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setCity(null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    !city ? "bg-foreground text-background" : "bg-surface ring-1 ring-border"
                  }`}
                >
                  All cities
                </button>
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(city === c ? null : c)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      city === c ? "bg-gradient-brand text-primary-foreground" : "bg-surface ring-1 ring-border"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Max price</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range" min={0} max={7000} step={50} value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="font-display text-lg text-gradient w-20 text-right">
                  {maxPrice === 0 ? "Free" : `R${maxPrice}`}
                </span>
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

            <button
              onClick={() => { setVibe(null); setCity(null); setCat(null); setMaxPrice(7000); }}
              disabled={activeFilterCount === 0}
              className="w-full rounded-full bg-surface ring-1 ring-border py-2.5 text-xs font-medium text-muted-foreground disabled:opacity-40"
            >
              Reset filters
            </button>

            <button onClick={() => setOpenFilters(false)} className="w-full rounded-full bg-gradient-brand py-3 font-semibold text-primary-foreground shadow-glow">
              Show {results.length} spots
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
