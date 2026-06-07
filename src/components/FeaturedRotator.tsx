import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Spot } from "@/lib/spots";

const ROTATE_MS = 5000;

/**
 * Hero promo banner that auto-rotates through the TROVE team's curated
 * "Featured" set (HQ → Discovery & Curation). Each item holds the stage for a
 * few seconds, then cross-fades to the next. Tap a dot to jump. Honours
 * `prefers-reduced-motion` by holding on the first card.
 */
export function FeaturedRotator({ items }: { items: Spot[] }) {
  const [i, setI] = useState(0);
  const count = items.length;

  // Keep the index valid if the curated list changes size.
  useEffect(() => {
    if (i >= count && count > 0) setI(0);
  }, [count, i]);

  // Auto-advance, unless there's nothing to rotate or the user opted out.
  useEffect(() => {
    if (count < 2) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setI((p) => (p + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) {
    return <div className="aspect-[5/2] w-full animate-pulse rounded-3xl bg-surface" />;
  }

  const item = items[Math.min(i, count - 1)];

  return (
    <div className="relative min-h-[156px] overflow-hidden rounded-3xl bg-surface-elevated ring-1 ring-border/60">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="absolute inset-0 flex flex-col justify-center"
        >
          {/* Cover bleeds in from the right, faded into the card */}
          <div className="absolute inset-y-0 right-0 w-[48%]">
            <img
              src={item.image}
              alt={item.name}
              loading="eager"
              data-fallback={item.imageFallback}
              onError={(e) => {
                const t = e.currentTarget;
                const fb = t.dataset.fallback;
                if (fb && t.src !== fb) t.src = fb;
              }}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface-elevated via-surface-elevated/55 to-transparent" />
          </div>

          <div className="relative max-w-[64%] p-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {item.city ? `${item.city} · Featured` : "Featured"}
            </span>
            <h2 className="mt-2 font-display text-xl leading-[1.05] text-foreground line-clamp-2">
              {item.name}
            </h2>
            {item.tagline && (
              <p className="mt-1.5 text-[12px] text-muted-foreground line-clamp-2">{item.tagline}</p>
            )}
            <div className="mt-4 flex items-center gap-2.5">
              <Link
                to="/spot/$id"
                params={{ id: item.id }}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow transition active:scale-[0.97]"
              >
                Book now
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center gap-1 rounded-full bg-surface px-3.5 py-2 text-xs font-semibold text-foreground ring-1 ring-border transition active:scale-[0.97]"
              >
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      {count > 1 && (
        <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5">
          {items.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setI(idx)}
              aria-label={`Show ${s.name}`}
              aria-current={idx === i}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-5 bg-primary" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
