import nightlife from "@/assets/spot-nightlife.jpg";
import comedy from "@/assets/spot-comedy.jpg";
import adventure from "@/assets/spot-adventure.jpg";
import rooftop from "@/assets/spot-rooftop.jpg";
import paint from "@/assets/spot-paint.jpg";
import techno from "@/assets/spot-techno.jpg";

export type Category = "Nightlife" | "Comedy" | "Adventure" | "Chill";
export type Vibe = "Hype" | "Chill" | "Romantic" | "Wild" | "Creative";
export type CapacityStatus = "Empty" | "Filling Up" | "Almost Full" | "Full";

export interface Friend {
  id: string;
  name: string;
  initial: string;
  hue: number;
}

export interface Spot {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: Category;
  vibes: Vibe[];
  city: "Joburg" | "Cape Town" | "Durban";
  area: string;
  date: string; // ISO
  doors: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  capacityBooked: number;
  capacityMax: number;
  distanceKm: number;
  friendsGoing: Friend[];
  hours: string;
  hostName: string;
  address: string;
  lat: number;
  lng: number;
}

const friends: Friend[] = [
  { id: "f1", name: "Siya", initial: "S", hue: 340 },
  { id: "f2", name: "Nomvula", initial: "N", hue: 290 },
  { id: "f3", name: "Thabo", initial: "T", hue: 200 },
  { id: "f4", name: "Lerato", initial: "L", hue: 30 },
  { id: "f5", name: "Kagiso", initial: "K", hue: 150 },
  { id: "f6", name: "Aisha", initial: "A", hue: 320 },
];

export const spots: Spot[] = [
  {
    id: "techno-tuesdays",
    name: "Techno Tuesdays",
    tagline: "Underground beats. Above-ground energy.",
    description:
      "The longest-running midweek warehouse rave in Braam. Resident DJs spin until sunrise. Strict no-phones-on-the-floor policy keeps it raw.",
    category: "Nightlife",
    vibes: ["Hype", "Wild"],
    city: "Joburg",
    area: "Braamfontein",
    date: "2026-04-21T21:00:00",
    doors: "21:00 — late",
    price: 150,
    rating: 4.8,
    reviews: 412,
    image: techno,
    capacityBooked: 178,
    capacityMax: 200,
    distanceKm: 2.4,
    friendsGoing: [friends[0], friends[1], friends[2]],
    hours: "Tue 21:00 — 04:00",
    hostName: "Neon Underground",
    address: "12 De Beer St, Braamfontein, Johannesburg",
    lat: -26.1925, lng: 28.0337,
  },
  {
    id: "sunset-sessions",
    name: "Sunset Sessions",
    tagline: "Sandton skyline. Golden hour. House music.",
    description:
      "Live saxophonist over deep house as the sun drops behind the city. Dress code: smart. BYO sunglasses.",
    category: "Nightlife",
    vibes: ["Chill", "Romantic"],
    city: "Joburg",
    area: "Sandton",
    date: "2026-04-25T17:00:00",
    doors: "17:00 — 23:00",
    price: 220,
    rating: 4.9,
    reviews: 287,
    image: rooftop,
    capacityBooked: 116,
    capacityMax: 120,
    distanceKm: 8.1,
    friendsGoing: [friends[3], friends[4]],
    hours: "Sat 17:00 — 23:00",
    hostName: "The Rooftop",
    address: "Nelson Mandela Sq, Sandton, Johannesburg",
    lat: -26.1076, lng: 28.0567,
  },
  {
    id: "open-mic-saturday",
    name: "Open Mic Saturday",
    tagline: "Five comics. One mic. Zero filter.",
    description:
      "Cape Town's funniest weekly open mic. Bring a friend, bring a drink, bring a thick skin.",
    category: "Comedy",
    vibes: ["Hype", "Chill"],
    city: "Cape Town",
    area: "Observatory",
    date: "2026-04-26T20:00:00",
    doors: "19:30 — 22:30",
    price: 90,
    rating: 4.6,
    reviews: 198,
    image: comedy,
    capacityBooked: 45,
    capacityMax: 120,
    distanceKm: 4.7,
    friendsGoing: [friends[5]],
    hours: "Sat 19:30 — 22:30",
    hostName: "Cellar Door Comedy",
    address: "Lower Main Rd, Observatory, Cape Town",
    lat: -33.9376, lng: 18.4731,
  },
  {
    id: "magaliesberg-paraglide",
    name: "Magaliesberg Tandem Paraglide",
    tagline: "Run. Lift. Float. Repeat.",
    description:
      "Tandem paraglide with a certified pilot over the Magaliesberg cliffs. 25-minute flight, GoPro footage included.",
    category: "Adventure",
    vibes: ["Wild"],
    city: "Joburg",
    area: "Magaliesberg",
    date: "2026-04-27T07:30:00",
    doors: "Daily 07:00",
    price: 1450,
    rating: 5.0,
    reviews: 96,
    image: adventure,
    capacityBooked: 4,
    capacityMax: 12,
    distanceKm: 76,
    friendsGoing: [],
    hours: "Daily 07:00 — 16:00",
    hostName: "SkyHigh ZA",
    address: "Magaliesberg Cliffs, North West",
    lat: -25.9833, lng: 27.5500,
  },
  {
    id: "sip-and-paint",
    name: "Sip & Paint: Table Mountain",
    tagline: "Two glasses. One masterpiece.",
    description:
      "Guided 2-hour painting session. All materials supplied. First glass on the house, after that you're on your own.",
    category: "Chill",
    vibes: ["Creative", "Chill", "Romantic"],
    city: "Cape Town",
    area: "Sea Point",
    date: "2026-04-24T18:30:00",
    doors: "18:30 — 21:00",
    price: 320,
    rating: 4.7,
    reviews: 154,
    image: paint,
    capacityBooked: 18,
    capacityMax: 24,
    distanceKm: 3.2,
    friendsGoing: [friends[1], friends[3]],
    hours: "Wed/Fri 18:30 — 21:00",
    hostName: "Studio Twenty Two",
    address: "Main Rd, Sea Point, Cape Town",
    lat: -33.9197, lng: 18.3850,
  },
  {
    id: "neon-friday",
    name: "Neon Friday",
    tagline: "Three rooms. Three sounds. One night.",
    description:
      "Main room: house. Side room: amapiano. Basement: drum & bass. Pick your poison.",
    category: "Nightlife",
    vibes: ["Hype", "Wild"],
    city: "Durban",
    area: "Florida Road",
    date: "2026-04-24T22:00:00",
    doors: "22:00 — 04:00",
    price: 180,
    rating: 4.7,
    reviews: 333,
    image: nightlife,
    capacityBooked: 320,
    capacityMax: 500,
    distanceKm: 12,
    friendsGoing: [friends[0], friends[4], friends[5]],
    hours: "Fri 22:00 — 04:00",
    hostName: "Club Vega",
    address: "Florida Rd, Morningside, Durban",
    lat: -29.8333, lng: 31.0167,
  },
];

