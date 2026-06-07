// Friends graph + "friends going" — live (Supabase RPCs) for real users, mock
// for the demo account. Profiles are owner-only in RLS, so reads go through the
// SECURITY DEFINER functions friends_going() / my_friends() / find_guest_by_email().

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useIsDemo } from "./listings-api";
import { getSpot as getMockSpot, type Friend } from "./spots";

// Stable colour + initial for an avatar from a display name.
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function toFriend(id: string, name: string | null): Friend {
  const display = name?.trim() || "Friend";
  return { id, name: display, initial: display.charAt(0).toUpperCase(), hue: hueFromString(display || id) };
}

// ---------------------------------------------------------------------------
// Friends going (powers FriendStack on spot detail)
// ---------------------------------------------------------------------------

export function useFriendsGoing(listingId: string | undefined) {
  const demo = useIsDemo();
  const { user } = useAuth();
  return useQuery<Friend[]>({
    queryKey: ["friends-going", demo, user?.id, listingId],
    enabled: !!listingId,
    queryFn: async () => {
      if (demo) return getMockSpot(listingId!)?.friendsGoing ?? [];
      if (!user) return [];
      const { data, error } = await supabase.rpc("friends_going", { p_listing_id: listingId! });
      if (error) throw error;
      return (data ?? []).map((r) => toFriend(r.id, r.full_name));
    },
  });
}

// ---------------------------------------------------------------------------
// Friends list / requests
// ---------------------------------------------------------------------------

export interface FriendRow {
  friendId: string;
  name: string;
  avatarUrl: string | null;
  status: "pending" | "accepted" | "declined";
  requestedByMe: boolean;
}

export function useFriends() {
  const demo = useIsDemo();
  const { user } = useAuth();
  return useQuery<FriendRow[]>({
    queryKey: ["friends", demo, user?.id],
    enabled: !!user || demo,
    queryFn: async () => {
      if (demo || !user) return [];
      const { data, error } = await supabase.rpc("my_friends");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        friendId: r.friend_id,
        name: r.full_name?.trim() || "Friend",
        avatarUrl: r.avatar_url,
        status: r.status as FriendRow["status"],
        requestedByMe: r.requested_by === user.id,
      }));
    },
  });
}

function orderedPair(me: string, other: string): { user_a: string; user_b: string } {
  return me < other ? { user_a: me, user_b: other } : { user_a: other, user_b: me };
}

/** Send a friend request by exact email. */
export function useAddFriend() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<{ name: string }, Error, string>({
    mutationFn: async (email) => {
      if (!user) throw new Error("Sign in to add friends.");
      const { data, error } = await supabase.rpc("find_guest_by_email", { p_email: email });
      if (error) throw error;
      const match = (data ?? [])[0];
      if (!match) throw new Error("No TROVE account found for that email.");
      const pair = orderedPair(user.id, match.id);
      const { error: insErr } = await supabase
        .from("friends")
        .insert({ ...pair, requested_by: user.id, status: "pending" });
      if (insErr) {
        if (insErr.code === "23505") throw new Error("You're already connected (or a request is pending).");
        throw insErr;
      }
      return { name: match.full_name?.trim() || "Friend" };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useRespondFriend() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { friendId: string; accept: boolean }>({
    mutationFn: async ({ friendId, accept }) => {
      if (!user) throw new Error("Not authenticated");
      const pair = orderedPair(user.id, friendId);
      const { error } = await supabase
        .from("friends")
        .update({ status: accept ? "accepted" : "declined" })
        .eq("user_a", pair.user_a)
        .eq("user_b", pair.user_b);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useRemoveFriend() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (friendId) => {
      if (!user) throw new Error("Not authenticated");
      const pair = orderedPair(user.id, friendId);
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("user_a", pair.user_a)
        .eq("user_b", pair.user_b);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}
