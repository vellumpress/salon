import assert from "node:assert/strict";
import test from "node:test";
import {
  CHUNK_RELOAD_STORAGE_KEY,
  CHUNK_RELOAD_WINDOW_MS,
  chunkReloadBlocked,
  forceChunkReload,
  freshReloadHref,
  isChunkLoadError,
  isOfflineNow,
  recoverFromChunkLoad,
  resetChunkReloadForTests,
} from "./chunk-reload.ts";

test("a fresh reload keeps the Pages shim path", () => {
  assert.equal(
    freshReloadHref("https://vellumpress.github.io/salon/?/club/invite/AbcdEfgh12", 99),
    "/salon/?/club/invite/AbcdEfgh12&__fresh=99",
  );
  assert.equal(
    freshReloadHref("https://vellumpress.github.io/salon/read/passing", 99),
    "/salon/read/passing?__fresh=99",
  );
});

test("matches Safari, Chrome, Firefox, and webpack chunk failures", () => {
  assert.equal(isChunkLoadError(new Error("Importing a module script failed.")), true);
  assert.equal(
    isChunkLoadError(
      new Error("Failed to fetch dynamically imported module: https://vellumpress.github.io/salon/assets/routes-old.js"),
    ),
    true,
  );
  assert.equal(
    isChunkLoadError(new Error("error loading dynamically imported module: /salon/assets/text-old.js")),
    true,
  );
  const chunk = new Error("Loading chunk 12 failed.");
  chunk.name = "ChunkLoadError";
  assert.equal(isChunkLoadError(chunk), true);
  assert.equal(isChunkLoadError("ChunkLoadError: Loading chunk 3 failed"), true);
  assert.equal(isChunkLoadError(new Error("Failed to fetch")), false);
  assert.equal(isChunkLoadError(new Error("Something went wrong")), false);
  assert.equal(isChunkLoadError(null), false);
});

test("the automatic reload is blocked only inside the window", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
  assert.equal(chunkReloadBlocked(storage, 10_000), false);
  storage.setItem(CHUNK_RELOAD_STORAGE_KEY, "10000");
  assert.equal(chunkReloadBlocked(storage, 10_000 + CHUNK_RELOAD_WINDOW_MS - 1), true);
  assert.equal(chunkReloadBlocked(storage, 10_000 + CHUNK_RELOAD_WINDOW_MS), false);
});

test("an offline chunk miss does not wipe the shell or navigate", async () => {
  let replaced = 0;
  let reloaded = 0;
  let posted = 0;
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const previous = {
    window: globalThis.window,
    sessionStorage: globalThis.sessionStorage,
    location: globalThis.location,
    caches: globalThis.caches,
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: {
      onLine: false,
      serviceWorker: {
        controller: {
          postMessage() {
            posted += 1;
          },
        },
        getRegistration() {
          return Promise.resolve(null);
        },
      },
    },
  });
  Object.assign(globalThis, {
    window: globalThis,
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    },
    caches: {
      open() {
        throw new Error("shell cache must stay closed while offline");
      },
    },
    location: {
      href: "https://vellumpress.github.io/salon/",
      pathname: "/salon/",
      search: "",
      hash: "",
      replace() {
        replaced += 1;
      },
      reload() {
        reloaded += 1;
      },
    },
  });
  resetChunkReloadForTests();
  try {
    assert.equal(isOfflineNow(), true);
    assert.equal(recoverFromChunkLoad(9_000), false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(replaced, 0);
    assert.equal(reloaded, 0);
    assert.equal(posted, 0);
    assert.equal(globalThis.location.href, "https://vellumpress.github.io/salon/");
    forceChunkReload(9_100);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(replaced, 0);
    assert.equal(posted, 0);
    assert.equal(reloaded, 1);
  } finally {
    resetChunkReloadForTests();
    Object.assign(globalThis, previous);
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
  }
});

test("a second document in the window does not auto-reload", async () => {
  const store = new Map<string, string>();
  let replaced = 0;
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const previous = {
    window: globalThis.window,
    sessionStorage: globalThis.sessionStorage,
    location: globalThis.location,
    caches: globalThis.caches,
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: {},
  });
  Object.assign(globalThis, {
    window: globalThis,
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
    caches: undefined,
    location: {
      href: "https://vellumpress.github.io/salon/read/passing",
      pathname: "/salon/read/passing",
      search: "",
      hash: "",
      replace(next: string) {
        replaced += 1;
        this.href = next;
      },
      reload() {
        replaced += 1;
      },
    },
  });
  resetChunkReloadForTests();
  try {
    assert.equal(recoverFromChunkLoad(5_000), true);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.match(String(globalThis.location.href), /__fresh=/);
    assert.equal(store.get(CHUNK_RELOAD_STORAGE_KEY), "5000");
    resetChunkReloadForTests();
    const afterFirst = replaced;
    assert.equal(recoverFromChunkLoad(5_100), false);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(replaced, afterFirst);
    resetChunkReloadForTests();
    forceChunkReload(5_200);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(replaced, afterFirst + 1);
  } finally {
    resetChunkReloadForTests();
    Object.assign(globalThis, previous);
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
  }
});
