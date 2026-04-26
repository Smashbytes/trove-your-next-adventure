import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import logo from "@/assets/trove-logo.png";

const SPLASH_KEY = "trove_splash_seen";

export function SplashScreen() {
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      setShow(false);
    }, 1700);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, exit: { duration: 0.35, delay: 0.05 } }}
          className="fixed inset-0 z-[100] grid place-items-center bg-black"
        >
          {/* Ambient radial glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(232,30,140,0.35), transparent 55%)",
            }}
          />

          {/* Logo stage */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: [0.6, 1.12, 1.0, 1.08, 1.0],
              opacity: [0, 1, 1, 1, 1],
            }}
            transition={{
              duration: 1.2,
              times: [0, 0.35, 0.55, 0.75, 0.95],
              ease: ["easeOut", "easeInOut", "easeInOut", "easeInOut"],
            }}
            className="relative"
          >
            {/* Soft halo behind logo */}
            <div
              className="absolute inset-0 -z-10 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(232,30,140,0.55), rgba(232,30,140,0) 70%)",
              }}
            />

            {/* Logo with shine sweep mask */}
            <div className="relative h-32 w-32 overflow-hidden">
              <img
                src={logo}
                alt="TROVE"
                className="h-full w-full object-contain drop-shadow-[0_0_30px_rgba(232,30,140,0.6)]"
              />
              {/* Diagonal shine sweep */}
              <motion.div
                initial={{ x: "-150%" }}
                animate={{ x: "150%" }}
                transition={{ duration: 0.7, delay: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
                  mixBlendMode: "screen",
                }}
              />
            </div>

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55, ease: "easeOut" }}
              className="mt-4 text-center font-display text-2xl tracking-[0.3em] text-white"
            >
              TR<span className="text-gradient">O</span>VE
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
