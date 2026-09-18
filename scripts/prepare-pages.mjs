#!/usr/bin/env node
/**
 * Assemble a GitHub Pages `dist/` from whatever TanStack Start / Nitro emitted.
 * Copies the SPA shell to `404.html` so deep links under /vellum-lite/ work.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "dist");

const candidates = [
  join(root, ".output/public"),
  join(root, "dist/client"),
  join(root, ".vercel/output/static"),
];

function hasHtmlShell(dir) {
  if (!existsSync(dir)) return false;
  return (
    existsSync(join(dir, "index.html")) ||
    existsSync(join(dir, "_shell.html")) ||
    existsSync(join(dir, "404.html"))
  );
}

function firstFile(dir, names) {
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return path;
  }
  return null;
}

let source = hasHtmlShell(dest) ? dest : null;
for (const dir of candidates) {
  if (dir === dest) continue;
  if (hasHtmlShell(dir)) {
    source = dir;
    break;
  }
}

if (!source) {
  console.error("[prepare-pages] no static client output found (looked in dist, .output/public, dist/client)");
  process.exit(1);
}

if (source !== dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(source)) {
    cpSync(join(source, name), join(dest, name), { recursive: true });
  }
  console.log(`[prepare-pages] copied ${source} → dist/`);
}

const shell = firstFile(dest, ["index.html", "_shell.html", "404.html"]);
if (!shell) {
  console.error("[prepare-pages] no HTML shell in dist/");
  process.exit(1);
}

if (!existsSync(join(dest, "index.html"))) {
  copyFileSync(shell, join(dest, "index.html"));
  console.log(`[prepare-pages] wrote dist/index.html from ${shell}`);
}
if (!existsSync(join(dest, "404.html"))) {
  copyFileSync(join(dest, "index.html"), join(dest, "404.html"));
  console.log("[prepare-pages] wrote dist/404.html");
}

writeFileSync(join(dest, ".nojekyll"), "");
console.log("[prepare-pages] ready");
