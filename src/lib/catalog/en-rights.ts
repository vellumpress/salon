/**
 * Thea Morse EN rights hold/pull (2026-09-16).
 *
 * These shelf ids must never be offered as English full-text readable
 * (Library, Rituals, curated rails, search-as-readable, /read local JSON).
 * Catalog-only / original-language rows may stay.
 *
 * `basilio` (Dragon’s Teeth, Serrano 1889) is the allowed stand-in and is
 * intentionally not in this set. `cousin-basilio` is listed so that id can
 * never ship as modern Cousin Basilio EN.
 */
export const EN_OFF_READABLE_IDS = new Set<string>([
  // PULL_EN
  "metamorphosis",
  "siddhartha",
  "mama-blanca",
  "skylark",
  "nirmala",
  "zaynab",
  "cat",
  // HOLD_EN
  "wild-geese",
  "quiroga",
  // HOLD_EN_VERIFY — Creighton US imprint uncleared (1931 risk)
  "grand-hotel",
  // KEEP_OFF_EN — FR/PT originals, no EN bind
  "ramires",
  "villes-tentaculaires",
  "heures-claires",
  "trophees",
  "emaux",
  // HOLD_EN — do not ship as Cousin Basilio EN
  "cousin-basilio",
]);

export function isEnReadableOff(id: string) {
  return EN_OFF_READABLE_IDS.has(id);
}

export function isBoundReadable(work: {
  id: string;
  local?: boolean;
  gutenberg?: number;
}) {
  if (isEnReadableOff(work.id)) return false;
  return Boolean(work.local || work.gutenberg);
}

export function isBoundLocal(work: { id: string; local?: boolean }) {
  if (isEnReadableOff(work.id)) return false;
  return Boolean(work.local);
}
