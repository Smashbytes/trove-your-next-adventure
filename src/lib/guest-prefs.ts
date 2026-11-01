// Guest onboarding/Settings choices. The account (`profiles` columns from
// migration 0031) is the source of truth; localStorage is a fast cache that
// also covers signed-out browsing. On sign-in the profile values replace the
// cache (see `hydratePrefsFromProfile`); every change goes to both
// (`saveGuestPrefs`). Product-analytics consent and the "onboarded" flag stay
// per-device on purpose.
//
// Shared phones (GST-L04-01): the personal fields are tagged with the account
// they belong to (`owner`) and wiped on sign-out, so the next person to sign in
// on this device never sees, or inherits, someone else's birthday or gender.

import { supabase } from "./supabase";
import type { Profile } from "./database.types";

const KEY = "trove:guest-prefs";

export interface GuestPrefs {
  interests: string[];
  city: string | null;
  dob: string | null;
  gender: string | null;
  notifs: { recommendations: boolean; reminders: boolean; trending: boolean };
  onboarded: boolean;
  /** PostHog product analytics — on by default (Privacy Policy: legitimate
   * interest, anonymised), switchable in Settings → Privacy & data. */
  analytics: boolean;
  /** Whose personal fields these are: an account id, `null` for choices made
   * here while signed out. Missing on caches written before GST-L04-01. */
  owner?: string | null;
}

const DEFAULTS: GuestPrefs = {
  interests: [],
  city: null,
  dob: null,
  gender: null,
  notifs: { recommendations: true, reminders: true, trending: true },
  onboarded: false,
  analytics: true,
};

const PERSONAL: Array<keyof GuestPrefs> = ["interests", "city", "dob", "gender", "notifs"];

export function getGuestPrefs(): GuestPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const v = localStorage.getItem(KEY);
    return v ? { ...DEFAULTS, ...(JSON.parse(v) as Partial<GuestPrefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Update the device cache only. */
export function patchGuestPrefs(patch: Partial<GuestPrefs>): GuestPrefs {
  const next = { ...getGuestPrefs(), ...patch };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: the account copy still holds it */
    }
  }
  return next;
}

export function hasOnboarded(): boolean {
  return getGuestPrefs().onboarded;
}

type ProfilePrefsUpdate = {
  interests?: string[];
  city?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  notification_prefs?: GuestPrefs["notifs"];
};

function toProfileColumns(patch: Partial<GuestPrefs>): ProfilePrefsUpdate {
  const cols: ProfilePrefsUpdate = {};
  if (patch.interests !== undefined) cols.interests = patch.interests;
  if (patch.city !== undefined) cols.city = patch.city;
  if (patch.dob !== undefined) cols.date_of_birth = patch.dob || null;
  if (patch.gender !== undefined) cols.gender = patch.gender || null;
  if (patch.notifs !== undefined) cols.notification_prefs = patch.notifs;
  return cols;
}

/**
 * Save choices to the device and, when signed in, to the account.
 * Throws if the account update fails, so callers can tell the guest.
 */
export async function saveGuestPrefs(userId: string | null | undefined, patch: Partial<GuestPrefs>) {
  const personal = PERSONAL.some((k) => patch[k] !== undefined);
  const next = patchGuestPrefs(personal ? { ...patch, owner: userId ?? null } : patch);
  const cols = toProfileColumns(patch);
  if (userId && Object.keys(cols).length) {
    const { error } = await supabase.from("profiles").update(cols).eq("id", userId);
    if (error) throw error;
  }
  return next;
}

/** Sign-out: drop the personal fields; analytics consent and "onboarded" stay. */
export function forgetPersonalPrefs() {
  const { analytics, onboarded } = getGuestPrefs();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS, analytics, onboarded, owner: null }));
  } catch {
    /* storage blocked: nothing was cached either */
  }
}

/**
 * Called when the profile loads. The account wins; but if the account has never
 * stored choices and this device has some that were picked here while signed
 * out, push those up once instead of wiping them. Another account's cache, or
 * an untagged one, is never copied (GST-L04-01).
 */
export function hydratePrefsFromProfile(profile: Profile) {
  const local = getGuestPrefs();
  const serverEmpty =
    (profile.interests ?? []).length === 0 && !profile.date_of_birth && !profile.gender;
  const localHasData = local.interests.length > 0 || !!local.dob || !!local.gender;

  if (serverEmpty && localHasData && local.owner === null) {
    void saveGuestPrefs(profile.id, {
      interests: local.interests,
      dob: local.dob,
      gender: local.gender,
      notifs: local.notifs,
      ...(profile.city ? {} : { city: local.city }),
    }).catch((e) => console.error("[prefs] couldn't copy device choices to the account", e));
    return;
  }

  const notifs = profile.notification_prefs as Partial<GuestPrefs["notifs"]> | null;
  const ownCache = local.owner === profile.id || local.owner === null;
  patchGuestPrefs({
    owner: profile.id,
    interests: profile.interests ?? [],
    city: profile.city ?? (ownCache ? local.city : null),
    dob: profile.date_of_birth ?? null,
    gender: profile.gender ?? null,
    notifs: { ...DEFAULTS.notifs, ...(notifs ?? {}) },
  });
}
