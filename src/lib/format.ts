// App-wide display helpers and reference lists. Kept separate from the demo
// catalogue in `spots.ts` so ordinary screens don't download the mock data.

import type { CapacityStatus, Category, Spot } from "./spots";

/** Display labels for city chips → DB city values used in queries. */
export const CITY_LABELS: Record<string, string> = {
  Joburg: "Johannesburg",
  Johannesburg: "Johannesburg",
  Pretoria: "Pretoria",
  "Cape Town": "Cape Town",
  Stellenbosch: "Stellenbosch",
  Durban: "Durban",
  Gqeberha: "Gqeberha",
  Bloemfontein: "Bloemfontein",
  Polokwane: "Polokwane",
  Knysna: "Knysna",
  "East London": "East London",
};

/** Fallback category list (demo account, and before the DB list loads). */
export const CATEGORIES: Category[] = [
  "Nightlife",
  "Food & Drink",
  "Music",
  "Adventure",
  "Wellness",
  "Arts & Culture",
  "Family & Social",
  "Community",
];

/** Display names shown in city chips. */
export const CITIES: string[] = [
  "Joburg",
  "Pretoria",
  "Cape Town",
  "Stellenbosch",
  "Durban",
  "Gqeberha",
  "Bloemfontein",
  "Polokwane",
  "Knysna",
  "East London",
];

/** Approximate city centres, for "Use my current location" → nearest city. */
const CITY_COORDS: Record<string, [number, number]> = {
  Joburg: [-26.2041, 28.0473],
  Pretoria: [-25.7479, 28.2293],
  "Cape Town": [-33.9249, 18.4241],
  Stellenbosch: [-33.9321, 18.8602],
  Durban: [-29.8587, 31.0218],
  Gqeberha: [-33.9608, 25.6022],
  Bloemfontein: [-29.0852, 26.1596],
  Polokwane: [-23.9045, 29.4689],
  Knysna: [-34.0363, 23.0471],
  "East London": [-33.0153, 27.9116],
};

/** Nearest supported city to a coordinate (great-circle distance). */
export function nearestCity(lat: number, lng: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  let best = CITIES[0];
  let bestKm = Infinity;
  for (const [city, [clat, clng]] of Object.entries(CITY_COORDS)) {
    const a =
      Math.sin(rad(clat - lat) / 2) ** 2 +
      Math.cos(rad(lat)) * Math.cos(rad(clat)) * Math.sin(rad(clng - lng) / 2) ** 2;
    const km = 6371 * 2 * Math.asin(Math.sqrt(a));
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return best;
}

/** DB stores money in cents (legacy column names end in `_kobo`). Exact, no rounding. */
export function centsToRand(cents: number | null | undefined): number {
  return (cents ?? 0) / 100;
}

/** "Free", "R150", "R1 500", "R149,99" (en-ZA). Cents are shown only when present. */
export function formatPrice(rand: number) {
  if (rand === 0) return "Free";
  const whole = Math.abs(rand - Math.round(rand)) < 0.005;
  return `R${rand.toLocaleString("en-ZA", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

export function hostSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function capacityStatus(s: Spot): CapacityStatus {
  if (!s.capacityMax || s.capacityMax <= 0) return "Empty";
  const r = s.capacityBooked / s.capacityMax;
  if (r >= 1) return "Full";
  if (r >= 0.85) return "Almost Full";
  if (r >= 0.4) return "Filling Up";
  return "Empty";
}

export function capacityColor(status: CapacityStatus): string {
  switch (status) {
    case "Empty": return "var(--color-success)";
    case "Filling Up": return "var(--color-warning)";
    case "Almost Full": return "var(--color-primary)";
    case "Full": return "var(--color-danger)";
  }
}
