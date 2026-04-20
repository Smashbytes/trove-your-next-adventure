import logo from "@/assets/trove-logo.png";

export function Logo({ size = 28, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img src={logo} alt="TROVE" width={size} height={size} className="drop-shadow-[0_0_12px_rgba(232,30,140,0.55)]" />
      {withWord && (
        <span className="font-display text-lg tracking-tight">
          TR<span className="text-gradient">O</span>VE
        </span>
      )}
    </div>
  );
}
