import { capacityColor, capacityStatus, type Spot } from "@/lib/spots";

export function CapacityPill({ spot }: { spot: Spot }) {
  const status = capacityStatus(spot);
  const color = capacityColor(status);
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full glass-strong px-2.5 py-1 text-[11px] font-medium">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full pulse-dot" style={{ background: color }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      {status}
    </div>
  );
}

export function CapacityBar({ spot }: { spot: Spot }) {
  const pct = Math.min(100, Math.round((spot.capacityBooked / spot.capacityMax) * 100));
  const status = capacityStatus(spot);
  const color = capacityColor(status);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Live capacity</span>
        <span className="font-medium">{spot.capacityBooked}/{spot.capacityMax} · {pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
      </div>
    </div>
  );
}
