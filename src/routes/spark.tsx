import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  AtSign, Check, ChevronRight, Globe2, Lock, MapPin, Plus, Search,
  UserPlus, Users2, X, Zap,
} from "lucide-react";
import { ResponsiveShell } from "@/components/desktop/ResponsiveShell";
import { FriendsManager } from "@/components/FriendsManager";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/spots";
import { koboToRand } from "@/lib/listings-api";
import {
  splitNeedsAction,
  useCloseBy,
  useCreateGroup,
  useDiscoverGroups,
  useGroupMembers,
  useInviteToGroup,
  useJoinGroup,
  useLeaveGroup,
  useLinkUp,
  useMyGroups,
  useRespondGroupInvite,
  useSearchGuests,
  useSplitInbox,
  useUpdateGroup,
  useDeleteGroup,
  type GroupSummary,
  type GuestResult,
} from "@/lib/spark-api";
import { useFriends } from "@/lib/friends-api";

export const Route = createFileRoute("/spark")({
  head: () => ({ meta: [{ title: "Spark — TROVE" }] }),
  component: SparkPage,
});

type Tab = "friends" | "closeby" | "groups";

function SparkPage() {
  const { isAuthenticated, openAuthModal, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");

  if (!isAuthenticated) {
    return (
      <ResponsiveShell title="Spark">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="max-w-[280px] text-sm text-muted-foreground">
            Link up with friends, join groups and split ticket payments — sign in to spark it up.
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
    <ResponsiveShell title="Spark" backTo="/profile">
      <div className="space-y-5 pb-24">
        {!profile?.username && (
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-2xl bg-gradient-soft p-4 ring-1 ring-primary/30 transition hover:ring-primary/60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand shadow-glow-soft">
              <AtSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Claim your @username</p>
              <p className="text-xs text-muted-foreground">So friends can actually find you</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        <ActiveSplits />

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2">
          <TabButton active={tab === "friends"} onClick={() => setTab("friends")} icon={<UserPlus className="h-4 w-4" />} label="Friends" />
          <TabButton active={tab === "closeby"} onClick={() => setTab("closeby")} icon={<MapPin className="h-4 w-4" />} label="Close By" />
          <TabButton active={tab === "groups"} onClick={() => setTab("groups")} icon={<Users2 className="h-4 w-4" />} label="Groups" />
        </div>

        {tab === "friends" && <FriendsTab />}
        {tab === "closeby" && <CloseByTab />}
        {tab === "groups" && <GroupsTab />}
      </div>
    </ResponsiveShell>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition ${
        active
          ? "bg-gradient-brand text-primary-foreground shadow-glow-soft"
          : "bg-surface text-muted-foreground ring-1 ring-border"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Active splits strip — anything that needs a response or a payment
// ---------------------------------------------------------------------------

function ActiveSplits() {
  const { data: inbox = [] } = useSplitInbox();
  const navigate = useNavigate();
  const actionable = inbox.filter(splitNeedsAction);
  if (actionable.length === 0) return null;
  return (
    <div className="space-y-2">
      {actionable.map((item) => (
        <button
          key={item.splitId}
          onClick={() => navigate({ to: "/split/$id", params: { id: item.splitId } })}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-soft p-3.5 text-left ring-1 ring-primary/40 transition hover:ring-primary"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand shadow-glow-soft">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {item.splitStatus === "pending" ? "Split request" : "Time to pay your share"}
              {" · "}{item.listingTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.splitStatus === "pending"
                ? `${item.initiatorName} · your share ${formatPrice(koboToRand(item.shareKobo))} + R5 fee`
                : `Pay ${formatPrice(koboToRand(item.shareKobo + item.feeKobo))} to lock in the tickets`}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friends tab — username/name search + Link Up manager
// ---------------------------------------------------------------------------

function FriendsTab() {
  const [query, setQuery] = useState("");
  const { data: results = [], isFetching } = useSearchGuests(query);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-full bg-surface-elevated px-4 ring-1 ring-border focus-within:ring-primary">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find people — @username or name"
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="space-y-2">
          {results.length === 0 && !isFetching && (
            <p className="text-xs text-muted-foreground">
              Nobody found for “{query.trim()}”. They may not be discoverable — you can still add them by email below.
            </p>
          )}
          {results.map((g) => <GuestRow key={g.id} guest={g} />)}
        </div>
      )}

      <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
        <FriendsManager />
      </section>
    </div>
  );
}

function GuestRow({ guest }: { guest: GuestResult }) {
  const linkUp = useLinkUp();
  const display = guest.fullName?.trim() || (guest.username ? `@${guest.username}` : "TROVE member");

  async function send() {
    try {
      await linkUp.mutateAsync(guest.id);
      toast.success(`Link Up request sent to ${display}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request.");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-2.5">
      <SparkAvatar name={display} url={guest.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{display}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {guest.username ? `@${guest.username}` : ""}
          {guest.username && guest.city ? " · " : ""}
          {guest.city ?? ""}
          {typeof guest.mutualCount === "number" && guest.mutualCount > 0
            ? ` · ${guest.mutualCount} mutual`
            : ""}
        </p>
      </div>
      {guest.linkStatus === "accepted" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1.5 text-[11px] font-semibold text-success">
          <Check className="h-3 w-3" /> Linked
        </span>
      ) : guest.linkStatus === "pending" ? (
        <span className="rounded-full bg-surface px-3 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border">
          {guest.requestedByMe ? "Requested" : "Respond in Friends"}
        </span>
      ) : (
        <button
          onClick={send}
          disabled={linkUp.isPending}
          className="rounded-full bg-gradient-brand px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-glow-soft disabled:opacity-50"
        >
          Link Up
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Close By tab
// ---------------------------------------------------------------------------

function CloseByTab() {
  const { profile } = useAuth();
  const [everywhere, setEverywhere] = useState(false);
  const { data: people = [], isLoading } = useCloseBy(everywhere);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Discoverable TROVE members {everywhere ? "everywhere" : profile?.city ? `in ${profile.city}` : "near you"}
        </p>
        <button
          onClick={() => setEverywhere((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
            everywhere
              ? "bg-gradient-brand text-primary-foreground shadow-glow-soft"
              : "bg-surface-elevated text-muted-foreground ring-1 ring-border"
          }`}
        >
          <Globe2 className="mr-1 inline h-3 w-3" />
          Everywhere
        </button>
      </div>

      {!profile?.discoverable && (
        <Link
          to="/settings"
          className="block rounded-2xl bg-surface p-3.5 text-xs text-muted-foreground ring-1 ring-border transition hover:ring-primary/40"
        >
          You're currently hidden. Turn on <span className="font-semibold text-foreground">“Allow others to find you”</span> in
          Settings so friends can spot you here too.
        </Link>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      ) : people.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 text-center ring-1 ring-border">
          <p className="text-sm font-medium">Nobody close by (yet)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile?.city
              ? "Try “Everywhere”, or invite your crew to TROVE."
              : "Set your city in Settings to see people near you."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((g) => <GuestRow key={g.id} guest={g} />)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Groups tab
// ---------------------------------------------------------------------------

function GroupsTab() {
  const { user } = useAuth();
  const { data: mine = [] } = useMyGroups();
  const [query, setQuery] = useState("");
  const { data: directory = [] } = useDiscoverGroups(query);
  const [creating, setCreating] = useState(false);
  const [openGroup, setOpenGroup] = useState<GroupSummary | null>(null);

  const invites = mine.filter((g) => g.myStatus === "invited");
  const joined = mine.filter((g) => g.myStatus === "member");
  const mineIds = new Set(mine.map((g) => g.id));
  const discoverable = directory.filter((g) => !mineIds.has(g.id));

  return (
    <div className="space-y-5">
      {/* Invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Invites</SectionLabel>
          {invites.map((g) => <GroupInviteRow key={g.id} group={g} />)}
        </div>
      )}

      {/* My groups */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Your groups</SectionLabel>
          <button
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-glow-soft"
          >
            <Plus className="h-3 w-3" /> New group
          </button>
        </div>
        {creating && <CreateGroupForm onDone={() => setCreating(false)} />}
        {joined.length === 0 && !creating ? (
          <p className="text-xs text-muted-foreground">
            No groups yet — create one for your crew or join a public group below.
          </p>
        ) : (
          joined.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              open={openGroup?.id === g.id}
              onToggle={() => setOpenGroup(openGroup?.id === g.id ? null : g)}
              isOwner={g.ownerId === user?.id}
            />
          ))
        )}
      </div>

      {/* Directory */}
      <div className="space-y-2">
        <SectionLabel>Find groups</SectionLabel>
        <div className="flex items-center gap-2 rounded-full bg-surface-elevated px-4 ring-1 ring-border focus-within:ring-primary">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search public groups"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        {discoverable.length === 0 ? (
          <p className="text-xs text-muted-foreground">No groups found — be the one who starts it.</p>
        ) : (
          discoverable.map((g) => <DirectoryGroupRow key={g.id} group={g} />)
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{children}</p>;
}

function CreateGroupForm({ onDone }: { onDone: () => void }) {
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [listed, setListed] = useState(true);

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("Give your group a name (at least 2 characters).");
      return;
    }
    try {
      await create.mutateAsync({ name, description, isPrivate, listed });
      toast.success(`Group “${name.trim()}” created.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create group.");
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name — e.g. Braai Squad"
        className="w-full rounded-full bg-surface-elevated px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's the vibe? (optional)"
        className="w-full rounded-full bg-surface-elevated px-4 py-2.5 text-sm ring-1 ring-border focus:outline-none focus:ring-primary"
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Private group</p>
          <p className="text-xs text-muted-foreground">Invite-only — only you can add members</p>
        </div>
        <Switch on={isPrivate} onClick={() => setIsPrivate((v) => !v)} />
      </div>
      {isPrivate && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Show on Friend Groups page</p>
            <p className="text-xs text-muted-foreground">People can see it exists, but still can't join uninvited</p>
          </div>
          <Switch on={listed} onClick={() => setListed((v) => !v)} />
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={create.isPending}
          className="flex-1 rounded-full bg-gradient-brand py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-soft disabled:opacity-50"
        >
          Create group
        </button>
        <button onClick={onDone} className="rounded-full bg-surface-elevated px-5 text-sm ring-1 ring-border">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? "bg-gradient-brand" : "bg-surface-elevated ring-1 ring-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          on ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function GroupInviteRow({ group }: { group: GroupSummary }) {
  const respond = useRespondGroupInvite();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gradient-soft p-3 ring-1 ring-primary/40">
      <GroupIcon isPrivate={group.isPrivate} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{group.name}</p>
        <p className="text-xs text-muted-foreground">You've been invited</p>
      </div>
      <button
        onClick={() => respond.mutate({ groupId: group.id, accept: true })}
        className="grid h-8 w-8 place-items-center rounded-full bg-success/20 text-success"
        aria-label="Accept invite"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={() => respond.mutate({ groupId: group.id, accept: false })}
        className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted-foreground"
        aria-label="Decline invite"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function GroupRow({ group, open, onToggle, isOwner }: {
  group: GroupSummary; open: boolean; onToggle: () => void; isOwner: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left">
        <GroupIcon isPrivate={group.isPrivate} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{group.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
            {group.isPrivate ? " · Private" : " · Public"}
            {isOwner ? " · You own this" : ""}
          </p>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <GroupDetail group={group} isOwner={isOwner} />}
    </div>
  );
}

function GroupDetail({ group, isOwner }: { group: GroupSummary; isOwner: boolean }) {
  const { user } = useAuth();
  const { data: members = [] } = useGroupMembers(group.id);
  const { data: friends = [] } = useFriends();
  const invite = useInviteToGroup();
  const leave = useLeaveGroup();
  const update = useUpdateGroup();
  const del = useDeleteGroup();
  const [inviting, setInviting] = useState(false);

  const memberIds = new Set(members.map((m) => m.userId));
  const invitable = friends.filter((f) => f.status === "accepted" && !memberIds.has(f.friendId));

  return (
    <div className="space-y-3 border-t border-border/60 p-3">
      {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}

      <div className="space-y-1.5">
        {members.map((m) => {
          const display = m.fullName?.trim() || (m.username ? `@${m.username}` : "Member");
          return (
            <div key={m.userId} className="flex items-center gap-2.5">
              <SparkAvatar name={display} url={m.avatarUrl} size="sm" />
              <p className="flex-1 truncate text-xs font-medium">
                {display}
                {m.userId === user?.id ? " (you)" : ""}
              </p>
              {m.role === "owner" && (
                <span className="text-[10px] uppercase tracking-wide text-accent">Owner</span>
              )}
              {m.status === "invited" && (
                <span className="text-[10px] text-muted-foreground">Invited</span>
              )}
            </div>
          );
        })}
      </div>

      {isOwner && (
        <>
          <button
            onClick={() => setInviting((v) => !v)}
            className="w-full rounded-full bg-surface-elevated py-2 text-xs font-semibold ring-1 ring-border transition hover:ring-primary/50"
          >
            <UserPlus className="mr-1 inline h-3.5 w-3.5" /> Invite friends
          </button>
          {inviting && (
            <div className="space-y-1.5">
              {invitable.length === 0 ? (
                <p className="text-xs text-muted-foreground">All your linked friends are already here.</p>
              ) : (
                invitable.map((f) => (
                  <div key={f.friendId} className="flex items-center gap-2.5">
                    <SparkAvatar name={f.name} url={f.avatarUrl} size="sm" />
                    <p className="flex-1 truncate text-xs">{f.name}</p>
                    <button
                      onClick={async () => {
                        try {
                          await invite.mutateAsync({ groupId: group.id, userId: f.friendId });
                          toast.success(`Invited ${f.name}.`);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Couldn't invite.");
                        }
                      }}
                      className="rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-semibold text-primary-foreground"
                    >
                      Invite
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          {group.isPrivate && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Show on Friend Groups page</p>
              <Switch
                on={group.listed ?? true}
                onClick={() =>
                  update.mutate(
                    { groupId: group.id, patch: { listed: !(group.listed ?? true) } },
                    { onError: (e) => toast.error(e.message) },
                  )
                }
              />
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-1">
        {!isOwner && (
          <button
            onClick={() => leave.mutate({ groupId: group.id })}
            className="text-[11px] text-muted-foreground transition hover:text-destructive"
          >
            Leave group
          </button>
        )}
        {isOwner && (
          <button
            onClick={() => {
              if (confirm(`Delete “${group.name}”? This can't be undone.`)) {
                del.mutate(group.id, {
                  onSuccess: () => toast.success("Group deleted."),
                  onError: (e) => toast.error(e.message),
                });
              }
            }}
            className="text-[11px] text-muted-foreground transition hover:text-destructive"
          >
            Delete group
          </button>
        )}
      </div>
    </div>
  );
}

function DirectoryGroupRow({ group }: { group: GroupSummary }) {
  const join = useJoinGroup();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-elevated p-3">
      <GroupIcon isPrivate={group.isPrivate} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{group.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
          {group.ownerName ? ` · by ${group.ownerName}` : ""}
        </p>
      </div>
      {group.isPrivate ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border">
          <Lock className="h-3 w-3" /> Invite only
        </span>
      ) : (
        <button
          onClick={() =>
            join.mutate(group.id, {
              onSuccess: () => toast.success(`Joined ${group.name}!`),
              onError: (e) => toast.error(e.message),
            })
          }
          disabled={join.isPending}
          className="rounded-full bg-gradient-brand px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-glow-soft disabled:opacity-50"
        >
          Join
        </button>
      )}
    </div>
  );
}

function GroupIcon({ isPrivate }: { isPrivate: boolean }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow-soft">
      {isPrivate ? <Lock className="h-4 w-4" /> : <Users2 className="h-4 w-4" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared avatar
// ---------------------------------------------------------------------------

function SparkAvatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-sm";
  return (
    <div className={`grid ${cls} shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-brand font-display text-primary-foreground`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : name.replace(/^@/, "").charAt(0).toUpperCase()}
    </div>
  );
}
