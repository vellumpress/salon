/**
 * TanStack Router dehydrates SSR match ids by replacing "/" with U+0000
 * (`dehydrateSsrMatchId` in @tanstack/router-core). The root match id is
 * `__root__` + fullPath `/` → `__root__/`, which becomes the raw NUL in
 * `i:"__root__\0"` inside the classic `$tsr-stream-barrier` <script>.
 *
 * HTML forbids U+0000. Chromium rewrites it to U+FFFD and keeps parsing, and
 * `hydrateSsrMatchId` already maps both U+0000 and U+FFFD back to "/", so
 * desktop hydrates. iOS Home Screen WebKit can stop that classic script at
 * the NUL, so the module tag after it never runs and the cream "tbr"
 * shell stays on screen.
 *
 * Upstream (TanStack/router#7654) is not in the published 1.171 line. The
 * installed hydrator already accepts U+FFFD, so the source fix is to emit
 * that character instead of NUL. Existing NULs / replacement characters in
 * an id are escaped to ~0 / ~r *before* the slash rewrite; only the slash
 * step changes.
 *
 * The Pages post-build pass still removes every 0x00 from emitted HTML. A
 * leftover delimiter is rewritten to U+FFFD rather than deleted: deleting
 * the byte would turn `__root__/` into `__root__` and the client would
 * reject the SSR match.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SLASH_TO_NUL = /replaceAll\(\s*(["'])\/\1\s*,\s*(["'])\\(?:0|u0000)\2\s*\)/g;

/** @param {string} code */
export function rewriteDehydrateSsrMatchId(code) {
  if (typeof code !== "string") return { code, hits: 0 };
  let hits = 0;
  const next = code.replace(SLASH_TO_NUL, (_match, quote) => {
    hits += 1;
    return `replaceAll(${quote}/${quote}, ${quote}\\uFFFD${quote})`;
  });
  return { code: next, hits };
}

/**
 * Patch the installed router-core codec before prerender imports it.
 * Idempotent: a second call finds no slash→NUL step and writes nothing.
 * @param {string} [root]
 * @returns {string[]} files rewritten
 */
export function patchInstalledDehydrateSsrMatchId(root) {
  const packageRoot = root ?? findRouterCoreRoot();
  if (!packageRoot) return [];
  const files = [
    join(packageRoot, "dist/esm/ssr/ssr-match-id.js"),
    join(packageRoot, "dist/cjs/ssr/ssr-match-id.cjs"),
    join(packageRoot, "src/ssr/ssr-match-id.ts"),
  ];
  const patched = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const code = readFileSync(file, "utf8");
    const { code: next, hits } = rewriteDehydrateSsrMatchId(code);
    if (hits === 0) continue;
    writeFileSync(file, next);
    patched.push(file);
  }
  return patched;
}

function findRouterCoreRoot() {
  try {
    const entry = fileURLToPath(import.meta.resolve("@tanstack/router-core"));
    const marker = `${join("node_modules", "@tanstack", "router-core")}`;
    const at = entry.lastIndexOf(marker);
    if (at === -1) return null;
    return entry.slice(0, at + marker.length);
  } catch {
    return null;
  }
}

/** Vite plugin: patch router-core before SPA prerender reads match ids. */
export function ssrMatchIdNulPlugin() {
  let logged = false;
  const patch = () => {
    const patched = patchInstalledDehydrateSsrMatchId();
    if (!logged && patched.length > 0) {
      logged = true;
      console.error(
        `[ssr-match-id-no-nul] rewrote slash delimiters in ${patched.length} router-core file(s)`,
      );
    }
    return patched;
  };
  return {
    name: "ssr-match-id-no-nul",
    enforce: "pre",
    config() {
      patch();
    },
    buildStart() {
      patch();
    },
    configureServer() {
      patch();
    },
    transform(code, id) {
      const file = id.split("?")[0]?.replaceAll("\\", "/") ?? "";
      if (!file.includes("/ssr/ssr-match-id.")) return null;
      const { code: next, hits } = rewriteDehydrateSsrMatchId(code);
      if (hits === 0) return null;
      return { code: next, map: null };
    },
  };
}

const FFFD = Buffer.from([0xef, 0xbf, 0xbd]);

/**
 * Remove every 0x00 from an HTML buffer. Slash delimiters become U+FFFD,
 * which `hydrateSsrMatchId` already decodes as "/".
 * @param {Buffer | string} input
 * @returns {{ buf: Buffer, removed: number }}
 */
export function stripHtmlNulBytes(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (!buf.includes(0)) return { buf, removed: 0 };
  const parts = [];
  let removed = 0;
  let start = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] !== 0) continue;
    parts.push(buf.subarray(start, i), FFFD);
    removed += 1;
    start = i + 1;
  }
  parts.push(buf.subarray(start));
  const out = Buffer.concat(parts);
  if (out.includes(0)) {
    throw new Error("stripHtmlNulBytes left a NUL byte");
  }
  return { buf: out, removed };
}

