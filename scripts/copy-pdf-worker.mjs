#!/usr/bin/env node
/**
 * Put pdf.js's module worker where the Pages app can load it:
 *   /salon/pdf.worker.min.js
 * The bytes stay an ES module. The .js name is what GitHub Pages
 * serves as JavaScript. Not committed — generated before dev and build.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const dest = join(root, "public/pdf.worker.min.js");

if (!existsSync(source)) {
  console.error("[copy-pdf-worker] missing pdfjs worker. Run npm install.");
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(source, dest);
console.log("[copy-pdf-worker] public/pdf.worker.min.js");
