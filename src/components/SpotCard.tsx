import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Star, Clock, ArrowUpRight, Ticket } from "lucide-react";
import { CapacityPill } from "./CapacityBar";
import { formatDate, formatTime, formatPrice, hostSlug, type Spot } from "@/lib/spots";

export function SpotCard({ spot, index = 0 }: { spot: Spot; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-3xl bg-surface ring-1 ring-border/50"
    >
      <Link to="/spot/$id" params={{ id: spot.id }} className="block">
        {/* Media */}
        <div className="relative aspect-[4/5] overflow-hidden bg-black">
          <img
            src={spot.image}
            alt={spot.name}
            loading="lazy"
            width={1024}
            height={1280}
            data-fallback={spot.imageFallback}
            onError={(e) => {
              const t = e.currentTarget;
              const fb = t.dataset.fallback;
              if (fb && t.src !== fb) t.src = fb;
            }}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />

          {/* Top: category + capacity */}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <span className="rounded-full glass-strong px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {spot.category}
            </span>
            <CapacityPill spot={spot} />
          </div>

          {/* Bottom gradient + content */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-28 pb-4 px-4">
            {/* Date / time strip */}
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-2.5 py-1 ring-1 ring-white/15">
              <Clock className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/90">
                {formatDate(spot.date)} · {formatTime(spot.date)}
              </span>
            </div>
            <h3 className="font-display text-2xl leading-[0.95] tracking-tight text-white">
              {spot.name}
            </h3>
            <p className="mt-1 text-[12px] text-white/70 line-clamp-1">{spot.tagline}</p>

            {/* Meta row */}
            <div className="mt-2.5 flex items-center gap-3 text-[11px] text-white/75">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {spot.area}
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" /> {spot.rating}
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="font-mono">{spot.city}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Footer — host + price CTA */}
      <footer className="flex items-center justify-between gap-3 px-3.5 py-3">
        <Link
          to="/host/$slug"
          params={{ slug: hostSlug(spot.hostName) }}
          className="flex items-center gap-2.5 min-w-0 group/host"
        >
          <div className="rounded-full p-[1.5px] bg-gradient-brand">
            <div className="h-8 w-8 rounded-full bg-background grid place-items-center font-display text-[11px]">
              {spot.hostName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[12px] font-semibold truncate group-hover/host:text-primary transition">
              {spot.hostName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {spot.friendsGoing.length > 0
                ? `${spot.friendsGoing.length} from your community going`
                : `${spot.reviews} reviews`}
            </p>
          </div>
        </Link>
        <Link
          to="/spot/$id"
          params={{ id: spot.id }}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 py-2 text-[11px] font-semibold text-primary-foreground shadow-glow-soft"
        >
          <Ticket className="h-3.5 w-3.5" />
          {formatPrice(spot.price)}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </footer>
    </motion.article>
  );
}
