import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

/** Full-page "this doesn't exist" state with a way back to Discover. */
export function NotFoundState({
  title = "This spot isn't available",
  body = "It may have ended, sold out or been taken down by the host.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface ring-1 ring-border">
        <Compass className="h-7 w-7 text-primary" />
      </div>
      <h1 className="mt-5 font-display text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        Back to Discover
      </Link>
    </main>
  );
}
