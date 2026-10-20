// Friends graph + "friends going" — live (Supabase RPCs) for real users, mock
// for the demo account. Profiles are owner-only in RLS, so reads go through the
// SECURITY DEFINER functions friends_going() / my_friends() / find_guest_by_email().

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { UUID_RE, useIsDemo } from "./listings-api";
import type { Friend } from "./spots";

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
      if (demo) return (await import("./spots")).getSpot(listingId!)?.friendsGoing ?? [];
      if (!user || !UUID_RE.test(listingId!)) return [];
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
  username: string | null;
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
        name: r.full_name?.trim() || (r.username ? `@${r.username}` : "Friend"),
        username: r.username,
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

const ADD_ERRORS: Record<string, string> = {
  INVALID_EMAIL: "Enter a full email address, e.g. name@example.com.",
  TOO_MANY_REQUESTS: "You've sent a lot of friend requests today. Try again tomorrow.",
};

/**
 * Send a friend request by exact email. The server answers the same way
 * whether or not the email has a TROVE account (GST-L02-09), so this never
 * reveals who is on TROVE; the other person decides in their notifications.
 */
export function useAddFriend() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (email) => {
      if (!user) throw new Error("Sign in to add friends.");
      const { error } = await supabase.rpc("send_friend_request_by_email" as never, { p_email: email } as never);
      if (error) throw new Error(ADD_ERRORS[(error.message ?? "").trim()] ?? error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}

const RESPOND_ERRORS: Record<string, string> = {
  NOT_YOURS_TO_ANSWER: "Only the person you sent the request to can answer it.",
  ALREADY_ANSWERED: "This request was already answered.",
  REQUEST_NOT_FOUND: "This friend request no longer exists.",
};

/** Accept/decline an incoming request: respond_friend_request() lets only the recipient answer. */
export function useRespondFriend() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, { friendId: string; accept: boolean }>({
    mutationFn: async ({ friendId, accept }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.rpc("respond_friend_request" as never, {
        p_other: friendId,
        p_accept: accept,
      } as never);
      if (error) throw new Error(RESPOND_ERRORS[(error.message ?? "").trim()] ?? error.message);
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
