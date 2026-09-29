import { SHELF, type ShelfWork } from "./shelf.ts";

/**
 * Catalog key maps that repeated an id. The later copy was the same value
 * and was removed from the map. Shelf rows themselves are not edited here.
 *
 * - an-outcast-of-the-islands — blurbs.ts
 * - the-bridge-of-san-luis-rey — places.ts
 */
export const COLLIDED_CATALOG_KEYS = [
  "an-outcast-of-the-islands",
  "the-bridge-of-san-luis-rey",
] as const;

const seen = new Set<string>();
const works: ShelfWork[] = [];
for (const work of SHELF) {
  if (seen.has(work.id)) continue;
  seen.add(work.id);
  works.push(work);
}

/** Shelf in lane order, one row per id. */
export const DEDUPED_CATALOG: readonly ShelfWork[] = works;

/** Home search and Map both read this, so the idle counts match. */
export function catalogCount() {
  return DEDUPED_CATALOG.length;
}

export function dedupedCatalogIds() {
  return DEDUPED_CATALOG.map((work) => work.id);
}
