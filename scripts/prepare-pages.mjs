#!/usr/bin/env node
/**
 * Assemble a GitHub Pages `dist/` from the TanStack Start client output.
 * Drops the SSR `server/` tree (not served on Pages) and writes the
 * spa-github-pages 404.html + index.html restore script so cold deep
 * links under /salon/ land on the matching client route.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applySpaPagesFallback } from "./spa-pages-fallback.mjs";
import { applyPagesHtmlSafety } from "./ssr-nul.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "dist");

const candidates = [
  join(root, "dist/client"),
  join(root, ".output/public"),
  join(root, ".vercel/output/static"),
];

function hasHtmlShell(dir) {
  if (!existsSync(dir)) return false;
  return existsSync(join(dir, "index.html")) || existsSync(join(dir, "_shell.html"));
}

function firstFile(dir, names) {
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return path;
  }
  return null;
}

const source = candidates.find(hasHtmlShell) ?? (hasHtmlShell(dest) ? dest : null);
if (!source) {
  console.error("[prepare-pages] no static client output found");
  process.exit(1);
}

const staging = mkdtempSync(join(tmpdir(), "salon-pages-"));
cpSync(source, staging, { recursive: true });
rmSync(join(staging, "client"), { recursive: true, force: true });
rmSync(join(staging, "server"), { recursive: true, force: true });

rmSync(dest, { recursive: true, force: true });
cpSync(staging, dest, { recursive: true });
rmSync(staging, { recursive: true, force: true });
console.log(`[prepare-pages] copied ${source} → dist/`);

const shell = firstFile(dest, ["index.html", "_shell.html"]);
if (!shell) {
  console.error("[prepare-pages] no HTML shell in dist/");
  process.exit(1);
}
if (!existsSync(join(dest, "index.html"))) {
  copyFileSync(shell, join(dest, "index.html"));
}
applySpaPagesFallback(dest);
const safety = applyPagesHtmlSafety(dest);
writeFileSync(join(dest, ".nojekyll"), "");
console.log(`[prepare-pages] html files=${safety.files} nul-bytes-removed=${safety.removed}`);

/** Top-level routes plus /read/<catalog id>, so GitHub Pages returns 200. */
const STATIC_ROUTES = [
  "login",
  "forgot-password",
  "reset-password",
  "friends",
  "profile",
  "profile/collection",
  "you",
  "map",
  "together",
  "curator",
  "page",
  "rituals",
  "adapted",
  "clubs",
  "shuffle",
  "curated",
  "glass",
  "stores",
  "desk",
  "form",
];

function emitStaticRoutes(destDir, indexHtml) {
  const shellHtml = existsSync(join(destDir, "index.html"))
    ? join(destDir, "index.html")
    : indexHtml;
  const stamp = (rel) => {
    const dir = join(destDir, rel);
    mkdirSync(dir, { recursive: true });
    copyFileSync(shellHtml, join(dir, "index.html"));
  };
  for (const route of STATIC_ROUTES) stamp(route);
  const shelf = readFileSync(join(root, "src/lib/catalog/shelf.ts"), "utf8");
  const ids = new Set();
  for (const match of shelf.matchAll(/\bid:\s*"([^"]+)"/g)) ids.add(match[1]);
  for (const id of ids) stamp(`read/${id}`);
  console.log(`[prepare-pages] static routes=${STATIC_ROUTES.length} read=${ids.size}`);
}

emitStaticRoutes(dest, join(dest, "index.html"));
console.log("[prepare-pages] ready");
