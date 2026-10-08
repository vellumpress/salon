import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { FONT_FILES, renderShellServiceWorker } from "./ssr-nul.mjs";

const ORIGIN = "https://vellumpress.github.io";
const SHELL_URL = `${ORIGIN}/salon/`;

function shellHtml(asset = "/salon/assets/index-abc.js") {
  return `<!DOCTYPE html><html><head><script data-spa-pages-restore></script><script type="module" src="${asset}"></script><link rel="stylesheet" href="/salon/assets/app.css"></head><body>shelf</body></html>`;
}

class FakeCache {
  constructor() {
    this.map = new Map();
  }
  match(key) {
    const url = typeof key === "string" ? key : key.url;
    const hit = this.map.get(url);
    return Promise.resolve(hit ? hit.clone() : undefined);
  }
  put(key, res) {
    const url = typeof key === "string" ? key : key.url;
    this.map.set(url, res.clone());
    return Promise.resolve();
  }
  delete(key) {
    const url = typeof key === "string" ? key : key.url;
    return Promise.resolve(this.map.delete(url));
  }
  keys() {
    return Promise.resolve([...this.map.keys()].map((url) => ({ url })));
  }
}

class FakeCaches {
  constructor() {
    this.stores = new Map();
  }
  open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return Promise.resolve(this.stores.get(name));
  }
  has(name) {
    return Promise.resolve(this.stores.has(name));
  }
  delete(name) {
    return Promise.resolve(this.stores.delete(name));
  }
  keys() {
    return Promise.resolve([...this.stores.keys()]);
  }
}

function loadWorker({ onLine = false, fetchImpl, clients = [] } = {}) {
  const caches = new FakeCaches();
  const listeners = {};
  const sandbox = {
    Response,
    Request,
    Headers,
    URL,
    URLSearchParams,
    Promise,
    setTimeout,
    clearTimeout,
    RegExp,
    JSON,
    Date,
    Math,
    String,
    Array,
    Object,
    Number,
    Error,
    TypeError,
    console,
    caches,
    fetch: fetchImpl ?? (() => Promise.reject(new TypeError("Failed to fetch"))),
  };
  sandbox.self = {
    location: { origin: ORIGIN, href: `${ORIGIN}/salon/sw.js` },
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    skipWaiting() { return Promise.resolve(); },
    clients: {
      claim() { return Promise.resolve(); },
      matchAll() { return Promise.resolve(clients); },
    },
    registration: { navigationPreload: { enable() { return Promise.resolve(); } } },
    navigator: { onLine },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    `${renderShellServiceWorker()}\nglobalThis.__tbr = { handleNavigate: handleNavigate, dropShellForRecovery: dropShellForRecovery, offlinePage: offlinePage, warmFonts: warmFonts, isStaticAsset: isStaticAsset, withFreshParam: withFreshParam };`,
    sandbox,
  );
  return { caches, api: sandbox.__tbr, sandbox, listeners };
}

function navEvent(href) {
  return {
    request: { url: href, method: "GET", mode: "navigate" },
    waitUntil() {},
    preloadResponse: Promise.resolve(undefined),
  };
}

async function putShell(caches, name, html = shellHtml()) {
  const cache = await caches.open(name);
  await cache.put(
    SHELL_URL,
    new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }),
  );
}

test("install stores reading faces, and an offline launch still serves them", async () => {
  const bodies = new Map();
  let online = true;
  const { caches, api, listeners } = loadWorker({
    onLine: true,
    fetchImpl(input) {
      if (!online) return Promise.reject(new TypeError("Failed to fetch"));
      const url = String(input?.url || input);
      if (url.includes("/salon/fonts/") && url.endsWith(".woff2")) {
        const body = `face:${url}`;
        bodies.set(url, body);
        return Promise.resolve(new Response(body, { status: 200, headers: { "content-type": "font/woff2" } }));
      }
      return Promise.reject(new TypeError("Failed to fetch"));
    },
  });
  await api.warmFonts();
  online = false;
  const cache = await caches.open("tbr-static");
  for (const file of FONT_FILES) {
    const url = `${ORIGIN}${file}`;
    const hit = await cache.match(url);
    assert.ok(hit, file);
    assert.equal(await hit.text(), bodies.get(url));
  }

  sandboxOffline(listeners);
  const fontUrl = `${ORIGIN}/salon/fonts/outfit-latin-400-normal.woff2`;
  const event = {
    request: { url: fontUrl, method: "GET", mode: "cors" },
    waitUntil() {},
    respondWith(promise) {
      event.result = promise;
    },
  };
  listeners.fetch(event);
  const res = await event.result;
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "font/woff2");
  assert.equal(await res.text(), bodies.get(fontUrl));

  const page = await api.offlinePage();
  const html = await page.text();
  assert.match(html, /font-family:"Outfit"/);
  assert.match(html, /\/salon\/fonts\/outfit-latin-400-normal\.woff2/);
  assert.doesNotMatch(html, /system-ui|Times New Roman|Arial|ui-sans-serif/);
  assert.equal(api.isStaticAsset(new URL(fontUrl)), true);
});

