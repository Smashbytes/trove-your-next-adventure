import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { toast } from "sonner";

// These are only needed after a tap (sign-in), once signed in (live
// notifications) or once per session (launch animation), so they stay out of
// the entry bundle. A chunk that fails to download (flaky mobile data) must
// never take the app down: each falls back to something harmless instead.
const loadAuthModal = () => import("@/components/AuthModal");
const AuthModal = lazy<ComponentType<{ open: boolean; onClose?: () => void }>>(() =>
  loadAuthModal()
    .then((m) => ({ default: m.AuthModal }))
    .catch(() => ({ default: AuthModalUnavailable })),
);
const SplashScreen = lazy<ComponentType>(() =>
  import("@/components/SplashScreen")
    .then((m) => ({ default: m.SplashScreen }))
    .catch(() => ({ default: () => null })),
);
const NotificationCenter = lazy<ComponentType>(() =>
  import("@/components/NotificationCenter")
    .then((m) => ({ default: m.NotificationCenter }))
    .catch(() => ({ default: () => null })),
);

/** Shown if the sign-in dialog's code couldn't be downloaded. */
function AuthModalUnavailable({ open, onClose }: { open: boolean; onClose?: () => void }) {
  useEffect(() => {
    if (!open) return;
    toast.error("We couldn't open sign-in. Check your connection and try again.", { id: "auth-unavailable" });
    onClose?.();
  }, [open, onClose]);
  return null;
}

/** How long the static launch stage may wait for the splash code (ms). */
const SPLASH_WAIT_MS = 1200;
import { queryClient } from "@/lib/query-client";

import appCss from "../styles.css?url";
import { BrandStage } from "@/components/BrandStage";
import { AccountClosingScreen } from "@/components/AccountClosingScreen";

const SITE_URL = ((import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "https://trove-your-next-adventure.pages.dev").replace(/\/$/, "");
const TITLE = "TROVE — Discover. Book. Experience.";
const DESCRIPTION = "Discover and book South Africa's best events, nightlife, food and adventures in seconds.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0612" },
      { name: "trove-build", content: __TROVE_BUILD__ },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "TROVE" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/trove-logo.png" },
      { rel: "apple-touch-icon", href: "/trove-logo.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Poppins:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display text-7xl text-gradient">
          404<span className="sr-only"> — page not found</span>
        </h1>
        <p className="mt-3 text-muted-foreground">This page doesn't exist (yet).</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Back to Discover
        </a>
      </div>
    </main>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppWithAuth() {
  const { showAuthModal, closeAuthModal, isAuthenticated, profile } = useAuth();
  // Closing (14-day grace): nothing else until they keep it or sign out.
  const closingSince = isAuthenticated && profile?.deletion_requested_at && !profile.anonymised_at ? profile.deletion_requested_at : null;
  const [authLoaded, setAuthLoaded] = useState(false);
  // This tree only renders in the browser (see RootComponent), so session
  // storage can be read up front: the first launch of a session plays the
  // splash; the static stage covers the moment while its code loads.
  const [playSplash, setPlaySplash] = useState(() => {
    try {
      return !sessionStorage.getItem("trove_splash_seen");
    } catch {
      return false;
    }
  });

  // Fetch the sign-in dialog in the background once the page is idle, so it
  // opens instantly when someone taps "Log in".
  useEffect(() => {
    const idle = (window as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const run = () =>
      void loadAuthModal()
        .then(() => setAuthLoaded(true))
        .catch(() => {
          /* offline: the dialog loads (or explains) when someone taps Log in */
        });
    if (idle) idle(run);
    else setTimeout(run, 1500);
  }, []);

  return (
    <>
      {closingSince ? <AccountClosingScreen requestedAt={closingSince} /> : <Outlet />}
      {playSplash && (
        <Suspense
          fallback={
            <TimedStage
              onExpire={() => {
                // Slow connection: skip the animation this time rather than
                // keep the app covered.
                try {
                  sessionStorage.setItem("trove_splash_seen", "1");
                } catch {
                  /* ignore */
                }
                setPlaySplash(false);
              }}
            />
          }
        >
          <SplashScreen />
        </Suspense>
      )}
      {(showAuthModal || authLoaded) && (
        <Suspense fallback={null}>
          <AuthModal open={showAuthModal} onClose={closeAuthModal} />
        </Suspense>
      )}
      {isAuthenticated && (
        <Suspense fallback={null}>
          <NotificationCenter />
        </Suspense>
      )}
      <Toaster position="top-center" richColors />
    </>
  );
}

function RootComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {mounted ? (
        <AuthProvider>
          <AppWithAuth />
        </AuthProvider>
      ) : (
        <BootShell />
      )}
    </QueryClientProvider>
  );
}

/**
 * What the server sends (and what shows before JavaScript runs). The app itself
 * mounts client-side only — see "fix: stabilize guest hydration" — so this
 * keeps the first paint branded instead of a blank black page.
 */
/** The static launch stage, for at most SPLASH_WAIT_MS while the splash code loads. */
function TimedStage({ onExpire }: { onExpire: () => void }) {
  useEffect(() => {
    const t = setTimeout(onExpire, SPLASH_WAIT_MS);
    return () => clearTimeout(t);
  }, [onExpire]);
  return <BrandStage />;
}

function BootShell() {
  return (
    <BrandStage>
      <noscript>
        <p className="mt-6 max-w-xs px-6 text-center text-sm text-muted-foreground">
          TROVE needs JavaScript to run. Turn it on in your browser settings to discover and book events.
        </p>
      </noscript>
    </BrandStage>
  );
}
