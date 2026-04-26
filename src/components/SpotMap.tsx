import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarkerPoint {
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
}

interface SpotMapProps {
  points: MarkerPoint[];
  height?: number;
  zoom?: number;
  className?: string;
}

// Branded SVG marker (hot magenta gem) — avoids broken default Leaflet icon paths.
const brandIcon = L.divIcon({
  className: "trove-pin",
  html: `<div style="
    width:34px;height:42px;position:relative;
    transform:translate(-50%, -100%);
    filter: drop-shadow(0 6px 14px oklch(0.66 0.29 358 / 0.55));
  ">
    <svg viewBox="0 0 34 42" width="34" height="42" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff3d8a"/>
          <stop offset="100%" stop-color="#d6228e"/>
        </linearGradient>
      </defs>
      <path d="M17 1.5C8.7 1.5 2 8.2 2 16.5c0 11 15 24 15 24s15-13 15-24C32 8.2 25.3 1.5 17 1.5z"
            fill="url(#g)" stroke="white" stroke-width="2"/>
      <circle cx="17" cy="16" r="5.2" fill="white"/>
    </svg>
  </div>`,
  iconSize: [34, 42],
  iconAnchor: [17, 42],
  popupAnchor: [0, -38],
});

export function SpotMap({ points, height = 220, zoom = 14, className = "" }: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    const center: L.LatLngTuple =
      points.length === 1
        ? [points[0].lat, points[0].lng]
        : [
            points.reduce((s, p) => s + p.lat, 0) / points.length,
            points.reduce((s, p) => s + p.lng, 0) / points.length,
          ];

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    // Dark themed tiles via CartoDB
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 20, subdomains: "abcd" },
    ).addTo(map);

    const bounds = L.latLngBounds([]);
    points.forEach((p) => {
      const m = L.marker([p.lat, p.lng], { icon: brandIcon }).addTo(map);
      m.bindPopup(
        `<div style="font-family:Inter,sans-serif;min-width:140px">
          <div style="font-weight:700;font-size:13px">${p.label}</div>
          ${p.sublabel ? `<div style="font-size:11px;opacity:0.7;margin-top:2px">${p.sublabel}</div>` : ""}
        </div>`,
      );
      bounds.extend([p.lat, p.lng]);
    });

    if (points.length > 1) map.fitBounds(bounds, { padding: [30, 30] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, zoom]);

  return (
    <div
      ref={containerRef}
      className={`trove-map-shell w-full overflow-hidden rounded-2xl ring-1 ring-border ${className}`}
      style={{ height, background: "oklch(0.09 0.006 300)" }}
    />
  );
}
