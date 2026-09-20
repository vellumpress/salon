#!/usr/bin/env node
/**
 * Static preview of the Pages artifact: serve dist/ at /salon/
 * and fall unknown paths through 404.html (same as GitHub Pages).
 * That file is the spa-github-pages redirect shim, not a copy of index.html.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const base = "/salon";
const host = "127.0.0.1";
const port = Number(process.env.PORT || 8081);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
};

if (!existsSync(join(dist, "index.html"))) {
  console.error("[preview-pages] dist/index.html missing — run npm run build first");
  process.exit(1);
}

function send(res, status, file, type) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-cache" });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${host}:${port}`);
  let path = decodeURIComponent(url.pathname);
  if (path === "/" || path === "") {
    res.writeHead(302, { location: `${base}/` });
    res.end();
    return;
  }
  if (path === base) {
    res.writeHead(302, { location: `${base}/` });
    res.end();
    return;
  }
  if (!path.startsWith(`${base}/`)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }
  let rel = path.slice(base.length);
  if (rel.endsWith("/")) rel += "index.html";
  const file = normalize(join(dist, rel));
  if (!file.startsWith(dist)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isFile()) {
    send(res, 200, file, TYPES[extname(file)] ?? "application/octet-stream");
    return;
  }
  send(res, 404, join(dist, "404.html"), TYPES[".html"]);
});

server.listen(port, host, () => {
  console.log(`  ➜  Local:   http://${host}:${port}${base}/`);
});
