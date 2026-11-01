import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * What a signed-out visitor sees on a page that only makes sense signed in,
 * instead of an empty list that suggests their data is gone (GST-L04-07).
 */
export function SignInRequired({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  const { openAuthModal } = useAuth();
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface ring-1 ring-border">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <p className="max-w-[260px] text-sm text-muted-foreground">{message}</p>
      <button
        onClick={openAuthModal}
        className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        Sign in
      </button>
    </div>
  );
}
