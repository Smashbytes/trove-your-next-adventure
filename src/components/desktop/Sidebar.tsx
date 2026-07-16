import { Link, useLocation } from "@tanstack/react-router";
import {
  Compass,
  CalendarDays,
  Building2,
  Users,
  Heart,
  Ticket,
  Clock,
  MapPin,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { CITIES } from "@/lib/spots";
import { getGuestPrefs } from "@/lib/guest-prefs";

type NavItem = {
  to: "/" | "/search" | "/saved" | "/tickets" | "/settings" | "/spark";
  label: string;
  icon: typeof Compass;
  exact?: boolean;
  soon?: boolean;
};

/** Primary nav. `soon` items render disabled until their routes exist. */
const primary: NavItem[] = [
  { to: "/", label: "Discover", icon: Compass, exact: true },
  { to: "/search", label: "Events", icon: CalendarDays },
  { to: "/settings", label: "My Spots", icon: Building2 },
  { to: "/spark", label: "Spark", icon: Users },
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/tickets", label: "History", icon: Clock },
];

interface SidebarProps {
  /** Currently selected city (display label) for the "Explore by city" list. */
  activeCity?: string;
  onSelectCity?: (city: string) => void;
}

export function Sidebar({ activeCity, onSelectCity }: SidebarProps) {
  const { pathname } = useLocation();
  const prefCity = getGuestPrefs().city;
  const cities = CITIES.slice(0, 4); // Joburg, Pretoria, Cape Town, Durban

  return (
    <aside className="sticky top-0 hidden h-dvh w-[244px] shrink-0 flex-col border-r border-border/50 bg-sidebar px-4 py-5 lg:flex">
      <div className="px-2">
        <Link to="/" aria-label="TROVE home">
          <Logo size={30} />
        </Link>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {primary.map((item, i) => {
          const Icon = item.icon;
          const active =
            !item.soon &&
            ("exact" in item && item.exact
              ? pathname === "/"
              : pathname.startsWith(item.to) && item.to !== "/");

          if (item.soon) {
            return (
              <div
                key={`${item.label}-${i}`}
                className="group flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/50"
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70 ring-1 ring-border/60">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={`${item.label}-${i}`}
              to={item.to}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-soft text-foreground ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-brand shadow-glow" />
              )}
              <Icon
                className={`h-[18px] w-[18px] transition ${active ? "text-primary" : ""}`}
                strokeWidth={active ? 2.3 : 1.8}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-border/40 pt-5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Explore by city
        </p>
        <div className="mt-2 flex flex-col gap-0.5">
          {cities.map((city) => {
            const active = activeCity === city || (!activeCity && prefCity === city);
            return (
              <button
                key={city}
                onClick={() => onSelectCity?.(city)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground/60"}`} />
                {city}
              </button>
            );
          })}
          <Link
            to="/search"
            className="px-3 py-2 text-xs font-medium text-muted-foreground/70 transition hover:text-foreground"
          >
            See all cities
          </Link>
        </div>
      </div>
    </aside>
  );
}
