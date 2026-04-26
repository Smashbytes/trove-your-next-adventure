import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SplashScreen } from "./SplashScreen";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <SplashScreen />
      {children}
      <BottomNav />
    </div>
  );
}
