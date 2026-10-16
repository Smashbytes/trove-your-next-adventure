import logo from "@/assets/trove-logo.png";

/**
 * The centred TROVE launch stage: glow, logo, wordmark. Rendered statically by
 * the root's boot shell (what shows before JavaScript runs) and as the first
 * frame of the animated SplashScreen, so the hand-off between them is seamless.
 * Keep this file free of framer-motion so the boot shell stays in the entry.
 */
export const STAGE_GLOW =
  "radial-gradient(circle at 50% 46%, rgba(232,30,140,0.32), rgba(232,30,140,0.08) 32%, transparent 58%)";

export const LOGO_MASK =
  "radial-gradient(circle at 50% 50%, #000 58%, rgba(0,0,0,0.55) 78%, transparent 100%)";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt=""
      width={128}
      height={128}
      className={`h-32 w-32 object-contain drop-shadow-[0_0_30px_rgba(232,30,140,0.6)] ${className}`}
      style={{ maskImage: LOGO_MASK, WebkitMaskImage: LOGO_MASK }}
    />
  );
}

export function BrandWordmark() {
  return (
    <p className="text-center font-display text-2xl tracking-[0.3em] text-white">
      TR<span className="text-gradient">O</span>VE
    </p>
  );
}

/** Static version of the stage (boot shell / no-JS). */
export function BrandStage({ children }: { children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black" aria-busy="true">
      <div className="pointer-events-none absolute inset-0" style={{ background: STAGE_GLOW }} />
      <div className="relative flex flex-col items-center">
        <BrandLogo />
        <div className="mt-4">
          <BrandWordmark />
        </div>
        {children}
      </div>
    </div>
  );
}
