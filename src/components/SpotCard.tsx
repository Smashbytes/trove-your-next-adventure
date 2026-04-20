import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MapPin, Star } from "lucide-react";
import { CapacityPill } from "./CapacityBar";
import { formatDate, formatTime, formatPrice, type Spot } from "@/lib/spots";
import { toggleSaved, useStore, getSaved } from "@/lib/store";

export function SpotCard({ spot, index = 0 }: { spot: Spot; index?: number }) {
  const saved = useStore(() => getSaved()).includes(spot.id);
  const likes = 800 + Math.floor((spot.rating * spot.reviews) % 9000);
  const comments = Math.max(12, Math.floor(spot.reviews / 4));

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl bg-surface ring-1 ring-border/50"
    >
      {/* Post header — host row */}
      <header className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="rounded-full p-[2px] bg-gradient-brand">
              <div className="h-9 w-9 rounded-full bg-background grid place-items-center font-display text-xs">
                {spot.hostName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
            </div>
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">{spot.hostName}</p>
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {spot.area} · {spot.city}
            </p>
          </div>
        </div>
        <CapacityPill spot={spot} />
      </header>

      {/* Media */}
      <Link to="/spot/$id" params={{ id: spot.id }} className="relative block">
        <div className="relative aspect-[4/5] overflow-hidden bg-black">
          <img
            src={spot.image}
            alt={spot.name}
            loading="lazy"
            width={1024}
            height={1280}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
          />
          {/* Top chip row */}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <span className="rounded-full glass-strong px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {spot.category}
            </span>
            <span className="rounded-full glass-strong px-2.5 py-1 text-[10px] font-semibold">
              {formatDate(spot.date)} · {formatTime(spot.date)}
            </span>
          </div>

          {/* Bottom gradient + caption */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-24 pb-4 px-4">
            <h3 className="font-display text-2xl leading-[0.95] tracking-tight text-white">
              {spot.name}
            </h3>
            <p className="mt-1 text-[12px] text-white/70 line-clamp-1">{spot.tagline}</p>
          </div>

          {/* Right-side action rail (TikTok/IG reels style) */}
          <div className="absolute right-2.5 bottom-24 flex flex-col items-center gap-3.5">
            <ActionBtn
              onClick={(e) => { e.preventDefault(); toggleSaved(spot.id); }}
              icon={<Heart className={`h-5 w-5 ${saved ? "fill-primary text-primary" : "text-white"}`} />}
              label={kFmt(likes + (saved ? 1 : 0))}
            />
            <ActionBtn
              icon={<MessageCircle className="h-5 w-5 text-white" />}
              label={kFmt(comments)}
            />
            <ActionBtn
              icon={<Send className="h-5 w-5 text-white" />}
              label="Share"
            />
            <ActionBtn
              onClick={(e) => { e.preventDefault(); toggleSaved(spot.id); }}
              icon={<Bookmark className={`h-5 w-5 ${saved ? "fill-accent text-accent" : "text-white"}`} />}
              label="Save"
            />
          </div>
        </div>
      </Link>

      {/* Footer — friends + price */}
      <footer className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {spot.friendsGoing.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {spot.friendsGoing.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="grid h-6 w-6 place-items-center rounded-full ring-2 ring-surface text-[10px] font-bold text-white"
                    style={{ background: `oklch(0.6 0.22 ${f.hue})` }}
                  >
                    {f.initial}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                <span className="text-foreground font-medium">{spot.friendsGoing[0].name}</span>
                {spot.friendsGoing.length > 1 && ` + ${spot.friendsGoing.length - 1} more`} going
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {spot.rating} · {spot.reviews} reviews
            </p>
          )}
        </div>
        <Link
          to="/spot/$id"
          params={{ id: spot.id }}
          className="shrink-0 rounded-full bg-gradient-brand px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-glow-soft"
        >
          {formatPrice(spot.price)}
        </Link>
      </footer>
    </motion.article>
  );
}

function ActionBtn({
  icon, label, onClick,
}: { icon: React.ReactNode; label: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
      <span className="grid h-10 w-10 place-items-center rounded-full glass-strong">
        {icon}
      </span>
      <span className="text-[10px] font-semibold text-white drop-shadow">{label}</span>
    </button>
  );
}

function kFmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
