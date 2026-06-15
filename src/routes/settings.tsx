import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, Heart, LifeBuoy, Bell, Sparkles, ChevronRight } from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { FriendsManager } from "@/components/FriendsManager";
import { useAuth } from "@/lib/auth";
import { useFollowedHosts, useToggleFollow } from "@/lib/social";
import { CATEGORIES } from "@/lib/spots";
import { getGuestPrefs, patchGuestPrefs, type GuestPrefs } from "@/lib/guest-prefs";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TROVE" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAuthenticated, openAuthModal } = useAuth();

  if (!isAuthenticated) {
    return (
      <ResponsiveShell title="Settings">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="max-w-[260px] text-sm text-muted-foreground">
            Sign in to manage your interests, friends and preferences.
          </p>
          <button
            onClick={openAuthModal}
            className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Sign in
          </button>
        </div>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell title="Settings" backTo="/profile">
      <div className="space-y-6">
        <Interests />
        <Card title="Friends" icon={Sparkles}>
          <FriendsManager heading={false} />
        </Card>
        <MySpots />
        <NotificationPrefs />

        <Link
          to="/support"
          className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border transition hover:ring-primary/40"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-soft ring-1 ring-primary/30">
            <LifeBuoy className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Help &amp; Support</p>
            <p className="text-xs text-muted-foreground">Contact us or track a request</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </ResponsiveShell>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <h2 className="mb-4 inline-flex items-center gap-2 font-display text-lg">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Interests() {
  const [interests, setInterests] = useState<string[]>(() => getGuestPrefs().interests);

  function toggle(c: string) {
    const next = interests.includes(c)
      ? interests.filter((x) => x !== c)
      : [...interests, c];
    setInterests(next);
    patchGuestPrefs({ interests: next });
  }

  return (
    <Card title="Interests" icon={Sparkles}>
      <p className="mb-3 text-xs text-muted-foreground">
        Pick what you're into — we'll surface more of it.
      </p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const on = interests.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                on
                  ? "bg-gradient-brand text-primary-foreground shadow-glow-soft"
                  : "bg-surface-elevated text-muted-foreground ring-1 ring-border"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function MySpots() {
  const { data: hosts = [], isLoading } = useFollowedHosts();
  const toggleFollow = useToggleFollow();

  return (
    <Card title="Spots you follow" icon={Heart}>
      {isLoading ? (
        <div className="h-16 animate-pulse rounded-2xl bg-surface-elevated" />
      ) : hosts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          You're not following any spots yet. Tap the heart on a host to follow them.
        </p>
      ) : (
        <div className="space-y-2">
          {hosts.map((h) => (
            <div
              key={h.userId}
              className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-2.5"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-brand text-sm font-display text-primary-foreground">
                {h.heroUrl ? (
                  <img src={h.heroUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  h.name.charAt(0)
                )}
              </div>
              <Link
                to="/host/$slug"
                params={{ slug: h.slug }}
                className="min-w-0 flex-1"
              >
                <p className="flex items-center gap-1 truncate text-sm font-medium">
                  {h.name}
                  {h.verified && <BadgeCheck className="h-3.5 w-3.5 text-accent" />}
                </p>
                {h.city && <p className="truncate text-xs text-muted-foreground">{h.city}</p>}
              </Link>
              <button
                onClick={() => toggleFollow.mutate(h.userId)}
                className="text-[11px] text-muted-foreground transition hover:text-destructive"
              >
                Unfollow
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const NOTIF_OPTIONS: { key: keyof GuestPrefs["notifs"]; label: string; hint: string }[] = [
  { key: "recommendations", label: "Recommendations", hint: "Spots picked for you" },
  { key: "reminders", label: "Booking reminders", hint: "Before events you've booked" },
  { key: "trending", label: "Trending near you", hint: "What's hot in your city" },
];

function NotificationPrefs() {
  const [notifs, setNotifs] = useState<GuestPrefs["notifs"]>(() => getGuestPrefs().notifs);

  function toggle(key: keyof GuestPrefs["notifs"]) {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    patchGuestPrefs({ notifs: next });
  }

  return (
    <Card title="Notifications" icon={Bell}>
      <div className="space-y-1">
        {NOTIF_OPTIONS.map((o) => (
          <div key={o.key} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.hint}</p>
            </div>
            <button
              role="switch"
              aria-checked={notifs[o.key]}
              onClick={() => toggle(o.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                notifs[o.key] ? "bg-gradient-brand" : "bg-surface-elevated ring-1 ring-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  notifs[o.key] ? "left-[1.375rem]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
