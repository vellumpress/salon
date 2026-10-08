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
  // siddhartha left this set in BATCH-13: PG 2500 is the verified 1922 English.
  "metamorphosis",
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
  // KEEP_OFF_EN — OPEN-FIX-2 language sweep: 98–100% non-English originals, no EN bind
  "bruges-la-morte",
  "calligrammes",
  "das-stunden-buch",
  "ein-landarzt",
  "les-chants-de-maldoror",
  "les-trophees",
  "os-lusiadas",
  "policarpo",
  "therese-raquin",
  "ubirajara",
  "meaulnes",
  "papeis-avulsos",
  "hien-le-maboul",
  "les-civilises",
  "prosas-profanas",
  "les-villes-tentaculaires",
  "alcools",
  "contes-cruels",
  "a-illustre-casa-de-ramires",
  "quincas",
  "tradiciones-peruanas",
  "emaux-et-camees",
  "knulp",
  "iracema",
  "neue-gedichte",
  "azul",
  "casmurro",
  "les-heures-claires",
  "petersburg",
  "nazarin",
  "pepita-jimenez",
  "cecilia",
  "the-mandarin",
  "la-regenta",
  "tristana",
  "les-amours-jaunes",
  "los-pazos-de-ulloa",
  "amor-de-perdicao",
  "libro-de-poemas",
  "misericordia",
  "martin-fierro",
  // dona-perfecta left this set in DONA-PERFECTA: PG 2462 is Mary J. Serrano's English.
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
