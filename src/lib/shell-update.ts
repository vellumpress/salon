/**
 * Old phones keep the previous JavaScript until the service worker that
 * controls them is replaced. Ask for that check on every launch, and again
 * when the app comes back to the foreground. A newer shell applies on the
 * next navigation or the next launch. It must not replace the document
 * while a book is open.
 */

import { isOfflineNow } from "./chunk-reload.ts";
import { shellMayReload } from "./reader-shell.ts";

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

/** `index-AbCdEf12.js` from a script URL or an HTML shell. */
export function shellEntryName(value: string): string | null {
  const match = value.match(/index-[A-Za-z0-9_-]{8}\.js/);
  return match ? match[0] : null;
}

export function shellEntryDiffers(runningSrc: string, html: string): boolean {
  const live = shellEntryName(html);
  const running = shellEntryName(runningSrc);
  if (!live || !running) return false;
  return live !== running;
}

/** Baked into this shell so a later deploy is a different document. */
const SHELL_STAMP = "tbr-hold-open";

function documentMayReload(): boolean {
  if (typeof document === "undefined" || typeof location === "undefined") return true;
  const href = `${location.pathname}${location.search}`;
  if (href.includes(`\u0000${SHELL_STAMP}`)) return false;
  const frame = Boolean(document.querySelector(".reader-frame"));
  return shellMayReload(href, frame);
}

/** Keep a Pages `?/path` query intact while adding the fresh-shell flag. */
export function freshShellHref(href: string, now: number): string {
  const url = new URL(href);
  if (url.search.length > 1 && url.search.charAt(1) === "/") {
    const parts = url.search
      .slice(1)
      .split("&")
      .filter((part) => part && !part.startsWith("__fresh="));
    parts.push(`__fresh=${now}`);
    return `${url.origin}${url.pathname}?${parts.join("&")}${url.hash}`;
  }
  url.searchParams.set("__fresh", String(now));
  return url.href;
}

let listening = false;

function reloadForNewWorker() {
  if (!documentMayReload()) return;
  let storage: SwReloadStorage;
  try {
    storage = sessionStorage;
  } catch {
    return;
  }
  if (workerReloadBlocked(storage)) return;
  markWorkerReload(storage);
  window.location.reload();
}

export async function nudgeServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  if (isOfflineNow()) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  // Listen before update(). A waiting worker can take over during that
  // await, and the change event does not replay.
  if (hadController && !listening) {
    listening = true;
    navigator.serviceWorker.addEventListener("controllerchange", reloadForNewWorker);
  }
  const before = navigator.serviceWorker.controller;
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
  if (hadController && navigator.serviceWorker.controller && navigator.serviceWorker.controller !== before) {
    reloadForNewWorker();
  }
}

async function reloadIfDocumentIsStale(): Promise<void> {
  if (typeof document === "undefined" || typeof fetch !== "function") return;
  if (isOfflineNow()) return;
  if (!documentMayReload()) return;
  const running =
    document.querySelector("script[type='module'][src*='/assets/index-']")?.getAttribute("src") ||
    "";
  let html = "";
  try {
    const res = await fetch("/salon/", { cache: "no-store" });
    if (!res.ok) return;
    html = await res.text();
  } catch {
    return;
  }
  if (!shellEntryDiffers(running, html)) return;
  let storage: SwReloadStorage;
  try {
    storage = sessionStorage;
  } catch {
    return;
  }
  if (workerReloadBlocked(storage)) return;
  markWorkerReload(storage);
  const next = freshShellHref(window.location.href, Date.now());
  if (next === window.location.href) return;
  window.location.replace(next);
}

let watching = false;

export function watchShellUpdates(): void {
  if (watching || typeof window === "undefined" || typeof document === "undefined") return;
  watching = true;
  const kick = () => {
    void nudgeServiceWorker();
    void reloadIfDocumentIsStale();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick();
  });
  window.addEventListener("pageshow", kick);
  kick();
}