/** @param {string} destDir */
export function stripNulBytesInHtmlTree(destDir) {
  let files = 0;
  let removed = 0;
  const stack = [destDir];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir || !existsSync(dir)) continue;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (!ent.isFile() || !/\.html?$/i.test(ent.name)) continue;
      files += 1;
      const buf = readFileSync(path);
      const next = stripHtmlNulBytes(buf);
      if (next.removed > 0) {
        writeFileSync(path, next.buf);
        removed += next.removed;
      }
    }
  }
  return { files, removed };
}

export const SHELL_CACHE_ATTR = "data-shell-network";
/**
 * Pages shell cache. v3 starts empty. `tbr-shell-v2` is the offline fallback
 * until a v3 document commits, then it is deleted. Older names (`tbr-shell`,
 * `vellum-shell`) are dropped on activate.
 */
export const SHELL_CACHE_NAME = "tbr-shell-v3";
/**
 * Hashed js/css only. Book JSON stays on the network so a long novel cannot
 * evict the shell. The activate handler must not delete this cache.
 */
export const SHELL_ASSET_CACHE_NAME = "tbr-assets";
/** Previous shell cache. Kept as an offline fallback until a v3 shell commits. */
export const RETIRED_SHELL_CACHE_NAME = "tbr-shell-v2";
/**
 * Icons, manifest, favicon, and font files. Not hashed, so they update in
 * place (stale-while-revalidate). Activate must not delete this cache.
 */
export const STATIC_CACHE_NAME = "tbr-static";
/**
 * Same-origin Outfit and Cormorant Garamond files. Install stores every
 * one in the static cache so a Home Screen launch with no network still
 * has the reading faces.
 */
export const FONT_FILES = [
  "/salon/fonts/outfit-latin-300-normal.woff2",
  "/salon/fonts/outfit-latin-400-normal.woff2",
  "/salon/fonts/outfit-latin-500-normal.woff2",
  "/salon/fonts/outfit-latin-ext-300-normal.woff2",
  "/salon/fonts/outfit-latin-ext-400-normal.woff2",
  "/salon/fonts/outfit-latin-ext-500-normal.woff2",
  "/salon/fonts/cormorant-garamond-latin-400-normal.woff2",
  "/salon/fonts/cormorant-garamond-latin-400-italic.woff2",
  "/salon/fonts/cormorant-garamond-latin-500-normal.woff2",
  "/salon/fonts/cormorant-garamond-latin-ext-400-normal.woff2",
  "/salon/fonts/cormorant-garamond-latin-ext-400-italic.woff2",
  "/salon/fonts/cormorant-garamond-latin-ext-500-normal.woff2",
];

/**
 * Home Screen cold start.
 *
 * GitHub Pages sends `cache-control: max-age=600` even for hashed files, so a
 * phone that slept past ten minutes re-fetches the whole boot graph. The
 * shell is one SPA document: serve the cached `/salon/` HTML for every
 * navigation under the scope (deep links included — no 404 hop). The web
 * app manifest is a real file, not a shelf id. A document navigation to
 * `/salon/manifest.webmanifest` is not claimed: the browser loads the Pages
 * file itself (`application/manifest+json`). A script-built Response was
 * still committed as this shell in the browser.
 * Hashed
 * js/css stay cache-first when the cached bytes are real code. A cached HTML
 * body or 404 is never returned for those URLs until the network has been
 * tried. NUL bytes are refused so a poisoned document cannot stick. Book
 * texts ship as hashed chunks under `/salon/assets/` and are precached with
 * the rest of the build manifest; they are not stored in the HTML shell.
 *
 * Repeat launches paint the cached shell. The network is given a short race
 * (`SHELL_RACE_MS`). If that response's asset list differs from the cached
 * shell — the build manifest — the new document is painted immediately.
 * A slower response still commits. Open clients are sent through `__fresh`
 * only when a cached shell's asset list differs from the new one. A first
 * install has no cached shell, so a reader already on a sentence is not
 * reloaded once precaching finishes. The new
 * service worker takes over with skipWaiting and clients.claim. Hashes the
 * cached shell still references, including lazy chunks recorded while it was
 * current, stay in the asset cache until that shell is replaced.
 *
 * A navigation whose query contains `__fresh=` prefers the network, then the
 * cached shell (current, then retired), then a small offline page. The
 * promise passed to respondWith never rejects — an offline `fetch` must not
 * surface as Safari "cannot open page".
 *
 * @param {{ precache?: string[], boot?: string[], extras?: string[] }} [manifest]
 *   `precache` is every built `/salon/assets/*.(js|mjs|css)`, app shell first
 *   and then book chunks smallest-first. `boot` is the app shell only
 *   (routes, reader, desk, shelf, pdf). Install waits for `boot`. The rest
 *   fills in after claim and stops if the origin cache quota is hit, so a
 *   long novel cannot evict the document needed to launch. `extras` is
 *   same-origin static files (manifest, icons, favicon).
 */
