import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandLogo, BrandWordmark, STAGE_GLOW } from "@/components/BrandStage";

const SPLASH_KEY = "trove_splash_seen";

/** Total run time. The logo zooms through at the end and reveals the app. */
const DURATION_MS = 1650;
const REDUCED_MS = 450;

/**
 * Launch animation, once per browser session — inspired by X/Twitter's start-up:
 * the stage picks up exactly where the boot shell left off (same logo, same
 * spot), the logo pops and catches a shine, takes a small breath in, then
 * rockets towards the camera while the black stage dissolves and the app
 * appears through it. Reduced-motion users get a short fade instead.
 */
export function SplashScreen() {
  // Rendered only in the browser (from the root, after mount), so session state
  // can be read up front — visible from the very first frame, no gap after the
  // boot shell.
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem(SPLASH_KEY);
    } catch {
      return false;
    }
  });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY)) return;
    const prefersReduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setReduced(prefersReduced);
    setShow(true);
    // Mark it seen only once it has played, so a re-run of this effect (React
    // dev double-invoke, a quick remount) can never leave it stuck on screen.
    const t = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      setShow(false);
    }, prefersReduced ? REDUCED_MS : DURATION_MS);
    return () => {
      clearTimeout(t);
      setShow(false);
    };
  }, []);

  const s = DURATION_MS / 1000;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[100] grid place-items-center"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {/* Black stage: holds, then dissolves as the logo flies through it */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: reduced ? [1, 1, 0] : [1, 1, 0] }}
            transition={reduced ? { duration: REDUCED_MS / 1000, times: [0, 0.4, 1] } : { duration: s, times: [0, 0.66, 0.92], ease: "easeIn" }}
          />

          {/* Breathing brand glow */}
          <motion.div
            className="absolute inset-0"
            style={{ background: STAGE_GLOW }}
            initial={{ opacity: 1, scale: 1 }}
            animate={reduced ? { opacity: [1, 0] } : { opacity: [1, 1, 0.9, 0], scale: [1, 1.25, 1.1, 2.6] }}
            transition={reduced ? { duration: REDUCED_MS / 1000 } : { duration: s, times: [0, 0.3, 0.55, 0.85], ease: "easeInOut" }}
          />

          <div className="relative flex flex-col items-center">
            {/* Logo: pop → breathe in → zoom through the camera */}
            <motion.div
              className="relative"
              initial={{ scale: 1, opacity: 1 }}
              animate={
                reduced
                  ? { opacity: [1, 0] }
                  : { scale: [1, 1.1, 1, 0.84, 30], opacity: [1, 1, 1, 1, 0] }
              }
              transition={
                reduced
                  ? { duration: REDUCED_MS / 1000 }
                  : {
                      duration: s,
                      times: [0, 0.18, 0.36, 0.56, 0.95],
                      ease: ["easeOut", "easeInOut", "easeInOut", [0.7, 0, 0.84, 0]],
                    }
              }
            >
              <div className="relative h-32 w-32 overflow-hidden">
                <BrandLogo />
                {!reduced && (
                  <motion.div
                    initial={{ x: "-150%" }}
                    animate={{ x: "150%" }}
                    transition={{ duration: 0.55, delay: 0.15, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
                      mixBlendMode: "screen",
                    }}
                  />
                )}
              </div>
            </motion.div>

            {/* Wordmark: same place as the boot shell's, bows out before the zoom */}
            <motion.div
              className="mt-4"
              initial={{ opacity: 1, y: 0 }}
              animate={reduced ? { opacity: [1, 0] } : { opacity: [1, 1, 0], y: [0, 0, 10] }}
              transition={reduced ? { duration: REDUCED_MS / 1000 } : { duration: s * 0.55, times: [0, 0.6, 1], ease: "easeIn" }}
            >
              <BrandWordmark />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
