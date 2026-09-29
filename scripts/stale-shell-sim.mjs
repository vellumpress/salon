/**
 * Build A is cached, then build B replaces it and deletes A's lazy chunk.
 * Opening from A's shell must land on B without staying on the error screen.
 *
 * Run: node scripts/stale-shell-sim.mjs
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { renderShellServiceWorker } from "./ssr-nul.mjs";

const PORT = 4178;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const sw = renderShellServiceWorker();

const HTML_404 = `<!DOCTYPE html><html><head><title>tbr</title></head><body>Missing asset</body></html>`;

function shell(gen) {
  const id = gen === "A" ? "AAAA" : "BBBB";
  return `<!DOCTYPE html><html><head>
<script data-spa-pages-restore type="text/javascript">/*restore*/</script>
<script>
(function () {
  var KEY = "tbr-chunk-reload";
  var WINDOW = 20000;
  function isChunk(error) {
    var name = error && error.name ? String(error.name) : "";
    var message = error && error.message ? String(error.message) : String(error || "");
    if (name === "ChunkLoadError") return true;
    return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i.test(name + " " + message);
  }
  function recover() {
    var now = Date.now();
    try {
      var at = parseInt(sessionStorage.getItem(KEY) || "0", 10);
      if (at && now - at < WINDOW) {
        document.body.textContent = "Reload";
        return;
      }
      sessionStorage.setItem(KEY, String(now));
    } catch (err) {}
    try {
      var worker = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (worker) worker.postMessage({ type: "recover-shell" });
    } catch (err) {}
    var next = new URLSearchParams(location.search);
    next.set("__fresh", String(now));
    location.replace(location.pathname + "?" + next.toString() + location.hash);
  }
  window.addEventListener("vite:preloadError", function (event) {
    event.preventDefault();
    recover();
  });
  window.addEventListener("unhandledrejection", function (event) {
    if (!isChunk(event.reason)) return;
    event.preventDefault();
    recover();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/salon/sw.js", { scope: "/salon/", updateViaCache: "none" });
  }
})();
</script>
<link rel="stylesheet" href="/salon/assets/styles-${id}.css">
</head><body>
<script type="module" src="/salon/assets/index-${id}.js"></script>
</body></html>`;
}

const files = {
  "index-AAAA.js": `if (location.hash === "#warm") { document.body.textContent = "warm-a"; } else { try { sessionStorage.setItem("saw-stale-shell", "A"); } catch (err) {} import("./route-AAAA.js").then(function (mod) { document.body.textContent = mod.label; }); }\n`,
  "route-AAAA.js": `export const label = "Build A";\n`,
  "styles-AAAA.css": `body{margin:0;background:#F3F1EB;color:#111}\n`,
  "index-BBBB.js": `import("./route-BBBB.js").then(function (mod) { document.body.textContent = mod.label; });\n`,
  "route-BBBB.js": `export const label = "Build B";\n`,
  "styles-BBBB.css": `body{margin:0;background:#F3F1EB;color:#111}\n`,
};

let generation = "A";
let shellDelayMs = 0;
const hits = [];

function send(res, status, type, body) {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
  });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", ORIGIN);
  hits.push(`${req.method} ${url.pathname}${url.search}`);
  if (url.pathname === "/salon/sw.js") {
    send(res, 200, "application/javascript; charset=utf-8", sw);
    return;
  }
  const asset = url.pathname.startsWith("/salon/assets/")
    ? url.pathname.slice("/salon/assets/".length)
    : "";
  if (asset) {
    const retired = generation === "B" && (asset === "route-AAAA.js" || asset === "index-AAAA.js");
    if (retired || !files[asset]) {
      send(res, 404, "text/html; charset=utf-8", HTML_404);
      return;
    }
    const type = asset.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";
    send(res, 200, type, files[asset]);
    return;
  }
  if (url.pathname === "/salon" || url.pathname === "/salon/" || url.pathname === "/salon/index.html") {
    const body = shell(generation);
    const delay = shellDelayMs;
    setTimeout(() => send(res, 200, "text/html; charset=utf-8", body), delay);
    return;
  }
  send(res, 404, "text/html; charset=utf-8", HTML_404);
});

await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));

  await page.goto(`${ORIGIN}/salon/#warm`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 });
  await page.goto(`${ORIGIN}/salon/#warm`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(
    async () => {
      const shellCache = await caches.open("tbr-shell-v3");
      const assetCache = await caches.open("tbr-assets");
      const shellKeys = await shellCache.keys();
      const assetKeys = await assetCache.keys();
      return (
        shellKeys.some((key) => key.url.includes("/salon/")) &&
        assetKeys.some((key) => key.url.includes("index-AAAA.js"))
      );
    },
    null,
    { timeout: 10000 },
  );
  await page.waitForFunction(() => (document.body.textContent || "").includes("warm-a"), null, {
    timeout: 5000,
  });

  generation = "B";
  shellDelayMs = 1500;

  await page
    .goto(`${ORIGIN}/salon/`, { waitUntil: "domcontentloaded", timeout: 20000 })
    .catch(() => {});
  await page.waitForFunction(() => (document.body.textContent || "").includes("Build B"), null, {
    timeout: 15000,
  });

  const body = (await page.locator("body").innerText()).trim();
  const sawStale = await page.evaluate(() => sessionStorage.getItem("saw-stale-shell"));
  assert.equal(body, "Build B");
  assert.equal(sawStale, "A");
  assert.equal(body.includes("Something went wrong"), false);
  assert.notEqual(body, "Reload");

  const poisoned = await page.evaluate(async () => {
    const cache = await caches.open("tbr-assets");
    await cache.put(
      `${location.origin}/salon/assets/route-BBBB.js`,
      new Response("<!DOCTYPE html><title>stale</title>", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    const res = await fetch("/salon/assets/route-BBBB.js");
    return {
      status: res.status,
      type: res.headers.get("content-type") || "",
      text: await res.text(),
    };
  });
  assert.equal(poisoned.status, 200);
  assert.equal(poisoned.type.includes("text/html"), false);
  assert.match(poisoned.text, /Build B/);
  assert.equal(poisoned.text.includes("<!DOCTYPE"), false);

  const freshLoads = hits.filter((hit) => hit.includes("__fresh=")).length;
  assert.ok(freshLoads >= 1 && freshLoads < 6, `fresh loads should recover once, got ${freshLoads}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        body,
        sawStale,
        freshLoads,
        poisoned: { status: poisoned.status, type: poisoned.type },
        pageErrors: pageErrors.filter((line) => !/dynamically imported module|Importing a module script failed/i.test(line)),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
