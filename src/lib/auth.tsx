import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { HostProfile, Profile } from './database.types';
import { hydratePrefsFromProfile } from './guest-prefs';

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
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<boolean>;
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

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
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
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

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
    if (!error) setShowAuthModal(false);
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Fallback redirect in case user clicks a link instead of entering OTP.
        emailRedirectTo: `${guestAppUrl()}/onboarding?verified=1`,
      },
    });
    return { error: error?.message ?? null };
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
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
   * server call fails or stalls, still end the session on this device so the
   * button never "does nothing". Returns false only if nothing could be done.
   */
  const signOut = async (): Promise<boolean> => {
    const local = () => supabase.auth.signOut({ scope: 'local' });
    try {
      const result = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: Error }>((resolve) =>
          setTimeout(() => resolve({ error: new Error('sign-out timed out') }), 6000),
        ),
      ]);
      if (result.error) {
        console.error('[auth] global sign-out failed, ending local session:', result.error);
        await local();
      }
    } catch (error) {
      console.error('[auth] sign-out threw, ending local session:', error);
      try {
        await local();
      } catch {
        return false;
      }
    }
    setSession(null);
    setProfile(null);
    setHostProfile(null);
    return true;
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
