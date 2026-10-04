/**
 * A cached Pages shell can hydrate, then fail a later dynamic import() when
 * the hashed route or catalog chunk was deleted by a newer deploy. Safari
 * reports that as "Importing a module script failed." Reload once, with a
 * sessionStorage window so a still-broken shell cannot loop.
 */

export const CHUNK_RELOAD_WINDOW_MS = 20_000;
export const CHUNK_RELOAD_STORAGE_KEY = "tbr-chunk-reload";

const CHUNK_LOAD_MESSAGE =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i;

export type ChunkReloadStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function isChunkLoadError(error: unknown): boolean {
  if (error == null || error === false) return false;
  if (typeof error === "string") return CHUNK_LOAD_MESSAGE.test(error);
  if (typeof error !== "object") return false;
  const record = error as { name?: unknown; message?: unknown };
  const name = typeof record.name === "string" ? record.name : "";
  if (name === "ChunkLoadError") return true;
  const message = typeof record.message === "string" ? record.message : "";
  if (CHUNK_LOAD_MESSAGE.test(name) || CHUNK_LOAD_MESSAGE.test(message)) return true;
  const asString = String(error);
  return asString !== "[object Object]" && CHUNK_LOAD_MESSAGE.test(asString);
}

export function chunkReloadBlocked(storage: ChunkReloadStorage, now = Date.now()): boolean {
  let at = 0;
  try {
    at = Number.parseInt(storage.getItem(CHUNK_RELOAD_STORAGE_KEY) || "0", 10);
  } catch {
    return false;
  }
  if (!Number.isFinite(at) || at <= 0) return false;
  return now - at < CHUNK_RELOAD_WINDOW_MS;
}

let startedThisDocument = false;

/** Test hook. Does not clear sessionStorage. */
export function resetChunkReloadForTests() {
  startedThisDocument = false;
}

function markAttempt(storage: ChunkReloadStorage, now: number) {
  try {
    storage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
  } catch {
    /* private mode */
  }
}

function sessionStore(): ChunkReloadStorage {
  try {
    return sessionStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {},
    };
  }
}

/** Home Screen airplane mode. A chunk miss must not delete the only shell. */
export function isOfflineNow(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * True when a replacement document can actually be fetched. `navigator.onLine`
 * stays true on some phones with no route, and deleting the shell then leaves
 * the next launch with nothing to paint.
 */
async function shellReplacementReachable(): Promise<boolean> {
  if (typeof fetch !== "function") return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch("/salon/", { cache: "no-store", signal: ctrl.signal });
    return res.ok && (res.headers.get("content-type") || "").includes("text/html");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function clearStaleShellCache(): Promise<void> {
  if (isOfflineNow()) return;
  const canTouchCache =
    typeof caches !== "undefined" ||
    (typeof navigator !== "undefined" && Boolean(navigator.serviceWorker));
  if (!canTouchCache) return;
  if (!(await shellReplacementReachable())) return;
  // Do not delete the cached document here. The service worker overwrites it
  // only after the replacement and its entry assets are stored. A failed
  // fetch must leave the shell the phone already has.
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/salon/");
    const worker =
      navigator.serviceWorker.controller || reg?.active || reg?.waiting || reg?.installing;
    worker?.postMessage({ type: "recover-shell" });
    if (!reg) return;
    await Promise.race([
      reg.update(),
      new Promise((resolve) => {
        setTimeout(resolve, 1200);
      }),
    ]);
    reg.waiting?.postMessage({ type: "skip-waiting" });
  } catch {
    /* ignore */
  }
}

function hardReload() {
  const now = Date.now();
  try {
    const next = new URL(location.href);
    next.searchParams.set("__fresh", String(now));
    location.replace(`${next.pathname}${next.search}${next.hash}`);
  } catch {
    location.reload();
  }
}

async function runChunkReload() {
  await Promise.race([
    clearStaleShellCache(),
    new Promise((resolve) => {
      setTimeout(resolve, 1500);
    }),
  ]);
  hardReload();
}

/**
 * Ask the service worker to swap in a fresh shell, then hard-reload once.
 * Returns false when a reload already ran inside the window, or when the
 * phone is offline (the cached shell must stay).
 */
export function recoverFromChunkLoad(now = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  if (isOfflineNow()) return false;
  if (startedThisDocument) return true;
  const storage = sessionStore();
  if (chunkReloadBlocked(storage, now)) return false;
  startedThisDocument = true;
  markAttempt(storage, now);
  void runChunkReload();
  return true;
}

/** Manual Reload button. Not suppressed by the automatic window. */
export function forceChunkReload(now = Date.now()): void {
  if (typeof window === "undefined") return;
  if (isOfflineNow()) {
    try {
      location.reload();
    } catch {
      /* ignore */
    }
    return;
  }
  startedThisDocument = true;
  markAttempt(sessionStore(), now);
  void runChunkReload();
}

export function installChunkReloadGuard() {
  if (typeof window === "undefined") return;
  const host = window as Window & { __tbrChunkGuard?: boolean };
  if (host.__tbrChunkGuard) return;
  host.__tbrChunkGuard = true;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recoverFromChunkLoad();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    recoverFromChunkLoad();
  });

  window.addEventListener(
    "error",
    (event) => {
      if (!isChunkLoadError(event.error) && !isChunkLoadError(event.message)) return;
      recoverFromChunkLoad();
    },
    true,
  );
}
