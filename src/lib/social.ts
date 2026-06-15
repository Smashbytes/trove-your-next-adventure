// Saves (wishlist) and follows — live for real users, localStorage for the demo
// account and signed-out browsing.
//
//   - saves table:   (user_id, listing_id)  — keyed by listing id
//   - follows table: (user_id, host_id)      — keyed by host_profiles.user_id
//
// The demo account and signed-out users transparently fall back to the existing
// localStorage store so the UI behaves identically; a signed-out real user who
// tries to save/follow is prompted to sign in.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useIsDemo, prettifySlug } from "./listings-api";
import {
  getSaved,
  toggleSaved as toggleSavedLocal,
  getFollows,
  toggleFollow as toggleFollowLocal,
} from "./store";

// ---------------------------------------------------------------------------
// Saves
// ---------------------------------------------------------------------------

export function useSavedIds() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo; // demo + signed-out use localStorage
  return useQuery<string[]>({
    queryKey: ["saves", local, user?.id],
    queryFn: async () => {
      if (local) return getSaved();
      const { data, error } = await supabase
        .from("saves")
        .select("listing_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.listing_id);
    },
  });
}

export function useToggleSave() {
  const demo = useIsDemo();
  const { user, openAuthModal } = useAuth();
  const qc = useQueryClient();
  const local = !user || demo;

  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!user && !demo) {
        openAuthModal();
        throw new Error("auth-required");
      }
      if (local) {
        toggleSavedLocal(listingId);
        return;
      }
      const current = getQuerySet(qc, ["saves", local, user!.id]);
      if (current.has(listingId)) {
        const { error } = await supabase
          .from("saves")
          .delete()
          .eq("user_id", user!.id)
          .eq("listing_id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saves")
          .insert({ user_id: user!.id, listing_id: listingId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saves"] });
    },
    onError: (e) => {
      if ((e as Error).message !== "auth-required") {
        qc.invalidateQueries({ queryKey: ["saves"] });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Follows (keyed by host_profiles.user_id)
// ---------------------------------------------------------------------------

export function useFollowedIds() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  return useQuery<string[]>({
    queryKey: ["follows", local, user?.id],
    queryFn: async () => {
      if (local) return getFollows();
      const { data, error } = await supabase
        .from("follows")
        .select("host_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.host_id);
    },
  });
}

export function useToggleFollow() {
  const demo = useIsDemo();
  const { user, openAuthModal } = useAuth();
  const qc = useQueryClient();
  const local = !user || demo;

  return useMutation({
    mutationFn: async (hostId: string) => {
      if (!user && !demo) {
        openAuthModal();
        throw new Error("auth-required");
      }
      if (local) {
        toggleFollowLocal(hostId);
        return;
      }
      const current = getQuerySet(qc, ["follows", local, user!.id]);
      if (current.has(hostId)) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("user_id", user!.id)
          .eq("host_id", hostId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ user_id: user!.id, host_id: hostId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follows"] }),
    onError: (e) => {
      if ((e as Error).message !== "auth-required") {
        qc.invalidateQueries({ queryKey: ["follows"] });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Followed hosts (resolved to display details for "My Spots")
// ---------------------------------------------------------------------------

export interface FollowedHost {
  userId: string;
  slug: string;
  name: string;
  city: string | null;
  verified: boolean;
  heroUrl: string | null;
}

export function useFollowedHosts() {
  const { data: ids = [] } = useFollowedIds();
  return useQuery<FollowedHost[]>({
    queryKey: ["followed-hosts", [...ids].sort()],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_profiles")
        .select("user_id, slug, city, verified, hero_url")
        .in("user_id", ids);
      if (error) throw error;
      return (data ?? []).map((h) => ({
        userId: h.user_id,
        slug: h.slug,
        name: prettifySlug(h.slug),
        city: h.city,
        verified: !!h.verified,
        heroUrl: h.hero_url,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { QueryClient } from "@tanstack/react-query";
function getQuerySet(qc: QueryClient, key: unknown[]): Set<string> {
  const data = qc.getQueryData<string[]>(key);
  return new Set(data ?? []);
}