export function capacityStatus(s: Spot): CapacityStatus {
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

export function getSpot(id: string) {
  return spots.find((s) => s.id === id);
}

export function hostSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export interface Host {
  slug: string;
  name: string;
  city: Spot["city"];
  area: string;
  events: Spot[];
  followers: number;
  bio: string;
  founded: string;
  priceRange: string;
  specialties: string[];
  amenities: string[];
  openingHours: { day: string; hours: string }[];
  contact: { phone: string; email: string; instagram: string };
  highlights: string[];
}

const hostMeta: Record<string, Omit<Host, "slug" | "name" | "city" | "area" | "events" | "followers">> = {
  "Neon Underground": {
    bio: "Joburg's home of warehouse techno since 2019. No phones. No ego. Just bass that rearranges your insides until sunrise.",
    founded: "2019",
    priceRange: "R120 — R220",
    specialties: ["Warehouse Techno", "Resident DJs", "All-Nighters"],
    amenities: ["Cloakroom", "Smoking Patio", "ATM", "Late-night Food"],
    openingHours: [
      { day: "Tue", hours: "21:00 — 04:00" },
      { day: "Fri — Sat", hours: "22:00 — 06:00" },
    ],
    contact: { phone: "+27 11 403 0001", email: "doors@neonunderground.za", instagram: "@neon.underground.jhb" },
    highlights: ["Strict no-phones-on-floor policy", "Renowned international guest residencies", "Sound by Funktion-One"],
  },
  "The Rooftop": {
    bio: "Sandton's sundown destination. Live sax over deep house, signature cocktails and a 360° skyline that hits different at golden hour.",
    founded: "2017",
    priceRange: "R180 — R350",
    specialties: ["Sunset Sessions", "Deep House", "Cocktail Bar"],
    amenities: ["Cocktail Bar", "Tapas Kitchen", "Heated Lounge", "Valet"],
    openingHours: [
      { day: "Wed — Thu", hours: "16:00 — 23:00" },
      { day: "Fri — Sat", hours: "16:00 — 02:00" },
      { day: "Sun", hours: "14:00 — 22:00" },
    ],
    contact: { phone: "+27 11 217 4400", email: "hello@therooftop.co.za", instagram: "@therooftop.sandton" },
    highlights: ["Smart dress code enforced", "Reservations recommended Fri/Sat", "Live saxophonist every Sunday"],
  },
  "Cellar Door Comedy": {
    bio: "Cape Town's loudest open mic. Five comics, one mic, every Saturday — plus mid-week showcases from the country's sharpest headliners.",
    founded: "2015",
    priceRange: "R60 — R150",
    specialties: ["Open Mic", "Stand-up", "Comedy Showcases"],
    amenities: ["Full Bar", "Pizza Kitchen", "Wheelchair Access"],
    openingHours: [
      { day: "Wed", hours: "19:00 — 23:00" },
      { day: "Fri — Sat", hours: "18:00 — 00:00" },
    ],
    contact: { phone: "+27 21 447 1166", email: "book@cellardoor.co.za", instagram: "@cellardoorcomedy" },
    highlights: ["Audience members may be roasted on sight", "BYO thick skin", "First-timer slot every Saturday"],
  },
  "SkyHigh ZA": {
    bio: "Certified tandem pilots flying the Magaliesberg cliffs since 2012. 25-minute flights, full safety brief, GoPro footage included.",
    founded: "2012",
    priceRange: "R1 200 — R2 800",
    specialties: ["Tandem Paragliding", "Pilot Training", "GoPro Footage"],
    amenities: ["Free Parking", "Gear Provided", "Pickup from JHB"],
    openingHours: [
      { day: "Daily", hours: "07:00 — 16:00" },
    ],
    contact: { phone: "+27 82 555 0114", email: "fly@skyhigh.za", instagram: "@skyhigh.za" },
    highlights: ["SAHPA-certified pilots", "Weather-dependent — rebooking is free", "Min weight 35kg, max 110kg"],
  },
  "Studio Twenty Two": {
    bio: "Sip & paint nights for creatives, daters and chaos coordinators. All materials supplied — talent very much optional.",
    founded: "2020",
    priceRange: "R250 — R420",
    specialties: ["Sip & Paint", "Private Bookings", "Date Nights"],
    amenities: ["All Materials Provided", "Wine Bar", "Aprons Supplied"],
    openingHours: [
      { day: "Wed", hours: "18:30 — 21:00" },
      { day: "Fri", hours: "18:30 — 21:30" },
      { day: "Sat", hours: "11:00 — 14:00, 18:30 — 21:30" },
    ],
    contact: { phone: "+27 21 433 2200", email: "hi@studio22.co.za", instagram: "@studiotwentytwo.cpt" },
    highlights: ["First glass of wine on the house", "All skill levels welcome", "Private group bookings from 8 pax"],
  },
  "Club Vega": {
    bio: "Three rooms, three sounds, one Durban institution. House upstairs, amapiano in the side room, drum & bass in the basement.",
    founded: "2014",
    priceRange: "R120 — R250",
    specialties: ["Multi-Room", "Amapiano", "Drum & Bass"],
    amenities: ["Three Bars", "Cloakroom", "Secure Parking", "VIP Booths"],
    openingHours: [
      { day: "Thu", hours: "21:00 — 03:00" },
      { day: "Fri — Sat", hours: "22:00 — 04:00" },
    ],
    contact: { phone: "+27 31 312 8000", email: "info@clubvega.co.za", instagram: "@clubvega.dbn" },
    highlights: ["18+ only — ID required", "Dress code: smart casual", "VIP booths bookable from R2 500"],
  },
};

export function getHosts(): Host[] {
  const map = new Map<string, Host>();
  for (const s of spots) {
    const slug = hostSlug(s.hostName);
    const existing = map.get(slug);
    if (existing) {
      existing.events.push(s);
    } else {
      const meta = hostMeta[s.hostName] ?? {
        bio: "Booking the best nights in town.",
        founded: "—",
        priceRange: "—",
        specialties: [],
        amenities: [],
        openingHours: [],
        contact: { phone: "", email: "", instagram: "" },
        highlights: [],
      };
      map.set(slug, {
        slug,
        name: s.hostName,
        city: s.city,
        area: s.area,
        events: [s],
        followers: 200 + ((slug.length * 137) % 4800),
        ...meta,
      });
    }
  }
  return [...map.values()];
}

export function getHost(slug: string): Host | undefined {
  return getHosts().find((h) => h.slug === slug);
}

export function formatPrice(n: number) {
  return `R${n.toLocaleString("en-ZA")}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}
