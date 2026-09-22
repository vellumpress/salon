/**
 * GitHub Pages SPA fallback (rafgraph/spa-github-pages).
 *
 * Pages only serves real files. A cold open of /salon/read/… hits this
 * 404.html, which redirects into /salon/?/<route>. index.html restores the
 * path with history.replaceState before TanStack Router boots.
 *
 * Project site at username.github.io/salon → keep 1 path segment.
 * https://github.com/rafgraph/spa-github-pages
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** `/salon` on https://vellumpress.github.io/salon/ */
export const PATH_SEGMENTS_TO_KEEP = 1;

export const SPA_RESTORE_ATTR = "data-spa-pages-restore";

/**
 * @param {{ pathname: string, search?: string, hash?: string }} loc
 * @param {number} [keep]
 */
export function encodeSpaRedirectPath(loc, keep = PATH_SEGMENTS_TO_KEEP) {
  const pathname = loc.pathname || "/";
  const search = loc.search || "";
  const hash = loc.hash || "";
  const kept = pathname.split("/").slice(0, 1 + keep).join("/");
  const rest = pathname
    .slice(1)
    .split("/")
    .slice(keep)
    .join("/")
    .replace(/&/g, "~and~");
  const query = search ? `&${search.slice(1).replace(/&/g, "~and~")}` : "";
  return `${kept}/?/${rest}${query}${hash}`;
}

/**
 * Inverse of encodeSpaRedirectPath. Tolerates a missing trailing slash on
 * the kept prefix (stock rafgraph assumes `/repo/`).
 *
 * @param {{ pathname: string, search?: string, hash?: string }} loc
 */
export function restoreSpaRedirectPath(loc) {
  const pathname = loc.pathname || "/";
  const search = loc.search || "";
  const hash = loc.hash || "";
  if (search[1] !== "/") return `${pathname}${search}${hash}`;
  const decoded = search
    .slice(1)
    .split("&")
    .map((s) => s.replace(/~and~/g, "&"))
    .join("?");
  const base = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return `${base}${decoded}${hash}`;
}

export function renderSpaRestoreScript() {
  return `<script ${SPA_RESTORE_ATTR} type="text/javascript">
/* spa-github-pages restore — https://github.com/rafgraph/spa-github-pages */
(function (l) {
  if (l.search[1] !== "/") return;
  var decoded = l.search.slice(1).split("&").map(function (s) {
    return s.replace(/~and~/g, "&");
  }).join("?");
  var base = l.pathname.endsWith("/") ? l.pathname.slice(0, -1) : l.pathname;
  window.history.replaceState(null, "", base + decoded + l.hash);
}(window.location));
</script>`;
}

export function renderSpa404Html() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Vellum</title>
    <meta name="robots" content="noindex" />
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // MIT License
      // https://github.com/rafgraph/spa-github-pages
      // Turns /salon/read/enchanted-april?at=3#n into
      // /salon/?/read/enchanted-april&at=3#n so Pages can serve index.html.
      // Must stay >512 bytes for legacy IE custom-404 handling.
      var pathSegmentsToKeep = ${PATH_SEGMENTS_TO_KEEP};

      var l = window.location;
      l.replace(
        l.protocol +
          "//" +
          l.hostname +
          (l.port ? ":" + l.port : "") +
          l.pathname.split("/").slice(0, 1 + pathSegmentsToKeep).join("/") +
          "/?/" +
          l.pathname.slice(1).split("/").slice(pathSegmentsToKeep).join("/").replace(/&/g, "~and~") +
          (l.search ? "&" + l.search.slice(1).replace(/&/g, "~and~") : "") +
          l.hash
      );
    </script>
  </head>
  <body>
    <p>Opening this page in Vellum&hellip;</p>
    <noscript>
      <p>
        JavaScript is required for this address.
        <a href="/salon/">Open Vellum</a>
      </p>
    </noscript>
  </body>
</html>
`;
}

export function injectSpaRestoreScript(html) {
  if (typeof html !== "string") return html;
  if (html.includes(SPA_RESTORE_ATTR)) return html;
  if (!/<head[\s>]/i.test(html)) return html;
  return html.replace(/<head([^>]*)>/i, `<head$1>${renderSpaRestoreScript()}`);
}

export function writeSpa404Html(filePath) {
  writeFileSync(filePath, renderSpa404Html());
}

/** Write 404.html and inject the restore script into dist/index.html. */
export function applySpaPagesFallback(destDir) {
  writeSpa404Html(join(destDir, "404.html"));
  const indexPath = join(destDir, "index.html");
  const html = readFileSync(indexPath, "utf8");
  const next = injectSpaRestoreScript(html);
  if (next !== html) writeFileSync(indexPath, next);
}

export function public404Path() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "public", "404.html");
}
