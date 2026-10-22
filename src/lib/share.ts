// Social sharing — rich link previews + TROVE short links.
//
//  • Open Graph: /spot/$id renders og:* tags server-side (see spotOgMeta), with
//    og:image pointing at the `og-image` edge fn (branded 1200×630 JPEG).
//  • Short links: welovetrove.co.za/s/<code> → `share-redirect` edge fn →
//    /spot/<id>?ref=<code>. Minted by the get_share_link RPC (migration 0027).
//  • Attribution: the ref is remembered and credited to the booking from the
//    ticket page (attribute_booking_share, migration 0028).
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const GUEST_APP_URL = "https://trove-your-next-adventure.pages.dev";
export const SHORT_LINK_BASE = "https://www.welovetrove.co.za/s/";

export const spotUrl = (listingId: string) => `${GUEST_APP_URL}/spot/${listingId}`;
export const ogImageUrl = (listingId: string) =>
  `${SUPABASE_URL}/functions/v1/og-image?listing=${listingId}`;

// ---------------------------------------------------------------------------
// Open Graph data for the spot page <head>
// ---------------------------------------------------------------------------

export interface SpotOg {
  id: string;
  title: string;
  description: string;
}

/**
 * Minimal listing read for link previews. Plain PostgREST fetch so it runs the
 * same in the SSR worker (where crawlers land) and the browser. Never throws —
 * a failed lookup just falls back to the site-wide tags in __root.
 */
export async function fetchSpotOg(id: string): Promise<SpotOg | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings_with_capacity?id=eq.${id}&status=eq.live&select=id,title,city,base_price_cents,metadata,description`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        // A slow lookup mustn't hold up the page for a crawler (GST-L02-08).
        // (Runs in the Cloudflare worker, which has AbortSignal.timeout.)
        signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(4_000) : undefined,
      },
    );
    if (!res.ok) return null;
    const [row] = (await res.json()) as Array<{
      id: string;
      title: string;
      city: string | null;
      base_price_cents: number | null;
      metadata: { tagline?: string; date?: string } | null;
      description: string | null;
    }>;
    if (!row) return null;

    const meta = row.metadata ?? {};
    const date = meta.date
      ? new Intl.DateTimeFormat("en-ZA", {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: "Africa/Johannesburg",
        }).format(new Date(meta.date))
      : null;
    // Values are ZAR cents.
    const price = row.base_price_cents ? `From R${Math.round(row.base_price_cents / 100)}` : "Free entry";
    const lead = meta.tagline || (row.description ?? "").replace(/\s+/g, " ").slice(0, 120);
    const facts = [date, row.city, price].filter(Boolean).join(" · ");

    return {
      id: row.id,
      title: row.title,
      description: [facts, lead].filter(Boolean).join(" — "),
    };
  } catch {
    return null;
  }
}

/** og:/twitter: tags for a spot. Child-route meta overrides __root's by name/property. */
export function spotOgMeta(og: SpotOg) {
  const title = `${og.title} — TROVE`;
  const image = ogImageUrl(og.id);
  return [
    { title },
    { name: "description", content: og.description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "TROVE" },
    { property: "og:locale", content: "en_ZA" },
    { property: "og:url", content: spotUrl(og.id) },
    { property: "og:title", content: og.title },
    { property: "og:description", content: og.description },
    { property: "og:image", content: image },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `${og.title} on TROVE` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: og.title },
    { name: "twitter:description", content: og.description },
    { name: "twitter:image", content: image },
  ];
}

// ---------------------------------------------------------------------------
// Short links + the share sheet
// ---------------------------------------------------------------------------

/**
 * The signed-in guest's personal short link for a spot (idempotent — the RPC
 * returns the same code every time). Falls back to the canonical spot URL when
 * signed out or if minting fails, so sharing never breaks.
 */
export async function guestShareUrl(listingId: string, signedIn: boolean): Promise<string> {
  if (!signedIn) return spotUrl(listingId);
  // get_share_link isn't in the generated types yet (migration 0027).
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: { code: string } | null; error: unknown }>)("get_share_link", {
    p_listing_id: listingId,
    p_channel: "link",
    p_kind: "guest",
  });
  if (error || !data?.code) return spotUrl(listingId);
  return SHORT_LINK_BASE + data.code;
}

// ---------------------------------------------------------------------------
// Attribution — which short link led to a booking
// ---------------------------------------------------------------------------
// share-redirect lands guests on /spot/<id>?ref=<code>. We remember the code
// per listing (last click wins, 30-day window) and, once the guest is looking
// at their ticket, hand it to attribute_booking_share (migration 0028).

const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REF_CODE_RE = /^[A-Za-z0-9]{4,16}$/;
const refKey = (listingId: string) => `trove.share-ref.${listingId}`;

export function rememberShareRef(listingId: string, code: string | null) {
  if (!code || !REF_CODE_RE.test(code)) return;
  try {
    localStorage.setItem(refKey(listingId), JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* storage blocked — attribution is best-effort */
  }
}

function peekShareRef(listingId: string): string | null {
  try {
    const raw = localStorage.getItem(refKey(listingId));
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code: string; at: number };
    if (Date.now() - at > REF_TTL_MS || !REF_CODE_RE.test(code)) {
      localStorage.removeItem(refKey(listingId));
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

/** Credit a booking to the share link the guest arrived through, if any. */
export async function attributeBookingShare(bookingId: string, listingId: string): Promise<void> {
  const code = peekShareRef(listingId);
  if (!code) return;
  const { error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: unknown }>)("attribute_booking_share", {
    p_booking_id: bookingId,
    p_code: code,
  });
  // Any definitive answer (attributed, already attributed, or not eligible)
  // consumes the ref; a network error leaves it for the next ticket view.
  if (!error) {
    try {
      localStorage.removeItem(refKey(listingId));
    } catch {
      /* ignore */
    }
  }
}

export type ShareOutcome = "shared" | "copied" | "dismissed" | "failed";

/** Native share sheet on mobile, clipboard everywhere else. */
export async function shareLink(opts: { url: string; title: string; text: string }): Promise<ShareOutcome> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(opts);
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(opts.url);
      return "copied";
    }
    return "failed";
  } catch (e) {
    return (e as Error)?.name === "AbortError" ? "dismissed" : "failed";
  }
}