export function renderShellServiceWorker(manifest = {}) {
  const precacheList = Array.isArray(manifest.precache) ? manifest.precache : [];
  const bootList = Array.isArray(manifest.boot) ? manifest.boot : precacheList;
  const precache = JSON.stringify(precacheList);
  const boot = JSON.stringify(bootList);
  const extras = JSON.stringify(Array.isArray(manifest.extras) ? manifest.extras : []);
  const fontFiles = JSON.stringify(FONT_FILES);
  return `/* tbr shell: cached HTML for repeat launches; hashed js/css are cache-first. A new deploy swaps the shell when its asset manifest differs. Navigations never reject: cached shell, then retired shell, then an offline page. */
var SHELL = "${SHELL_CACHE_NAME}";
var ASSETS = "${SHELL_ASSET_CACHE_NAME}";
var RETIRED = "${RETIRED_SHELL_CACHE_NAME}";
var STATIC = "${STATIC_CACHE_NAME}";
var PRECACHE = ${precache};
var BOOT = ${boot};
var EXTRAS = ${extras};
var FONT_FILES = ${fontFiles};
var SHELL_RACE_MS = 600;
var commitChain = Promise.resolve();
var reloadedClients = {};

function shellUrl() {
  return new URL("/salon/", self.location.origin).href;
}
function manifestUrl() {
  return new URL("/salon/__sw_manifest", self.location.origin).href;
}
function liveUrl() {
  return new URL("/salon/__sw_live", self.location.origin).href;
}
function hasNul(text) {
  return text.indexOf(String.fromCharCode(0)) !== -1;
}
function isAppShell(html) {
  return typeof html === "string" && html.indexOf("data-spa-pages-restore") !== -1 && !hasNul(html);
}
function isCodeAsset(url) {
  return url.origin === self.location.origin
    && url.pathname.indexOf("/salon/assets/") === 0
    && new RegExp("\\\\.(?:js|mjs|css)$", "i").test(url.pathname);
}
function extractAssetUrls(html) {
  var re = new RegExp("/salon/assets/[A-Za-z0-9._~-]+\\\\.(?:js|mjs|css)", "g");
  var out = [];
  var seen = {};
  var match;
  while ((match = re.exec(html))) {
    var abs = new URL(match[0], self.location.origin).href;
    if (seen[abs]) continue;
    seen[abs] = 1;
    out.push(abs);
  }
  return out;
}
function shellResponse(html) {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
function readManifest(cache, url) {
  return cache.match(url || manifestUrl()).then(function (res) {
    if (!res) return [];
    return res.json().then(function (data) {
      return Array.isArray(data) ? data : [];
    }).catch(function () { return []; });
  });
}
function rememberAsset(url) {
  if (!url) return Promise.resolve();
  return caches.open(ASSETS).then(function (cache) {
    return readManifest(cache, liveUrl()).then(function (list) {
      var i;
      for (i = 0; i < list.length; i++) if (list[i] === url) return;
      list.push(url);
      return cache.put(liveUrl(), jsonResponse(list));
    });
  }).catch(function () {});
}
function withTimeout(promise, ms) {
  return new Promise(function (resolve) {
    var settled = false;
    var timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      resolve(null);
    }, ms);
    Promise.resolve(promise).then(function (value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    });
  });
}
function isServableCode(res) {
  if (!res || !res.ok || res.type === "opaque") return false;
  var type = (res.headers.get("content-type") || "").toLowerCase();
  if (type.indexOf("text/html") !== -1) return false;
  return true;
}
function plainMiss(status) {
  return new Response("", {
    status: status || 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
}
function sameAssetSet(a, b) {
  if (!a || !b || !a.length || a.length !== b.length) return false;
  var seen = {};
  var i;
  for (i = 0; i < a.length; i++) seen[a[i]] = 1;
  for (i = 0; i < b.length; i++) if (!seen[b[i]]) return false;
  return true;
}
function shellAssetsDiffer(prevHtml, nextHtml) {
  // Missing HTML is not a new build. The first install has no cached shell,
  // and the open page is already this build. Reloading it drops a mid-sit
  // reader onto the sit gate once precache finishes.
  if (!prevHtml || !nextHtml) return false;
  return !sameAssetSet(extractAssetUrls(prevHtml), extractAssetUrls(nextHtml));
}
function criticalUrls(urls) {
  var out = [];
  var i;
  for (i = 0; i < urls.length; i++) {
    if (/\\/assets\\/index-[^/]+\\.js$/.test(urls[i]) || /\\.css$/.test(urls[i])) out.push(urls[i]);
  }
  if (!out.length) {
    for (i = 0; i < urls.length; i++) {
      if (/\\.js$/.test(urls[i])) {
        out.push(urls[i]);
        break;
      }
    }
  }
  return out;
}
function warmAssets(urls) {
  if (!urls || !urls.length) return Promise.resolve(true);
  return caches.open(ASSETS).then(function (cache) {
    return Promise.all(urls.map(function (url) {
      return cache.match(url).then(function (hit) {
        if (hit && isServableCode(hit)) return true;
        return fetch(url, { cache: "no-cache" }).then(function (res) {
          if (!res || !res.ok || res.type === "opaque" || !isServableCode(res)) return false;
          var copy = res.clone();
          return cache.put(url, copy).then(function () { return true; }, function () { return false; });
        }).catch(function () { return false; });
      });
    })).then(function (flags) {
      var i;
      for (i = 0; i < flags.length; i++) if (!flags[i]) return false;
      return true;
    });
  });
}
function pruneToGenerations(urls) {
  return caches.open(ASSETS).then(function (cache) {
    return Promise.all([readManifest(cache), readManifest(cache, liveUrl())]).then(function (lists) {
      var prev = lists[0];
      var live = lists[1];
      var keep = {};
      var i;
      var baked = precacheHrefs();
      var hasLive = live.length > 0;
      for (i = 0; i < urls.length; i++) keep[urls[i]] = 1;
      for (i = 0; i < prev.length; i++) keep[prev[i]] = 1;
      for (i = 0; i < live.length; i++) keep[live[i]] = 1;
      for (i = 0; i < baked.length; i++) keep[baked[i]] = 1;
      return cache.keys().then(function (reqs) {
        return Promise.all(reqs.map(function (req) {
          if (req.url === manifestUrl() || req.url === liveUrl()) return Promise.resolve();
          if (keep[req.url]) return Promise.resolve();
          // No live generation yet: the previous manifest listed only the
          // HTML urls. Keep lazy chunks the cached shell still imports.
          if (!hasLive) {
            return cache.match(req).then(function (res) {
              if (res && !isServableCode(res)) return cache.delete(req);
            });
          }
          return cache.delete(req);
        }));
      }).then(function () {
        return cache.put(manifestUrl(), jsonResponse(urls)).then(function () {
          return cache.put(liveUrl(), jsonResponse(urls));
        });
      });
    });
  });
}
function commitShell(html) {
  if (!isAppShell(html)) return Promise.resolve(false);
  var urls = extractAssetUrls(html);
  var critical = criticalUrls(urls);
  if (!critical.length) return Promise.resolve(false);
  return warmAssets(critical).then(function (ok) {
    if (!ok) return false;
    return caches.open(SHELL).then(function (cache) {
      return cache.put(shellUrl(), shellResponse(html));
    }).then(function () {
      return caches.delete(RETIRED);
    }).then(function () {
      return warmAssets(urls);
    }).then(function () {
      return pruneToGenerations(urls);
    }).then(function () {
      return precacheBuild();
    }).then(function () { return true; });
  });
}
function enqueueCommit(html) {
  var run = commitChain.then(function () { return commitShell(html); }, function () { return commitShell(html); });
  commitChain = run.then(function () {}, function () {});
  return run;
}
function readPreload(event) {
  if (!event || !event.preloadResponse || !event.preloadResponse.then) return Promise.resolve(null);
  return withTimeout(event.preloadResponse.then(function (res) {
    if (!res || !res.ok || res.redirected) return null;
    try {
      var path = new URL(res.url || shellUrl()).pathname;
      if (path !== "/salon" && path !== "/salon/" && path !== "/salon/index.html") return null;
    } catch (err) {
      return null;
    }
    return res.text();
  }).then(function (html) {
    return isAppShell(html) ? html : null;
  }).catch(function () { return null; }), 1000);
}
function networkShell(event) {
  return withTimeout(readPreload(event).then(function (html) {
    if (html) return html;
    return fetch(shellUrl(), { cache: "no-store" }).then(function (res) {
      if (!res || !res.ok) return null;
      return res.text();
    }).then(function (text) {
      return isAppShell(text) ? text : null;
    });
  }).catch(function () { return null; }), 8000);
}
function shellFromCache(name) {
  return caches.has(name).then(function (exists) {
    if (!exists) return null;
    return caches.open(name);
  }).then(function (cache) {
    if (!cache) return null;
    return cache.match(shellUrl());
  }).then(function (cached) {
    if (!cached) return null;
    return cached.text().then(function (html) {
      if (!isAppShell(html)) return null;
      return shellResponse(html);
    });
  }).catch(function () { return null; });
}
function readCachedShell() {
  return shellFromCache(SHELL);
}
function readRetiredShell() {
  return shellFromCache(RETIRED);
}
function readCachedShellHtml() {
  return caches.has(SHELL).then(function (exists) {
    if (!exists) return null;
    return caches.open(SHELL);
  }).then(function (cache) {
    if (!cache) return null;
    return cache.match(shellUrl());
  }).then(function (cached) {
    if (!cached) return null;
    return cached.text();
  }).then(function (html) {
    return isAppShell(html) ? html : null;
  }).catch(function () { return null; });
}
function withFreshParam(href, now) {
  var url;
  try { url = new URL(href); } catch (err) { return href; }
  if (url.search.length > 1 && url.search.charAt(1) === "/") {
    var parts = url.search.slice(1).split("&").filter(function (part) {
      return part && part.indexOf("__fresh=") !== 0;
    });
    parts.push("__fresh=" + now);
    return url.origin + url.pathname + "?" + parts.join("&") + url.hash;
  }
  url.searchParams.set("__fresh", String(now));
  return url.href;
}
function reloadOpenClients() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    var now = Date.now();
    return Promise.all(list.map(function (client) {
      if (!client) return Promise.resolve();
      var recent = reloadedClients[client.id] || 0;
      if (recent && now - recent < 5000) return Promise.resolve();
      var url;
      try { url = new URL(client.url); } catch (err) { return Promise.resolve(); }
      if (url.origin !== self.location.origin) return Promise.resolve();
      if (url.pathname !== "/salon" && url.pathname.indexOf("/salon/") !== 0) return Promise.resolve();
      if (url.search.indexOf("__fresh=") !== -1) return Promise.resolve();
      if (isWebAppManifest(url)) {
        reloadedClients[client.id] = now;
        if (!client.navigate) return Promise.resolve();
        return client.navigate(url.origin + url.pathname + url.hash);
      }
      reloadedClients[client.id] = now;
      if (!client.navigate) return Promise.resolve();
      return client.navigate(withFreshParam(url.href, now));
    }));
  }).catch(function () {});
}
function cacheFirstAsset(req) {
  var url = new URL(req.url);
  return caches.open(ASSETS).then(function (cache) {
    return cache.match(url.href).then(function (hit) {
      var goodHit = isServableCode(hit);
      var drop = !goodHit && hit ? cache.delete(url.href).catch(function () {}) : Promise.resolve();
      if (goodHit) return hit;
      return drop.then(function () {
        return fetch(req, { cache: "no-cache" }).then(function (res) {
          if (isServableCode(res)) {
            var copy = res.clone();
            return cache.put(req.url, copy).then(function () {
              return rememberAsset(url.href);
            }).then(function () { return res; }, function () { return res; });
          }
          var type = res && res.headers ? (res.headers.get("content-type") || "").toLowerCase() : "";
          if (!res || !res.ok || type.indexOf("text/html") !== -1) {
            return plainMiss(res && res.status ? res.status : 404);
          }
          return res;
        }).catch(function () {
          return plainMiss(504);
        });
      });
    });
  });
}
function absList(list) {
  var out = [];
  var i;
  for (i = 0; i < list.length; i++) {
    try { out.push(new URL(list[i], self.location.origin).href); } catch (err) {}
  }
  return out;
}
function precacheHrefs() {
  return absList(PRECACHE);
}
function extraHrefs() {
  return absList(EXTRAS);
}
function precacheBatched(urls) {
  var i = 0;
  var stopped = false;
  function next() {
    if (stopped || i >= urls.length) return Promise.resolve();
    var slice = urls.slice(i, i + 6);
    i += 6;
    return caches.open(ASSETS).then(function (cache) {
      return Promise.all(slice.map(function (url) {
        return cache.match(url).then(function (hit) {
          if (hit && isServableCode(hit)) return "ok";
          return fetch(url, { cache: "no-cache" }).then(function (res) {
            if (!res || !res.ok || res.type === "opaque" || !isServableCode(res)) return "skip";
            return cache.put(url, res.clone()).then(function () { return "ok"; }, function (err) {
              var name = err && err.name ? String(err.name) : "";
              if (name === "QuotaExceededError" || /quota/i.test(String(err && err.message || err))) return "quota";
              return "skip";
            });
          }).catch(function () { return "skip"; });
        });
      })).then(function (flags) {
        var j;
        for (j = 0; j < flags.length; j++) if (flags[j] === "quota") stopped = true;
        return next();
      });
    }).catch(function () {});
  }
  return next();
}
function warmStatic(urls) {
  if (!urls || !urls.length) return Promise.resolve();
  return caches.open(STATIC).then(function (cache) {
    var i = 0;
    function next() {
      if (i >= urls.length) return;
      var slice = urls.slice(i, i + 6);
      i += 6;
      return Promise.all(slice.map(function (url) {
        return cache.match(url).then(function (hit) {
          if (hit) return;
          return fetch(url).then(function (res) {
            if (!res || (!res.ok && res.type !== "opaque")) return;
            return cache.put(url, res.clone());
          }).catch(function () {});
        });
      })).then(next, next);
    }
    return next();
  }).catch(function () {});
}
function warmFonts() {
  return warmStatic(absList(FONT_FILES));
}
function bootHrefs() {
  return absList(BOOT);
}
function precacheBuild() {
  var boot = bootHrefs();
  var seen = {};
  var i;
  var rest = [];
  var all = precacheHrefs();
  for (i = 0; i < boot.length; i++) seen[boot[i]] = 1;
  for (i = 0; i < all.length; i++) if (!seen[all[i]]) rest.push(all[i]);
  return precacheBatched(boot.concat(rest)).then(function () {
    return warmStatic(extraHrefs());
  }).then(function () {
    return warmFonts();
  }).catch(function () {});
}
function offlinePage() {
  var html = "<!DOCTYPE html><html lang=\\"en\\"><head><meta charset=\\"utf-8\\"><meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\"><title>tbr</title><style>@font-face{font-family:\\"Outfit\\";font-style:normal;font-weight:400;font-display:block;src:url(\\"/salon/fonts/outfit-latin-400-normal.woff2\\") format(\\"woff2\\")}html,body{margin:0;background:#F3F1EB;color:#111111;font:16px/1.45 \\"Outfit\\"}main{min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;padding:32px}button{margin-top:24px;height:48px;padding:0 18px;border:0;background:#111111;color:#F3F1EB;font:inherit;cursor:pointer}</style></head><body><main><p>Offline</p><p style=\\"margin-top:8px\\">tbr is on this phone. Connect once so it can open without a network.</p><button type=\\"button\\" onclick=\\"location.reload()\\">Retry</button></main></body></html>";
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
function fallbackShell() {
  return readCachedShell().then(function (hit) {
    if (hit) return hit;
    return readRetiredShell();
  }).then(function (hit) {
    return hit || offlinePage();
  }).catch(function () { return offlinePage(); });
}
function handleNavigate(event) {
  var fresh = false;
  try { fresh = new URL(event.request.url).search.indexOf("__fresh=") !== -1; } catch (err) {}
  var incoming = networkShell(event);
  var decided;
  if (fresh) {
    decided = incoming.then(function (html) {
      if (!html) return fallbackShell();
      event.waitUntil(enqueueCommit(html));
      return shellResponse(html);
    });
  } else {
    decided = readCachedShellHtml().then(function (prevHtml) {
      return withTimeout(incoming, SHELL_RACE_MS).then(function (html) {
        if (html && !prevHtml) {
          event.waitUntil(enqueueCommit(html));
          return shellResponse(html);
        }
        if (html && shellAssetsDiffer(prevHtml, html)) {
          event.waitUntil(enqueueCommit(html));
          return shellResponse(html);
        }
        if (html && prevHtml) {
          event.waitUntil(enqueueCommit(html));
          return shellResponse(prevHtml);
        }
        // Network missed the short race. Paint the cached shell so a cold
        // start stays short, then swap once if the later body is a new build.
        event.waitUntil(incoming.then(function (later) {
          if (!later) return;
          var changed = shellAssetsDiffer(prevHtml, later);
          return enqueueCommit(later).then(function () {
            if (changed) return reloadOpenClients();
          });
        }).catch(function () {}));
        if (prevHtml) return shellResponse(prevHtml);
        return readRetiredShell().then(function (old) {
          if (old) return old;
          return incoming.then(function (later) {
            if (later) return shellResponse(later);
            return fallbackShell();
          });
        });
      });
    });
  }
  return Promise.resolve(decided).then(function (res) {
    return res || offlinePage();
  }).catch(function () { return offlinePage(); });
}
function isWebAppManifest(url) {
  return url.origin === self.location.origin && /\\/manifest\\.webmanifest$/i.test(url.pathname);
}
function isHtmlBody(body) {
  var trimmed = String(body || "").replace(/^\\uFEFF/, "").trim();
  return !trimmed || trimmed.charAt(0) === "<";
}
function manifestFile(body) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/manifest+json; charset=utf-8" },
  });
}
function manifestFromResponse(res, req, allowRefetch) {
  if (!res || !res.ok) {
    if (allowRefetch) return refetchManifest(req);
    return Promise.resolve(plainMiss(res && res.status ? res.status : 404));
  }
  return res.text().then(function (body) {
    if (isHtmlBody(body)) {
      if (allowRefetch) return refetchManifest(req);
      return plainMiss(404);
    }
    return manifestFile(body);
  });
}
function refetchManifest(req) {
  return fetch(req, { cache: "no-store" }).then(function (fresh) {
    return manifestFromResponse(fresh, req, false);
  }).catch(function () { return plainMiss(504); });
}
function serveWebAppManifest(event, req) {
  return staleWhileRevalidate(event, req).then(function (res) {
    return manifestFromResponse(res, req, true);
  }).catch(function () { return plainMiss(504); });
}
function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.indexOf("/salon/") !== 0) return false;
  if (isCodeAsset(url)) return false;
  return /\\/(?:manifest\\.webmanifest|favicon\\.(?:ico|svg)|icon-\\d+\\.png|og\\.jpg|pdf\\.worker\\.min\\.js)$/i.test(url.pathname)
    || /\\.(?:json|webmanifest|png|svg|ico|jpe?g|webp|gif|woff2?)$/i.test(url.pathname);
}
function staleWhileRevalidate(event, req) {
  return caches.open(STATIC).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var refresh = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          var copy = res.clone();
          return cache.put(req, copy).then(function () { return res; }, function () { return res; });
        }
        return res;
      }).catch(function () { return null; });
      if (hit) {
        event.waitUntil(refresh);
        return hit;
      }
      return refresh.then(function (res) {
        return res || plainMiss(504);
      });
    });
  }).catch(function () {
    return fetch(req).catch(function () { return plainMiss(504); });
  });
}
function dropShellForRecovery() {
  if (self.navigator && self.navigator.onLine === false) return Promise.resolve(false);
  return networkShell(null).then(function (html) {
    if (!html) return false;
    // Replace the cached document only when its entry assets can be stored.
    // Deleting first would leave the next offline launch with no shell.
    return enqueueCommit(html).then(function (ok) { return ok === true; });
  }).catch(function () { return false; });
}

self.addEventListener("install", function (event) {
  event.waitUntil(precacheBatched(bootHrefs()).then(function () {
    return warmStatic(extraHrefs());
  }).then(function () {
    return warmFonts();
  }).then(function () { return self.skipWaiting(); }, function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (event) {
  var current = SHELL;
  var assets = ASSETS;
  var stat = STATIC;
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key === current || key === assets || key === RETIRED || key === stat) return Promise.resolve();
        return caches.delete(key);
      }));
    }).then(function () {
      if (self.registration.navigationPreload) return self.registration.navigationPreload.enable();
    }).then(function () {
      return self.clients.claim();
    }).then(function () {
      return precacheBuild();
    }).then(function () {
      return networkShell(null).then(function (html) {
        if (!html) return;
        return readCachedShellHtml().then(function (prev) {
          var changed = shellAssetsDiffer(prev, html);
          return enqueueCommit(html).then(function () {
            if (changed) return reloadOpenClients();
          });
        });
      });
    }),
  );
});
self.addEventListener("message", function (event) {
  var data = event.data || {};
  if (data.type === "skip-waiting") {
    self.skipWaiting();
    return;
  }
  if (data.type === "recover-shell") {
    event.waitUntil(dropShellForRecovery());
    return;
  }
  if (data.type !== "warm-assets" || !data.urls || !data.urls.length) return;
  var urls = [];
  var i;
  for (i = 0; i < data.urls.length; i++) {
    try {
      var url = new URL(String(data.urls[i]), self.location.origin);
      if (isCodeAsset(url)) urls.push(url.href);
    } catch (err) {}
  }
  event.waitUntil(warmAssets(urls).then(function () { return networkShell(null).then(function (html) {
    if (html) return enqueueCommit(html);
  }); }).then(function () { return precacheBuild(); }));
});
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (isWebAppManifest(url)) {
    // Document loads must be the static file. respondWith() of a built
    // Response was still the SPA shell (wordmark only, data-boot set).
    if (req.mode === "navigate") return;
    event.respondWith(serveWebAppManifest(event, req).catch(function () { return plainMiss(504); }));
    return;
  }
  if (isCodeAsset(url)) {
    event.respondWith(cacheFirstAsset(req).catch(function () { return plainMiss(504); }));
    return;
  }
  if (isStaticAsset(url) && req.mode !== "navigate") {
    event.respondWith(staleWhileRevalidate(event, req));
    return;
  }
  if (req.mode !== "navigate") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== "/salon" && url.pathname.indexOf("/salon/") !== 0) return;
  event.respondWith(handleNavigate(event).catch(function () { return offlinePage(); }));
});
`;
}

