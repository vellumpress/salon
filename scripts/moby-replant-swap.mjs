/**
 * Install an old home-screen copy of Moby-Dick (saved place, one tall
 * paragraph), then serve this build. Reopening in WebKit standalone mode
 * must load the new book and reader chunks, split the paragraph, and keep
 * the place.
 *
 * Run after `npm run build`: node scripts/moby-replant-swap.mjs
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { devices, webkit } from "playwright";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const assetsDir = join(dist, "assets");
const PORT = 4183;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const PHONE = devices["iPhone 12"];
const VIEW = { width: 390, height: 844 };

const OLD_INDEX = "index-OLDPLACE.js";
const OLD_READER = "read._workId-OLDCOPY.js";
const OLD_BOOK = "moby-dick-OLDCOPY.js";
const PREVIOUS = [
  "index-4mnfzZ5Z.js",
  "read._workId-DaIcRdjK.js",
  "moby-dick-DoX0Aou2.js",
  "moby-dick-CnFkSYNg.js",
];

function filesNamed(prefix) {
  return readdirSync(assetsDir)
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".js"))
    .map((name) => ({
      name,
      size: statSync(join(assetsDir, name)).size,
    }))
    .sort((a, b) => b.size - a.size);
}

const bookChunks = filesNamed("moby-dick");
const readerChunks = filesNamed("read._workId");
const indexChunks = filesNamed("index");
assert.ok(bookChunks.length >= 2, `expected two Moby-Dick chunks, saw ${bookChunks.map((row) => row.name).join(", ")}`);
assert.equal(readerChunks.length, 1, `expected one reader chunk, saw ${readerChunks.map((row) => row.name).join(", ")}`);
assert.ok(indexChunks.length >= 1, "missing index chunk");
const fullBook = bookChunks[0];
const readerChunk = readerChunks[0];
const indexChunk = indexChunks[0];
for (const row of bookChunks.concat(readerChunks)) {
  const body = readFileSync(join(assetsDir, row.name), "utf8");
  assert.ok(body.includes("__mobyReplant") && body.includes("replant-1"), `${row.name} has no replant stamp`);
}
const bookSource = readFileSync(join(root, "src/lib/catalog/texts/moby-dick.json"), "utf8");
assert.equal(bookSource.includes("__mobyReplant"), false);
for (const name of PREVIOUS) {
  assert.equal(existsSync(join(assetsDir, name)), false, `${name} is still the built filename`);
}
const breath = JSON.parse(bookSource).breaths[28];
assert.equal(breath.id, "s3-0");
const breathLead = breath.text.slice(0, 48);

const saved = {
  state: {
    sittingMinutes: 0,
    progress: {
      "moby-dick": {
        breathIndex: 28,
        breathId: "s3-0",
        breathCount: 2472,
        lastOpenedAt: Date.now(),
        sittingStartedAt: Date.now() - 60_000,
        keywords: {},
        kept: [],
        completedAt: null,
        entered: true,
      },
    },
  },
  version: 2,
};

const oldModules = {
  [OLD_INDEX]: `import { place } from "./${OLD_READER}";
import { wall } from "./${OLD_BOOK}";
localStorage.setItem("vellum-v1", place);
document.body.innerHTML = wall;
`,
  [OLD_READER]: `export const place = ${JSON.stringify(JSON.stringify(saved))};
`,
  [OLD_BOOK]: `export const wall = ${JSON.stringify(
    '<main class="reader-frame" data-bound="opening" data-breath-index="28" data-display-blocks="pending"><p class="breath-now"><span class="breath-block" data-block-sentences="8" style="display:block;height:700px">WALL OF TEXT</span></p></main>',
  )};
`,
};

const oldHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>tbr</title>
<script>
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/salon/sw.js", { scope: "/salon/", updateViaCache: "none" }).then(function (reg) {
    try { reg.update(); } catch (err) {}
    if (reg.waiting) reg.waiting.postMessage({ type: "skip-waiting" });
  });
}
</script>
</head><body>
<script type="module" src="/salon/assets/${OLD_INDEX}"></script>
</body></html>`;

const oldSw = `var SHELL = "tbr-shell-v3";
var ASSETS = "tbr-assets";
var OLD_FILES = ["/salon/assets/${OLD_INDEX}", "/salon/assets/${OLD_READER}", "/salon/assets/${OLD_BOOK}"];
self.addEventListener("install", function (event) {
  var shellUrl = new URL("/salon/", self.location.origin).href;
  event.waitUntil(fetch(shellUrl).then(function (res) {
    return caches.open(SHELL).then(function (cache) { return cache.put(shellUrl, res); });
  }).then(function () {
    return caches.open(ASSETS).then(function (cache) {
      return Promise.all(OLD_FILES.map(function (path) {
        var href = new URL(path, self.location.origin).href;
        return fetch(href).then(function (res) { return cache.put(href, res); });
      }));
    });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.pathname === "/salon/sw.js") return;
  if (url.pathname.indexOf("/salon/assets/") === 0 && /\\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(caches.open(ASSETS).then(function (cache) {
      return cache.match(url.href).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && res.ok) cache.put(url.href, res.clone());
          return res;
        });
      });
    }));
    return;
  }
  if (req.mode !== "navigate") return;
  if (url.pathname !== "/salon" && url.pathname.indexOf("/salon/") !== 0) return;
  if (url.search.indexOf("__fresh=") !== -1) {
    event.respondWith(fetch(req).catch(function () {
      return caches.open(SHELL).then(function (cache) {
        return cache.match(new URL("/salon/", url.origin).href);
      });
    }));
    return;
  }
  event.respondWith(caches.open(SHELL).then(function (cache) {
    return cache.match(new URL("/salon/", url.origin).href).then(function (hit) {
      return hit || fetch(req);
    });
  }));
});
`;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

let generation = "old";

function sendText(res, status, type, body, extra = {}) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", ...extra });
  res.end(body);
}

function sendFile(res, file) {
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(readFileSync(file));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", ORIGIN);
  const path = decodeURIComponent(url.pathname);
  if (path === "/salon/sw.js") {
    const body = generation === "old" ? oldSw : readFileSync(join(dist, "sw.js"));
    sendText(res, 200, "text/javascript; charset=utf-8", body, { "service-worker-allowed": "/salon/" });
    return;
  }
  if (!path.startsWith("/salon/") && path !== "/salon") {
    sendText(res, 404, "text/plain; charset=utf-8", "missing");
    return;
  }
  const rel = path === "/salon" || path === "/salon/" ? "/index.html" : path.slice("/salon".length);
  const baseName = rel.split("/").pop() || "";
  if (generation === "old" && (rel === "/index.html" || rel.startsWith("/read/"))) {
    sendText(res, 200, "text/html; charset=utf-8", oldHtml);
    return;
  }
  if (oldModules[baseName]) {
    if (generation === "new") {
      sendText(res, 404, "text/plain; charset=utf-8", "retired");
      return;
    }
    sendText(res, 200, "text/javascript; charset=utf-8", oldModules[baseName]);
    return;
  }
  const file = normalize(join(dist, rel));
  if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) {
    sendFile(res, file);
    return;
  }
  if (generation === "new" && req.method === "GET") {
    sendFile(res, join(dist, "index.html"));
    return;
  }
  sendText(res, 404, "text/plain; charset=utf-8", "missing");
});

await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));

const browser = await webkit.launch();
const shotDir = "/opt/cursor/artifacts";
mkdirSync(shotDir, { recursive: true });
const readUrl = `${ORIGIN}/salon/read/moby-dick`;
const requests = [];
const logs = [];

try {
  const context = await browser.newContext({
    viewport: VIEW,
    screen: VIEW,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  page.on("request", (req) => requests.push(req.url()));
  page.on("pageerror", (err) => logs.push(String(err.message || err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") logs.push(msg.text());
  });
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", { configurable: true, get: () => true });
    const media = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (String(query).includes("display-mode") && String(query).includes("standalone")) {
        return {
          matches: true,
          media: String(query),
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        };
      }
      return media(query);
    };
    const proto = ServiceWorkerRegistration.prototype;
    const orig = proto.update;
    proto.update = function () {
      window.__swUpdates = (window.__swUpdates || 0) + 1;
      return orig.apply(this, arguments);
    };
  });

  await page.goto(readUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(
    () => {
      const frame = document.querySelector(".reader-frame");
      const raw = localStorage.getItem("vellum-v1");
      return (
        navigator.serviceWorker.controller &&
        frame &&
        frame.getAttribute("data-breath-index") === "28" &&
        (frame.textContent || "").includes("WALL OF TEXT") &&
        raw &&
        raw.includes('"breathId":"s3-0"')
      );
    },
    null,
    { timeout: 20000 },
  );
  const before = await page.evaluate(() => {
    const block = document.querySelector("[data-block-sentences]");
    return {
      sentences: Number(block?.getAttribute("data-block-sentences")),
      height: block?.getBoundingClientRect().height ?? 0,
    };
  });
  const beforeCaches = await page.evaluate(async () => caches.keys());
  assert.equal(before.sentences, 8);
  assert.ok(before.height > VIEW.height / 3, `old copy was already split (${before.height}px)`);
  assert.ok(beforeCaches.includes("tbr-shell-v3"));
  assert.ok(beforeCaches.includes("tbr-assets"));

  requests.length = 0;
  generation = "new";
  await page.goto(readUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(
    (lead) => {
      const frame = document.querySelector(".reader-frame");
      const blocks = document.querySelectorAll(".breath-now [data-block-sentences]");
      const script = document.querySelector("script[src*='/assets/index-']")?.getAttribute("src") || "";
      return (
        frame?.getAttribute("data-bound") === "full" &&
        frame.getAttribute("data-breath-index") === "28" &&
        frame.getAttribute("data-display-blocks") === "ready" &&
        blocks.length > 1 &&
        script.includes("/assets/index-") &&
        !script.includes("OLDPLACE") &&
        (frame.textContent || "").includes(lead) &&
        !(frame.textContent || "").includes("WALL OF TEXT")
      );
    },
    breathLead,
    { timeout: 120000 },
  );

  const after = await page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const blocks = [...document.querySelectorAll(".breath-now [data-block-sentences]")].map((node) => ({
      sentences: Number(node.getAttribute("data-block-sentences")),
      height: node.getBoundingClientRect().height,
    }));
    const raw = localStorage.getItem("vellum-v1");
    const progress = raw ? JSON.parse(raw).state.progress["moby-dick"] : null;
    return {
      index: frame?.getAttribute("data-breath-index"),
      blocks,
      viewport: window.innerHeight,
      script: document.querySelector("script[src*='/assets/index-']")?.getAttribute("src") || "",
      progress,
      updates: window.__swUpdates || 0,
    };
  });
  assert.equal(after.index, "28");
  assert.equal(after.progress.breathIndex, 28);
  assert.equal(after.progress.breathId, "s3-0");
  assert.ok(after.blocks.length > 1, "paragraph stayed one block");
  assert.ok(after.viewport >= 800, `viewport ${after.viewport}`);
  for (const block of after.blocks) {
    if (block.sentences <= 1) continue;
    const ratio = block.height / after.viewport;
    assert.ok(ratio <= 0.34, `multi-sentence block is ${ratio.toFixed(3)} of the screen`);
  }
  assert.ok(after.script.includes(indexChunk.name), `script ${after.script}`);
  const opened = requests.findIndex((url) => url.includes(indexChunk.name));
  const lived = opened >= 0 ? requests.slice(opened) : requests;
  assert.ok(lived.some((url) => url.includes(readerChunk.name)), `reader chunk ${readerChunk.name} was not requested`);
  assert.ok(lived.some((url) => url.includes(fullBook.name)), `book chunk ${fullBook.name} was not requested`);
  assert.equal(lived.some((url) => url.includes(OLD_BOOK)), false);
  assert.equal(lived.some((url) => url.includes(OLD_READER)), false);

  const cacheNames = await page.evaluate(async () => caches.keys());
  assert.equal(cacheNames.includes("tbr-shell-v3"), false, `old shell cache remains: ${cacheNames.join(", ")}`);
  assert.equal(cacheNames.includes("tbr-assets"), false, `old asset cache remains: ${cacheNames.join(", ")}`);
  assert.ok(
    cacheNames.includes("tbr-shell-v4") || cacheNames.includes("tbr-assets-v4"),
    `new caches missing: ${cacheNames.join(", ")}`,
  );

  const updatesBefore = after.updates;
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pageshow"));
  });
  await page.waitForFunction((prior) => (window.__swUpdates || 0) > prior, updatesBefore, { timeout: 10000 });

  await page.screenshot({ path: join(shotDir, "moby-replant-iphone.png") });
  const report = {
    ok: true,
    index: indexChunk.name,
    reader: readerChunk.name,
    book: bookChunks.map((row) => row.name),
    fullBook: fullBook.name,
    place: { breathIndex: after.progress.breathIndex, breathId: after.progress.breathId },
    blocks: after.blocks,
    caches: cacheNames,
  };
  console.log(JSON.stringify(report, null, 2));
  if (logs.length) console.log(JSON.stringify({ logs: logs.slice(0, 12) }, null, 2));
} catch (error) {
  try {
    const pages = browser.contexts().flatMap((ctx) => ctx.pages());
    const current = pages[0];
    if (current) {
      const diag = await current.evaluate(() => ({
        url: location.href,
        text: (document.body?.innerText || "").slice(0, 400),
        raw: localStorage.getItem("vellum-v1"),
        script: document.querySelector("script[src*='index-']")?.getAttribute("src") || "",
        bound: document.querySelector(".reader-frame")?.getAttribute("data-bound") || "",
        index: document.querySelector(".reader-frame")?.getAttribute("data-breath-index") || "",
        ready: document.querySelector(".reader-frame")?.getAttribute("data-display-blocks") || "",
        blocks: document.querySelectorAll(".breath-now [data-block-sentences]").length,
      }));
      console.log(JSON.stringify({ diag, requests: requests.slice(-30), logs: logs.slice(0, 20) }, null, 2));
      await current.screenshot({ path: join(shotDir, "moby-replant-iphone-failed.png") });
    }
  } catch (diagError) {
    console.log(String(diagError));
  }
  throw error;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
