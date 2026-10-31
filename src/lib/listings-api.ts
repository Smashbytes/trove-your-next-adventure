// Live data layer for discovery/browse. Reads the public, host-published
// `live` listings from Supabase and maps them onto the `Spot` shape the UI
// already speaks, so existing components keep working unchanged.
//
// Read sources (all publicly readable per RLS):
//   - listings_with_capacity (view): listing fields + capacity_booked
//   - categories: id → display name + parent
//   - public_host_profiles: user_id → slug + display name
//   - rating_avg / review_count come aggregated from the view (0037)
//
// Known gaps flagged for follow-up:
//   * Host DISPLAY NAME is not publicly readable (profiles RLS is own-only and
//     host_profiles has no name column). We derive a name from the slug until a
//     public host-name source exists (e.g. host_profiles.display_name or a view).
//   * vibes/tagline/area/tags live in listings.metadata, written by the engine
//     listing editor. We read them defensively and degrade when absent.
//   * Editor's picks come from the curated_listings table (wired separately).

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { queryClient } from "./query-client";
import { useAuth } from "./auth";
import type {
  Category as DbCategory,
  ListingMetadata,
  ListingWithCapacity,
} from "./database.types";
import type { Friend, Spot, Vibe } from "./spots";
import { CATEGORIES as MOCK_CATEGORIES, CITY_LABELS, centsToRand } from "./format";

/** The demo catalogue is only downloaded for the showcase account. */
const loadMock = () => import("./spots");
import fallbackImage from "@/assets/spot-nightlife.jpg";

export const FALLBACK_IMAGE = fallbackImage;

/** Curated "Featured" slots live this long before they reset (reels-style). */
export const FEATURED_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * What the guest app reads from listings_with_capacity — named columns, never
 * `*`, so internal fields (search_tsv, compliance, health_score…) stay off the
 * wire (GST-L02-10).
 */
const LISTING_COLUMNS =
  "id, host_id, category_id, title, description, status, booking_mode, base_price_cents, capacity, " +
  "lat, lng, address, city, amenities, cover_url, metadata, created_at, listing_type, capacity_booked, " +
  "custom_questions, refund_policy, rating_avg, review_count, cancelled_at, starts_at, ends_at";

/** Cards per page on lists that load more as you go (Saved, a Spot's page). */
export const PAGE_SIZE = 24;

/**
 * PostgREST `or` filter: still on sale, i.e. the event's end (or its start
 * when no end is set) is in the future, or it's a venue with no date at all.
 * Mirrors reserve_booking's EVENT_ENDED check (GST-L03-01).
 */
function notEndedFilter(): string {
  const now = new Date().toISOString();
  return `ends_at.gt.${now},and(ends_at.is.null,starts_at.is.null),and(ends_at.is.null,starts_at.gt.${now})`;
}

/** Same rule as notEndedFilter, for a row already loaded. */
export function hasEnded(startsAt: string | null | undefined, endsAt: string | null | undefined): boolean {
  const end = endsAt ?? startsAt;
  return !!end && new Date(end).getTime() < Date.now();
}

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
  hostNameById?: Map<string, string>;
  nextSlotByListing?: Map<string, string>;
}

/** Map a live listing row onto the UI `Spot` shape. */
export function listingToSpot(row: ListingWithCapacity, extras: ListingExtras): Spot {
  const meta = (row.metadata ?? {}) as ListingMetadata;
  const cat = row.category_id ? extras.categories.get(row.category_id) : undefined;
  const parent = cat?.parentId ? extras.categories.get(cat.parentId) : undefined;
  const hostSlug = extras.hostSlugById.get(row.host_id) ?? "";
  const hostName = extras.hostNameById?.get(row.host_id) || prettifySlug(hostSlug);

  const metaDate = (meta as { date?: string }).date;
  const nextSlot = extras.nextSlotByListing?.get(row.id);
  // listings.starts_at is the event date (SHR-L03-03); metadata.date is legacy.
  const date = row.starts_at || metaDate || nextSlot || row.created_at;

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
    price: centsToRand(row.base_price_cents),
    // Aggregated by the database (GST-L02-11), not averaged here from review rows.
    rating: row.rating_avg != null ? Math.round(Number(row.rating_avg) * 10) / 10 : 0,
    reviews: Number(row.review_count ?? 0),
    image: row.cover_url || FALLBACK_IMAGE,
    imageFallback: FALLBACK_IMAGE,
    capacityBooked: row.capacity_booked ?? 0,
    capacityMax: row.capacity ?? 0,
    distanceKm: 0,
    friendsGoing: [] as Friend[],
    hours: formatOpeningHours(meta),
    hostName,
    hostSlug,
    address: row.address ?? "",
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    tags: meta.tags ?? row.amenities ?? [],
    customQuestions: (row.custom_questions as unknown as Spot["customQuestions"]) ?? [],
    bookingMode: row.booking_mode ?? undefined,
    rooms: readRooms(meta),
    refundPolicy: row.refund_policy ?? undefined,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    ended: hasEnded(row.starts_at, row.ends_at),
  };
}

