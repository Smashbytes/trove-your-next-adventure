import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
}

// Every request gets a time limit (GST-L02-08), so a stalled network shows
// "taking too long, try again" instead of a spinner that never ends.
// Paid checkout talks to TradeSafe several times (each capped at 12 s
// server-side), and photo uploads move real bytes, so they get longer.
const DEFAULT_TIMEOUT_MS = 20_000;
function timeoutFor(input: RequestInfo | URL): number {
  const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (u.includes('/functions/v1/tradesafe-initialize')) return 60_000;
  if (u.includes('/functions/v1/')) return 30_000;
  if (u.includes('/storage/v1/')) return 60_000;
  return DEFAULT_TIMEOUT_MS;
}

// Plain AbortController + setTimeout: AbortSignal.any/timeout are missing on
// iPhones before iOS 17.4 / 16, and a guest on an older phone must still load.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('The request timed out.', 'TimeoutError')),
    timeoutFor(input),
  );
  // Keep the caller's own abort (e.g. React Query cancelling) working too.
  const outer = init?.signal;
  const onAbort = () => controller.abort(outer?.reason);
  if (outer) {
    if (outer.aborted) onAbort();
    else outer.addEventListener('abort', onAbort, { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onAbort);
  });
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: { fetch: fetchWithTimeout },
});