/** Classic script: runs even when the entry module 404s and the wordmark never hydrates. */
export function renderBootWatchScript() {
  return `<script data-boot-watch>
(function () {
  var RETRY = "tbr-boot-retry";
  var done = false;
  try {
    var params = new URLSearchParams(location.search);
    if (params.has("__fresh")) {
      params.delete("__fresh");
      var qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }
  } catch (err) {}
  function ready() {
    return document.documentElement.getAttribute("data-boot") === "ready";
  }
  function finish() {
    done = true;
    try { sessionStorage.removeItem(RETRY); } catch (err) {}
  }
  function recover() {
    if (done || ready()) {
      if (ready()) finish();
      return;
    }
    if (navigator.onLine === false) return;
    var now = Date.now();
    try {
      var at = parseInt(sessionStorage.getItem(RETRY) || "0", 10);
      if (at && now - at < 20000) return;
      sessionStorage.setItem(RETRY, String(now));
    } catch (err) {}
    done = true;
    clearInterval(timer);
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "recover-shell" });
      }
    } catch (err) {}
    try {
      var next = new URLSearchParams(location.search);
      next.set("__fresh", String(now));
      location.replace(location.pathname + "?" + next.toString() + location.hash);
    } catch (err) {
      location.reload();
    }
  }
  var timer = setInterval(function () {
    if (!ready()) return;
    clearInterval(timer);
    finish();
  }, 250);
  var hydratedWait = false;
  function armHydrationDeadline() {
    if (hydratedWait) return;
    hydratedWait = true;
    setTimeout(function () {
      if (!ready()) recover();
    }, 8000);
  }
  window.addEventListener("error", function (ev) {
    var node = ev.target;
    if (!node || node.tagName !== "SCRIPT") return;
    var src = node.src || "";
    if (src.indexOf("/salon/assets/") === -1) return;
    recover();
  }, true);
  window.addEventListener("unhandledrejection", function (ev) {
    var reason = ev.reason;
    var text = reason ? String(reason.message || reason) : "";
    if (text.indexOf("module") === -1 && text.indexOf("import") === -1) return;
    recover();
  });
  document.addEventListener("DOMContentLoaded", function () {
    var nodes = document.querySelectorAll("script[src*='/salon/assets/']");
    var i;
    if (!nodes.length) {
      setTimeout(function () { if (!ready()) recover(); }, 1500);
      return;
    }
    for (i = 0; i < nodes.length; i++) nodes[i].addEventListener("load", armHydrationDeadline);
    setTimeout(function () {
      if (!ready() && !hydratedWait) recover();
    }, 20000);
  });
})();
</script>`;
}

