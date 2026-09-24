import { ADAPTED_BY_SALON_IDS, isAdaptedBySalon } from "./curatorial.ts";
import { isBoundLocal, isBoundReadable, isEnReadableOff } from "./en-rights.ts";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
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
 * Use for Rituals, homepage search + form rails, Curator/Shuffle defaults.
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

/** Homepage classics strip — remakes live on the Adapted by tbr lane. */
export const CLASSIC_LOCAL_WORKS: ShelfWork[] = LOCAL_WORKS.filter(
  (item) => !isAdaptedBySalon(item.id) && item.author !== "tbr" && item.author !== "Salon",
);

export const ADAPTED_WORKS: ShelfWork[] = ADAPTED_BY_SALON_IDS.flatMap((id) => {
  const work = shelfWork(id);
  return work && isBoundLocal(work) ? [work] : [];
});

/** Locked recommend order — only locally bound sits. */
export function featuredWorks(): ShelfWork[] {
  return FEATURED_CAROUSEL_IDS.flatMap((id) => {
    const work = shelfWork(id);
    return work && isBoundLocal(work) ? [work] : [];
  });
}
