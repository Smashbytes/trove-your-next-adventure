import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, Star, MapPin } from "lucide-react";
import { CapacityPill } from "./CapacityBar";
import { FriendStack } from "./FriendStack";
import { formatDate, formatTime, formatPrice, type Spot } from "@/lib/spots";
import { isSaved, toggleSaved, useStore, getSaved } from "@/lib/store";

export function SpotCard({ spot, index = 0 }: { spot: Spot; index?: number }) {
  const saved = useStore(() => getSaved()).includes(spot.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
    >
      <Link to="/spot/$id" params={{ id: spot.id }} className="block group">
        <div className="relative overflow-hidden rounded-2xl bg-surface ring-1 ring-border/40 transition-all hover:ring-primary/40 hover:shadow-glow-soft">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src={spot.image}
              alt={spot.name}
              loading="lazy"
              width={1024}
              height={1280}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

            {/* top row */}
            <div className="absolute inset-x-3 top-3 flex items-start justify-between">
              <CapacityPill spot={spot} />
              <button
                aria-label="Save spot"
                onClick={(e) => { e.preventDefault(); toggleSaved(spot.id); }}
                className="grid h-9 w-9 place-items-center rounded-full glass-strong transition active:scale-90"
              >
                <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
              </button>
            </div>

            {/* bottom info */}
            <div className="absolute inset-x-3 bottom-3 space-y-2">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{spot.category}</span>
                <span>{formatDate(spot.date)} · {formatTime(spot.date)}</span>
              </div>
              <h3 className="font-display text-xl leading-tight">{spot.name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{spot.area}</span>
                <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{spot.rating}</span>
              </div>
              <div className="flex items-end justify-between pt-1">
                <FriendStack friends={spot.friendsGoing} />
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">from</div>
                  <div className="font-display text-lg text-gradient">{formatPrice(spot.price)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
