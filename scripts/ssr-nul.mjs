/**
 * TanStack Router dehydrates SSR match ids by replacing "/" with U+0000
 * (`dehydrateSsrMatchId` in @tanstack/router-core). The root match id is
 * `__root__` + fullPath `/` → `__root__/`, which becomes the raw NUL in
 * `i:"__root__\0"` inside the classic `$tsr-stream-barrier` <script>.
 *
 * HTML forbids U+0000. Chromium rewrites it to U+FFFD and keeps parsing, and
 * `hydrateSsrMatchId` already maps both U+0000 and U+FFFD back to "/", so
 * desktop hydrates. iOS Home Screen WebKit can stop that classic script at
 * the NUL, so the module tag after it never runs and the cream "Vellum"
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
export const SHELL_CACHE_NAME = "vellum-shell";

/** Network-first document loads. Hashed assets are not intercepted. */
export function renderShellServiceWorker() {
  return `/* Pages HTML shell: network-first navigations. Hashed assets are not intercepted. */
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== "${SHELL_CACHE_NAME}";
            })
            .map(function (key) {
              return caches.delete(key);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req, { cache: "no-store" })
      .then(function (res) {
        if (!res || !res.ok) return res;
        var copy = res.clone();
        return caches.open("${SHELL_CACHE_NAME}").then(function (cache) {
          return cache.put(req.url, copy).then(function () {
            return res;
          });
        });
      })
      .catch(function () {
        return caches.open("${SHELL_CACHE_NAME}").then(function (cache) {
          return cache.match(req.url).then(function (cached) {
            if (cached) return cached;
            return fetch(req);
          });
        });
      }),
  );
});
`;
}

export function renderShellNetworkHints() {
  return `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><script ${SHELL_CACHE_ATTR}>if("serviceWorker"in navigator){navigator.serviceWorker.register("/salon/sw.js",{scope:"/salon/",updateViaCache:"none"}).catch(function(){})}</script>`;
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
