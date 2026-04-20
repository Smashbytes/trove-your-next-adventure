import { createFileRoute } from "@tanstack/react-router";
import { Bell, MessageCircle, Gift, Star, Settings, LogOut, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { getBookings, getSaved, useStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — TROVE" }] }),
  component: ProfilePage,
});

const rows = [
  { icon: Bell, label: "Push notifications", hint: "Reminders & friend activity", toggle: true },
  { icon: MessageCircle, label: "WhatsApp updates", hint: "Booking confirmations", toggle: true },
  { icon: Gift, label: "Refer a friend", hint: "Earn R50 when they book" },
  { icon: Star, label: "My reviews", hint: "Rate places you've been" },
  { icon: Users, label: "Friends", hint: "Manage your crew" },
  { icon: Settings, label: "Settings", hint: "Preferences & privacy" },
];

function ProfilePage() {
  const saved = useStore(() => getSaved()).length;
  const tickets = useStore(() => getBookings()).length;

  return (
    <AppShell>
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-2 flex items-center justify-between">
        <Logo />
        <button className="grid h-9 w-9 place-items-center rounded-full bg-surface ring-1 ring-border">
          <Settings className="h-4 w-4" />
        </button>
      </header>

      <main className="px-5 pt-4 space-y-6">
        {/* Identity */}
        <section className="rounded-2xl bg-gradient-soft p-5 ring-1 ring-primary/30">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-brand text-2xl font-display shadow-glow">
              S
            </div>
            <div>
              <h1 className="font-display text-2xl">Sipho M.</h1>
              <p className="text-xs text-muted-foreground">Member since 2026 · Joburg</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Tickets" value={tickets} />
            <Stat label="Saved" value={saved} />
            <Stat label="Friends" value={6} />
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-2xl bg-surface ring-1 ring-border divide-y divide-border">
          {rows.map(({ icon: Icon, label, hint, toggle }) => (
            <div key={label} className="flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-elevated">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              {toggle ? (
                <button className="relative h-6 w-11 rounded-full bg-gradient-brand shadow-glow-soft">
                  <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">›</span>
              )}
            </div>
          ))}
        </section>

        <button className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-medium text-muted-foreground ring-1 ring-border">
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <p className="text-center text-[11px] text-muted-foreground pt-2">TROVE v1.0 · Made in South Africa 🇿🇦</p>
      </main>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-background/40 p-3">
      <div className="font-display text-xl text-gradient">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
