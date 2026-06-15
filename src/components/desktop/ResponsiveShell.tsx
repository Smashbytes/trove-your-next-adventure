import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface ResponsiveShellProps {
  title: string;
  children: ReactNode;
  /** Optional header action (e.g. a "New" button), shown on both layouts. */
  action?: ReactNode;
  /** Where the mobile back arrow points. Defaults to Discover. */
  backTo?: "/" | "/profile";
  /** Max content width on desktop. */
  maxWidth?: string;
}

/**
 * Page chrome that adapts to viewport: phone uses AppShell + BottomNav, desktop
 * uses the Sidebar/TopBar shell. The page content is rendered into whichever
 * layout is visible. Use for secondary pages (Settings, Support, Notifications).
 */
export function ResponsiveShell({
  title,
  children,
  action,
  backTo = "/",
  maxWidth = "max-w-[840px]",
}: ResponsiveShellProps) {
  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden">
        <AppShell>
          <header className="sticky top-0 z-30 glass-strong px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Link
                to={backTo}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-border"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="flex-1 font-display text-xl">{title}</h1>
              {action}
            </div>
          </header>
          <main className="px-5 pt-4">{children}</main>
        </AppShell>
      </div>

      {/* Desktop */}
      <div className="hidden min-h-dvh bg-background bg-[image:var(--gradient-radial)] lg:flex">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1 px-8 py-7">
            <div className={`mx-auto ${maxWidth}`}>
              <div className="mb-6 flex items-center justify-between gap-3">
                <h1 className="font-display text-3xl">{title}</h1>
                {action}
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