function readRooms(meta: ListingMetadata): Spot["rooms"] {
  const raw = (meta as { rooms?: unknown }).rooms;
  if (!Array.isArray(raw)) return undefined;
  const rooms = raw
    .filter((r): r is { name: string; capacity?: number; price_cents?: number } =>
      !!r && typeof r === "object" && typeof (r as { name?: unknown }).name === "string")
    .map((r) => ({
      name: r.name,
      capacity: typeof r.capacity === "number" ? r.capacity : undefined,
      price: centsToRand(typeof r.price_cents === "number" ? r.price_cents : 0),
    }));
  return rooms.length > 0 ? rooms : undefined;
}

// ---------------------------------------------------------------------------
// Shared fetch of the bits needed to enrich a set of listing rows
// ---------------------------------------------------------------------------

/** Categories change rarely: one cached copy serves every list (GST-L03-09). */
function fetchCategories(): Promise<Map<string, CategoryNode>> {
  return queryClient.fetchQuery({
    queryKey: [...listingKeys.categories, "map"],
    queryFn: loadCategories,
    staleTime: 10 * 60_000,
  });
}

async function loadCategories(): Promise<Map<string, CategoryNode>> {
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
  const hostIds = [...new Set(rows.map((r) => r.host_id))];

  const [categories, hostsRes] = await Promise.all([
    fetchCategories(),
    supabase.from("public_host_profiles").select("user_id, slug, display_name").in("user_id", hostIds),
  ]);

  if (hostsRes.error) throw hostsRes.error;

  const hostSlugById = new Map<string, string>();
  const hostNameById = new Map<string, string>();
  for (const h of (hostsRes.data ?? []) as { user_id: string; slug: string; display_name: string | null }[]) {
    hostSlugById.set(h.user_id, h.slug);
    if (h.display_name) hostNameById.set(h.user_id, h.display_name);
  }

  return rows.map((row) => listingToSpot(row, { categories, hostSlugById, hostNameById }));
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export const listingKeys = {
  all: ["listings"] as const,
  list: (filters: ListingFilters) => ["listings", "list", filters] as const,
  detail: (id: string | undefined) => ["listings", "detail", id] as const,
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

async function filterMockSpots(filters: ListingFilters): Promise<Spot[]> {
  const ql = (filters.query ?? "").trim().toLowerCase();
  const { spots: mockSpots } = await loadMock();
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
        .select(LISTING_COLUMNS)
        .eq("status", "live")
        .or(notEndedFilter())
        // Soonest events first; venues (no date) after, newest first.
        .order("starts_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 60);

      if (filters.city && filters.city !== "All") {
        // Map display name → metro (e.g. "Joburg" → "Johannesburg"). Filter on
        // metro, not the typed city, so Sandton, Umhlanga or Milnerton listings
        // show under their city (WEB-L03-02).
        const metro = CITY_LABELS[filters.city] ?? filters.city;
        q = q.eq("metro", metro);
      }
      if (filters.query && filters.query.trim()) {
        q = q.textSearch("search_tsv", filters.query.trim(), {
          type: "websearch",
          config: "english",
        });
      }
      if (filters.category && filters.category !== "All") {
        // A card's category is its top-level name, so a chip matches that
        // category and its children. Filtered here, before the limit, so the
        // chip shows the whole category and not a slice of the newest 60.
        const categories = await fetchCategories();
        const ids = [...categories.values()]
          .filter((c) => (c.parentId ? categories.get(c.parentId)?.name : c.name) === filters.category)
          .map((c) => c.id);
        if (ids.length === 0) return [];
        q = q.in("category_id", ids);
      }

      const { data, error } = await q;
      if (error) throw error;
      return enrichListings((data ?? []) as unknown as ListingWithCapacity[]);
    },
  });
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useListing(id: string | undefined) {
  const demo = useIsDemo();
  return useQuery({
    queryKey: [...listingKeys.detail(id), demo],
    enabled: !!id,
    queryFn: async (): Promise<Spot | null> => {
      if (demo) return (await loadMock()).getSpot(id!) ?? null;
      if (!UUID_RE.test(id!)) return null;
      const { data, error } = await supabase
        .from("listings_with_capacity")
        .select(LISTING_COLUMNS)
        .eq("id", id!)
        .eq("status", "live")
        // Ended events stay readable here: the page says "This event has ended".
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [spot] = await enrichListings([data as unknown as ListingWithCapacity]);
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
    const { getSpot: getMockSpot } = await loadMock();
    for (const id of ids) {
      const s = getMockSpot(id);
      if (s) map.set(id, s);
    }
    return map;
  }
  // Every id goes into the URL, and PostgREST refuses past ~678 of them
  // (GST-L03-04), so ask in batches.
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_BATCH) batches.push(ids.slice(i, i + ID_BATCH));
  const results = await Promise.all(
    batches.map((batch) => supabase.from("listings_with_capacity").select(LISTING_COLUMNS).in("id", batch)),
  );
  const rows: ListingWithCapacity[] = [];
  for (const { data, error } of results) {
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as ListingWithCapacity[]));
  }
  const spots = await enrichListings(rows);
  for (const s of spots) map.set(s.id, s);
  return map;
}

