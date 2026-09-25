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
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
/** Current Pages shell cache. The retired name is copied in, then deleted, on activate. */
export const SHELL_CACHE_NAME = "tbr-shell";
/**
 * Hashed js/css only. Book JSON stays on the network so a long novel cannot
 * evict the shell. The activate handler must not delete this cache.
 */
export const SHELL_ASSET_CACHE_NAME = "tbr-assets";
/** Previous shell cache. Kept here only so activate can move offline pages across and drop it. */
export const RETIRED_SHELL_CACHE_NAME = "vellum-shell";

/**
 * Home Screen cold start.
 *
 * GitHub Pages sends `cache-control: max-age=600` even for hashed files, so a
 * phone that slept past ten minutes re-fetches the whole boot graph. The
 * shell is one SPA document: serve the cached `/salon/` HTML for every
 * navigation under the scope (deep links included — no 404 hop), and
 * cache-first the hashed js/css. A background fetch refreshes the shell
 * without blocking paint. NUL bytes are refused so a poisoned document cannot
 * stick. Book texts are not intercepted.
 */
export function renderShellServiceWorker() {
  return `/* tbr shell: cached HTML for repeat launches; hashed js/css are cache-first. */
var SHELL = "${SHELL_CACHE_NAME}";
var ASSETS = "${SHELL_ASSET_CACHE_NAME}";
var shellFlight = null;

function shellUrl() {
  return new URL("/salon/", self.location.origin).href;
}
function manifestUrl() {
  return new URL("/salon/__sw_manifest", self.location.origin).href;
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
function readManifest(cache) {
  return cache.match(manifestUrl()).then(function (res) {
    if (!res) return [];
    return res.json().then(function (data) {
      return Array.isArray(data) ? data : [];
    }).catch(function () { return []; });
  });
}
function pruneReplacedShellAssets(urls) {
  return caches.open(ASSETS).then(function (cache) {
    return readManifest(cache).then(function (prev) {
      var keep = {};
      var i;
      for (i = 0; i < urls.length; i++) keep[urls[i]] = 1;
      return Promise.all(prev.map(function (url) {
        if (keep[url]) return Promise.resolve();
        return cache.delete(url);
      })).then(function () {
        return cache.put(manifestUrl(), new Response(JSON.stringify(urls), {
          headers: { "content-type": "application/json" },
        }));
      });
    });
  });
}
function warmAssets(urls) {
  if (!urls || !urls.length) return Promise.resolve();
  return caches.open(ASSETS).then(function (cache) {
    return Promise.all(urls.map(function (url) {
      return cache.match(url).then(function (hit) {
        if (hit) return;
        return fetch(url, { cache: "force-cache" }).then(function (res) {
          if (!res || !res.ok || res.type === "opaque") return;
          return cache.put(url, res);
        }).catch(function () {});
      });
    }));
  });
}
function readShellHtml(preload) {
  var pending = preload && typeof preload.then === "function"
    ? preload.then(function (res) { return res || null; }).catch(function () { return null; })
    : Promise.resolve(null);
  return pending.then(function (pre) {
    var usePre = !!(pre && pre.ok && !pre.redirected);
    if (usePre) {
      try {
        var path = new URL(pre.url || shellUrl()).pathname;
        if (path !== "/salon" && path !== "/salon/" && path !== "/salon/index.html") usePre = false;
      } catch (err) {
        usePre = false;
      }
    }
    var resPromise = usePre ? Promise.resolve(pre) : fetch(shellUrl(), { cache: "no-store" });
    return resPromise.then(function (res) {
      if (!res || !res.ok) return null;
      return res.text();
    });
  }).then(function (html) {
    if (!isAppShell(html)) return null;
    return html;
  }).catch(function () { return null; });
}
function refreshShell(preload) {
  if (shellFlight) return shellFlight;
  shellFlight = readShellHtml(preload).then(function (html) {
    if (!html) return null;
    var urls = extractAssetUrls(html);
    var saved = caches.open(SHELL).then(function (cache) {
      return cache.put(shellUrl(), shellResponse(html));
    });
    var done = saved.then(function () {
      return warmAssets(urls).then(function () { return pruneReplacedShellAssets(urls); });
    });
    return saved.then(function () { return { html: html, done: done }; });
  }).then(function (result) {
    shellFlight = null;
    return result;
  }, function (err) {
    shellFlight = null;
    throw err;
  });
  return shellFlight;
}
function cacheFirstAsset(req) {
  var url = new URL(req.url);
  return caches.open(ASSETS).then(function (cache) {
    return cache.match(url.href).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type !== "opaque") {
          var copy = res.clone();
          return cache.put(req.url, copy).then(function () { return res; });
        }
        return res;
      });
    });
  });
}
function handleNavigate(event) {
  var update = refreshShell(event.preloadResponse);
  event.waitUntil(update.then(function (result) { return result && result.done; }));
  return caches.open(SHELL).then(function (cache) {
    return cache.match(shellUrl());
  }).then(function (cached) {
    if (!cached) {
      return update.then(function (result) {
        if (result && result.html) return shellResponse(result.html);
        return fetch(event.request);
      });
    }
    return cached.text().then(function (html) {
      if (isAppShell(html)) return shellResponse(html);
      return update.then(function (result) {
        if (result && result.html) return shellResponse(result.html);
        return fetch(event.request);
      });
    });
  });
}

self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  var current = SHELL;
  var assets = ASSETS;
  var retired = "${RETIRED_SHELL_CACHE_NAME}";
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key === current || key === assets) return Promise.resolve();
        if (key === retired) {
          return caches.open(retired).then(function (oldCache) {
            return caches.open(current).then(function (nextCache) {
              return oldCache.keys().then(function (reqs) {
                return Promise.all(reqs.map(function (req) {
                  return oldCache.match(req).then(function (res) {
                    if (res) return nextCache.put(req, res);
                  });
                }));
              });
            });
          }).then(function () {
            return caches.delete(retired);
          });
        }
        return caches.delete(key);
      }));
    }).then(function () {
      if (self.registration.navigationPreload) return self.registration.navigationPreload.enable();
    }).then(function () {
      return self.clients.claim();
    }),
  );
});
self.addEventListener("message", function (event) {
  var data = event.data || {};
  if (data.type !== "warm-assets" || !data.urls || !data.urls.length) return;
  var urls = [];
  var i;
  for (i = 0; i < data.urls.length; i++) {
    try {
      var url = new URL(String(data.urls[i]), self.location.origin);
      if (isCodeAsset(url)) urls.push(url.href);
    } catch (err) {}
  }
  event.waitUntil(warmAssets(urls).then(function () { return refreshShell(null); }));
});
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (isCodeAsset(url)) {
    event.respondWith(cacheFirstAsset(req));
    return;
  }
  if (req.mode !== "navigate") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== "/salon" && url.pathname.indexOf("/salon/") !== 0) return;
  event.respondWith(handleNavigate(event));
});
`;
}

