// Saves (wishlist) and follows — live for real users, localStorage for the demo
// account and signed-out browsing.
//
//   - saves table:   (user_id, listing_id)  — keyed by listing id
//   - follows table: (user_id, host_id)      — keyed by host_profiles.user_id
//
// The demo account and signed-out users transparently fall back to the existing
// localStorage store so the UI behaves identically; a signed-out real user who
// tries to save/follow is prompted to sign in.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useIsDemo, prettifySlug, UUID_RE } from "./listings-api";
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
      const rows = await readAll((from, to) =>
        supabase.from("saves").select("listing_id").eq("user_id", user!.id).order("listing_id").range(from, to),
      );
      return rows.map((r) => r.listing_id);
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
      const rows = await readAll((from, to) =>
        supabase.from("follows").select("host_id").eq("user_id", user!.id).order("host_id").range(from, to),
      );
      return rows.map((r) => r.host_id);
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

const HOSTS_PAGE = 24;

/** "My Spots": newest follows first, a page at a time (GST-L03-04). */
export function useFollowedHosts() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  return useInfiniteQuery({
    queryKey: ["follows", "hosts", local, user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ hosts: FollowedHost[]; total: number }> => {
      let ids: string[];
      let total: number;
      if (local) {
        // Demo follows can be mock hosts, which aren't in the database.
        const all = getFollows().filter((id) => UUID_RE.test(id));
        total = all.length;
        ids = all.slice(pageParam, pageParam + HOSTS_PAGE);
      } else {
        const { data, error, count } = await supabase
          .from("follows")
          .select("host_id", { count: "exact" })
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + HOSTS_PAGE - 1);
        if (error) throw error;
        ids = (data ?? []).map((r) => r.host_id);
        total = count ?? ids.length;
      }
      if (ids.length === 0) return { hosts: [], total };
      // Public Spot card only: host_profiles itself is readable by the Spot's own team.
      const { data, error } = await supabase
        .from("public_host_profiles")
        .select("user_id, slug, display_name, city, verified, hero_url")
        .in("user_id", ids);
      if (error) throw error;
      const byId = new Map((data ?? []).map((h) => [h.user_id, h]));
      const hosts = ids.flatMap((id) => {
        const h = byId.get(id);
        if (!h?.user_id || !h.slug) return [];
        return [{
          userId: h.user_id,
          slug: h.slug,
          name: h.display_name || prettifySlug(h.slug),
          city: h.city,
          verified: !!h.verified,
          heroUrl: h.hero_url,
        }];
      });
      return { hosts, total };
    },
    getNextPageParam: (last, pages) => {
      const next = pages.length * HOSTS_PAGE;
      return next < last.total ? next : undefined;
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import type { QueryClient } from "@tanstack/react-query";

/** The server returns at most 1,000 rows a request, so read a guest's own ids in pages. */
async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const STEP = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += STEP) {
    const { data, error } = await page(from, from + STEP - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if ((data ?? []).length < STEP) return out;
  }
}

function getQuerySet(qc: QueryClient, key: unknown[]): Set<string> {
  const data = qc.getQueryData<string[]>(key);
  return new Set(data ?? []);
}