function sandboxOffline(listeners) {
  assert.equal(typeof listeners.fetch, "function");
}

test("a __fresh navigation offline falls back to the cached shell", async () => {
  const { caches, api } = loadWorker({ onLine: false });
  await putShell(caches, "tbr-shell-v3", shellHtml());
  const res = await api.handleNavigate(navEvent(`${SHELL_URL}?__fresh=171000`));
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /data-spa-pages-restore/);
  assert.doesNotMatch(text, /Retry/);
});

test("a __fresh navigation offline uses the retired shell, then an inline page", async () => {
  const retired = loadWorker({ onLine: false });
  await putShell(retired.caches, "tbr-shell-v2", shellHtml("/salon/assets/index-old.js"));
  const fromRetired = await retired.api.handleNavigate(navEvent(`${SHELL_URL}?__fresh=2`));
  assert.match(await fromRetired.text(), /index-old\.js/);

  const empty = loadWorker({ onLine: false });
  const page = await empty.api.handleNavigate(navEvent(`${SHELL_URL}?__fresh=3`));
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Offline/);
  assert.match(html, /Retry/);
  assert.match(html, /location\.reload\(\)/);
});

test("a normal navigation offline never rejects respondWith", async () => {
  const cached = loadWorker({ onLine: false });
  await putShell(cached.caches, "tbr-shell-v3");
  const hit = await cached.api.handleNavigate(navEvent(`${SHELL_URL}read/passing`));
  assert.match(await hit.text(), /data-spa-pages-restore/);

  const empty = loadWorker({ onLine: false });
  const page = await empty.api.handleNavigate(navEvent(SHELL_URL));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Retry/);

  const fresh = loadWorker({ onLine: false });
  await assert.doesNotReject(fresh.api.handleNavigate(navEvent(`${SHELL_URL}?__fresh=9`)));
});

test("recover-shell does not delete a cached shell while offline or while the network fails", async () => {
  const offline = loadWorker({ onLine: false });
  await putShell(offline.caches, "tbr-shell-v3");
  await putShell(offline.caches, "tbr-shell-v2");
  assert.equal(await offline.api.dropShellForRecovery(), false);
  const current = await offline.caches.open("tbr-shell-v3");
  const retired = await offline.caches.open("tbr-shell-v2");
  assert.ok(await current.match(SHELL_URL));
  assert.ok(await retired.match(SHELL_URL));

  const failed = loadWorker({ onLine: true });
  await putShell(failed.caches, "tbr-shell-v3");
  assert.equal(await failed.api.dropShellForRecovery(), false);
  const still = await failed.caches.open("tbr-shell-v3");
  assert.ok(await still.match(SHELL_URL));
});

