#!/usr/bin/env node
/**
 * Put pdf.js's legacy module worker where the Pages app can load it:
 *   /salon/pdf.worker.min.js
 * The legacy build avoids Map.getOrInsertComputed, Math.sumPrecise, and
 * Uint8Array.fromBase64, which iOS Safari does not implement. It still
 * calls Promise.withResolvers (missing before iOS 17.4), so a tiny polyfill
 * is the first statement of the copied worker. The bytes stay an ES module.
 * The .js name is what GitHub Pages serves as JavaScript.
 * Not committed — generated before dev and build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const LEGACY_WORKER_REL = "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs";

/** First statement of public/pdf.worker.min.js. Same logic as the main thread. */
export const WITH_RESOLVERS_POLYFILL = `if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
`;

export function copyPdfWorker() {
  const source = join(root, LEGACY_WORKER_REL);
  const dest = join(root, "public/pdf.worker.min.js");
  if (!existsSync(source)) {
    console.error("[copy-pdf-worker] missing pdfjs worker. Run npm install.");
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, WITH_RESOLVERS_POLYFILL + readFileSync(source, "utf8"));
  console.log("[copy-pdf-worker] public/pdf.worker.min.js");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  copyPdfWorker();
}
