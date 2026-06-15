import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, MessageSquare, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/lib/notifications-api";

export function TopBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { isAuthenticated, profile, openAuthModal } = useAuth();
  const unread = useUnreadCount();

  const name = profile?.full_name?.trim() || "Guest";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border/50 bg-background/80 px-8 py-3.5 backdrop-blur-xl">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search" });
        }}
        className="relative max-w-xl flex-1"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events, venues, people…"
          className="h-11 w-full rounded-full border border-border/60 bg-surface/60 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:bg-surface focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <div className="flex items-center gap-2">
        <Link
          to="/support"
          className="relative grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground"
          aria-label="Support messages"
        >
          <MessageSquare className="h-[18px] w-[18px]" />
        </Link>
        <Link
          to="/notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-glow">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div className="ml-1 h-7 w-px bg-border/60" />

        {isAuthenticated ? (
          <Link
            to="/profile"
            className="ml-1 flex items-center gap-2.5 rounded-full p-1 pr-3 transition hover:bg-surface"
          >
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className="hidden leading-tight xl:block">
              <span className="block max-w-[120px] truncate text-sm font-semibold">{name}</span>
              <span className="block text-[11px] text-muted-foreground">View profile</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground xl:block" />
          </Link>
        ) : (
          <button
            onClick={openAuthModal}
            className="ml-1 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-soft transition active:scale-[0.98]"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
