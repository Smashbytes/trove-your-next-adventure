// Closing an account (SHR-L03-04): request → 14 days to change your mind →
// anonymised by the daily sweep. Bookings, tickets and payments are kept.
// The database refuses while money or events are still in flight and says why.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ClosureBlocker = { code: string; count: number; message: string };

export type AccountClosure = {
  requestedAt: string | null;
  wipeAfter: string | null;
  blockers: ClosureBlocker[];
};

type RawClosure = { requested_at: string | null; wipe_after: string | null; blockers: ClosureBlocker[] | null };

const KEY = ["account-closure"] as const;

/** Blockers (if not requested yet) and the closing date (if requested). */
export function useAccountClosure(enabled = true) {
  return useQuery<AccountClosure>({
    queryKey: KEY,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_account_closure" as never);
      if (error) throw error;
      const raw = (data ?? {}) as unknown as RawClosure;
      return { requestedAt: raw.requested_at ?? null, wipeAfter: raw.wipe_after ?? null, blockers: raw.blockers ?? [] };
    },
  });
}

/** Ask to close the account. `ok: false` comes with the blockers to finish first. */
export function useRequestAccountClosure() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; wipeAfter: string | null; blockers: ClosureBlocker[] }, Error, string>({
    mutationFn: async (reason) => {
      const { data, error } = await supabase.rpc("request_account_closure" as never, { p_reason: reason || null } as never);
      if (error) throw error;
      const raw = data as unknown as { ok: boolean; wipe_after?: string | null; blockers?: ClosureBlocker[] };
      return { ok: !!raw.ok, wipeAfter: raw.wipe_after ?? null, blockers: raw.blockers ?? [] };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Keep the account (only during the 14 days). */
export function useCancelAccountClosure() {
  const qc = useQueryClient();
  return useMutation<boolean, Error, void>({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("cancel_account_closure" as never);
      if (error) throw error;
      return !!data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** "21 October 2026" in SAST. */
export function closingDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });
}
