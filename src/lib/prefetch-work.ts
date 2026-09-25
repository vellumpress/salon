/**
 * Start a text download on tap without pulling the catalog graph into the
 * first paint. `works.ts` maps every local text; that chunk stays off the
 * Home Screen boot path until a sitting is actually opened.
 */
export function prefetchWork(id: string) {
  if (!id || id === "page" || typeof window === "undefined") return;
  void import("./works").then((mod) => mod.prefetchWork(id));
}

/** Warm the first page of the resume sit without pulling the rest of the book. */
export function prefetchOpening(id: string) {
  if (!id || id === "page" || typeof window === "undefined") return;
  void import("./works").then((mod) => mod.prefetchOpening(id));
}