/** Ids per `.in()` request: keeps the URL far below the server's limit. */
const ID_BATCH = 100;

/** The Saved page: newest saves first, a page at a time. */
export function useSavedSpots() {
  const demo = useIsDemo();
  const { user } = useAuth();
  const local = !user || demo;
  return useInfiniteQuery({
    queryKey: ["saves", "spots", local, user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ spots: Spot[]; total: number }> => {
      let ids: string[];
      let total: number;
      if (local) {
        // Demo + signed-out saves live in this browser (store.ts).
        const all = (await import("./store")).getSaved();
        total = all.length;
        ids = all.slice(pageParam, pageParam + PAGE_SIZE);
      } else {
        const { data, error, count } = await supabase
          .from("saves")
          .select("listing_id", { count: "exact" })
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);
        if (error) throw error;
        ids = (data ?? []).map((r) => r.listing_id);
        total = count ?? ids.length;
      }
      const map = await loadSpotsByIds(ids, demo);
      // Keep save order; a save whose listing is gone simply doesn't show.
      return { spots: ids.map((id) => map.get(id)).filter((s): s is Spot => !!s), total };
    },
    getNextPageParam: (last, pages) => {
      const next = pages.length * PAGE_SIZE;
      return next < last.total ? next : undefined;
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
      if (demo) return (await loadMock()).editorsPicks();
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
      // Preserve the curator's order; drop any that no longer resolve or ended.
      return ids.map((id) => map.get(id)).filter((s): s is Spot => !!s && !s.ended);
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
        const h = (await loadMock()).getHost(slug!);
        if (!h) return null;
        return {
          slug: h.slug,
          userId: h.slug,
          name: h.name,
          bio: h.bio,
          heroUrl: h.events[0]?.image ?? null,
          city: h.city,
          verified: true,
        };
      }
      const { data: host, error: hErr } = await supabase
        .from("public_host_profiles")
        .select("user_id, slug, display_name, bio, hero_url, city, verified")
        .eq("slug", slug!)
        .maybeSingle();
      if (hErr) throw hErr;
      if (!host?.user_id || !host.slug) return null;
      return {
        slug: host.slug,
        userId: host.user_id,
        name: host.display_name || prettifySlug(host.slug),
        bio: host.bio,
        heroUrl: host.hero_url,
        city: host.city,
        verified: !!host.verified,
      };
    },
  });
}

/** A Spot's live listings, soonest first, ended events left out, a page at a time. */
export function useHostSpots(host: HostBundle | null | undefined) {
  const demo = useIsDemo();
  return useInfiniteQuery({
    queryKey: [...listingKeys.host(host?.slug), "spots", demo],
    enabled: !!host,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ spots: Spot[]; total: number }> => {
      if (demo) {
        const events = (await loadMock()).getHost(host!.slug)?.events ?? [];
        return { spots: pageParam === 0 ? events : [], total: events.length };
      }
      const { data, error, count } = await supabase
        .from("listings_with_capacity")
        .select(LISTING_COLUMNS, { count: "exact" })
        .eq("host_id", host!.userId)
        .eq("status", "live")
        .or(notEndedFilter())
        .order("starts_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      const spots = await enrichListings((data ?? []) as unknown as ListingWithCapacity[]);
      return { spots, total: count ?? spots.length };
    },
    getNextPageParam: (last, pages) => {
      const next = pages.length * PAGE_SIZE;
      return next < last.total ? next : undefined;
    },
  });
}
