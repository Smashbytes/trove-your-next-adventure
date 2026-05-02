import nightlife from "@/assets/spot-nightlife.jpg";
import comedy from "@/assets/spot-comedy.jpg";
import adventure from "@/assets/spot-adventure.jpg";
import rooftop from "@/assets/spot-rooftop.jpg";
import paint from "@/assets/spot-paint.jpg";
import techno from "@/assets/spot-techno.jpg";

export type Category =
  | "Nightlife"
  | "Food & Drink"
  | "Music"
  | "Adventure"
  | "Wellness"
  | "Arts & Culture"
  | "Family & Social"
  | "Community";

export type Vibe = "Hype" | "Chill" | "Romantic" | "Wild" | "Creative";
export type CapacityStatus = "Empty" | "Filling Up" | "Almost Full" | "Full";

export type City =
  | "Joburg"
  | "Pretoria"
  | "Sandton"
  | "Soweto"
  | "Cape Town"
  | "Stellenbosch"
  | "Durban"
  | "Gqeberha"
  | "Bloemfontein"
  | "Polokwane";

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

export const CITIES: City[] = [
  "Joburg",
  "Pretoria",
  "Sandton",
  "Soweto",
  "Cape Town",
  "Stellenbosch",
  "Durban",
  "Gqeberha",
  "Bloemfontein",
  "Polokwane",
];

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
  subcategory: string;
  vibes: Vibe[];
  city: City;
  area: string;
  date: string; // ISO
  doors: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  imageFallback: string;
  capacityBooked: number;
  capacityMax: number;
  distanceKm: number;
  friendsGoing: Friend[];
  hours: string;
  hostName: string;
  address: string;
  lat: number;
  lng: number;
  editorsPick?: boolean;
  tags?: string[];
}

const friends: Friend[] = [
  { id: "f1", name: "Siya", initial: "S", hue: 340 },
  { id: "f2", name: "Nomvula", initial: "N", hue: 290 },
  { id: "f3", name: "Thabo", initial: "T", hue: 200 },
  { id: "f4", name: "Lerato", initial: "L", hue: 30 },
  { id: "f5", name: "Kagiso", initial: "K", hue: 150 },
  { id: "f6", name: "Aisha", initial: "A", hue: 320 },
];

// Pick the best of the 6 bundled images by category + vibe.
// Replace these per-venue with real photos via scripts/generate-spot-images.mjs (Nano Banana).
function imageFor(category: Category, vibes: Vibe[]): string {
  if (category === "Nightlife") {
    if (vibes.includes("Wild")) return techno;
    if (vibes.includes("Romantic") || vibes.includes("Chill")) return rooftop;
    if (vibes.includes("Creative")) return comedy;
    return nightlife;
  }
  if (category === "Adventure") return adventure;
  if (category === "Music") return vibes.includes("Hype") ? techno : rooftop;
  if (category === "Food & Drink") return rooftop;
  if (category === "Wellness") return paint;
  if (category === "Arts & Culture") return paint;
  if (category === "Family & Social") return vibes.includes("Wild") || vibes.includes("Hype") ? adventure : rooftop;
  if (category === "Community") return vibes.includes("Hype") ? nightlife : rooftop;
  return nightlife;
}

type SpotInput = Omit<Spot, "image" | "imageFallback" | "friendsGoing"> & {
  image?: string;
  friendsGoing?: Friend[];
};

// AUTO-GENERATED-IMAGES-START — rewritten by scripts/generate-spot-images.mjs
// Maps spot id → public path of an AI-generated image (Nano Banana). Falls back
// to the category image when a spot id is not present here.
const generatedImages: Record<string, string> = {};
// AUTO-GENERATED-IMAGES-END

// Curated Unsplash CDN URLs — verified live, 1 per spot. If any 404s in the
// browser, the <img onError> handler swaps in the local category fallback.
const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

const unsplashImages: Record<string, string> = {
  // Nightlife
  "techno-tuesdays":      u("1777029078138-2e4f872f5884"),
  "sunset-sessions":      u("1566417713940-fe7c737a9ef2"),
  "open-mic-saturday":    u("1572116469696-31de0f17cc34"),
  "neon-friday":          u("1777029078123-399c118ec938"),
  "truth-jazz-room":      u("1598994671512-395d7a6147e0"),
  "vilakazi-karaoke":     u("1722505531413-f2ae52db16e6"),
  "the-aviary":           u("1605270012917-bf157c5a9541"),
  "castro-maboneng":      u("1764510377621-174bdbd74e74"),

  // Food & Drink
  "market-on-main":       u("1414235077428-338989a2e8c0"),
  "marble-tasting":       u("1623408859815-22534357b3db"),
  "biscuit-mill-saturday":u("1482049016688-2d3e1b311543"),
  "tashas-brunch":        u("1504674900247-0877df9cc836"),
  "bunny-chow-quarters":  u("1467003909585-2f8a72700288"),
  "roots-stellenbosch":   u("1484723091739-30a097e8f929"),

  // Music
  "bassline-newtown":     u("1576514129883-2f1d47a65da6"),
  "ct-jazz-fest":         u("1563841930606-67e2bce48b78"),
  "rocking-the-daisies":  u("1670028514318-0ac718c0590d"),
  "ultra-sa-jhb":         u("1583795484071-3c453e3a7c71"),
  "fugard-theatre":       u("1578850141295-7fb35c301da6"),
  "sun-arena-gig":        u("1443745029291-d5c27bc0b562"),

  // Adventure
  "magaliesberg-paraglide":u("1630879937467-4afa290b1a6b"),
  "bloukrans-bungy":      u("1659221876406-31a3746f41b9"),
  "cradle-skydive":       u("1522332896918-9622e84d53d7"),
  "drakensberg-2day-hike":u("1659901981145-dbc056431a8b"),
  "cape-point-mtb":       u("1654786154777-02c4d0668373"),
  "karkloof-canopy":      u("1611745179863-e123a89795fa"),

  // Wellness
  "saxon-spa-day":        u("1532926381893-7542290edf1d"),
  "camelthorn-retreat":   u("1445019980597-93fa8acb246c"),
  "hot-yoga-parkhurst":   u("1529290130-4ca3753253ae"),
  "stellenbosch-hot-springs":u("1603077864615-538e955d1ad1"),

  // Arts & Culture
  "sip-and-paint":        u("1606819717115-9159c900370b"),
  "zeitz-mocaa":          u("1518998053901-5348d3961a04"),
  "constitution-hill":    u("1569783721854-33a99b4c0bae"),
  "the-field-pottery":    u("1565876427310-0695a4ff03b7"),

  // Family & Social
  "gold-reef-day":        u("1502136969935-8d8eef54d77b"),
  "ushaka-marine":        u("1505731110654-99d7f7f8e39c"),
  "lory-park-zoo":        u("1516051662687-567d7c4e8f6a"),
  "boulders-penguins":    u("1542577731-55541be363d4"),

  // Community
  "comic-con-africa":     u("1766766465229-e85e956d1ff1"),
  "mighty-men-conference":u("1742452375104-b42c5761a815"),
};

function spot(input: SpotInput): Spot {
  const localFallback = imageFor(input.category, input.vibes);
  const online = unsplashImages[input.id];
  return {
    image: generatedImages[input.id] ?? input.image ?? online ?? localFallback,
    imageFallback: localFallback,
    friendsGoing: input.friendsGoing ?? [],
    ...input,
  };
}