export function renderShellNetworkHints() {
  return `<style data-shell-paint>html,body{background:#F3F1EB;color:#111111}</style><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0">${renderBootWatchScript()}<script ${SHELL_CACHE_ATTR} type="module">if("serviceWorker"in navigator){navigator.serviceWorker.register("/salon/sw.js",{scope:"/salon/",updateViaCache:"none"}).then(function(reg){function collect(){var urls=[];var seen={};function add(href){if(!href||href.indexOf("/salon/assets/")===-1||seen[href])return;seen[href]=1;urls.push(href)}var nodes=document.querySelectorAll("script[src],link[rel=stylesheet][href],link[rel=modulepreload][href]");for(var i=0;i<nodes.length;i++)add(nodes[i].src||nodes[i].href||"");if(window.performance&&performance.getEntriesByType){var entries=performance.getEntriesByType("resource");for(var j=0;j<entries.length;j++)add(entries[j].name||"")}return urls}function send(){var worker=reg.active;if(!worker)return;worker.postMessage({type:"warm-assets",urls:collect()})}function whenReady(){if(reg.active)return Promise.resolve();var sw=reg.installing||reg.waiting;if(!sw)return Promise.resolve();return new Promise(function(resolve){sw.addEventListener("statechange",function(){if(sw.state==="activated")resolve()})})}function kick(){whenReady().then(send)}if(document.readyState==="complete")kick();else window.addEventListener("load",kick)}).catch(function(){})}</script>`;
}

