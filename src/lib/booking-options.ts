// What a guest can choose when booking a spot: a ticket tier (events), a time
// slot (slot listings) or a room (stays). The server (reserve_booking) re-checks
// the choice belongs to the listing and charges ITS price for it; the price
// shown here is for display only.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { centsToRand } from "./format";
import { UUID_RE } from "./listings-api";
import type { Spot } from "./spots";

export interface BookingOption {
  kind: "tier" | "slot" | "room";
  /** ticket_type id, availability id, or room name. */
  id: string;
  label: string;
  detail?: string;
  /** Rand per ticket / person / room. */
  unitPrice: number;
}

export interface SelectedOption {
  ticketTypeId?: string;
  slotId?: string;
  room?: string;
  label: string;
  unitPrice: number;
}

export function toSelected(option: BookingOption): SelectedOption {
  return {
    ticketTypeId: option.kind === "tier" ? option.id : undefined,
    slotId: option.kind === "slot" ? option.id : undefined,
    room: option.kind === "room" ? option.id : undefined,
    label: option.label,
    unitPrice: option.unitPrice,
  };
}

const slotFormat = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Johannesburg",
});

export function useBookingOptions(spot: Spot | null | undefined, demo: boolean) {
  const id = spot?.id;
  return useQuery<BookingOption[]>({
    queryKey: ["booking-options", id, demo],
    enabled: !!id && !demo && UUID_RE.test(id),
    staleTime: 30_000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const [tiersRes, slotsRes] = await Promise.all([
        supabase
          .from("ticket_types")
          .select("id, name, description, price_kobo, sale_starts_at, sale_ends_at, sort_order")
          .eq("listing_id", id!)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),
        spot!.bookingMode === "slot"
          ? supabase
              .from("availability")
              .select("id, starts_at, ends_at, price_override_kobo")
              .eq("listing_id", id!)
              .eq("status", "open")
              .gt("starts_at", now)
              .order("starts_at", { ascending: true })
              .limit(60)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (tiersRes.error) throw tiersRes.error;
      if (slotsRes.error) throw slotsRes.error;

      const nowMs = Date.now();
      const tiers = (tiersRes.data ?? []).filter(
        (t) =>
          (!t.sale_starts_at || new Date(t.sale_starts_at).getTime() <= nowMs) &&
          (!t.sale_ends_at || new Date(t.sale_ends_at).getTime() > nowMs),
      );
      if (tiers.length > 0) {
        return tiers.map((t) => ({
          kind: "tier" as const,
          id: t.id,
          label: t.name,
          detail: t.description ?? undefined,
          unitPrice: centsToRand(t.price_kobo),
        }));
      }

      const slots = (slotsRes.data ?? []) as Array<{
        id: string;
        starts_at: string;
        ends_at: string;
        price_override_kobo: number | null;
      }>;
      if (slots.length > 0) {
        return slots.map((s) => ({
          kind: "slot" as const,
          id: s.id,
          label: slotFormat.format(new Date(s.starts_at)),
          unitPrice: s.price_override_kobo != null ? centsToRand(s.price_override_kobo) : spot!.price,
        }));
      }

      return (spot!.rooms ?? []).map((r) => ({
        kind: "room" as const,
        id: r.name,
        label: r.name,
        detail: r.capacity ? `Sleeps ${r.capacity}` : undefined,
        unitPrice: r.price,
      }));
    },
  });
}
