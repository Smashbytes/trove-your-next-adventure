import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { SpotCard } from "@/components/SpotCard";
import { useSpotsByIds } from "@/lib/listings-api";
import { useSavedIds } from "@/lib/social";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "Saved — TROVE" }] }),
  component: SavedPage,
});

function SavedPage() {
  const { data: ids = [] } = useSavedIds();
  const { data: saved = [] } = useSpotsByIds(ids);

  return (
    <ResponsiveShell title="Saved" maxWidth="max-w-[1040px]">
      <p className="mb-4 text-xs text-muted-foreground">Your wishlist · {saved.length} spots</p>
      {saved.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface ring-1 ring-border">
            <Heart className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-xl">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any spot to keep it here.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Start exploring
          </Link>
        </div>
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:grid-cols-3">
          {saved.map((s, i) => (
            <SpotCard key={s.id} spot={s} index={i} />
          ))}
        </div>
      )}
    </ResponsiveShell>
  );
}