export function renderShellNetworkHints() {
  return `<style data-shell-paint>html,body{background:#F3F1EB;color:#111111}</style><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><script ${SHELL_CACHE_ATTR} type="module">if("serviceWorker"in navigator){navigator.serviceWorker.register("/salon/sw.js",{scope:"/salon/",updateViaCache:"none"}).then(function(reg){function collect(){var nodes=document.querySelectorAll("script[src],link[rel=stylesheet][href],link[rel=modulepreload][href]");var urls=[];for(var i=0;i<nodes.length;i++){var href=nodes[i].src||nodes[i].href||"";if(href.indexOf("/salon/assets/")!==-1)urls.push(href)}return urls}function send(){var worker=reg.active;if(!worker)return;worker.postMessage({type:"warm-assets",urls:collect()})}function whenReady(){if(reg.active)return Promise.resolve();var sw=reg.installing||reg.waiting;if(!sw)return Promise.resolve();return new Promise(function(resolve){sw.addEventListener("statechange",function(){if(sw.state==="activated")resolve()})})}function kick(){whenReady().then(send)}if(document.readyState==="complete")kick();else window.addEventListener("load",kick)}).catch(function(){})}</script>`;
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
  writeFileSync(join(destDir, "sw.js"), renderShellServiceWorker());
  return stripNulBytesInHtmlTree(destDir);
}
