import { useState } from "react";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { closingDate, useCancelAccountClosure } from "@/lib/account-closure";
import { friendlyError } from "@/lib/errors";

/**
 * Shown instead of the app while the signed-in account is closing (the 14 days
 * after a close request): keep it, or sign out and let it close.
 */
export function AccountClosingScreen({ requestedAt }: { requestedAt: string }) {
  const { signOut, refreshProfile } = useAuth();
  const keep = useCancelAccountClosure();
  const [leaving, setLeaving] = useState(false);
  const wipeOn = closingDate(new Date(new Date(requestedAt).getTime() + 14 * 86_400_000).toISOString());

  function keepAccount() {
    keep.mutate(undefined, {
      onSuccess: async (kept) => {
        if (!kept) {
          toast.error("This account can't be reopened any more.");
          return;
        }
        await refreshProfile();
        toast.success("Welcome back. Your account is staying open.");
      },
      onError: (e) => toast.error(friendlyError(e, "Couldn't keep your account. Try again.")),
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface ring-1 ring-border">
        <UserX className="h-7 w-7 text-primary" />
      </div>
      <h1 className="mt-5 font-display text-2xl">Your account is closing</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        On {wipeOn} we'll remove your name, photo, contact details and friends from TROVE. Your past bookings and
        payments stay on record. Changed your mind?
      </p>
      <button
        type="button"
        onClick={keepAccount}
        disabled={keep.isPending}
        className="mt-6 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {keep.isPending ? "Keeping it…" : "Keep my account"}
      </button>
      <button
        type="button"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          await signOut();
          setLeaving(false);
        }}
        className="mt-3 text-sm font-semibold text-muted-foreground underline underline-offset-4"
      >
        Sign out
      </button>
    </main>
  );
}
