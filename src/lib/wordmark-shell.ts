/**
 * Direct opens on GitHub Pages are the wordmark shell (the 404 document the
 * service worker reuses). A warm route chunk would paint the real page into
 * that shell and React error #418 fires. A prerendered route already has its
 * own markup, so it should paint immediately.
 */
export function documentIsWordmarkShell(
  doc: { querySelector: (selector: string) => unknown } | null | undefined,
) {
  if (!doc) return false;
  if (doc.querySelector(".board, .frame-screen, .reader-frame")) return false;
  return Boolean(doc.querySelector(".wordmark"));
}
