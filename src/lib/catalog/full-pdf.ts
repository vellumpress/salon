import { isBoundLocal, isBoundReadable, isEnReadableOff } from "./en-rights.ts";
import { SHELF, shelfWork, type ShelfWork } from "./shelf.ts";

/** True when the app can open the complete work (local bound text or Gutenberg full text). */
export function hasFullPdf(id: string) {
  if (isEnReadableOff(id)) return false;
  const work = shelfWork(id);
  return Boolean(work && isBoundReadable(work));
}

export function withFullPdf<T extends { id: string }>(items: T[]) {
  return items.filter((item) => hasFullPdf(item.id));
}

/**
 * LE-polished local bind (`local: true` + catalog/texts JSON).
 * Use for Rituals, homepage form rails, Curator/Shuffle defaults — not for search.
 */
export function isLocalBound(id: string) {
  if (isEnReadableOff(id)) return false;
  const work = shelfWork(id);
  return Boolean(work && isBoundLocal(work));
}

export function withLocalBound<T extends { id: string }>(items: T[]) {
  return items.filter((item) => isLocalBound(item.id));
}

export const FULL_TEXT_WORKS: ShelfWork[] = SHELF.filter((item) => isBoundReadable(item));

export const LOCAL_WORKS: ShelfWork[] = SHELF.filter((item) => isBoundLocal(item));
