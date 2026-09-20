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
 * Unhuman Tour (*Kusamakura*) stays Later / unranked: the 1927 Takahashi
 * English is a held near-miss, not Featured-track Next.
 *
 * Remakes are Salon original adaptations of PD sources. They are their own
 * catalog track — never Featured, Next, or Later classics.
 */
export type CuratorialTrack = "featured" | "next" | "later" | "adapted";

export const NEXT_FEATURED_TRACK_IDS = [
  "quicksand",
  "attendants-confession",
  "rashomon",
] as const;

/** Mira pack — homepage Adapted by Salon only. Do not add to Featured / Next. */
export const ADAPTED_BY_SALON_IDS = [
  "miss-brill-adapted",
  "prefer-not",
  "late-season",
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
