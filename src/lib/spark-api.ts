// TROVE Spark — the social layer: searchable usernames, guest discovery
// ("Friends Close By"), friend groups and split payments.
//
// Reads go through SECURITY DEFINER RPCs (profiles are own-only under RLS);
// split payment writes go through edge functions (split-create / split-respond
// / split-pay) because money moves. See supabase/migrations/0020_spark_social.sql.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const USERNAME_RE = /^[a-z][a-z0-9_.]{2,19}$/;

export function normalizeUsername(v: string): string {
  return v.trim().replace(/^@/, "").toLowerCase();
}

/** Invoke an edge function and surface its JSON error body as an Error. */
async function invokeEdge<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let msg = error.message;
    try {
      if (ctx) {
        const parsed = await ctx.json();
        if (parsed?.error) msg = parsed.error;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Spark profile settings (username + toggles + city)
// ---------------------------------------------------------------------------

export interface SparkSettingsPatch {
  username?: string | null;
  discoverable?: boolean;
  is_private?: boolean;
  friends_going_optin?: boolean;
  city?: string | null;
}

export function useUpdateSparkSettings() {
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, SparkSettingsPatch>({
    mutationFn: async (patch) => {
      if (!user) throw new Error("Sign in first.");
      if (patch.username != null && patch.username !== "") {
        const uname = normalizeUsername(patch.username);
        if (!USERNAME_RE.test(uname)) {
          throw new Error("Usernames are 3–20 characters: letters, numbers, _ or . — starting with a letter.");
        }
        patch = { ...patch, username: uname };
      }
      const { error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") throw new Error("That username is taken — try another.");
        throw error;
      }
      await refreshProfile();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["close-by"] });
    },
  });
}

export function useUsernameAvailable(username: string) {
  const normalized = normalizeUsername(username);
  const valid = USERNAME_RE.test(normalized);
  return useQuery<boolean>({
    queryKey: ["username-available", normalized],
    enabled: valid,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("username_available", { p_username: normalized });
      if (error) throw error;
      return !!data;
    },
  });
}

// ---------------------------------------------------------------------------
// Guest discovery: search + Friends Close By + Link Up by id
// ---------------------------------------------------------------------------

export interface GuestResult {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  city: string | null;
  /** friendship edge with me, if any */
  linkStatus: "pending" | "accepted" | "declined" | null;
  requestedByMe: boolean;
  mutualCount?: number;
}

export function useSearchGuests(query: string) {
  const { user } = useAuth();
  const q = query.trim();
  return useQuery<GuestResult[]>({
    queryKey: ["guest-search", q],
    enabled: !!user && q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_guests", { p_query: q });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        username: r.username,
        fullName: r.full_name,
        avatarUrl: r.avatar_url,
        city: r.city,
        linkStatus: r.link_status,
        requestedByMe: r.requested_by === user!.id,
      }));
    },
  });
}

export function useCloseBy(everywhere: boolean) {
  const { user } = useAuth();
  return useQuery<GuestResult[]>({
    queryKey: ["close-by", everywhere, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("friends_close_by", { p_everywhere: everywhere });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        username: r.username,
        fullName: r.full_name,
        avatarUrl: r.avatar_url,
        city: r.city,
        linkStatus: null,
        requestedByMe: false,
        mutualCount: r.mutual_count,
      }));
    },
  });
}

/** Send a Link Up request straight to a user id (from search / Close By). */
export function useLinkUp() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (targetId) => {
      if (!user) throw new Error("Sign in to link up.");
      const pair = user.id < targetId
        ? { user_a: user.id, user_b: targetId }
        : { user_a: targetId, user_b: user.id };
      const { error } = await supabase
        .from("friends")
        .insert({ ...pair, requested_by: user.id, status: "pending" });
      if (error) {
        if (error.code === "23505") throw new Error("You're already connected (or a request is pending).");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["close-by"] });
      qc.invalidateQueries({ queryKey: ["guest-search"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Friend groups
// ---------------------------------------------------------------------------

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  listed?: boolean;
  ownerId: string;
  ownerName?: string;
  memberCount: number;
  myRole?: "owner" | "member";
  myStatus?: "invited" | "member" | null;
}

export function useMyGroups() {
  const { user } = useAuth();
  return useQuery<GroupSummary[]>({
    queryKey: ["my-groups", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_groups");
      if (error) throw error;
      return (data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        isPrivate: g.is_private,
        listed: g.listed,
        ownerId: g.owner_id,
        memberCount: g.member_count,
        myRole: g.my_role as "owner" | "member",
        myStatus: g.my_status as "invited" | "member",
      }));
    },
  });
}

