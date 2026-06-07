// Live data layer for discovery/browse. Reads the public, host-published
// `live` listings from Supabase and maps them onto the `Spot` shape the UI
// already speaks, so existing components keep working unchanged.
//
// Read sources (all publicly readable per RLS):
//   - listings_with_capacity (view): listing fields + capacity_booked
//   - categories: id → display name + parent
//   - host_profiles: user_id → public slug
//   - reviews: aggregated rating/count per listing
//
// Known gaps flagged for follow-up:
//   * Host DISPLAY NAME is not publicly readable (profiles RLS is own-only and
//     host_profiles has no name column). We derive a name from the slug until a
//     public host-name source exists (e.g. host_profiles.display_name or a view).
//   * vibes/tagline/area/tags live in listings.metadata, written by the engine
//     listing editor. We read them defensively and degrade when absent.
//   * Editor's picks come from the curated_listings table (wired separately).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  Category as DbCategory,
  ListingMetadata,
  ListingWithCapacity,
} from "./database.types";
import type { Friend, Spot, Vibe } from "./spots";
import {
  spots as mockSpots,
  getSpot as getMockSpot,
  getHost as getMockHost,
  editorsPicks as mockEditorsPicks,
  CATEGORIES as MOCK_CATEGORIES,
  CITY_LABELS,
} from "./spots";
import fallbackImage from "@/assets/spot-nightlife.jpg";

export const FALLBACK_IMAGE = fallbackImage;

/** Curated "Featured" slots live this long before they reset (reels-style). */
export const FEATURED_TTL_MS = 48 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Demo mode
// ---------------------------------------------------------------------------
// One designated guest account sees the full mock catalogue (rich friends,
// reviews, editor's picks, split — the "populated" experience) so the whole
// flow can be demoed before real supply matures. Every other user sees live
// Supabase data. All mock lives behind this flag; deleting it later is the
// single switch that retires the mock entirely.
export const DEMO_GUEST_EMAIL = (
  (import.meta.env.VITE_DEMO_GUEST_EMAIL as string | undefined) ?? "syc0.obzzy@gmail.com"
).toLowerCase();

/** True when the signed-in user is the demo/showcase account. */
export function useIsDemo(): boolean {
  const { user } = useAuth();
  return !!user?.email && user.email.toLowerCase() === DEMO_GUEST_EMAIL;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function koboToRand(kobo: number | null | undefined): number {
  return Math.round((kobo ?? 0) / 100);
}

/** "taboo-night-club" → "Taboo Night Club". Stop-gap host display name. */
export function prettifySlug(slug: string | null | undefined): string {
  if (!slug) return "Host";
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatOpeningHours(meta: ListingMetadata): string {
  const oh = (meta as { opening_hours?: Record<string, { open: string; close: string }> })
    .opening_hours;
  if (!oh) return "";
  const entries = Object.entries(oh);
  if (entries.length === 0) return "";
  const [day, span] = entries[0];
  return `${day} ${span.open}–${span.close}`;
}

export interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
}

interface ListingExtras {
  categories: Map<string, CategoryNode>;
  hostSlugById: Map<string, string>;
  ratingByListing: Map<string, { avg: number; count: number }>;
  nextSlotByListing?: Map<string, string>;
}

/** Map a live listing row onto the UI `Spot` shape. */
export function listingToSpot(row: ListingWithCapacity, extras: ListingExtras): Spot {
  const meta = (row.metadata ?? {}) as ListingMetadata;
  const cat = row.category_id ? extras.categories.get(row.category_id) : undefined;
  const parent = cat?.parentId ? extras.categories.get(cat.parentId) : undefined;
  const rating = extras.ratingByListing.get(row.id);
  const hostSlug = extras.hostSlugById.get(row.host_id) ?? "";

  const metaDate = (meta as { date?: string }).date;
  const nextSlot = extras.nextSlotByListing?.get(row.id);
  const date = metaDate || nextSlot || row.created_at;

  return {
    id: row.id,
    name: row.title,
    tagline: meta.tagline ?? "",
    description: row.description ?? "",
    // Top-level category name for the chip; leaf name as subcategory.
    category: (parent?.name ?? cat?.name ?? "Experience") as Spot["category"],
    subcategory: parent ? (cat?.name ?? "") : "",
    vibes: (meta.vibes as Vibe[] | undefined) ?? [],
    city: (row.city ?? "") as Spot["city"],
    area: meta.area ?? row.address ?? "",
    date,
    doors: (meta as { doors_open?: string }).doors_open ?? "",
    price: koboToRand(row.base_price_kobo),
    rating: rating ? Math.round(rating.avg * 10) / 10 : 0,
    reviews: rating?.count ?? 0,
    image: row.cover_url || FALLBACK_IMAGE,
    imageFallback: FALLBACK_IMAGE,
    capacityBooked: row.capacity_booked ?? 0,
    capacityMax: row.capacity ?? 0,
    distanceKm: 0,
    friendsGoing: [] as Friend[],
    hours: formatOpeningHours(meta),
    hostName: prettifySlug(hostSlug),
    address: row.address ?? "",
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    tags: meta.tags ?? row.amenities ?? [],
  };
}

// ---------------------------------------------------------------------------
// Shared fetch of the bits needed to enrich a set of listing rows
// ---------------------------------------------------------------------------

async function fetchCategories(): Promise<Map<string, CategoryNode>> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("is_active", true);
  if (error) throw error;
  const map = new Map<string, CategoryNode>();
  for (const c of (data ?? []) as Pick<DbCategory, "id" | "name" | "parent_id">[]) {
    map.set(c.id, { id: c.id, name: c.name, parentId: c.parent_id });
  }
  return map;
}