test("a navigation to the web app manifest is not claimed by the shell", async () => {
  const manifest = `{
  "name": "tbr.",
  "start_url": "/salon/",
  "scope": "/salon/"
}
`;
  let manifestFetches = 0;
  const { caches, listeners } = loadWorker({
    onLine: true,
    fetchImpl(input) {
      const url = String(input?.url || input);
      if (url.includes("/salon/manifest.webmanifest")) {
        manifestFetches += 1;
        return Promise.resolve(
          new Response(manifest, {
            status: 200,
            headers: { "content-type": "application/octet-stream" },
          }),
        );
      }
      if (url.endsWith("/salon/") || url.endsWith("/salon/index.html")) {
        return Promise.resolve(
          new Response(shellHtml(), {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
        );
      }
      return Promise.reject(new TypeError("Failed to fetch"));
    },
  });
  await putShell(caches, "tbr-shell-v3");

  const event = {
    request: {
      url: `${ORIGIN}/salon/manifest.webmanifest`,
      method: "GET",
      mode: "navigate",
    },
    waitUntil() {},
    respondWith(promise) {
      event.result = promise;
    },
  };
  listeners.fetch(event);
  assert.equal(event.result, undefined);
  assert.equal(manifestFetches, 0);

  const sub = {
    request: {
      url: `${ORIGIN}/salon/manifest.webmanifest`,
      method: "GET",
      mode: "cors",
    },
    waitUntil() {},
    respondWith(promise) {
      sub.result = promise;
    },
  };
  listeners.fetch(sub);
  const res = await sub.result;
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/manifest+json; charset=utf-8");
  const body = await res.text();
  assert.match(body, /"name": "tbr."/);
  assert.match(body, /"start_url": "\/salon\/"/);
  assert.doesNotMatch(body, /data-spa-pages-restore|not on the shelf|<!DOCTYPE html>/i);

  const book = {
    request: { url: `${ORIGIN}/salon/read/passing`, method: "GET", mode: "navigate" },
    waitUntil() {},
    respondWith(promise) {
      book.result = promise;
    },
  };
  listeners.fetch(book);
  const bookRes = await book.result;
  assert.equal(bookRes.headers.get("content-type"), "text/html; charset=utf-8");
  assert.match(await bookRes.text(), /data-spa-pages-restore/);
});

test("a cached app shell is not served for a manifest navigation", async () => {
  const { caches, listeners } = loadWorker({ onLine: true });
  const href = `${ORIGIN}/salon/manifest.webmanifest`;
  const cache = await caches.open("tbr-static");
  await cache.put(
    href,
    new Response(shellHtml(), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
  );
  const event = {
    request: { url: href, method: "GET", mode: "navigate" },
    waitUntil() {},
    respondWith(promise) {
      event.result = promise;
    },
  };
  listeners.fetch(event);
  assert.equal(event.result, undefined);
});

function shellFetch(html) {
  return (input) => {
    const url = String(input && input.url ? input.url : input);
    let path = "";
    try { path = new URL(url).pathname; } catch { path = ""; }
    if (path === "/salon" || path === "/salon/" || path === "/salon/index.html") {
      return Promise.resolve(
        new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }),
      );
    }
    if (url.includes("/salon/assets/")) {
      const type = url.endsWith(".css") ? "text/css" : "text/javascript";
      return Promise.resolve(new Response("/* asset */", { status: 200, headers: { "content-type": type } }));
    }
    return Promise.resolve(new Response("", { status: 200, headers: { "content-type": "text/plain" } }));
  };
}

function openReader() {
  const navigated = [];
  const client = {
    id: "mid-sit",
    url: `${ORIGIN}/salon/read/the-house-of-mirth?sit=5`,
    navigate(href) {
      navigated.push(href);
      return Promise.resolve();
    },
  };
  return { client, navigated };
}

async function runActivate(worker) {
  let pending = Promise.resolve();
  worker.listeners.activate({
    waitUntil(task) {
      pending = Promise.resolve(task);
    },
  });
  await pending;
}

test("a first install does not reload a reader who is already mid-sit", async () => {
  const { client, navigated } = openReader();
  const html = shellHtml("/salon/assets/index-roOwEHpA.js");
  const worker = loadWorker({
    onLine: true,
    fetchImpl: shellFetch(html),
    clients: [client],
  });
  await runActivate(worker);
  assert.deepEqual(navigated, []);
  const cache = await worker.caches.open("tbr-shell-v3");
  const stored = await cache.match(SHELL_URL);
  assert.ok(stored);
  assert.match(await stored.text(), /index-roOwEHpA\.js/);
});

test("a shell commit of the same build does not reload an open reader", async () => {
  const { client, navigated } = openReader();
  const html = shellHtml("/salon/assets/index-roOwEHpA.js");
  const worker = loadWorker({
    onLine: true,
    fetchImpl: shellFetch(html),
    clients: [client],
  });
  await putShell(worker.caches, "tbr-shell-v3", html);
  await runActivate(worker);
  assert.deepEqual(navigated, []);
});

test("a new build reloads an open reader through __fresh and keeps the sit query", async () => {
  const { client, navigated } = openReader();
  const worker = loadWorker({
    onLine: true,
    fetchImpl: shellFetch(shellHtml("/salon/assets/index-newBuild.js")),
    clients: [client],
  });
  await putShell(worker.caches, "tbr-shell-v3", shellHtml("/salon/assets/index-roOwEHpA.js"));
  await runActivate(worker);
  assert.equal(navigated.length, 1);
  assert.match(navigated[0], /\/salon\/read\/the-house-of-mirth/);
  assert.match(navigated[0], /sit=5/);
  assert.match(navigated[0], /__fresh=/);
});

test("a shell refresh keeps the Pages shim query", () => {
  const { api } = loadWorker();
  assert.equal(
    api.withFreshParam(`${ORIGIN}/salon/?/club/invite/AbcdEfgh12`, 99),
    `${ORIGIN}/salon/?/club/invite/AbcdEfgh12&__fresh=99`,
  );
  assert.equal(
    api.withFreshParam(`${ORIGIN}/salon/login?next=%2Fclub%2Finvite%2FAbcdEfgh12`, 99),
    `${ORIGIN}/salon/login?next=%2Fclub%2Finvite%2FAbcdEfgh12&__fresh=99`,
  );
});

test("recover-shell may replace the shell only after a new document is fetched", async () => {
  let shellFetches = 0;
  const { caches, api } = loadWorker({
    onLine: true,
    fetchImpl(input) {
      const url = String(input);
      let path = "";
      try { path = new URL(url).pathname; } catch { path = ""; }
      if (path === "/salon" || path === "/salon/" || path === "/salon/index.html") {
        shellFetches += 1;
        return Promise.resolve(
          new Response(shellHtml("/salon/assets/index-new.js"), {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
        );
      }
      if (url.includes("/salon/assets/")) {
        const type = url.endsWith(".css") ? "text/css" : "text/javascript";
        return Promise.resolve(new Response("/* asset */", { status: 200, headers: { "content-type": type } }));
      }
      return Promise.reject(new TypeError("Failed to fetch"));
    },
  });
  await putShell(caches, "tbr-shell-v3", shellHtml("/salon/assets/index-old.js"));
  const replaced = await api.dropShellForRecovery();
  assert.equal(replaced, true);
  assert.ok(shellFetches >= 1);
  const cache = await caches.open("tbr-shell-v3");
  const stored = await cache.match(SHELL_URL);
  assert.ok(stored);
  assert.match(await stored.text(), /index-new\.js/);
});
