/**
 * Boot and background fetches must not wait on a dead radio. Offline rejects
 * immediately. A phone that still reports `onLine` while the request cannot
 * complete is cut off after a few seconds so the shelf can paint from local
 * data.
 */
export const NETWORK_TIMEOUT_MS = 4_000;

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function networkFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isOffline()) return Promise.reject(new TypeError("Failed to fetch"));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS);
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) ctrl.abort();
    else outer.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
