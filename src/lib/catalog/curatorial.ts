import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";

/**
 * Featured → Next → Later ranking for local binds.
 *
 * Salon Pages has no dedicated Featured trio of April + Bridge + Maggot
 * (those ids are not a carousel here). Featured stays the existing
 * FEATURED_CAROUSEL_IDS list — do not insert Quicksand.
 *
 * Quicksand is Next Featured-track: worldly non-NY backup after Mirth.
 * The Attendant’s Confession sits beside it (A24 South America lane).
 * Rashōmon sits beside them (Asia lane) — not Featured until a dedicated trio.
 */
export type CuratorialTrack = "featured" | "next" | "later";

export const NEXT_FEATURED_TRACK_IDS = [
  "quicksand",
  "attendants-confession",
  "rashomon",
] as const;

const FEATURED = new Set(FEATURED_CAROUSEL_IDS);
const NEXT = new Set<string>(NEXT_FEATURED_TRACK_IDS);

export function curatorialTrack(id: string): CuratorialTrack {
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
