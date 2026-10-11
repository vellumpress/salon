/**
 * Old phones keep the previous JavaScript until the service worker that
 * controls them is replaced. Ask for that check on every boot. Reload only
 * when a worker was already in charge and a newer one takes over, so the
 * first install does not kick a reader out of a sit.
 */

import { isOfflineNow } from "./chunk-reload.ts";

export const SW_RELOAD_KEY = "tbr-sw-reload";
export const SW_RELOAD_WINDOW_MS = 20_000;

export type SwReloadStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function workerReloadBlocked(storage: SwReloadStorage, now = Date.now()): boolean {
  let at = 0;
  try {
    at = Number.parseInt(storage.getItem(SW_RELOAD_KEY) || "0", 10);
  } catch {
    return false;
  }
  if (!Number.isFinite(at) || at <= 0) return false;
  return now - at < SW_RELOAD_WINDOW_MS;
}

export function markWorkerReload(storage: SwReloadStorage, now = Date.now()) {
  try {
    storage.setItem(SW_RELOAD_KEY, String(now));
  } catch {
    /* private mode */
  }
}

let listening = false;

export async function nudgeServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  if (isOfflineNow()) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reg: ServiceWorkerRegistration | undefined;
  try {
    reg = await navigator.serviceWorker.getRegistration("/salon/");
  } catch {
    return;
  }
  if (!reg) return;
  try {
    await reg.update();
  } catch {
    /* the browser will check again on the next navigation */
  }
  const skip = () => {
    reg?.waiting?.postMessage({ type: "skip-waiting" });
  };
  skip();
  reg.installing?.addEventListener("statechange", skip);
  if (!hadController || listening) return;
  listening = true;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    let storage: SwReloadStorage;
    try {
      storage = sessionStorage;
    } catch {
      return;
    }
    if (workerReloadBlocked(storage)) return;
    markWorkerReload(storage);
    window.location.reload();
  });
}
