import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { HostProfile, Profile } from './database.types';
import { forgetPersonalPrefs, hydratePrefsFromProfile } from './guest-prefs';
import { queryClient } from './query-client';
import { clearCheckoutIntent, clearPendingPayment } from './store';

// ---------------------------------------------------------------------------
// Sign-out after 14 days without use (D-059, GST-L04-03)
// ---------------------------------------------------------------------------
// The Free plan can't time-box sessions on the server, so the app does it (the
// same rule as the Engine): every visit and interaction stamps this device; a
// session found more than 14 days after the last stamp is signed out before
// anything loads.

const LAST_ACTIVE_KEY = 'trove:last-active';
const IDLE_LIMIT_MS = 14 * 24 * 60 * 60 * 1000;
const STAMP_EVERY_MS = 5 * 60 * 1000;
/** Shown once on the next screen after the app signs someone out by itself. */
export const SIGNED_OUT_NOTICE_KEY = 'trove:signed-out-notice';
const IDLE_NOTICE =
  "You were signed out because this device hadn't used TROVE for 14 days. Sign in again to continue.";

function readLastActive(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_ACTIVE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function stampActive(force = false) {
  try {
    const last = readLastActive();
    if (force || !last || Date.now() - last > STAMP_EVERY_MS) {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    }
  } catch {
    // Storage blocked (private mode): the idle rule just doesn't apply.
  }
}

function idleTooLong(): boolean {
  const last = readLastActive();
  return last !== null && Date.now() - last > IDLE_LIMIT_MS;
}

function leaveNotice(message: string) {
  try {
    sessionStorage.setItem(SIGNED_OUT_NOTICE_KEY, message);
  } catch {
    // ignore
  }
}

/** Nothing from the last guest stays on the device or in memory (GST-L04-01). */
function forgetDeviceData() {
  queryClient.clear();
  forgetPersonalPrefs();
  try {
    clearPendingPayment();
    clearCheckoutIntent();
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

// supabase-js keeps the session when the logout request fails (no signal),
// with any scope: it returns the error before removing the stored session
// (GST-L04-02). Drop this device's copy ourselves; the caller reloads so the
// client starts from the cleared storage.
function forgetSessionOnThisDevice() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.includes('-auth-token')) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  forgetDeviceData();
}

// One profile request per signed-in user for the whole page (module scope, so
// it survives the provider remounting during hydration).
let profileRequest: { userId: string; promise: Promise<Profile | null> } | null = null;

function loadProfileOnce(userId: string, force: boolean): Promise<Profile | null> {
  if (!force && profileRequest?.userId === userId) return profileRequest.promise;
  const request = { userId, promise: Promise.resolve<Profile | null>(null) };
  request.promise = (async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.error('[auth] profiles fetch failed:', error);
      if (profileRequest === request) profileRequest = null; // let the next call retry
    }
    return (data ?? null) as Profile | null;
  })();
  profileRequest = request;
  return request.promise;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  hostProfile: HostProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHost: boolean;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  /** `alreadyRegistered`: Supabase sent no code because the email has an account (GST-L04-06). */
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; alreadyRegistered: boolean }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  /** Signs out everywhere; if the request fails, at least this device is signed out (page reloads). */
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The shared Supabase project's Site URL points at the engine, so the guest app
// MUST pin its own redirect target — otherwise confirmation emails bounce users
// to the engine. Use the configured public URL in production, origin in dev.
const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "");
function guestAppUrl(): string {
  if (PUBLIC_SITE_URL) return PUBLIC_SITE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://trove-your-next-adventure.pages.dev";
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const safetyTimeout = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 8000);

    // Email links (/reset-password, the sign-up confirmation) sign the guest in
    // on purpose, so an old stamp must not sign them straight back out.
    const fromEmailLink =
      window.location.pathname.startsWith('/reset-password') ||
      new URLSearchParams(window.location.search).has('verified');

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        if (session && !fromEmailLink && idleTooLong()) {
          leaveNotice(IDLE_NOTICE);
          const { error } = await supabase.auth.signOut({ scope: 'local' });
          if (error) {
            forgetSessionOnThisDevice();
            window.location.reload();
            return;
          }
          if (cancelled) return;
          session = null;
        } else if (session) {
          stampActive(fromEmailLink);
        }
        setSession(session);
        if (session) fetchProfile(session.user.id);
        else setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[auth] getSession failed:', error);
        setIsLoading(false);
      });

    // IMPORTANT: this callback runs while supabase-js holds its auth lock. Never
    // await another Supabase call in here: it waits for the same lock and
    // deadlocks every later auth call (sign-out, sign-in, token refresh) —
    // the "Sign out does nothing" bug. Profile loads are deferred instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setSession(session);
      if (session) {
        setShowAuthModal(false);
        // A token refresh doesn't change who is signed in; skip the refetch.
        if (event !== 'TOKEN_REFRESHED') {
          setTimeout(() => {
            if (!cancelled) void fetchProfile(session.user.id, event === 'USER_UPDATED');
          }, 0);
        }
      } else {
        profileRequest = null;
        setProfile(null);
        setHostProfile(null);
        setIsLoading(false);
        setShowAuthModal(false);
        // Any sign-out (button, idle rule, session ended elsewhere) leaves
        // nothing personal behind for the next person on this device.
        if (event === 'SIGNED_OUT') forgetDeviceData();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // D-059: keep stamping while the guest uses the app; a tab left open for 14
  // days is signed out the moment it's looked at again.
  const signedIn = !!session;
  useEffect(() => {
    if (!signedIn) return;
    const onActivity = () => stampActive();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (idleTooLong()) {
        leaveNotice(IDLE_NOTICE);
        void supabase.auth.signOut({ scope: 'local' }).then(({ error }) => {
          if (error) forgetSessionOnThisDevice();
          window.location.replace('/');
        });
        return;
      }
      stampActive();
    };
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn]);

  // getSession() and the INITIAL_SESSION / SIGNED_IN events all report the same
  // user on load, and the provider can mount twice while the page hydrates:
  // they all share one request per user (GST-L02-10). Explicit refreshes
  // (refreshProfile, USER_UPDATED) pass force.
  async function fetchProfile(userId: string, force = false) {
    setIsLoading(true);
    try {
      const p = await loadProfileOnce(userId, force);
      setProfile(p);
      // The account is the source of truth for onboarding/Settings choices.
      if (p) hydratePrefsFromProfile(p);
      // The guest app never needs the host's private Spot row (payout details
      // live there); hosts manage it in the Engine.
      setHostProfile(null);
    } catch (error) {
      console.error('[auth] fetchProfile threw:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      stampActive(true);
      setShowAuthModal(false);
    }
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Fallback redirect in case user clicks a link instead of entering OTP.
        emailRedirectTo: `${guestAppUrl()}/onboarding?verified=1`,
      },
    });
    if (error) return { error: error.message, alreadyRegistered: false };
    // Supabase hides whether an email is taken: for an existing account it
    // returns a user with no identities and sends nothing.
    const alreadyRegistered = !!data.user && (data.user.identities?.length ?? 0) === 0;
    return { error: null, alreadyRegistered };
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (!error) stampActive(true);
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${guestAppUrl()}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  /**
   * Sign out everywhere (revokes the refresh token on the server). If the
   * request fails or stalls, sign this device out anyway and reload, so the
   * button never "does nothing" and the session can't come back (GST-L04-02).
   */
  const signOut = async (): Promise<void> => {
    let failed = false;
    try {
      const result = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: Error }>((resolve) =>
          setTimeout(() => resolve({ error: new Error('sign-out timed out') }), 6000),
        ),
      ]);
      if (result.error) {
        console.error('[auth] sign-out failed:', result.error);
        failed = true;
      }
    } catch (error) {
      console.error('[auth] sign-out threw:', error);
      failed = true;
    }
    if (!failed) {
      forgetDeviceData();
      setSession(null);
      setProfile(null);
      setHostProfile(null);
      return;
    }
    // The request didn't reach TROVE. Sign this device out anyway and say so:
    // the session may still be live on other devices.
    forgetSessionOnThisDevice();
    leaveNotice(
      "Signed out on this device. We couldn't reach TROVE, so you may still be signed in on other devices. Sign in and out again when you're back online.",
    );
    window.location.replace('/');
  };

  const refreshProfile = async () => {
    if (session) await fetchProfile(session.user.id, true);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      hostProfile,
      isLoading,
      isAuthenticated: !!session,
      isHost: !!profile?.is_host,
      showAuthModal,
      openAuthModal: () => setShowAuthModal(true),
      closeAuthModal: () => setShowAuthModal(false),
      signInWithEmail,
      signUpWithEmail,
      verifyEmailOtp,
      resetPassword,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
