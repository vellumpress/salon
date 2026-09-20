import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";

/**
 * Featured → Next → Later ranking for local binds, plus Adapted by Salon.
 *
 * Live Featured recommend rank (Mike A24≥9, Mira elevate Sun Sep 20):
 * Enchanted April, The Bridge of San Luis Rey, Mr. Fortune’s Maggot,
 * then The House of Mirth, then Quicksand. See FEATURED_CAROUSEL_IDS.
 * Home does not render a Featured strip — those five live on Rituals
 * (and remain the sit-together shuffle preference).
 *
 * Next Featured-track keeps the remaining Host-a-sit queue:
 * The Attendant’s Confession (A24 South America lane).
 * Rashōmon (Asia lane).
 * A High Wind in Jamaica (Jamaica / before-sleep Host-a-sit Ch1).
 * Noli Me Tangere (Manila / unwind Host-a-sit Ch1).
 * Vera (Cornwall / before-sleep Host-a-sit Ch I).
 * On a Chinese Screen (China / waking Host-a-sit Parlour).
 * Futility (Petersburg coast / waking Host-a-sit sisters).
 * Trooper Peter Halket (Mashonaland / before-sleep Host-a-sit kopje).
 * The Home and the World (Bengal / before-sleep) — worldly Asia, behind the
 * Featured lead (April → Bridge → Maggot → Mirth → Quicksand).
 * The Immoralist (France / before-sleep) — Next Featured-track; not cold-open.
 * Letters of a Javanese Princess and Blood and Sand are ritual Next sits only —
 * not Featured-track, not Featured carousel.
 * Where Angels Fear to Tread and The Gadfly are ritual Next sits only —
 * not Featured-track, not Featured carousel.
 * The Poison Tree is Later (Bengal / unwind) — not Next, not Featured.
 *
 * Remakes are Salon original adaptations of PD sources. They are their own
 * catalog track — never Featured, Next, or Later classics.
 */
export type CuratorialTrack = "featured" | "next" | "later" | "adapted";

export const NEXT_FEATURED_TRACK_IDS = [
  "attendants-confession",
  "rashomon",
  "high-wind-jamaica",
  "noli-me-tangere",
  "vera",
  "on-a-chinese-screen",
  "futility",
  "trooper-peter-halket",
  "the-home-and-the-world",
  "the-immoralist",
] as const;

/** Mira pack — Adapted by Salon lane only. Do not add to Featured / Next. */
export const ADAPTED_BY_SALON_IDS = [
  "miss-brill-adapted",
  "prefer-not",
  "late-season",
  "between-the-drop-and-the-water",
  "he-woke-changed",
  "the-pattern",
  "a-coat-worthy-of-respect",
  "what-she-borrowed",
  "it-was-not-nervousness",
  "during-carnival",
  "what-we-sold",
] as const;

const FEATURED = new Set(FEATURED_CAROUSEL_IDS);
const NEXT = new Set<string>(NEXT_FEATURED_TRACK_IDS);
const ADAPTED = new Set<string>(ADAPTED_BY_SALON_IDS);

export function isAdaptedBySalon(id: string) {
  return ADAPTED.has(id);
}

export function curatorialTrack(id: string): CuratorialTrack {
  if (ADAPTED.has(id)) return "adapted";
  if (FEATURED.has(id)) return "featured";
  if (NEXT.has(id)) return "next";
  return "later";
}

export function worksOnTrack(
  ids: readonly string[],
  track: CuratorialTrack,
): string[] {
  return ids.filter((id) => curatorialTrack(id) === track);
}