export const spots: Spot[] = [
  // ───── NIGHTLIFE (8) ─────
  spot({
    id: "techno-tuesdays",
    name: "Techno Tuesdays",
    tagline: "Underground beats. Above-ground energy.",
    description:
      "The longest-running midweek warehouse rave in Braam. Resident DJs spin until sunrise. Strict no-phones-on-the-floor policy keeps it raw.",
    category: "Nightlife", subcategory: "Warehouse Rave",
    vibes: ["Hype", "Wild"],
    city: "Joburg", area: "Braamfontein",
    date: "2026-05-12T21:00:00", doors: "21:00 — late",
    price: 150, rating: 4.8, reviews: 412,
    capacityBooked: 178, capacityMax: 200, distanceKm: 2.4,
    friendsGoing: [friends[0], friends[1], friends[2]],
    hours: "Tue 21:00 — 04:00",
    hostName: "Neon Underground",
    address: "12 De Beer St, Braamfontein, Johannesburg",
    lat: -26.1925, lng: 28.0337,
    editorsPick: true, tags: ["Techno", "All-Nighter", "18+"],
  }),
  spot({
    id: "sunset-sessions",
    name: "Sunset Sessions",
    tagline: "Sandton skyline. Golden hour. House music.",
    description:
      "Live saxophonist over deep house as the sun drops behind the city. Dress code: smart. BYO sunglasses.",
    category: "Nightlife", subcategory: "Rooftop",
    vibes: ["Chill", "Romantic"],
    city: "Sandton", area: "Nelson Mandela Square",
    date: "2026-05-09T17:00:00", doors: "17:00 — 23:00",
    price: 220, rating: 4.9, reviews: 287,
    capacityBooked: 116, capacityMax: 120, distanceKm: 8.1,
    friendsGoing: [friends[3], friends[4]],
    hours: "Sat 17:00 — 23:00",
    hostName: "The Rooftop",
    address: "Nelson Mandela Sq, Sandton",
    lat: -26.1076, lng: 28.0567,
    editorsPick: true, tags: ["Live Music", "Cocktails", "Date Night"],
  }),
  spot({
    id: "open-mic-saturday",
    name: "Open Mic Saturday",
    tagline: "Five comics. One mic. Zero filter.",
    description:
      "Cape Town's funniest weekly open mic. Bring a friend, bring a drink, bring a thick skin.",
    category: "Nightlife", subcategory: "Comedy Club",
    vibes: ["Hype", "Chill"],
    city: "Cape Town", area: "Observatory",
    date: "2026-05-09T20:00:00", doors: "19:30 — 22:30",
    price: 90, rating: 4.6, reviews: 198,
    capacityBooked: 45, capacityMax: 120, distanceKm: 4.7,
    friendsGoing: [friends[5]],
    hours: "Sat 19:30 — 22:30",
    hostName: "Cellar Door Comedy",
    address: "Lower Main Rd, Observatory, Cape Town",
    lat: -33.9376, lng: 18.4731,
    tags: ["Comedy", "Open Mic"],
  }),
  spot({
    id: "neon-friday",
    name: "Neon Friday",
    tagline: "Three rooms. Three sounds. One night.",
    description:
      "Main room: house. Side room: amapiano. Basement: drum & bass. Pick your poison.",
    category: "Nightlife", subcategory: "Multi-Room Club",
    vibes: ["Hype", "Wild"],
    city: "Durban", area: "Florida Road",
    date: "2026-05-08T22:00:00", doors: "22:00 — 04:00",
    price: 180, rating: 4.7, reviews: 333,
    capacityBooked: 320, capacityMax: 500, distanceKm: 12,
    friendsGoing: [friends[0], friends[4], friends[5]],
    hours: "Fri 22:00 — 04:00",
    hostName: "Club Vega",
    address: "Florida Rd, Morningside, Durban",
    lat: -29.8333, lng: 31.0167,
    tags: ["Amapiano", "Drum & Bass", "18+"],
  }),
  spot({
    id: "truth-jazz-room",
    name: "Truth Jazz Room",
    tagline: "Smoke, brass, and a Steinway in the corner.",
    description:
      "Pretoria's premier listening room. Live jazz quartets every Thursday. Whisky list 80 deep. Conversation kept low — the music is the point.",
    category: "Nightlife", subcategory: "Jazz Club",
    vibes: ["Chill", "Romantic"],
    city: "Pretoria", area: "Hatfield",
    date: "2026-05-14T20:00:00", doors: "19:30 — 23:30",
    price: 200, rating: 4.8, reviews: 142,
    capacityBooked: 64, capacityMax: 90, distanceKm: 14,
    hours: "Thu — Sat 19:30 — 23:30",
    hostName: "Truth Coffee & Jazz",
    address: "Burnett St, Hatfield, Pretoria",
    lat: -25.7479, lng: 28.2374,
    tags: ["Live Jazz", "Whisky", "Listening Room"],
  }),
  spot({
    id: "vilakazi-karaoke",
    name: "Vilakazi Karaoke Nights",
    tagline: "Soweto sings. You sing too.",
    description:
      "Open-air karaoke down the street where two Nobel laureates lived. R30 a song, four-song max, and the crowd keeps you honest.",
    category: "Nightlife", subcategory: "Karaoke",
    vibes: ["Hype", "Creative"],
    city: "Soweto", area: "Vilakazi Street",
    date: "2026-05-15T19:00:00", doors: "19:00 — 23:00",
    price: 60, rating: 4.7, reviews: 89,
    capacityBooked: 88, capacityMax: 150, distanceKm: 26,
    friendsGoing: [friends[1], friends[3]],
    hours: "Fri 19:00 — 23:00",
    hostName: "Sakhumzi Restaurant",
    address: "6980 Vilakazi St, Orlando West, Soweto",
    lat: -26.2381, lng: 27.9078,
    tags: ["Karaoke", "Outdoor", "All Ages"],
  }),
  spot({
    id: "the-aviary",
    name: "The Aviary Speakeasy",
    tagline: "No menu. No phone calls. Just trust the bar.",
    description:
      "Hidden behind a bookshelf on Long Street. Bartenders read your mood and build a flight. 16-seat counter — book ahead or queue from 6pm.",
    category: "Nightlife", subcategory: "Speakeasy",
    vibes: ["Romantic", "Chill"],
    city: "Cape Town", area: "Long Street",
    date: "2026-05-16T19:00:00", doors: "19:00 — 01:00",
    price: 280, rating: 4.9, reviews: 211,
    capacityBooked: 14, capacityMax: 16, distanceKm: 5,
    hours: "Wed — Sat 19:00 — 01:00",
    hostName: "The Aviary",
    address: "112 Long St, Cape Town CBD",
    lat: -33.9226, lng: 18.4197,
    editorsPick: true, tags: ["Cocktails", "Hidden", "Reservation Only"],
  }),
  spot({
    id: "castro-maboneng",
    name: "Castro After Dark",
    tagline: "Where the dance floor doesn't ask for your pronouns.",
    description:
      "Maboneng's loudest LGBTQ+ night. Two floors, drag at midnight, after-hours till the sun comes up. Safe space, hard policy.",
    category: "Nightlife", subcategory: "Club",
    vibes: ["Hype", "Wild"],
    city: "Joburg", area: "Maboneng",
    date: "2026-05-23T22:00:00", doors: "22:00 — 06:00",
    price: 160, rating: 4.8, reviews: 176,
    capacityBooked: 240, capacityMax: 350, distanceKm: 5.4,
    friendsGoing: [friends[2], friends[5]],
    hours: "Sat 22:00 — 06:00",
    hostName: "Castro JHB",
    address: "Fox St, Maboneng, Johannesburg",
    lat: -26.2050, lng: 28.0578,
    tags: ["LGBTQ+", "Drag", "Safe Space"],
  }),

  // ───── FOOD & DRINK (6) ─────
  spot({
    id: "market-on-main",
    name: "Market on Main",
    tagline: "Forty stalls. One Sunday. Eat your way through.",
    description:
      "Maboneng's flagship Sunday food market. From ostrich wraps to laksa to artisan boerewors rolls. Live DJs from noon, art markets upstairs.",
    category: "Food & Drink", subcategory: "Food Market",
    vibes: ["Chill", "Creative"],
    city: "Joburg", area: "Maboneng",
    date: "2026-05-10T10:00:00", doors: "10:00 — 15:00",
    price: 0, rating: 4.6, reviews: 522,
    capacityBooked: 600, capacityMax: 1200, distanceKm: 5.6,
    friendsGoing: [friends[0], friends[3]],
    hours: "Sun 10:00 — 15:00",
    hostName: "Market on Main",
    address: "264 Fox St, Maboneng, Johannesburg",
    lat: -26.2046, lng: 28.0588,
    tags: ["Food Market", "Family", "Sunday"],
  }),
  spot({
    id: "marble-tasting",
    name: "Marble Tasting Menu",
    tagline: "Six courses. One open fire. David Higgs himself.",
    description:
      "Sandton's most-talked-about chef's table. Open-flame cooking, biltong-cured wagyu, smoke that gets in your hair. Book three weeks out.",
    category: "Food & Drink", subcategory: "Fine Dining",
    vibes: ["Romantic", "Chill"],
    city: "Sandton", area: "Rosebank",
    date: "2026-05-21T19:00:00", doors: "19:00 — 23:00",
    price: 1850, rating: 4.9, reviews: 248,
    capacityBooked: 22, capacityMax: 24, distanceKm: 6.2,
    hours: "Tue — Sat 18:30 — 23:00",
    hostName: "Marble",
    address: "Trumpet, Keyes Avenue, Rosebank",
    lat: -26.1465, lng: 28.0414,
    editorsPick: true, tags: ["Tasting Menu", "Wagyu", "Reservation"],
  }),
  spot({
    id: "biscuit-mill-saturday",
    name: "Old Biscuit Mill Saturday",
    tagline: "Woodstock wakes up hungry. So should you.",
    description:
      "The Neighbourgoods Market — 100+ stalls of farm cheese, slow-fermented sourdough, spit-roast lamb wraps. Get there before 10 or queue.",
    category: "Food & Drink", subcategory: "Food Market",
    vibes: ["Chill", "Creative"],
    city: "Cape Town", area: "Woodstock",
    date: "2026-05-09T09:00:00", doors: "09:00 — 14:00",
    price: 0, rating: 4.7, reviews: 1102,
    capacityBooked: 1500, capacityMax: 2500, distanceKm: 7,
    friendsGoing: [friends[1], friends[4]],
    hours: "Sat 09:00 — 14:00",
    hostName: "The Old Biscuit Mill",
    address: "375 Albert Rd, Woodstock, Cape Town",
    lat: -33.9268, lng: 18.4561,
    tags: ["Food Market", "Saturday", "Family"],
  }),
  spot({
    id: "tashas-brunch",
    name: "Tashas Le Parc Brunch",
    tagline: "Eggs benedict in a glasshouse. With a view.",
    description:
      "Pretoria's brunch institution. Ricotta hotcakes, smashed avo on rye, oat milk flat whites by the pool. Bring sunglasses and a long Saturday.",
    category: "Food & Drink", subcategory: "Brunch",
    vibes: ["Chill", "Romantic"],
    city: "Pretoria", area: "Brooklyn",
    date: "2026-05-16T09:30:00", doors: "07:30 — 16:00",
    price: 240, rating: 4.6, reviews: 387,
    capacityBooked: 78, capacityMax: 110, distanceKm: 12,
    friendsGoing: [friends[2]],
    hours: "Daily 07:30 — 16:00",
    hostName: "Tashas",
    address: "Brooklyn Mall, Pretoria",
    lat: -25.7705, lng: 28.2418,
    tags: ["Brunch", "Outdoor", "Family"],
  }),
  spot({
    id: "bunny-chow-quarters",
    name: "Bunny Chow Quarters",
    tagline: "A loaf of bread. A pool of curry. A Durban birthright.",
    description:
      "The original 1940s recipe. Quarter, half or full bunny — mutton, bean or prawn. Eat with your hands. No cutlery, no apologies.",
    category: "Food & Drink", subcategory: "Casual Dining",
    vibes: ["Chill"],
    city: "Durban", area: "Florida Road",
    date: "2026-05-13T12:00:00", doors: "11:00 — 22:00",
    price: 95, rating: 4.8, reviews: 614,
    capacityBooked: 40, capacityMax: 80, distanceKm: 13,
    hours: "Mon — Sun 11:00 — 22:00",
    hostName: "Bunny Chow Quarters",
    address: "275 Florida Rd, Morningside, Durban",
    lat: -29.8348, lng: 31.0179,
    tags: ["Curry", "Halal", "Iconic"],
  }),
  spot({
    id: "roots-stellenbosch",
    name: "Roots Restaurant",
    tagline: "Eight courses among the vines. Pairings included.",
    description:
      "Forrester Estate's farm-to-table menu, paired with Stellenbosch's most awarded reds. Sundown service runs straight into a bonfire and brandy nightcap.",
    category: "Food & Drink", subcategory: "Wine Farm",
    vibes: ["Romantic", "Chill"],
    city: "Stellenbosch", area: "Banhoek Valley",
    date: "2026-05-30T18:00:00", doors: "18:00 — 23:00",
    price: 1450, rating: 4.9, reviews: 168,
    capacityBooked: 36, capacityMax: 50, distanceKm: 52,
    hours: "Wed — Sun 12:00 — 23:00",
    hostName: "Roots Restaurant",
    address: "Forrester Estate, Banhoek Rd, Stellenbosch",
    lat: -33.9213, lng: 18.9201,
    editorsPick: true, tags: ["Wine Pairing", "Farm-to-Table", "Date Night"],
  }),

  // ───── MUSIC (6) ─────
  spot({
    id: "bassline-newtown",
    name: "Bassline Live",
    tagline: "Where Brenda played. Where the next one will too.",
    description:
      "Newtown's heritage live venue. African jazz, hip-hop, kwaito legends. 600-cap floor, brutal sound, no seats — you're standing for this.",
    category: "Music", subcategory: "Live Venue",
    vibes: ["Hype", "Creative"],
    city: "Joburg", area: "Newtown",
    date: "2026-05-17T20:00:00", doors: "19:00 — 02:00",
    price: 350, rating: 4.8, reviews: 489,
    capacityBooked: 460, capacityMax: 600, distanceKm: 3.1,
    friendsGoing: [friends[0], friends[2]],
    hours: "Show nights 19:00 — late",
    hostName: "Bassline",
    address: "10 Henry Nxumalo St, Newtown, Johannesburg",
    lat: -26.2025, lng: 28.0339,
    editorsPick: true, tags: ["Live Music", "Hip-Hop", "Heritage"],
  }),
  spot({
    id: "ct-jazz-fest",
    name: "Cape Town Jazz Festival",
    tagline: "Africa's Grandest Gathering. Two stages. Three nights.",
    description:
      "The continent's biggest jazz festival. International headliners, SA's finest, late-night jam sessions in the side rooms. Day pass or full weekend.",
    category: "Music", subcategory: "Festival",
    vibes: ["Hype", "Creative"],
    city: "Cape Town", area: "CTICC",
    date: "2026-06-26T17:00:00", doors: "17:00 — 02:00",
    price: 950, rating: 4.9, reviews: 2104,
    capacityBooked: 12500, capacityMax: 18000, distanceKm: 4,
    friendsGoing: [friends[1], friends[3], friends[5]],
    hours: "Fri — Sat 17:00 — 02:00",
    hostName: "espAfrika",
    address: "CTICC, Cape Town",
    lat: -33.9151, lng: 18.4297,
    editorsPick: true, tags: ["Festival", "Jazz", "Multi-Day"],
  }),
  spot({
    id: "rocking-the-daisies",
    name: "Rocking the Daisies",
    tagline: "Three days. One farm. Mud guaranteed.",
    description:
      "SA's biggest indie/electronic festival. Camping, four stages, sustainable everything, headliners drop at midnight. Bring sunblock and a rain jacket.",
    category: "Music", subcategory: "Festival",
    vibes: ["Wild", "Hype"],
    city: "Stellenbosch", area: "Cloof Wine Estate",
    date: "2026-10-02T12:00:00", doors: "Friday 12:00",
    price: 1850, rating: 4.7, reviews: 4203,
    capacityBooked: 22000, capacityMax: 30000, distanceKm: 88,
    friendsGoing: [friends[0], friends[1], friends[2], friends[4]],
    hours: "Fri — Sun, all weekend",
    hostName: "Seed Experiences",
    address: "Cloof Wine Estate, Darling, Western Cape",
    lat: -33.3833, lng: 18.3833,
    tags: ["Festival", "Camping", "Indie"],
  }),
  spot({
    id: "ultra-sa-jhb",
    name: "Ultra South Africa",
    tagline: "Mainstage. Resistance. Worldwide line-up.",
    description:
      "The flagship Ultra brand lands at Nasrec. Two stages, A-list global DJs, pyrotechnics that rearrange the sky. Strict 18+ ID required.",
    category: "Music", subcategory: "Festival",
    vibes: ["Hype", "Wild"],
    city: "Joburg", area: "Nasrec",
    date: "2026-06-19T16:00:00", doors: "16:00 — 02:00",
    price: 1450, rating: 4.6, reviews: 1820,
    capacityBooked: 38000, capacityMax: 50000, distanceKm: 11,
    hours: "Fri — Sat 16:00 — 02:00",
    hostName: "Ultra SA",
    address: "Nasrec Expo Centre, Johannesburg",
    lat: -26.2533, lng: 27.9856,
    tags: ["EDM", "Festival", "18+"],
  }),
  spot({
    id: "fugard-theatre",
    name: "The Fugard Presents",
    tagline: "Strings, voice, story. One stage.",
    description:
      "District Six's intimate 280-seater. Acoustic acts, classical crossovers, spoken-word with live cello. Two-set format with interval.",
    category: "Music", subcategory: "Theatre",
    vibes: ["Chill", "Creative"],
    city: "Cape Town", area: "District Six",
    date: "2026-05-29T19:30:00", doors: "19:00 — 22:30",
    price: 380, rating: 4.8, reviews: 297,
    capacityBooked: 220, capacityMax: 280, distanceKm: 3,
    hours: "Show nights 19:00 — 22:30",
    hostName: "The Fugard",
    address: "Caledon St, District Six, Cape Town",
    lat: -33.9292, lng: 18.4221,
    tags: ["Acoustic", "Theatre", "Seated"],
  }),
  spot({
    id: "sun-arena-gig",
    name: "Sun Arena Live",
    tagline: "Time Square. Stadium sound. Big stage moments.",
    description:
      "Pretoria's 8,500-cap arena hosts the biggest SA and international gigs. Tiered seating, GA pit, parking on-site. The show always starts late — pack your patience.",
    category: "Music", subcategory: "Arena",
    vibes: ["Hype"],
    city: "Pretoria", area: "Menlyn Maine",
    date: "2026-06-13T20:00:00", doors: "19:00 — 23:30",
    price: 650, rating: 4.7, reviews: 1102,
    capacityBooked: 6800, capacityMax: 8500, distanceKm: 16,
    friendsGoing: [friends[4]],
    hours: "Show nights 19:00 — 23:30",
    hostName: "Sun Arena",
    address: "Time Square, Menlyn Maine, Pretoria",
    lat: -25.7878, lng: 28.2784,
    tags: ["Arena", "Live Music", "Family"],
  }),

  // ───── ADVENTURE (6) ─────
  spot({
    id: "magaliesberg-paraglide",
    name: "Magaliesberg Tandem Paraglide",
    tagline: "Run. Lift. Float. Repeat.",
    description:
      "Tandem paraglide with a certified pilot over the Magaliesberg cliffs. 25-minute flight, GoPro footage included.",
    category: "Adventure", subcategory: "Paragliding",
    vibes: ["Wild"],
    city: "Joburg", area: "Magaliesberg",
    date: "2026-05-11T07:30:00", doors: "Daily 07:00",
    price: 1450, rating: 5.0, reviews: 96,
    capacityBooked: 4, capacityMax: 12, distanceKm: 76,
    hours: "Daily 07:00 — 16:00",
    hostName: "SkyHigh ZA",
    address: "Magaliesberg Cliffs, North West",
    lat: -25.9833, lng: 27.5500,
    tags: ["Tandem", "Outdoor", "GoPro"],
  }),
  spot({
    id: "bloukrans-bungy",
    name: "Bloukrans Bungy",
    tagline: "216 metres. Three seconds of free fall. One legend.",
    description:
      "World's highest commercial bridge bungy. Full safety brief, video and photo packages, t-shirt at the bottom. Do it sober. Trust us.",
    category: "Adventure", subcategory: "Bungee",
    vibes: ["Wild"],
    city: "Gqeberha", area: "Tsitsikamma",
    date: "2026-05-23T09:00:00", doors: "Daily 09:00",
    price: 1750, rating: 4.9, reviews: 1240,
    capacityBooked: 28, capacityMax: 40, distanceKm: 240,
    friendsGoing: [friends[0]],
    hours: "Daily 09:00 — 17:00",
    hostName: "Face Adrenalin",
    address: "Bloukrans Bridge, N2, Tsitsikamma",
    lat: -33.9667, lng: 23.6333,
    editorsPick: true, tags: ["Bungee", "Bucket List", "Outdoor"],
  }),
  spot({
    id: "cradle-skydive",
    name: "Cradle Skydive Tandem",
    tagline: "Open the door. Lean out. Trust the strap.",
    description:
      "10,000ft tandem skydive over the Cradle of Humankind. Includes scenic flight, ground school, and a video package you'll over-share for weeks.",
    category: "Adventure", subcategory: "Skydive",
    vibes: ["Wild"],
    city: "Joburg", area: "Cradle of Humankind",
    date: "2026-05-23T08:00:00", doors: "Sat — Sun 08:00",
    price: 2950, rating: 4.9, reviews: 412,
    capacityBooked: 9, capacityMax: 16, distanceKm: 48,
    hours: "Sat — Sun 08:00 — 14:00",
    hostName: "Skydive Pretoria",
    address: "Cullinan Aerodrome, Cradle area",
    lat: -25.7167, lng: 28.5167,
    tags: ["Skydive", "Tandem", "Bucket List"],
  }),
  spot({
    id: "drakensberg-2day-hike",
    name: "Drakensberg 2-Day Hike",
    tagline: "Cathedral Peak. Sleep in a cave. Wake up changed.",
    description:
      "Guided two-day hike to Cathedral Peak. Includes cave overnight, all meals, registered guide, gear list provided. Moderate fitness required.",
    category: "Adventure", subcategory: "Hiking",
    vibes: ["Wild", "Chill"],
    city: "Durban", area: "uKhahlamba",
    date: "2026-05-23T07:00:00", doors: "Sat — Sun",
    price: 2200, rating: 4.9, reviews: 187,
    capacityBooked: 8, capacityMax: 12, distanceKm: 215,
    friendsGoing: [friends[3]],
    hours: "Weekend departures",
    hostName: "Berg Guides Co.",
    address: "Cathedral Peak, uKhahlamba, KZN",
    lat: -28.9500, lng: 29.2167,
    editorsPick: true, tags: ["Hiking", "Multi-Day", "Wilderness"],
  }),
  spot({
    id: "cape-point-mtb",
    name: "Cape Point MTB Trail",
    tagline: "Single-track to the edge of Africa.",
    description:
      "30km guided MTB loop through fynbos and ocean lookouts. Bike rental, helmet, water and trail snacks included. Intermediate skill required.",
    category: "Adventure", subcategory: "Mountain Bike",
    vibes: ["Wild"],
    city: "Cape Town", area: "Cape Point",
    date: "2026-05-16T08:00:00", doors: "Sat — Sun 08:00",
    price: 850, rating: 4.7, reviews: 224,
    capacityBooked: 6, capacityMax: 14, distanceKm: 60,
    hours: "Sat — Sun 08:00 — 13:00",
    hostName: "Day Trippers",
    address: "Cape Point Nature Reserve",
    lat: -34.3568, lng: 18.4972,
    tags: ["MTB", "Guided", "Ocean"],
  }),
  spot({
    id: "karkloof-canopy",
    name: "Karkloof Canopy Tour",
    tagline: "Eight slides. One forest. Zero regrets.",
    description:
      "Three-hour zipline tour through the indigenous Karkloof Forest. 8 slides, 2 platform crossings, full safety harness. All ages 7+.",
    category: "Adventure", subcategory: "Zipline",
    vibes: ["Wild", "Creative"],
    city: "Durban", area: "Karkloof",
    date: "2026-05-30T09:00:00", doors: "Daily 09:00",
    price: 1100, rating: 4.8, reviews: 312,
    capacityBooked: 10, capacityMax: 16, distanceKm: 100,
    hours: "Daily 09:00 — 16:00",
    hostName: "Karkloof Canopy Tours",
    address: "Karkloof Forest, KZN Midlands",
    lat: -29.3500, lng: 30.2167,
    tags: ["Zipline", "Family", "Forest"],
  }),

  // ───── WELLNESS (4) ─────
  spot({
    id: "saxon-spa-day",
    name: "Saxon Spa Sanctuary",
    tagline: "Africa's most-awarded spa. Yes, really.",
    description:
      "Five-hour ritual: hammam scrub, hot stone massage, hydrotherapy, light lunch, treatment of choice. Book robe size when reserving.",
    category: "Wellness", subcategory: "Day Spa",
    vibes: ["Chill", "Romantic"],
    city: "Sandton", area: "Sandhurst",
    date: "2026-05-22T10:00:00", doors: "Daily 09:00 — 19:00",
    price: 3200, rating: 4.9, reviews: 198,
    capacityBooked: 14, capacityMax: 18, distanceKm: 7.8,
    hours: "Daily 09:00 — 19:00",
    hostName: "The Saxon",
    address: "36 Saxon Rd, Sandhurst, Johannesburg",
    lat: -26.1342, lng: 28.0454,
    editorsPick: true, tags: ["Luxury", "Couples", "Day Spa"],
  }),
  spot({
    id: "camelthorn-retreat",
    name: "Camelthorn Wellness Retreat",
    tagline: "Bushveld silence. No wifi. No questions.",
    description:
      "Two-night reset in the Limpopo bushveld. Sunrise yoga, journaling sessions, spa treatments, plant-based meals, fire-side breathwork.",
    category: "Wellness", subcategory: "Retreat",
    vibes: ["Chill", "Creative"],
    city: "Polokwane", area: "Welgevonden Reserve",
    date: "2026-06-12T15:00:00", doors: "Fri 15:00 — Sun 12:00",
    price: 6800, rating: 4.9, reviews: 87,
    capacityBooked: 12, capacityMax: 16, distanceKm: 280,
    friendsGoing: [friends[5]],
    hours: "Fri — Sun retreats monthly",
    hostName: "Camelthorn Retreats",
    address: "Welgevonden Game Reserve, Limpopo",
    lat: -24.2167, lng: 27.8500,
    tags: ["Retreat", "Bushveld", "Multi-Day"],
  }),
  spot({
    id: "hot-yoga-parkhurst",
    name: "Hot Yoga Parkhurst",
    tagline: "40 degrees. 75 minutes. New person.",
    description:
      "Heated vinyasa flow in a 40-degree studio. Mats and towels provided, change rooms with showers. First-timer drop-in special.",
    category: "Wellness", subcategory: "Yoga Studio",
    vibes: ["Chill"],
    city: "Joburg", area: "Parkhurst",
    date: "2026-05-12T18:00:00", doors: "Mon — Sat 06:00 — 20:00",
    price: 180, rating: 4.7, reviews: 312,
    capacityBooked: 22, capacityMax: 32, distanceKm: 5.4,
    hours: "Mon — Sat 06:00 — 20:00",
    hostName: "Hot Yoga Studio",
    address: "4th Ave, Parkhurst, Johannesburg",
    lat: -26.1392, lng: 28.0156,
    tags: ["Yoga", "Drop-in", "Beginner Friendly"],
  }),
  spot({
    id: "stellenbosch-hot-springs",
    name: "Riebeek Hot Springs",
    tagline: "Outdoor pools. Mountain view. Bring a robe.",
    description:
      "Natural geothermal pools heated to 38°C. Day pass includes towel, locker and one drink. Adults-only after 18:00 on Fridays.",
    category: "Wellness", subcategory: "Hot Springs",
    vibes: ["Chill", "Romantic"],
    city: "Stellenbosch", area: "Riebeek-Kasteel",
    date: "2026-05-30T11:00:00", doors: "Daily 10:00 — 20:00",
    price: 320, rating: 4.6, reviews: 256,
    capacityBooked: 60, capacityMax: 120, distanceKm: 95,
    hours: "Daily 10:00 — 20:00",
    hostName: "Riebeek Hot Springs",
    address: "Riebeek-Kasteel, Western Cape",
    lat: -33.3792, lng: 18.9043,
    tags: ["Hot Springs", "Day Pass", "Outdoor"],
  }),

  // ───── ARTS & CULTURE (4) ─────
  spot({
    id: "sip-and-paint",
    name: "Sip & Paint: Table Mountain",
    tagline: "Two glasses. One masterpiece.",
    description:
      "Guided 2-hour painting session. All materials supplied. First glass on the house, after that you're on your own.",
    category: "Arts & Culture", subcategory: "Workshop",
    vibes: ["Creative", "Chill", "Romantic"],
    city: "Cape Town", area: "Sea Point",
    date: "2026-05-15T18:30:00", doors: "18:30 — 21:00",
    price: 320, rating: 4.7, reviews: 154,
    capacityBooked: 18, capacityMax: 24, distanceKm: 3.2,
    friendsGoing: [friends[1], friends[3]],
    hours: "Wed/Fri 18:30 — 21:00",
    hostName: "Studio Twenty Two",
    address: "Main Rd, Sea Point, Cape Town",
    lat: -33.9197, lng: 18.3850,
    tags: ["Workshop", "Date Night", "Creative"],
  }),
  spot({
    id: "zeitz-mocaa",
    name: "Zeitz MOCAA Late",
    tagline: "Africa's biggest contemporary museum. After-hours.",
    description:
      "First-Friday late opening. Curator-led tours, DJ on the rooftop, cash bar. Nine floors of contemporary African art. Wear comfortable shoes.",
    category: "Arts & Culture", subcategory: "Museum",
    vibes: ["Creative", "Chill"],
    city: "Cape Town", area: "V&A Waterfront",
    date: "2026-05-01T18:00:00", doors: "18:00 — 22:00",
    price: 180, rating: 4.8, reviews: 612,
    capacityBooked: 220, capacityMax: 350, distanceKm: 5,
    friendsGoing: [friends[2]],
    hours: "First Friday monthly",
    hostName: "Zeitz MOCAA",
    address: "Silo District, V&A Waterfront, Cape Town",
    lat: -33.9082, lng: 18.4220,
    editorsPick: true, tags: ["Museum", "Contemporary", "After-Hours"],
  }),
  spot({
    id: "constitution-hill",
    name: "Constitution Hill Tour",
    tagline: "Where struggle was lived. Where law is made.",
    description:
      "Guided 90-minute tour of the Old Fort, Number Four prison, and the Constitutional Court. Powerful, unflinching, and essential.",
    category: "Arts & Culture", subcategory: "Heritage",
    vibes: ["Creative"],
    city: "Joburg", area: "Hillbrow",
    date: "2026-05-09T11:00:00", doors: "Daily 09:00 — 16:00",
    price: 120, rating: 4.9, reviews: 884,
    capacityBooked: 25, capacityMax: 40, distanceKm: 4.2,
    hours: "Daily 09:00 — 16:00",
    hostName: "Constitution Hill",
    address: "11 Kotze St, Hillbrow, Johannesburg",
    lat: -26.1880, lng: 28.0431,
    tags: ["Heritage", "Guided", "Family"],
  }),
  spot({
    id: "the-field-pottery",
    name: "The Field Pottery Wheel",
    tagline: "Mud on your hands. Magic on the wheel.",
    description:
      "3-hour intro to the wheel. Throw two pieces, glaze them, collect them in 10 days. Wine, snacks and a playlist that keeps you going.",
    category: "Arts & Culture", subcategory: "Workshop",
    vibes: ["Creative", "Chill"],
    city: "Joburg", area: "Rosebank",
    date: "2026-05-17T14:00:00", doors: "Sat 14:00 — 17:00",
    price: 580, rating: 4.8, reviews: 142,
    capacityBooked: 8, capacityMax: 10, distanceKm: 6.4,
    friendsGoing: [friends[4]],
    hours: "Sat 14:00 — 17:00",
    hostName: "The Field",
    address: "Keyes Art Mile, Rosebank, Johannesburg",
    lat: -26.1456, lng: 28.0420,
    tags: ["Pottery", "Workshop", "Beginner Friendly"],
  }),

  // ───── FAMILY & SOCIAL (4) ─────
  spot({
    id: "gold-reef-day",
    name: "Gold Reef City Day Pass",
    tagline: "Roller coasters. Mine tour. Pancakes.",
    description:
      "All-day theme park access. Ten rides, gold-mine descent, live shows. Heads-up: Tower of Terror is no joke. Check height limits before booking.",
    category: "Family & Social", subcategory: "Theme Park",
    vibes: ["Hype", "Wild"],
    city: "Joburg", area: "Ormonde",
    date: "2026-05-16T09:30:00", doors: "Daily 09:30 — 17:00",
    price: 290, rating: 4.5, reviews: 1840,
    capacityBooked: 4500, capacityMax: 8000, distanceKm: 8.6,
    friendsGoing: [friends[0], friends[3]],
    hours: "Wed — Sun 09:30 — 17:00",
    hostName: "Gold Reef City",
    address: "Northern Parkway, Ormonde, Johannesburg",
    lat: -26.2364, lng: 28.0094,
    tags: ["Family", "Theme Park", "Day Pass"],
  }),
  spot({
    id: "ushaka-marine",
    name: "uShaka Marine World",
    tagline: "Aquarium. Slides. Dolphin show. One ticket.",
    description:
      "Full-day combo: aquarium tunnel, dolphin show, water park slides. Lockers, food courts, beach access right outside. Bring sunblock.",
    category: "Family & Social", subcategory: "Aquarium",
    vibes: ["Hype"],
    city: "Durban", area: "Point Waterfront",
    date: "2026-05-09T09:00:00", doors: "Daily 09:00 — 17:00",
    price: 320, rating: 4.6, reviews: 2902,
    capacityBooked: 1800, capacityMax: 3500, distanceKm: 14,
    hours: "Daily 09:00 — 17:00",
    hostName: "uShaka Marine World",
    address: "1 King Shaka Ave, Point, Durban",
    lat: -29.8675, lng: 31.0458,
    tags: ["Aquarium", "Family", "Water Park"],
  }),
  spot({
    id: "lory-park-zoo",
    name: "Lory Park Mini Zoo",
    tagline: "Lemurs. Lions. Lunch. Loop.",
    description:
      "Family-run mini-zoo with conservation focus. Predator feedings at 11 and 14. Picnic area, jungle gym, animal encounters bookable on arrival.",
    category: "Family & Social", subcategory: "Zoo",
    vibes: ["Chill", "Creative"],
    city: "Joburg", area: "Midrand",
    date: "2026-05-09T10:00:00", doors: "Daily 09:00 — 17:00",
    price: 140, rating: 4.6, reviews: 612,
    capacityBooked: 240, capacityMax: 600, distanceKm: 22,
    friendsGoing: [friends[5]],
    hours: "Daily 09:00 — 17:00",
    hostName: "Lory Park",
    address: "180 Kruger Rd, Midrand, Johannesburg",
    lat: -25.9889, lng: 28.1225,
    tags: ["Family", "Zoo", "Outdoor"],
  }),
  spot({
    id: "boulders-penguins",
    name: "Boulders Beach Penguins",
    tagline: "African penguins. White sand. No filter needed.",
    description:
      "Boardwalk access to the protected colony, plus swimming at adjacent Foxy Beach. SANParks fee at gate. Closed-toe shoes recommended on rocks.",
    category: "Family & Social", subcategory: "Nature",
    vibes: ["Chill", "Creative"],
    city: "Cape Town", area: "Simon's Town",
    date: "2026-05-23T11:00:00", doors: "Daily 08:00 — 18:30",
    price: 190, rating: 4.8, reviews: 4602,
    capacityBooked: 800, capacityMax: 1800, distanceKm: 38,
    hours: "Daily 08:00 — 18:30",
    hostName: "SANParks",
    address: "Boulders Beach, Simon's Town",
    lat: -34.1976, lng: 18.4519,
    tags: ["Family", "Wildlife", "Beach"],
  }),

  // ───── COMMUNITY (2) ─────
  spot({
    id: "comic-con-africa",
    name: "Comic Con Africa",
    tagline: "Cosplay. Esports. Artist alley. All weekend.",
    description:
      "Africa's biggest pop-culture expo. International guests, gaming tournaments, comic artist signings, food trucks. 4-day pass available.",
    category: "Community", subcategory: "Expo",
    vibes: ["Hype", "Creative"],
    city: "Joburg", area: "Kyalami",
    date: "2026-09-25T10:00:00", doors: "Thu — Sun 10:00 — 19:00",
    price: 320, rating: 4.7, reviews: 1604,
    capacityBooked: 28000, capacityMax: 45000, distanceKm: 28,
    friendsGoing: [friends[0], friends[2], friends[4]],
    hours: "Thu — Sun 10:00 — 19:00",
    hostName: "Reed Exhibitions",
    address: "Kyalami Grand Prix Circuit, Midrand",
    lat: -25.9925, lng: 28.0833,
    editorsPick: true, tags: ["Expo", "Pop Culture", "Multi-Day"],
  }),
  spot({
    id: "mighty-men-conference",
    name: "Mighty Men Conference",
    tagline: "Faith. Fellowship. Fire-pit theology.",
    description:
      "Annual men's faith conference. Camping on-site, three nights of speakers and worship. Bring tent, sleeping bag and a folding chair.",
    category: "Community", subcategory: "Faith Gathering",
    vibes: ["Chill", "Creative"],
    city: "Bloemfontein", area: "Bloemfontein Show Grounds",
    date: "2026-08-21T16:00:00", doors: "Fri — Sun, all weekend",
    price: 450, rating: 4.8, reviews: 720,
    capacityBooked: 18000, capacityMax: 30000, distanceKm: 410,
    hours: "Fri — Sun, camping",
    hostName: "Shalom Trust",
    address: "Bloemfontein Show Grounds, Free State",
    lat: -29.0852, lng: 26.1596,
    tags: ["Faith", "Camping", "Multi-Day"],
  }),
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
  city: City;
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
    founded: "2019", priceRange: "R120 — R220",
    specialties: ["Warehouse Techno", "Resident DJs", "All-Nighters"],
    amenities: ["Cloakroom", "Smoking Patio", "ATM", "Late-night Food"],
    openingHours: [
      { day: "Tue", hours: "21:00 — 04:00" },
      { day: "Fri — Sat", hours: "22:00 — 06:00" },
    ],
    contact: { phone: "+27 11 403 0001", email: "doors@neonunderground.za", instagram: "@neon.underground.jhb" },
    highlights: ["Strict no-phones-on-floor policy", "International guest residencies", "Sound by Funktion-One"],
  },
  "The Rooftop": {
    bio: "Sandton's sundown destination. Live sax over deep house, signature cocktails and a 360° skyline that hits different at golden hour.",
    founded: "2017", priceRange: "R180 — R350",
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
    founded: "2015", priceRange: "R60 — R150",
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
    founded: "2012", priceRange: "R1 200 — R2 800",
    specialties: ["Tandem Paragliding", "Pilot Training", "GoPro Footage"],
    amenities: ["Free Parking", "Gear Provided", "Pickup from JHB"],
    openingHours: [{ day: "Daily", hours: "07:00 — 16:00" }],
    contact: { phone: "+27 82 555 0114", email: "fly@skyhigh.za", instagram: "@skyhigh.za" },
    highlights: ["SAHPA-certified pilots", "Weather-dependent — rebooking is free", "Min weight 35kg, max 110kg"],
  },
  "Studio Twenty Two": {
    bio: "Sip & paint nights for creatives, daters and chaos coordinators. All materials supplied — talent very much optional.",
    founded: "2020", priceRange: "R250 — R420",
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
    founded: "2014", priceRange: "R120 — R250",
    specialties: ["Multi-Room", "Amapiano", "Drum & Bass"],
    amenities: ["Three Bars", "Cloakroom", "Secure Parking", "VIP Booths"],
    openingHours: [
      { day: "Thu", hours: "21:00 — 03:00" },
      { day: "Fri — Sat", hours: "22:00 — 04:00" },
    ],
    contact: { phone: "+27 31 312 8000", email: "info@clubvega.co.za", instagram: "@clubvega.dbn" },
    highlights: ["18+ only — ID required", "Dress code: smart casual", "VIP booths bookable from R2 500"],
  },
  "Truth Coffee & Jazz": {
    bio: "Pretoria's listening room. Steam-punk styling, vinyl on weekdays, live brass on weekends. Phones on silent — the music is the point.",
    founded: "2016", priceRange: "R150 — R450",
    specialties: ["Live Jazz", "Whisky Flights", "Espresso"],
    amenities: ["Whisky Bar", "Vinyl Library", "Heated Patio"],
    openingHours: [
      { day: "Tue — Wed", hours: "07:00 — 22:00" },
      { day: "Thu — Sat", hours: "07:00 — 00:00" },
    ],
    contact: { phone: "+27 12 460 8800", email: "listen@truthjazz.co.za", instagram: "@truth.jazz.room" },
    highlights: ["Phones-off policy", "80+ whisky list", "Quartets every Thursday"],
  },
  "Sakhumzi Restaurant": {
    bio: "A taste of Soweto, hosted by Sakhumzi himself. Buffet of pap, chakalaka, oxtail and Vetkoek. Karaoke nights on Fridays under the stars.",
    founded: "2002", priceRange: "R60 — R280",
    specialties: ["Soweto Cuisine", "Karaoke", "Township Tours"],
    amenities: ["Outdoor Seating", "Live Music", "Group Bookings", "Halaal Options"],
    openingHours: [{ day: "Daily", hours: "08:00 — 23:00" }],
    contact: { phone: "+27 11 536 1379", email: "book@sakhumzi.co.za", instagram: "@sakhumzi.restaurant" },
    highlights: ["Buffet starts at noon", "Karaoke every Friday from 19:00", "Walk-ins welcome"],
  },
  "The Aviary": {
    bio: "Cape Town's worst-kept secret. Find the bookshelf on Long Street. 16 seats. No menu. The bartender reads you, then builds your night.",
    founded: "2021", priceRange: "R220 — R380",
    specialties: ["Bespoke Cocktails", "Mezcal", "Listening Sessions"],
    amenities: ["Counter Seating Only", "Vinyl Sound System", "Late-night Snacks"],
    openingHours: [{ day: "Wed — Sat", hours: "19:00 — 01:00" }],
    contact: { phone: "+27 21 461 9911", email: "find@aviary.cpt", instagram: "@aviary.speakeasy" },
    highlights: ["No menu — trust the bar", "Reservation strongly advised", "Phones discouraged"],
  },
  "Castro JHB": {
    bio: "Joburg's loudest LGBTQ+ home. Drag at midnight, after-hours till sunrise, hard zero-tolerance policy on harassment.",
    founded: "2018", priceRange: "R140 — R300",
    specialties: ["Drag", "House", "After-Hours"],
    amenities: ["Two Floors", "Drag Stage", "Smoking Patio", "Coat Check"],
    openingHours: [{ day: "Sat", hours: "22:00 — 06:00" }],
    contact: { phone: "+27 11 614 7700", email: "doors@castro.jhb", instagram: "@castro.jhb" },
    highlights: ["Drag every Saturday at 00:00", "Safe space — strict policy", "ID required at door"],
  },
  "Market on Main": {
    bio: "Maboneng's flagship Sunday market — 40+ traders, three live bands, art upstairs, espresso bar all day. Family-friendly until 16:00.",
    founded: "2011", priceRange: "R30 — R200",
    specialties: ["Food Market", "Live Music", "Art Stalls"],
    amenities: ["Family Friendly", "Outdoor Seating", "Pet Friendly", "ATM"],
    openingHours: [{ day: "Sun", hours: "10:00 — 15:00" }],
    contact: { phone: "+27 11 026 4566", email: "hello@marketonmain.co.za", instagram: "@market.on.main" },
    highlights: ["40+ stalls", "Live DJs from noon", "Free entry"],
  },
  "Marble": {
    bio: "Chef David Higgs' open-flame temple. Six-course chef's table on Friday, à la carte the rest of the week. Reservations open one month ahead.",
    founded: "2017", priceRange: "R650 — R2 200",
    specialties: ["Open-Flame Cooking", "Wagyu", "Tasting Menu"],
    amenities: ["Sommelier", "Private Dining", "Valet", "Wheelchair Access"],
    openingHours: [
      { day: "Tue — Sat", hours: "12:00 — 23:00" },
      { day: "Sun", hours: "12:00 — 16:00" },
    ],
    contact: { phone: "+27 10 594 5550", email: "reserve@marble.co.za", instagram: "@marble.restaurant" },
    highlights: ["Chef's table Fridays", "South African wine focus", "Smart dress code"],
  },
  "The Old Biscuit Mill": {
    bio: "Woodstock's Saturday institution. 100+ stalls of farm produce, slow-fermented sourdough, spit-roast lamb. Get there early or queue.",
    founded: "2006", priceRange: "R30 — R250",
    specialties: ["Neighbourgoods Market", "Artisan Food", "Designers"],
    amenities: ["Family Friendly", "Outdoor", "Live Music"],
    openingHours: [{ day: "Sat", hours: "09:00 — 14:00" }],
    contact: { phone: "+27 21 447 8194", email: "info@biscuitmill.co.za", instagram: "@oldbiscuitmill" },
    highlights: ["100+ traders", "Live music from 11:00", "Free entry"],
  },
  "Roots Restaurant": {
    bio: "Forrester Estate's farm-to-table tasting menu, paired with Stellenbosch's most awarded reds. Bonfire and brandy nightcap included.",
    founded: "2018", priceRange: "R950 — R2 200",
    specialties: ["Tasting Menu", "Wine Pairing", "Farm-to-Table"],
    amenities: ["Sommelier", "Vineyard Tours", "Private Dining", "Bonfire Lounge"],
    openingHours: [{ day: "Wed — Sun", hours: "12:00 — 23:00" }],
    contact: { phone: "+27 21 885 2374", email: "reserve@roots.za", instagram: "@roots.stellenbosch" },
    highlights: ["8-course menu", "Pairing flight included", "Vineyard sundowner walk"],
  },
  "Bassline": {
    bio: "Newtown's heritage live venue. Brenda Fassie played here. So did everyone since. Brutal sound, no seats, 600-cap floor, no compromises.",
    founded: "1994", priceRange: "R200 — R650",
    specialties: ["African Jazz", "Hip-Hop", "Kwaito Heritage"],
    amenities: ["Standing Floor", "Cash Bar", "Smoking Patio", "Cloakroom"],
    openingHours: [{ day: "Show Nights", hours: "19:00 — 02:00" }],
    contact: { phone: "+27 11 838 9145", email: "shows@bassline.co.za", instagram: "@bassline.live" },
    highlights: ["No seats — standing only", "ID required (18+)", "Sound by Pioneer"],
  },
  "espAfrika": {
    bio: "Producers of the Cape Town International Jazz Festival — Africa's grandest gathering. Two stages, three nights, 30 years of jazz history.",
    founded: "1999", priceRange: "R650 — R2 800",
    specialties: ["Festival Production", "Jazz", "Multi-Day Events"],
    amenities: ["Multiple Stages", "Food Court", "Accessibility Services", "Family Areas (early)"],
    openingHours: [{ day: "Festival Weekend", hours: "17:00 — 02:00" }],
    contact: { phone: "+27 21 671 0506", email: "tickets@espafrika.com", instagram: "@captownjazzfest" },
    highlights: ["30+ international acts", "Late-night jam rooms", "Day or weekend passes"],
  },
  "Seed Experiences": {
    bio: "SA's biggest indie/electronic festival promoter. Daisies, In The City, Lighthouse — three flagship weekends a year, all-camping, all-in.",
    founded: "2006", priceRange: "R950 — R3 200",
    specialties: ["Festivals", "Electronic", "Indie"],
    amenities: ["Camping", "Multiple Stages", "Bar Villages", "Showers"],
    openingHours: [{ day: "Festival Weekend", hours: "All weekend" }],
    contact: { phone: "+27 21 200 5240", email: "info@seedexperiences.com", instagram: "@rockingthedaisies" },
    highlights: ["3-day weekend pass", "Carbon-offset programme", "Strict drug-checking partners"],
  },
  "The Saxon": {
    bio: "Africa's most-awarded boutique hotel and spa. Five-hour rituals, hammam, hydrotherapy and a couples' suite that sells out 6 weeks ahead.",
    founded: "2000", priceRange: "R2 200 — R8 800",
    specialties: ["Day Spa", "Hammam", "Couples Treatments"],
    amenities: ["Hammam", "Hydrotherapy Pool", "Light Lunch", "Robes & Slippers"],
    openingHours: [{ day: "Daily", hours: "09:00 — 19:00" }],
    contact: { phone: "+27 11 292 6000", email: "spa@saxon.co.za", instagram: "@thesaxonhotel" },
    highlights: ["Hammam scrub included", "Couples suites", "Light lunch on the patio"],
  },
  "Face Adrenalin": {
    bio: "Operators of the world's highest commercial bridge bungy at Bloukrans (216m). 25+ years, zero gravity, full insurance, t-shirt at the bottom.",
    founded: "1997", priceRange: "R1 600 — R2 200",
    specialties: ["Bungy", "Bridge Walks", "Foefie Slides"],
    amenities: ["Safety Brief", "Photo & Video Packages", "T-Shirt", "Cafe"],
    openingHours: [{ day: "Daily", hours: "09:00 — 17:00" }],
    contact: { phone: "+27 42 281 1458", email: "jump@faceadrenalin.com", instagram: "@bloukransbungy" },
    highlights: ["World's highest at 216m", "Sober jumps only", "Full insurance included"],
  },
  "Zeitz MOCAA": {
    bio: "Africa's biggest contemporary art museum, in a converted grain silo at the V&A. Nine floors, 100+ galleries, First-Friday lates.",
    founded: "2017", priceRange: "R120 — R250",
    specialties: ["Contemporary African Art", "Curator Tours", "After-Hours"],
    amenities: ["Café", "Bookshop", "Rooftop Bar", "Wheelchair Access"],
    openingHours: [
      { day: "Tue — Sun", hours: "10:00 — 18:00" },
      { day: "First Fri", hours: "10:00 — 22:00" },
    ],
    contact: { phone: "+27 87 350 4777", email: "info@zeitzmocaa.museum", instagram: "@zeitzmocaa" },
    highlights: ["First-Friday late nights", "Free for SA students", "Rooftop bar with Table Mountain view"],
  },
  "Reed Exhibitions": {
    bio: "Producers of Comic Con Africa, FACE Festival, and Decorex. Africa's biggest pop-culture and consumer expo company.",
    founded: "2013", priceRange: "R200 — R1 200",
    specialties: ["Pop Culture Expos", "Gaming Tournaments", "Artist Alley"],
    amenities: ["Multiple Halls", "Food Trucks", "Esports Arena", "Family Areas"],
    openingHours: [{ day: "Expo Weekend", hours: "10:00 — 19:00" }],
    contact: { phone: "+27 11 783 7250", email: "tickets@comicconafrica.co.za", instagram: "@comicconafrica" },
    highlights: ["4-day pass available", "Cosplay competition", "International guest list"],
  },
  "Tashas": {
    bio: "All-day brunch institution. Glasshouse seating, ricotta hotcakes and oat-milk flat whites by the pool. Bring sunglasses and a long Saturday.",
    founded: "2005", priceRange: "R140 — R320",
    specialties: ["Brunch", "All-Day Café", "Patisserie"],
    amenities: ["Outdoor Seating", "Family Friendly", "Pet Friendly", "Patisserie"],
    openingHours: [{ day: "Daily", hours: "07:30 — 16:00" }],
    contact: { phone: "+27 12 460 1330", email: "brooklyn@tashascafe.com", instagram: "@tashascafe" },
    highlights: ["Walk-ins welcome", "Kids' menu", "Outdoor terrace"],
  },
  "Bunny Chow Quarters": {
    bio: "Durban's original 1940s bunny chow recipe. Quarter, half or full — mutton, bean or prawn. Eat with your hands. No cutlery, no apologies.",
    founded: "1949", priceRange: "R55 — R180",
    specialties: ["Bunny Chow", "Durban Curry", "Halaal"],
    amenities: ["Halaal Kitchen", "Takeaway", "Family Friendly", "Vegetarian Options"],
    openingHours: [{ day: "Mon — Sun", hours: "11:00 — 22:00" }],
    contact: { phone: "+27 31 303 7717", email: "eat@bunnychowquarters.co.za", instagram: "@bunnychow.dbn" },
    highlights: ["Original 1940s recipe", "Halaal certified", "Eat-in or takeaway"],
  },
  "Ultra SA": {
    bio: "The flagship Ultra brand on African soil. Mainstage, Resistance and a worldwide line-up that lands at Nasrec for one weekend a year.",
    founded: "2014", priceRange: "R950 — R3 800",
    specialties: ["EDM Festival", "Mainstage Production", "Worldwide Headliners"],
    amenities: ["Two Stages", "VIP Bar Villages", "ATM Wall", "Medical Tent"],
    openingHours: [{ day: "Festival Weekend", hours: "16:00 — 02:00" }],
    contact: { phone: "+27 11 884 5500", email: "info@ultrasouthafrica.com", instagram: "@ultrasouthafrica" },
    highlights: ["18+ ID required", "GA & VIP tiers", "Pyrotechnics every night"],
  },
  "The Fugard": {
    bio: "District Six's intimate 280-seater. Acoustic crossovers, classical, spoken-word with live cello. Two-set format with interval.",
    founded: "2010", priceRange: "R220 — R580",
    specialties: ["Acoustic", "Theatre", "Classical Crossovers"],
    amenities: ["Tiered Seating", "Wheelchair Access", "Bar", "Cloakroom"],
    openingHours: [{ day: "Show Nights", hours: "19:00 — 22:30" }],
    contact: { phone: "+27 21 461 4554", email: "tickets@thefugard.com", instagram: "@thefugardtheatre" },
    highlights: ["Acoustic-friendly room", "All-seated venue", "Phones-off policy"],
  },
  "Sun Arena": {
    bio: "Pretoria's 8,500-cap arena at Time Square. Tiered seating, GA pit, parking on-site. Hosts the biggest SA and international gigs.",
    founded: "2017", priceRange: "R350 — R1 800",
    specialties: ["Arena Shows", "Stadium Sound", "Major Tours"],
    amenities: ["Tiered Seating", "GA Pit", "Parking", "Food Court", "Wheelchair Access"],
    openingHours: [{ day: "Show Nights", hours: "19:00 — 23:30" }],
    contact: { phone: "+27 12 003 9000", email: "info@sunarena.co.za", instagram: "@sunarenamenlyn" },
    highlights: ["8 500 capacity", "Shows always start late — pack patience", "On-site parking"],
  },
  "Skydive Pretoria": {
    bio: "Tandem skydiving over the Cradle of Humankind since 2008. 10 000ft jumps, scenic flight included, video package you'll over-share for weeks.",
    founded: "2008", priceRange: "R2 600 — R3 400",
    specialties: ["Tandem Skydive", "AFF Training", "Cradle Scenics"],
    amenities: ["Ground School", "Video Package", "Pickup from JHB", "Cafe"],
    openingHours: [{ day: "Sat — Sun", hours: "08:00 — 14:00" }],
    contact: { phone: "+27 82 800 6290", email: "jump@skydivepretoria.com", instagram: "@skydivepretoria" },
    highlights: ["Weather-dependent rebooking is free", "Min 16 yrs", "Max weight 100kg"],
  },
  "Berg Guides Co.": {
    bio: "Registered Drakensberg mountain guides. Two-day Cathedral Peak hikes, cave overnights, full meals, gear list and safety briefs included.",
    founded: "2011", priceRange: "R1 800 — R3 200",
    specialties: ["Multi-Day Hiking", "Cave Overnights", "Wilderness First Aid"],
    amenities: ["Guide", "Meals Included", "Gear List", "Trail Permits"],
    openingHours: [{ day: "Weekend Departures", hours: "Fri pm — Sun pm" }],
    contact: { phone: "+27 33 845 0000", email: "trail@bergguides.co.za", instagram: "@berg.guides" },
    highlights: ["Moderate fitness required", "MCSA-registered guides", "Group max 12"],
  },
  "Day Trippers": {
    bio: "Cape Town's longest-running adventure day-trip outfit. MTB, hikes, peninsula loops — bike, helmet, trail snacks and pickups all sorted.",
    founded: "1996", priceRange: "R650 — R1 400",
    specialties: ["MTB Tours", "Peninsula Hikes", "Cape Point Loops"],
    amenities: ["Bike Rental", "Helmet & Pads", "Trail Snacks", "Pickup from CBD"],
    openingHours: [{ day: "Sat — Sun", hours: "08:00 — 13:00" }],
    contact: { phone: "+27 21 511 4766", email: "ride@daytrippers.co.za", instagram: "@daytrippers.cpt" },
    highlights: ["Intermediate skill required", "All gear included", "Small group sizes"],
  },
  "Karkloof Canopy Tours": {
    bio: "Three-hour zipline tour through the indigenous Karkloof Forest. Eight slides, two platform crossings, full safety harness — ages 7 and up.",
    founded: "2003", priceRange: "R950 — R1 250",
    specialties: ["Zipline", "Forest Canopy", "Family Adventure"],
    amenities: ["Safety Harness", "Trained Guides", "Cafe", "Family Friendly"],
    openingHours: [{ day: "Daily", hours: "09:00 — 16:00" }],
    contact: { phone: "+27 33 330 3415", email: "fly@karkloof.co.za", instagram: "@karkloofcanopy" },
    highlights: ["Min age 7", "Max weight 120kg", "All weather (light rain ok)"],
  },
  "Camelthorn Retreats": {
    bio: "Bushveld reset weekends in Welgevonden. Sunrise yoga, journaling, plant-based meals, fire-side breathwork. No wifi. No questions.",
    founded: "2019", priceRange: "R5 800 — R8 400",
    specialties: ["Wellness Retreat", "Yoga", "Breathwork"],
    amenities: ["Plant-Based Meals", "Spa", "Yoga Deck", "Bushveld Walks"],
    openingHours: [{ day: "Fri — Sun", hours: "Monthly retreats" }],
    contact: { phone: "+27 14 755 4000", email: "stay@camelthorn.za", instagram: "@camelthorn.retreats" },
    highlights: ["Phone-free zones", "Private chalet per guest", "Welgevonden Big 5 game drives"],
  },
  "Hot Yoga Studio": {
    bio: "Heated vinyasa flow in a 40-degree studio. Mats and towels provided. Drop-ins, packs and unlimited memberships available.",
    founded: "2018", priceRange: "R150 — R220",
    specialties: ["Hot Vinyasa", "Drop-In Classes", "Beginner Friendly"],
    amenities: ["Mats & Towels", "Showers", "Change Rooms", "Lockers"],
    openingHours: [{ day: "Mon — Sat", hours: "06:00 — 20:00" }],
    contact: { phone: "+27 11 327 3030", email: "om@hotyoga.co.za", instagram: "@hotyoga.parkhurst" },
    highlights: ["First-timer drop-in special", "Hydrate well before class", "10-pack & unlimited options"],
  },
  "Riebeek Hot Springs": {
    bio: "Natural geothermal pools heated to 38°C with mountain views. Day pass includes towel, locker and one drink. Adults-only Friday evenings.",
    founded: "1994", priceRange: "R260 — R420",
    specialties: ["Hot Springs", "Day Spa", "Couples Packages"],
    amenities: ["Geothermal Pools", "Towel & Locker", "Cafe", "Adults-Only Hours"],
    openingHours: [{ day: "Daily", hours: "10:00 — 20:00" }],
    contact: { phone: "+27 22 448 1855", email: "soak@riebeekhotsprings.co.za", instagram: "@riebeek.hotsprings" },
    highlights: ["Adults-only Fridays from 18:00", "Family hours till 17:00", "On-site cafe & bar"],
  },
  "Constitution Hill": {
    bio: "Heritage site combining the Old Fort, Number Four prison, and the Constitutional Court. Powerful, unflinching and essential.",
    founded: "2004", priceRange: "R80 — R150",
    specialties: ["Heritage Tour", "Guided Walks", "School Programmes"],
    amenities: ["Guided Tours", "Cafe", "Wheelchair Access", "Bookshop"],
    openingHours: [{ day: "Daily", hours: "09:00 — 16:00" }],
    contact: { phone: "+27 11 381 3100", email: "info@constitutionhill.org.za", instagram: "@constitutionhill" },
    highlights: ["90-minute guided tours", "Free for SA students", "Reservations recommended on weekends"],
  },
  "The Field": {
    bio: "Pottery wheel studio in the Keyes Art Mile. Three-hour intros, glazing sessions and a playlist that keeps you on the wheel.",
    founded: "2020", priceRange: "R420 — R780",
    specialties: ["Pottery Wheel", "Glazing", "Private Sessions"],
    amenities: ["All Materials", "Wine & Snacks", "Aprons", "Kiln Firing"],
    openingHours: [{ day: "Sat", hours: "14:00 — 17:00" }],
    contact: { phone: "+27 10 040 8800", email: "throw@thefield.studio", instagram: "@thefield.studio" },
    highlights: ["Pieces ready for collection in 10 days", "All skill levels", "Private bookings from 6 pax"],
  },
  "Gold Reef City": {
    bio: "Joburg's heritage theme park on the site of the original gold mine. Roller coasters, a real mine descent, live shows and a full casino floor.",
    founded: "1986", priceRange: "R220 — R420",
    specialties: ["Theme Park", "Mine Heritage Tour", "Live Shows"],
    amenities: ["Parking", "Family Areas", "Wheelchair Access", "Locker Rentals", "Hotel On-Site"],
    openingHours: [{ day: "Wed — Sun", hours: "09:30 — 17:00" }],
    contact: { phone: "+27 11 248 5000", email: "tickets@goldreefcity.co.za", instagram: "@goldreefcity" },
    highlights: ["Tower of Terror is no joke", "Check height limits before booking", "Mine descent included"],
  },
  "uShaka Marine World": {
    bio: "Durban's full-day combo — aquarium tunnel, dolphin show, water park slides. Lockers, food courts and beach access right outside.",
    founded: "2004", priceRange: "R220 — R420",
    specialties: ["Aquarium", "Water Park", "Dolphin Shows"],
    amenities: ["Lockers", "Food Court", "Beach Access", "Wheelchair Access", "Family Friendly"],
    openingHours: [{ day: "Daily", hours: "09:00 — 17:00" }],
    contact: { phone: "+27 31 328 8000", email: "info@ushakamarineworld.co.za", instagram: "@ushaka.marine" },
    highlights: ["One ticket covers all zones", "Bring sunblock & swimwear", "Dolphin show 11:00 & 14:00"],
  },
  "Lory Park": {
    bio: "Family-run mini-zoo in Midrand with a conservation focus. Predator feedings, picnic areas, jungle gym and bookable animal encounters.",
    founded: "1999", priceRange: "R100 — R250",
    specialties: ["Mini-Zoo", "Conservation", "Animal Encounters"],
    amenities: ["Picnic Area", "Jungle Gym", "Cafe", "Parking"],
    openingHours: [{ day: "Daily", hours: "09:00 — 17:00" }],
    contact: { phone: "+27 11 315 7307", email: "visit@lorypark.co.za", instagram: "@lorypark.zoo" },
    highlights: ["Predator feedings 11:00 & 14:00", "Animal encounters bookable on arrival", "Birthday packages"],
  },
  "SANParks": {
    bio: "South African National Parks — custodians of Kruger, Table Mountain, Boulders and 19 other parks. Boardwalks, beaches and protected colonies.",
    founded: "1926", priceRange: "R85 — R380",
    specialties: ["Conservation Areas", "Beach Access", "Wildlife Boardwalks"],
    amenities: ["Boardwalks", "Visitor Centre", "Parking", "Picnic Sites"],
    openingHours: [{ day: "Daily", hours: "08:00 — 18:30" }],
    contact: { phone: "+27 12 428 9111", email: "reservations@sanparks.org", instagram: "@sanparks" },
    highlights: ["SANParks fee at gate", "Closed-toe shoes recommended", "Wild Card holders save"],
  },
  "Shalom Trust": {
    bio: "Faith conference producers behind the Mighty Men weekend. Three nights of speakers, worship and fire-pit theology — bring tent and chair.",
    founded: "2007", priceRange: "R380 — R650",
    specialties: ["Faith Conferences", "Camping Weekends", "Worship Music"],
    amenities: ["Camping Grounds", "Worship Tent", "Food Stalls", "Family Areas"],
    openingHours: [{ day: "Conference Weekend", hours: "Fri — Sun" }],
    contact: { phone: "+27 33 500 1700", email: "info@shalomtrust.co.za", instagram: "@mightymen.conference" },
    highlights: ["Camping included", "Family-friendly day passes", "Worship line-up daily"],
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
        bio: "Booking the best nights, days and weekends across South Africa.",
        founded: "—",
        priceRange: s.price > 0 ? `From R${s.price}` : "Free",
        specialties: [s.subcategory].filter(Boolean),
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
  if (n === 0) return "Free";
  return `R${n.toLocaleString("en-ZA")}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

export function editorsPicks(): Spot[] {
  return spots.filter((s) => s.editorsPick);
}
