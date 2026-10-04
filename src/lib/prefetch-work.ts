/**
 * Start a text download on tap without pulling the catalog graph into the
 * first paint. `works.ts` maps every local text; that chunk stays off the
 * Home Screen boot path until a sitting is actually opened.
 */
export function prefetchWork(id: string) {
  if (!id || id === "page" || id.startsWith("import-") || typeof window === "undefined") return;
  void import("./works")
    .then((mod) => mod.prefetchWork(id))
    .catch(() => undefined);
}

/** Warm the first page of the resume sit without pulling the rest of the book. */
export function prefetchOpening(id: string) {
  if (!id || id === "page" || id.startsWith("import-") || typeof window === "undefined") return;
  void import("./works")
    .then((mod) => mod.prefetchOpening(id))
    .catch(() => undefined);
}