export function useDiscoverGroups(query: string) {
  const { user } = useAuth();
  return useQuery<GroupSummary[]>({
    queryKey: ["discover-groups", query.trim()],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("discover_groups", {
        p_query: query.trim() || null,
      });
      if (error) throw error;
      return (data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        isPrivate: g.is_private,
        ownerId: g.owner_id,
        ownerName: g.owner_name,
        memberCount: g.member_count,
        myStatus: (g.my_status ?? null) as "invited" | "member" | null,
      }));
    },
  });
}

export interface GroupMember {
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: "owner" | "member";
  status: "invited" | "member";
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery<GroupMember[]>({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("group_members", { p_group: groupId! });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        userId: m.user_id,
        username: m.username,
        fullName: m.full_name,
        avatarUrl: m.avatar_url,
        role: m.role as "owner" | "member",
        status: m.status as "invited" | "member",
      }));
    },
  });
}

export function useCreateGroup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<string, Error, { name: string; description?: string; isPrivate: boolean; listed: boolean }>({
    mutationFn: async ({ name, description, isPrivate, listed }) => {
      if (!user) throw new Error("Sign in first.");
      const { data, error } = await supabase
        .from("friend_groups")
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          owner_id: user.id,
          is_private: isPrivate,
          // Public groups are always in the directory; only private groups may hide.
          listed: isPrivate ? listed : true,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-groups"] });
      qc.invalidateQueries({ queryKey: ["discover-groups"] });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation<void, Error, { groupId: string; patch: { name?: string; description?: string | null; is_private?: boolean; listed?: boolean } }>({
    mutationFn: async ({ groupId, patch }) => {
      const { error } = await supabase.from("friend_groups").update(patch).eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-groups"] });
      qc.invalidateQueries({ queryKey: ["discover-groups"] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (groupId) => {
      const { error } = await supabase.from("friend_groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-groups"] });
      qc.invalidateQueries({ queryKey: ["discover-groups"] });
    },
  });
}

export function useJoinGroup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (groupId) => {
      if (!user) throw new Error("Sign in first.");
      const { error } = await supabase
        .from("friend_group_members")
        .insert({ group_id: groupId, user_id: user.id });
      if (error) {
        if (error.code === "23505") throw new Error("You're already in this group.");
        if (error.code === "42501") throw new Error("This group is invite-only.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-groups"] });
      qc.invalidateQueries({ queryKey: ["discover-groups"] });
      qc.invalidateQueries({ queryKey: ["group-members"] });
    },
  });
}

export function useLeaveGroup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { groupId: string; userId?: string }>({
    mutationFn: async ({ groupId, userId }) => {
      if (!user) throw new Error("Sign in first.");
      const { error } = await supabase
        .from("friend_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId ?? user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-groups"] });
      qc.invalidateQueries({ queryKey: ["discover-groups"] });
      qc.invalidateQueries({ queryKey: ["group-members"] });
    },
  });
}

