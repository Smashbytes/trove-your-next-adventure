import { Link, useLocation } from "@tanstack/react-router";
import { Compass, Search, Heart, Ticket, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="glass-strong rounded-2xl px-2 py-2 shadow-glow-soft">
          <ul className="flex items-center justify-between">
            {tabs.map((t) => {
              const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <li key={t.to} className="flex-1">
                  <Link
                    to={t.to}
                    className="relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition"
                  >
                    <Icon
                      className={`h-5 w-5 transition ${active ? "text-primary" : "text-muted-foreground"}`}
                      strokeWidth={active ? 2.4 : 1.8}
                    />
                    <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {t.label}
                    </span>
                    {active && (
                      <span className="absolute -top-1 h-1 w-8 rounded-full bg-gradient-brand shadow-glow" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
