// Open turn-by-turn directions in the device's native map app instead of an
// embedded OSM/Leaflet map. We don't ship our own map UI any more — we hand the
// captured coordinates (or address) to the platform handler:
//   - iOS / macOS  → Apple Maps  (maps.apple.com universal link → opens the app)
//   - everywhere else → Google Maps (maps/dir universal link → opens the app if
//     installed, otherwise the web map)
// Both URLs are plain https links, so they work from a sandboxed web context
// without the geo: scheme being blocked.

export interface MapTarget {
  lat?: number | null;
  lng?: number | null;
  label?: string | null;
  address?: string | null;
}

function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect via touch points.
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const mac = /Macintosh/.test(ua);
  return iOS || iPadOS || mac;
}

/** Build the directions URL for the current platform. */
export function directionsUrl({ lat, lng, label, address }: MapTarget): string {
  const hasCoords =
    typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);

  if (isAppleDevice()) {
    if (hasCoords) {
      const q = label ? `&q=${encodeURIComponent(label)}` : "";
      return `https://maps.apple.com/?daddr=${lat},${lng}${q}`;
    }
    return `https://maps.apple.com/?daddr=${encodeURIComponent(address ?? label ?? "")}`;
  }

  const dest = hasCoords ? `${lat},${lng}` : encodeURIComponent(address ?? label ?? "");
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

/** Force-open the user's default map app with directions to the target. */
export function openDirections(target: MapTarget): void {
  if (typeof window === "undefined") return;
  window.open(directionsUrl(target), "_blank", "noopener,noreferrer");
}
