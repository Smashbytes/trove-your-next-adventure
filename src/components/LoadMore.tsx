/** "Load more" under a paged list. Renders nothing once everything is loaded. */
export function LoadMore({
  hasMore,
  loading,
  onClick,
  label = "Load more",
}: {
  hasMore: boolean | undefined;
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  if (!hasMore) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mx-auto mt-4 block rounded-full bg-surface px-5 py-2.5 text-sm font-semibold ring-1 ring-border transition hover:ring-primary/40 disabled:opacity-50"
    >
      {loading ? "Loading…" : label}
    </button>
  );
}
