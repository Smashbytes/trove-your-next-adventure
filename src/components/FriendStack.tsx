import type { Friend } from "@/lib/spots";

export function FriendStack({ friends, max = 3, size = 24 }: { friends: Friend[]; max?: number; size?: number }) {
  if (!friends.length) return null;
  const shown = friends.slice(0, max);
  const extra = friends.length - shown.length;
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-center rounded-full ring-2 ring-background font-semibold text-[10px] text-white"
            style={{ width: size, height: size, background: `oklch(0.6 0.22 ${f.hue})` }}
          >
            {f.initial}
          </div>
        ))}
        {extra > 0 && (
          <div className="flex items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-semibold" style={{ width: size, height: size }}>
            +{extra}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {shown.map((f) => f.name).join(", ")} going
      </span>
    </div>
  );
}
