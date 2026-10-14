/** A book is on this address. `/read/id` and the Pages `?/read/id` form. */
export function readerHrefOpen(href: string): boolean {
  return /\/read\/[^/?#&]+/.test(href);
}

/**
 * A new shell may replace this document. Never while the reader is open:
 * the next navigation, or the next launch, picks up the new version.
 */
export function shellMayReload(href: string, readerFrame: boolean): boolean {
  if (readerFrame) return false;
  if (readerHrefOpen(href)) return false;
  return true;
}
