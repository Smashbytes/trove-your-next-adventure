import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { SpotCard } from "@/components/SpotCard";
import { LoadMore } from "@/components/LoadMore";
import { useSavedSpots } from "@/lib/listings-api";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "Saved — TROVE" }] }),
  component: SavedPage,
});

function SavedPage() {
  const savedQuery = useSavedSpots();
  const saved = savedQuery.data?.pages.flatMap((p) => p.spots) ?? [];
  const total = savedQuery.data?.pages[0]?.total ?? 0;

  return (
    <ResponsiveShell title="Saved" maxWidth="max-w-[1040px]">
      <p className="mb-4 text-xs text-muted-foreground">Your wishlist · {total} spots</p>
      {savedQuery.isLoading ? (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:grid-cols-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : saved.length === 0 ? (
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
        <>
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:grid-cols-3">
            {saved.map((s, i) => (
              <SpotCard key={s.id} spot={s} index={i} />
            ))}
          </div>
          <LoadMore
            hasMore={savedQuery.hasNextPage}
            loading={savedQuery.isFetchingNextPage}
            onClick={() => savedQuery.fetchNextPage()}
          />
        </>
      )}
    </ResponsiveShell>
  );
}