async function enrichListings(rows: ListingWithCapacity[]): Promise<Spot[]> {
  if (rows.length === 0) return [];
  const listingIds = rows.map((r) => r.id);
  const hostIds = [...new Set(rows.map((r) => r.host_id))];

  const [categories, hostsRes, reviewsRes] = await Promise.all([
    fetchCategories(),
    supabase.from("host_profiles").select("user_id, slug").in("user_id", hostIds),
    supabase.from("reviews").select("of_listing, rating").in("of_listing", listingIds),
  ]);

  if (hostsRes.error) throw hostsRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const hostSlugById = new Map<string, string>();
  for (const h of (hostsRes.data ?? []) as { user_id: string; slug: string }[]) {
    hostSlugById.set(h.user_id, h.slug);
  }

  const agg = new Map<string, { sum: number; count: number }>();
  for (const r of (reviewsRes.data ?? []) as { of_listing: string | null; rating: number }[]) {
    if (!r.of_listing) continue;
    const cur = agg.get(r.of_listing) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    agg.set(r.of_listing, cur);
  }
  const ratingByListing = new Map<string, { avg: number; count: number }>();
  for (const [id, { sum, count }] of agg) {
    ratingByListing.set(id, { avg: count ? sum / count : 0, count });
  }

  return rows.map((row) => listingToSpot(row, { categories, hostSlugById, ratingByListing }));
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export const listingKeys = {
  all: ["listings"] as const,
  list: (filters: ListingFilters) => ["listings", "list", filters] as const,
  detail: (id: string | undefined) => ["listings", "detail", id] as const,
  reviews: (id: string | undefined) => ["listings", "reviews", id] as const,
  host: (slug: string | undefined) => ["host", slug] as const,
  categories: ["categories"] as const,
};

export interface ListingFilters {
  city?: string;
  /** top-level category name ("All" or a category name) */
  category?: string;
  query?: string;
  limit?: number;
}

/** All active categories as a flat list (caller can derive top-level set). */
export function useCategories() {
  const demo = useIsDemo();
  return useQuery({
    queryKey: [...listingKeys.categories, demo],
    staleTime: 10 * 60_000,
    enabled: typeof window !== "undefined",
    queryFn: async (): Promise<CategoryNode[]> => {
      if (demo) {
        return MOCK_CATEGORIES.map((name) => ({ id: name, name, parentId: null }));
      }
      const map = await fetchCategories();
      return [...map.values()];
    },
  });
}

/** Top-level category display names, for filter chips. */
export function useTopLevelCategories() {
  const q = useCategories();
  const names = (q.data ?? [])
    .filter((c) => c.parentId === null)
    .map((c) => c.name);
  return { ...q, names };
}

function filterMockSpots(filters: ListingFilters): Spot[] {
  const ql = (filters.query ?? "").trim().toLowerCase();
  return mockSpots.filter((s) => {
    if (filters.city && filters.city !== "All" && s.city !== filters.city) return false;
    if (filters.category && filters.category !== "All" && s.category !== filters.category)
      return false;
    if (ql) {
      const hay =
        `${s.name} ${s.area} ${s.tagline} ${s.subcategory} ${(s.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  });
}

export function useListings(filters: ListingFilters = {}) {
  const demo = useIsDemo();
  return useQuery({
    queryKey: [...listingKeys.list(filters), demo],
    // Only run client-side — the Supabase anon client relies on browser APIs
    // (localStorage, URL detection) that don't exist in the SSR worker.
    enabled: typeof window !== "undefined",
    queryFn: async (): Promise<Spot[]> => {
      if (demo) return filterMockSpots(filters);

      let q = supabase
        .from("listings_with_capacity")
        .select("*")
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 60);

      if (filters.city && filters.city !== "All") {
        // Map display name → DB city name (e.g. "Joburg" → "Johannesburg").
        const dbCity = CITY_LABELS[filters.city] ?? filters.city;
        q = q.eq("city", dbCity);
      }
      if (filters.query && filters.query.trim()) {
        q = q.textSearch("search_tsv", filters.query.trim(), {
          type: "websearch",
          config: "english",
        });
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as ListingWithCapacity[];
      const spots = await enrichListings(rows);

      // Category filter applied post-enrichment (matches resolved display name).
      if (filters.category && filters.category !== "All") {
        return spots.filter((s) => s.category === filters.category);
      }
      return spots;
    },
  });
}

export function useListing(id: string | undefined) {
  const demo = useIsDemo();
  return useQuery({
    queryKey: [...listingKeys.detail(id), demo],
    enabled: !!id,
    queryFn: async (): Promise<Spot | null> => {
      if (demo) return getMockSpot(id!) ?? null;
      const { data, error } = await supabase
        .from("listings_with_capacity")
        .select("*")
        .eq("id", id!)
        .eq("status", "live")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [spot] = await enrichListings([data as ListingWithCapacity]);
      return spot ?? null;
    },
  });
}

/**
 * Resolve listing ids → Spots, as a non-hook async (used by the bookings layer
 * and the Saved page). Does NOT filter by status, so a booked listing that was
 * later paused still renders on the ticket.
 */
export async function loadSpotsByIds(ids: string[], demo: boolean): Promise<Map<string, Spot>> {
  const map = new Map<string, Spot>();
  if (ids.length === 0) return map;
  if (demo) {
    for (const id of ids) {
      const s = getMockSpot(id);
      if (s) map.set(id, s);
    }
    return map;
  }
  const { data, error } = await supabase
    .from("listings_with_capacity")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  const spots = await enrichListings((data ?? []) as ListingWithCapacity[]);
  for (const s of spots) map.set(s.id, s);
  return map;
}

/** Resolve a set of listing ids to Spots (for the Saved page). */
export function useSpotsByIds(ids: string[]) {
  const demo = useIsDemo();
  return useQuery<Spot[]>({
    queryKey: ["spots-by-ids", demo, [...ids].sort()],
    queryFn: async () => {
      const map = await loadSpotsByIds(ids, demo);
      // Preserve incoming order.
      return ids.map((id) => map.get(id)).filter((s): s is Spot => !!s);
    },
  });
}

export interface ListingReview {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  by_user: string;
}

export function useListingReviews(listingId: string | undefined) {
  const demo = useIsDemo();
  return useQuery<ListingReview[]>({
    queryKey: [...listingKeys.reviews(listingId), demo],
    enabled: !!listingId,
    queryFn: async () => {
      if (demo) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body, created_at, by_user")
        .eq("of_listing", listingId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ListingReview[];
    },
  });
}

export interface HostBundle {
  slug: string;
  userId: string;
  name: string;
  bio: string | null;
  heroUrl: string | null;
  city: string | null;
  verified: boolean;
  spots: Spot[];
}

/**
 * Editor's / featured picks — the TROVE team's curated hero set.
 *
 * Source of truth is HQ → Discovery & Curation → Featured board, which writes
 * `curated_listings` rows with `slot_type = 'featured'` (global rows have a null
 * city), ordered by `position`. We read the top set here, resolve them to live
 * `Spot`s, and preserve the admin-defined order. The demo account still sees the
 * mock catalogue. Publicly readable via the `public_read_curated` RLS policy.
 */
export function useEditorsPicks(limit = 5) {
  const demo = useIsDemo();
  return useQuery<Spot[]>({
    queryKey: ["editors-picks", demo, limit],
    staleTime: 5 * 60_000,
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      if (demo) return mockEditorsPicks();
      // Featured slots live for 48h (reels-style) then reset, so only surface
      // rows added within the window — keyed off created_at so it also expires
      // legacy rows that predate explicit ends_at TTLs.
      const cutoff = new Date(Date.now() - FEATURED_TTL_MS).toISOString();
      const { data, error } = await supabase
        .from("curated_listings")
        .select("listing_id, position")
        .eq("slot_type", "featured")
        .is("city", null)
        .gt("created_at", cutoff)
        .order("position", { ascending: true })
        .limit(limit);
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.listing_id);
      if (ids.length === 0) return [];
      const map = await loadSpotsByIds(ids, false);
      // Preserve the curator's order; drop any that no longer resolve.
      return ids.map((id) => map.get(id)).filter((s): s is Spot => !!s);
    },
  });
}

export function useHostBySlug(slug: string | undefined) {
  const demo = useIsDemo();
  return useQuery<HostBundle | null>({
    queryKey: [...listingKeys.host(slug), demo],
    enabled: !!slug,
    queryFn: async () => {
      if (demo) {
        const h = getMockHost(slug!);
        if (!h) return null;
        return {
          slug: h.slug,
          userId: h.slug,
          name: h.name,
          bio: h.bio,
          heroUrl: h.events[0]?.image ?? null,
          city: h.city,
          verified: true,
          spots: h.events,
        };
      }
      const { data: host, error: hErr } = await supabase
        .from("host_profiles")
        .select("user_id, slug, bio, hero_url, city, verified")
        .eq("slug", slug!)
        .maybeSingle();
      if (hErr) throw hErr;
      if (!host) return null;

      const { data: listings, error: lErr } = await supabase
        .from("listings_with_capacity")
        .select("*")
        .eq("host_id", host.user_id)
        .eq("status", "live")
        .order("created_at", { ascending: false });
      if (lErr) throw lErr;

      const spots = await enrichListings((listings ?? []) as ListingWithCapacity[]);
      return {
        slug: host.slug,
        userId: host.user_id,
        name: prettifySlug(host.slug),
        bio: host.bio,
        heroUrl: host.hero_url,
        city: host.city,
        verified: !!host.verified,
        spots,
      };
    },
  });
}
