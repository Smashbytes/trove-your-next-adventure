import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  LogOut,
  Settings,
  Check,
  Pencil,
  Camera,
  Ticket,
  Heart,
  Bell,
  LifeBuoy,
  ChevronRight,
} from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { FriendsManager } from "@/components/FriendsManager";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useMyBookings } from "@/lib/bookings-api";
import { useSavedIds } from "@/lib/social";
import { useFriends } from "@/lib/friends-api";

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

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Guest";
  const initial = displayName.charAt(0).toUpperCase();
  const memberYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;
  const avatarUrl = profile?.avatar_url ?? null;

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Pick an image under 5MB.");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error("Couldn't upload your photo. Please try again.");
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`; // bust cache
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
    setUploading(false);
    if (updErr) {
      toast.error("Couldn't save your photo.");
      return;
    }
    await refreshProfile();
    toast.success("Photo updated.");
  }

  if (!isAuthenticated) {
    return (
      <ResponsiveShell title="Profile">
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <Logo size={36} />
          <h1 className="mt-5 font-display text-2xl">Your profile</h1>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
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
              className="inline-flex items-center justify-center rounded-full bg-surface px-6 py-3 text-sm font-semibold ring-1 ring-border"
            >
              Sign in
            </button>
          </div>
        </div>
      </ResponsiveShell>
    );
  }

  return (
    <ResponsiveShell
      title="Profile"
      action={
        <Link
          to="/settings"
          aria-label="Settings"
          className="grid h-9 w-9 place-items-center rounded-full bg-surface ring-1 ring-border transition hover:ring-primary/40"
        >
          <Settings className="h-4 w-4" />
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Identity */}
        <section className="rounded-3xl bg-gradient-soft p-5 ring-1 ring-primary/30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-brand text-3xl font-display shadow-glow"
              aria-label="Change photo"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
              {uploading && (
                <span className="absolute inset-0 grid place-items-center bg-black/60 text-[10px] font-semibold text-white">
                  …
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickAvatar}
              className="hidden"
            />

            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full rounded-lg bg-background/60 px-2 py-1 font-display text-lg ring-1 ring-border focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-brand text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="truncate font-display text-2xl">{displayName}</h1>
                  <button
                    onClick={() => {
                      setNameInput(displayName);
                      setEditing(true);
                    }}
                    className="text-muted-foreground"
                    aria-label="Edit name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
                {memberYear ? ` · Member since ${memberYear}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Stat label="Tickets" value={bookings.length} />
            <Stat label="Saved" value={savedIds.length} />
            <Stat label="Friends" value={accepted.length} />
          </div>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3">
          <QuickLink to="/tickets" icon={Ticket} label="My tickets" />
          <QuickLink to="/saved" icon={Heart} label="Saved" />
          <QuickLink to="/notifications" icon={Bell} label="Notifications" />
          <QuickLink to="/support" icon={LifeBuoy} label="Support" />
        </section>

        {/* Friends */}
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <FriendsManager />
        </section>

        <button
          onClick={() => signOut()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-medium text-muted-foreground ring-1 ring-border"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          TROVE v1.0 · Made in South Africa 🇿🇦
        </p>
      </div>
    </ResponsiveShell>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/tickets" | "/saved" | "/notifications" | "/support";
  icon: typeof Ticket;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border transition hover:ring-primary/40"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-soft ring-1 ring-primary/30">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
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
