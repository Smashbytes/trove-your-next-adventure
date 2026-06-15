import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface DesktopShellProps {
  children: ReactNode;
  /** Optional right rail; rendered at xl+ widths. */
  rightRail?: ReactNode;
  activeCity?: string;
  onSelectCity?: (city: string) => void;
}

/**
 * Full-width desktop chrome: fixed left nav, sticky top bar, scrolling main
 * column, and an optional right rail. Mobile keeps the AppShell/BottomNav.
 */
export function DesktopShell({ children, rightRail, activeCity, onSelectCity }: DesktopShellProps) {
  return (
    <div className="flex min-h-dvh bg-background bg-[image:var(--gradient-radial)]">
      <Sidebar activeCity={activeCity} onSelectCity={onSelectCity} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-w-0 flex-1">
          <main className="min-w-0 flex-1 px-8 py-6">
            <div className="mx-auto max-w-[1040px]">{children}</div>
          </main>
          {rightRail}
        </div>
      </div>
    </div>
  );
}