export function useInviteToGroup() {
  const qc = useQueryClient();
  return useMutation<void, Error, { groupId: string; userId: string }>({
    mutationFn: async ({ groupId, userId }) => {
      const { error } = await supabase.rpc("invite_to_group", { p_group: groupId, p_user: userId });
      if (error) {
        if (error.message.includes("NOT_FRIENDS")) throw new Error("You can only invite friends you're linked with.");
        if (error.message.includes("NOT_GROUP_OWNER")) throw new Error("Only the group owner can invite.");
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-members"] }),
  });
}

/** Accept (→ member) or decline (delete row) a group invite. */
export function useRespondGroupInvite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { groupId: string; accept: boolean }>({
    mutationFn: async ({ groupId, accept }) => {
      if (!user) throw new Error("Sign in first.");
      if (accept) {
        const { error } = await supabase
          .from("friend_group_members")
          .update({ status: "member" })
          .eq("group_id", groupId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("friend_group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-groups"] });
      qc.invalidateQueries({ queryKey: ["discover-groups"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Split payments
// ---------------------------------------------------------------------------

export type SplitStatus = "pending" | "ready" | "completed" | "declined" | "cancelled" | "expired";
export type ShareStatus = "pending" | "accepted" | "declined" | "paid";

export interface SplitInboxItem {
  splitId: string;
  shareId: string;
  listingId: string;
  listingTitle: string;
  initiatorId: string;
  initiatorName: string;
  qty: number;
  ticketTotalKobo: number;
  shareKobo: number;
  feeKobo: number;
  splitStatus: SplitStatus;
  myStatus: ShareStatus;
  bookingId: string | null;
  createdAt: string;
}

/** True when this item needs the user to do something right now. */
export function splitNeedsAction(item: SplitInboxItem): boolean {
  return (
    (item.splitStatus === "pending" && item.myStatus === "pending") ||
    (item.splitStatus === "ready" && item.myStatus === "accepted")
  );
}

export function useSplitInbox() {
  const { user } = useAuth();
  return useQuery<SplitInboxItem[]>({
    queryKey: ["split-inbox", user?.id],
    enabled: !!user,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((i) => i.splitStatus === "pending" || i.splitStatus === "ready")
        ? 8000
        : false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_split_inbox");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        splitId: r.split_id,
        shareId: r.share_id,
        listingId: r.listing_id,
        listingTitle: r.listing_title,
        initiatorId: r.initiator_id,
        initiatorName: r.initiator_name,
        qty: r.qty,
        ticketTotalKobo: r.ticket_total_kobo,
        shareKobo: r.share_kobo,
        feeKobo: r.fee_kobo,
        splitStatus: r.split_status,
        myStatus: r.my_status,
        bookingId: r.booking_id,
        createdAt: r.created_at,
      }));
    },
  });
}

export interface SplitParticipantRow {
  shareId: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  shareKobo: number;
  feeKobo: number;
  status: ShareStatus;
  isInitiator: boolean;
}

export interface SplitDetail {
  id: string;
  listingId: string;
  initiatorId: string;
  bookingId: string | null;
  qty: number;
  ticketTotalKobo: number;
  feePerShareKobo: number;
  status: SplitStatus;
  createdAt: string;
  participants: SplitParticipantRow[];
}

export function useSplit(splitId: string | undefined) {
  return useQuery<SplitDetail | null>({
    queryKey: ["split", splitId],
    enabled: !!splitId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "pending" || s === "ready" ? 4000 : false;
    },
    queryFn: async () => {
      const { data: bill, error } = await supabase
        .from("split_bills")
        .select("id, listing_id, initiator_id, booking_id, qty, ticket_total_kobo, fee_per_share_kobo, status, created_at")
        .eq("id", splitId!)
        .maybeSingle();
      if (error) throw error;
      if (!bill) return null;
      const { data: parts, error: pErr } = await supabase.rpc("split_participants", { p_split: splitId! });
      if (pErr) throw pErr;
      return {
        id: bill.id,
        listingId: bill.listing_id,
        initiatorId: bill.initiator_id,
        bookingId: bill.booking_id,
        qty: bill.qty,
        ticketTotalKobo: bill.ticket_total_kobo,
        feePerShareKobo: bill.fee_per_share_kobo,
        status: bill.status,
        createdAt: bill.created_at,
        participants: (parts ?? []).map((p) => ({
          shareId: p.share_id,
          userId: p.user_id,
          username: p.username,
          fullName: p.full_name,
          avatarUrl: p.avatar_url,
          shareKobo: p.share_kobo,
          feeKobo: p.fee_kobo,
          status: p.status,
          isInitiator: p.is_initiator,
        })),
      };
    },
  });
}

export function useCreateSplit() {
  const qc = useQueryClient();
  return useMutation<{ split_id: string }, Error, { listingId: string; qty: number; friendIds: string[] }>({
    mutationFn: ({ listingId, qty, friendIds }) =>
      invokeEdge("split-create", { listing_id: listingId, qty, friend_ids: friendIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["split-inbox"] }),
  });
}

export function useRespondSplit() {
  const qc = useQueryClient();
  return useMutation<{ status: string; booking_id?: string }, Error, { splitId: string; action: "accept" | "decline" | "cancel"; agreed?: boolean }>({
    mutationFn: ({ splitId, action, agreed }) =>
      invokeEdge("split-respond", { split_id: splitId, action, agreed }),
    onSuccess: (_d, { splitId }) => {
      qc.invalidateQueries({ queryKey: ["split", splitId] });
      qc.invalidateQueries({ queryKey: ["split-inbox"] });
    },
  });
}

export function usePaySplitShare() {
  return useMutation<{ authorization_url: string }, Error, string>({
    mutationFn: (splitId) => invokeEdge("split-pay", { split_id: splitId }),
  });
}