/** @param {string} html */
export function injectShellNetworkHints(html) {
  if (typeof html !== "string" || html.includes(SHELL_CACHE_ATTR)) return html;
  const hints = renderShellNetworkHints();
  const restore = /(<script\s+data-spa-pages-restore\b[\s\S]*?<\/script>)/i;
  if (restore.test(html)) return html.replace(restore, `$1${hints}`);
  if (!/<head[\s>]/i.test(html)) return html;
  return html.replace(/<head([^>]*)>/i, `<head$1>${hints}`);
}

const CATALOG_CHUNK_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/catalog");

function catalogChunkIds() {
  const ids = new Set();
  for (const folder of ["texts", "openings"]) {
    const dir = join(CATALOG_CHUNK_ROOT, folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".json")) ids.add(name.slice(0, -".json".length));
    }
  }
  return ids;
}

/** Vite chunk names end in `-[hash]` of 8. Book texts use the catalog id as the name. */
function assetChunkId(filename) {
  return filename.replace(/-[A-Za-z0-9_-]{8}\.(?:js|mjs|css)$/i, "");
}

/** The breath-id map is a lazy chunk. Install must not wait on it. */
function isLazyRemapChunk(filename) {
  return assetChunkId(filename) === "at-remap";
}

const STATIC_SHELL_FILES = [
  "manifest.webmanifest",
  "favicon.ico",
  "favicon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "og.jpg",
  "pdf.worker.min.js",
];

