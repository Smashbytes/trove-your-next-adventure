// Onboarding selections + personalization, persisted locally (no schema column
// exists for guest interests/city/prefs yet). The discover feed reads `city` to
// default the user's location filter; `interests` can later re-rank the feed.

const KEY = "trove:guest-prefs";

export interface GuestPrefs {
  interests: string[];
  city: string | null;
  dob: string | null;
  gender: string | null;
  notifs: { recommendations: boolean; reminders: boolean; trending: boolean };
  onboarded: boolean;
}

const DEFAULTS: GuestPrefs = {
  interests: [],
  city: null,
  dob: null,
  gender: null,
  notifs: { recommendations: true, reminders: true, trending: true },
  onboarded: false,
};

export function getGuestPrefs(): GuestPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const v = localStorage.getItem(KEY);
    return v ? { ...DEFAULTS, ...(JSON.parse(v) as Partial<GuestPrefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function patchGuestPrefs(patch: Partial<GuestPrefs>): GuestPrefs {
  const next = { ...getGuestPrefs(), ...patch };
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function hasOnboarded(): boolean {
  return getGuestPrefs().onboarded;
}
