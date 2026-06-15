import { Link } from "@tanstack/react-router";
import { ChevronRight, Megaphone, UserPlus } from "lucide-react";
import { useFriends } from "@/lib/friends-api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/spots";
import type { Spot } from "@/lib/spots";

function avatarHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function RightRail({ trending }: { trending: Spot[] }) {
  const { isAuthenticated } = useAuth();
  const { data: friends = [] } = useFriends();
  const crew = friends.filter((f) => f.status === "accepted");
  const top = trending.slice(0, 5);

  return (
    <aside className="sticky top-[68px] hidden h-fit w-[320px] shrink-0 flex-col gap-5 py-6 pr-8 xl:flex">
      {/* Your Crew — real accepted friends, honest empty state */}
      {isAuthenticated && (
        <section className="rounded-3xl bg-surface/50 p-5 ring-1 ring-border/50">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base">Your Crew</h3>
            <Link
              to="/profile"
              className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              See all
            </Link>
          </div>

          {crew.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {crew.slice(0, 5).map((f) => (
                <li key={f.friendId} className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold text-white"
                    style={{ background: `hsl(${avatarHue(f.name)} 70% 45%)` }}
                  >
                    {f.avatarUrl ? (
                      <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      f.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-surface ring-1 ring-border">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Add friends to see who's going out with you.
              </p>
              <Link
                to="/profile"
                className="mt-1 text-xs font-semibold text-primary transition hover:underline"
              >
                Find your crew
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Trending This Week — real listings, capacity-sorted */}
      <section className="rounded-3xl bg-surface/50 p-5 ring-1 ring-border/50">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-base">Trending Events</h3>
          <span className="text-[11px] text-muted-foreground">This Week</span>
        </div>
        <ol className="mt-4 space-y-3.5">
          {top.map((s, i) => (
            <li key={s.id}>
              <Link
                to="/spot/$id"
                params={{ id: s.id }}
                className="group flex items-start gap-3"
              >
                <span className="font-display text-lg leading-none text-muted-foreground/50 transition group-hover:text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold transition group-hover:text-primary">
                    {s.name}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {formatDate(s.date)}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground/70">
                    {s.area || s.city}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {top.length === 0 && (
            <li className="text-xs text-muted-foreground">No events trending yet.</li>
          )}
        </ol>
      </section>

      {/* Host CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-soft p-5 ring-1 ring-primary/20">
        <span className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
        <h3 className="font-display text-base">Host an Event?</h3>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Reach thousands of TROVE users across South Africa.
        </p>
        <a
          href="https://trove-engine.pages.dev"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow-soft transition active:scale-[0.98]"
        >
          <Megaphone className="h-3.5 w-3.5" />
          Get Started
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </section>
    </aside>
  );
}