/**
 * Every hashed script and stylesheet the build emitted, plus same-origin
 * files the shell requests outside `/assets/` (manifest, icons, favicon).
 * Book texts are `import.meta.glob` chunks under `/salon/assets/`, so they
 * are in `precache`, not a separate JSON fetch. The breath-id map
 * (`at-remap-*.js`) is in that fill too, after install, so a cold launch
 * does not wait on it. The first fetch is also stored by the asset cache.
 * @param {string} destDir
 */
export function collectShellPrecache(destDir) {
  const bookIds = catalogChunkIds();
  const rows = [];
  const assetsDir = join(destDir, "assets");
  if (existsSync(assetsDir)) {
    for (const name of readdirSync(assetsDir)) {
      if (!/\.(?:js|mjs|css)$/i.test(name)) continue;
      const path = `/salon/assets/${name}`;
      let size = 0;
      try { size = statSync(join(assetsDir, name)).size; } catch { size = 0; }
      const id = assetChunkId(name);
      rows.push({
        path,
        size,
        book: bookIds.has(id),
        lazy: isLazyRemapChunk(name),
      });
    }
  }
  const precache = rows.map((row) => row.path).sort();
  const boot = rows.filter((row) => !row.book && !row.lazy).map((row) => row.path).sort();
  const later = rows
    .filter((row) => row.book || row.lazy)
    .sort((a, b) => a.size - b.size || (a.path < b.path ? -1 : 1));
  const fill = boot.concat(later.map((row) => row.path));
  const extras = [];
  for (const name of STATIC_SHELL_FILES) {
    if (existsSync(join(destDir, name))) extras.push(`/salon/${name}`);
  }
  const imagesDir = join(destDir, "images");
  if (existsSync(imagesDir)) {
    for (const name of readdirSync(imagesDir)) {
      if (/\.(?:png|jpe?g|svg|webp|gif|ico)$/i.test(name)) extras.push(`/salon/images/${name}`);
    }
  }
  const fontsDir = join(destDir, "fonts");
  if (existsSync(fontsDir)) {
    for (const name of readdirSync(fontsDir)) {
      if (/\.woff2$/i.test(name)) extras.push(`/salon/fonts/${name}`);
    }
  }
  extras.sort();
  return { precache, boot, fill, extras };
}

/**
 * Pages-only: less sticky HTML shell, plus a hard NUL strip of every HTML file.
 * @param {string} destDir
 */
export function applyPagesHtmlSafety(destDir) {
  const indexPath = join(destDir, "index.html");
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, "utf8");
    const next = injectShellNetworkHints(html);
    if (next !== html) writeFileSync(indexPath, next);
  }
  const listed = collectShellPrecache(destDir);
  writeFileSync(
    join(destDir, "sw.js"),
    renderShellServiceWorker({
      precache: listed.fill,
      boot: listed.boot,
      extras: listed.extras,
    }),
  );
  return stripNulBytesInHtmlTree(destDir);
}
