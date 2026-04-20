import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SpotCard } from "@/components/SpotCard";
import { spots } from "@/lib/spots";
import { getSaved, useStore } from "@/lib/store";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "Saved — TROVE" }] }),
  component: SavedPage,
});

function SavedPage() {
  const ids = useStore(() => getSaved());
  const saved = spots.filter((s) => ids.includes(s.id));

  return (
    <AppShell>
      <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <h1 className="font-display text-2xl">Saved</h1>
        <p className="text-xs text-muted-foreground">Your wishlist · {saved.length} spots</p>
      </header>
      <main className="px-5 pt-5 space-y-4">
        {saved.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface ring-1 ring-border">
              <Heart className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-xl">Nothing saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any spot to keep it here.</p>
            <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              Start exploring
            </Link>
          </div>
        ) : (
          saved.map((s, i) => <SpotCard key={s.id} spot={s} index={i} />)
        )}
      </main>
    </AppShell>
  );
}
