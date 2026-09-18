import { hasFullPdf } from "./catalog/full-pdf";
import { SHELF, type ShelfWork } from "./catalog/shelf";

export type GeoRegion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

/** Language → literary geography (approx). English scatters across several hubs. */
const LANG_HUBS: Record<string, { lat: number; lng: number; label: string }[]> = {
  English: [
    { lat: 51.5, lng: -0.12, label: "London" },
    { lat: 40.71, lng: -74.01, label: "New York" },
    { lat: 53.35, lng: -6.26, label: "Dublin" },
    { lat: -33.87, lng: 151.21, label: "Sydney" },
    { lat: 28.61, lng: 77.21, label: "Delhi" },
  ],
  French: [{ lat: 48.86, lng: 2.35, label: "Paris" }],
  Russian: [{ lat: 55.75, lng: 37.62, label: "Moscow" }],
  Spanish: [
    { lat: 40.42, lng: -3.7, label: "Madrid" },
    { lat: 19.43, lng: -99.13, label: "Mexico City" },
    { lat: -34.6, lng: -58.38, label: "Buenos Aires" },
  ],
  German: [{ lat: 52.52, lng: 13.4, label: "Berlin" }],
  Japanese: [{ lat: 35.68, lng: 139.69, label: "Tokyo" }],
  Chinese: [{ lat: 39.9, lng: 116.4, label: "Beijing" }],
  Portuguese: [
    { lat: 38.72, lng: -9.14, label: "Lisbon" },
    { lat: -22.91, lng: -43.17, label: "Rio" },
  ],
  Bengali: [{ lat: 22.57, lng: 88.36, label: "Kolkata" }],
  Italian: [{ lat: 41.9, lng: 12.5, label: "Rome" }],
  Dutch: [{ lat: 52.37, lng: 4.9, label: "Amsterdam" }],
  Polish: [{ lat: 52.23, lng: 21.01, label: "Warsaw" }],
  Swedish: [{ lat: 59.33, lng: 18.07, label: "Stockholm" }],
  Norwegian: [{ lat: 59.91, lng: 10.75, label: "Oslo" }],
  Persian: [{ lat: 35.69, lng: 51.39, label: "Tehran" }],
  Yiddish: [
    { lat: 52.23, lng: 21.01, label: "Warsaw" },
    { lat: 40.71, lng: -74.01, label: "New York" },
  ],
  Hungarian: [{ lat: 47.5, lng: 19.04, label: "Budapest" }],
  Arabic: [{ lat: 30.04, lng: 31.24, label: "Cairo" }],
  Danish: [{ lat: 55.68, lng: 12.57, label: "Copenhagen" }],
  Greek: [{ lat: 37.98, lng: 23.73, label: "Athens" }],
  Hindi: [{ lat: 28.61, lng: 77.21, label: "Delhi" }],
  Romanian: [{ lat: 44.43, lng: 26.1, label: "Bucharest" }],
  Czech: [{ lat: 50.08, lng: 14.42, label: "Prague" }],
  Finnish: [{ lat: 60.17, lng: 24.94, label: "Helsinki" }],
  Ukrainian: [{ lat: 50.45, lng: 30.52, label: "Kyiv" }],
  Hebrew: [{ lat: 31.77, lng: 35.23, label: "Jerusalem" }],
  Latin: [{ lat: 41.9, lng: 12.5, label: "Rome" }],
  Icelandic: [{ lat: 64.15, lng: -21.94, label: "Reykjavík" }],
  "Old Norse": [{ lat: 64.15, lng: -21.94, label: "Reykjavík" }],
  Tamil: [{ lat: 13.08, lng: 80.27, label: "Chennai" }],
  Catalan: [{ lat: 41.39, lng: 2.17, label: "Barcelona" }],
};

const FALLBACK = { lat: 20, lng: 0, label: "Elsewhere" };

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type PlacedWork = ShelfWork & {
  lat: number;
  lng: number;
  place: string;
  readable: boolean;
};

export function placeWork(item: ShelfWork): PlacedWork {
  const hubs = LANG_HUBS[item.language] ?? [FALLBACK];
  const h = hash(item.id);
  const hub = hubs[h % hubs.length]!;
  // deterministic jitter so titles don't stack perfectly
  const jitterLat = ((h % 1000) / 1000 - 0.5) * 6;
  const jitterLng = (((h >>> 10) % 1000) / 1000 - 0.5) * 8;
  return {
    ...item,
    lat: hub.lat + jitterLat,
    lng: hub.lng + jitterLng,
    place: hub.label,
    readable: hasFullPdf(item.id),
  };
}

export const PLACED_WORKS: PlacedWork[] = SHELF.map(placeWork);

export function regionsFromPlaced(works: PlacedWork[] = PLACED_WORKS) {
  const counts = new Map<string, number>();
  for (const w of works) {
    counts.set(w.place, (counts.get(w.place) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Equirectangular project into 0–100% of the map pane. */
export function projectPin(lat: number, lng: number) {
  const LAT0 = -55;
  const LAT1 = 75;
  const LNG0 = -170;
  const LNG1 = 180;
  const x = ((lng - LNG0) / (LNG1 - LNG0)) * 100;
  const y = ((LAT1 - lat) / (LAT1 - LAT0)) * 100;
  return {
    left: `${Math.min(97, Math.max(2, x))}%`,
    top: `${Math.min(97, Math.max(2, y))}%`,
  };
}
