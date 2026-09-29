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

const SHELL_CACHES = ["tbr-shell-v3", "tbr-shell-v2", "tbr-shell"] as const;

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

async function clearStaleShellCache(): Promise<void> {
  if (typeof caches !== "undefined") {
    await Promise.all(
      SHELL_CACHES.map(async (name) => {
        try {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          await Promise.all(
            keys.map(async (req) => {
              let path = "";
              try {
                path = new URL(req.url).pathname;
              } catch {
                return;
              }
              if (path === "/salon" || path === "/salon/" || path === "/salon/index.html") {
                await cache.delete(req);
              }
            }),
          );
        } catch {
          /* ignore */
        }
      }),
    );
  }
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
 * Clear the stale shell, ask the service worker to update, and hard-reload
 * once. Returns false when a reload already ran inside the window.
 */
export function recoverFromChunkLoad(now = Date.now()): boolean {
  if (typeof window === "undefined") return false;
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
