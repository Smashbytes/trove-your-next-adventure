import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0612" },
      { title: "TROVE — Decide. Book. Show Up." },
      { name: "description", content: "Discover and book South Africa's best nightlife, comedy and adventures in seconds." },
      { property: "og:title", content: "TROVE — Decide. Book. Show Up." },
      { property: "og:description", content: "Discover and book South Africa's best nightlife, comedy and adventures in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TROVE — Decide. Book. Show Up." },
      { name: "twitter:description", content: "Discover and book South Africa's best nightlife, comedy and adventures in seconds." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/711a9d30-b017-40d2-af9b-68f3ca19acf5/id-preview-0ebde4d8--58d6995d-47ea-4b9a-853c-43ccc7f53917.lovable.app-1777236622317.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/711a9d30-b017-40d2-af9b-68f3ca19acf5/id-preview-0ebde4d8--58d6995d-47ea-4b9a-853c-43ccc7f53917.lovable.app-1777236622317.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/trove-logo.png" },
      { rel: "apple-touch-icon", href: "/trove-logo.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Poppins:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display text-7xl text-gradient">404</h1>
        <p className="mt-3 text-muted-foreground">This spot doesn't exist (yet).</p>
        <a href="/" className="mt-6 inline-flex rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
          Back to Discover
        </a>
      </div>
    </div>
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
  const { showAuthModal, closeAuthModal } = useAuth();
  return (
    <>
      <Outlet />
      <AuthModal open={showAuthModal} onClose={closeAuthModal} />
      <Toaster position="top-center" richColors />
    </>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}
