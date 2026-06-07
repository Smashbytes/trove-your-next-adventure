import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Settings, UserPlus, Check, X, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useMyBookings } from "@/lib/bookings-api";
import { useSavedIds } from "@/lib/social";
import {
  useFriends,
  useAddFriend,
  useRespondFriend,
  useRemoveFriend,
  type FriendRow,
} from "@/lib/friends-api";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — TROVE" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, isAuthenticated, signOut, openAuthModal, refreshProfile } = useAuth();
  const { data: bookings = [] } = useMyBookings();
  const { data: savedIds = [] } = useSavedIds();
  const { data: friends = [] } = useFriends();

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending" && !f.requestedByMe);

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Guest";
  const initial = displayName.charAt(0).toUpperCase();
  const memberYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [savingName, setSavingName] = useState(false);

  async function saveName() {
    if (!user || nameInput.trim().length < 2) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nameInput.trim() })
      .eq("id", user.id);
    setSavingName(false);
    if (error) {
      toast.error("Couldn't update your name.");
      return;
    }
    await refreshProfile();
    setEditing(false);
    toast.success("Name updated.");
  }

  if (!isAuthenticated) {
    return (
      <AppShell>
        <main className="flex min-h-[75vh] flex-col items-center justify-center px-8 text-center">
          <Logo size={36} />
          <h1 className="mt-5 font-display text-2xl">Your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-[240px]">
            Sign in or create an account to see your tickets, saved spots and friends.
          </p>
          <div className="mt-7 flex w-full max-w-[260px] flex-col gap-3">
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Get started
            </Link>
            <button
              onClick={openAuthModal}
              className="inline-flex items-center justify-center rounded-full bg-surface ring-1 ring-border px-6 py-3 text-sm font-semibold"
            >
              Sign in
            </button>
          </div>
        </main>
      </AppShell>
    );
  }

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
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full rounded-lg bg-background/60 px-2 py-1 text-lg font-display ring-1 ring-border focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName}
                    className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl truncate">{displayName}</h1>
                  <button onClick={() => { setNameInput(displayName); setEditing(true); }} className="text-muted-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}{memberYear ? ` · Member since ${memberYear}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Tickets" value={bookings.length} />
            <Stat label="Saved" value={savedIds.length} />
            <Stat label="Friends" value={accepted.length} />
          </div>
        </section>

        {/* Friends */}
        <FriendsManager incoming={incoming} accepted={accepted} />

        <button
          onClick={() => signOut()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-medium text-muted-foreground ring-1 ring-border"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <p className="text-center text-[11px] text-muted-foreground pt-2">TROVE v1.0 · Made in South Africa 🇿🇦</p>
      </main>
    </AppShell>
  );
}

function FriendsManager({ incoming, accepted }: { incoming: FriendRow[]; accepted: FriendRow[] }) {
  const addFriend = useAddFriend();
  const respond = useRespondFriend();
  const remove = useRemoveFriend();
  const [email, setEmail] = useState("");

  async function add() {
    const value = email.trim();
    if (!value) return;
    try {
      const { name } = await addFriend.mutateAsync(value);
      toast.success(`Friend request sent to ${name}.`);
      setEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request.");
    }
  }

  return (
    <section className="rounded-2xl bg-surface ring-1 ring-border p-4 space-y-4">
      <h2 className="font-display text-lg inline-flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" /> Friends
      </h2>

      {/* Add by email */}
      <div className="flex items-stretch gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          type="email"
          placeholder="Add a friend by email"
          className="flex-1 rounded-full bg-surface-elevated px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
        />
        <button
          onClick={add}
          disabled={addFriend.isPending}
          className="rounded-full bg-gradient-brand px-4 text-sm font-semibold text-primary-foreground shadow-glow-soft disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Requests</p>
          {incoming.map((f) => (
            <div key={f.friendId} className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-2.5">
              <Avatar name={f.name} />
              <p className="flex-1 text-sm font-medium truncate">{f.name}</p>
              <button
                onClick={() => respond.mutate({ friendId: f.friendId, accept: true })}
                className="grid h-8 w-8 place-items-center rounded-full bg-success/20 text-success"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => respond.mutate({ friendId: f.friendId, accept: false })}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Accepted friends */}
      {accepted.length > 0 ? (
        <div className="space-y-2">
          {accepted.map((f) => (
            <div key={f.friendId} className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-2.5">
              <Avatar name={f.name} />
              <p className="flex-1 text-sm font-medium truncate">{f.name}</p>
              <button
                onClick={() => remove.mutate(f.friendId)}
                className="text-[11px] text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No friends yet — add a few to see who's going out.</p>
      )}
    </section>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-sm font-display text-primary-foreground">
      {name.charAt(0).toUpperCase()}
    </div>
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
