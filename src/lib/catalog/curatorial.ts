import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";

/**
 * Featured → Next → Later ranking for local binds, plus Adapted by Salon.
 *
 * Salon Pages has no dedicated Featured trio of April + Bridge + Maggot
 * (those ids are not a carousel here). Featured stays the existing
 * FEATURED_CAROUSEL_IDS list — do not insert Quicksand.
 *
 * Quicksand is Next Featured-track: worldly non-NY backup after Mirth.
 * The Attendant’s Confession sits beside it (A24 South America lane).
 * Rashōmon sits beside them (Asia lane) — not Featured until a dedicated trio.
 * A High Wind in Jamaica sits beside them (Jamaica / before-sleep Host-a-sit Ch1).
 * Noli Me Tangere sits beside them (Manila / unwind Host-a-sit Ch1).
 * Vera sits beside them (Cornwall / before-sleep Host-a-sit Ch I).
 *
 * Remakes are Salon original adaptations of PD sources. They are their own
 * catalog track — never Featured, Next, or Later classics.
 */
export type CuratorialTrack = "featured" | "next" | "later" | "adapted";

export const NEXT_FEATURED_TRACK_IDS = [
  "quicksand",
  "attendants-confession",
  "rashomon",
  "high-wind-jamaica",
  "noli-me-tangere",
  "vera",
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
