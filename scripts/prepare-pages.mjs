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
  mkdtempSync,
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
console.log("[prepare-pages] ready");
