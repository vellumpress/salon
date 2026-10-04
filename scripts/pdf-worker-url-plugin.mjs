/**
 * Serve pdf.js's legacy worker as a Vite asset URL.
 * The import is `pdfjs-dist/legacy/build/pdf.worker.min.mjs?url`.
 * This writes a .js copy with the Promise.withResolvers polyfill and the
 * ReadableStream async-iterator polyfill first,
 * then hands that file to Vite's `?url` pipeline so the build emits
 * /salon/assets/pdf.worker.min-<hash>.js. The .js name is what GitHub Pages
 * serves as JavaScript. The hash changes when the worker bytes change.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LEGACY_WORKER_REL, WORKER_PREAMBLE } from "./copy-pdf-worker.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const PDF_WORKER_SPECIFIER = "pdfjs-dist/legacy/build/pdf.worker.min.mjs";

/** Not public/. A public file would keep a stable URL and skip the content hash. */
export const POLYFILLED_WORKER_REL = "node_modules/.salon/pdf.worker.min.js";

export function writePolyfilledWorker() {
  const source = join(root, LEGACY_WORKER_REL);
  const dest = join(root, POLYFILLED_WORKER_REL);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, WORKER_PREAMBLE + readFileSync(source, "utf8"));
  return dest;
}

/**
 * Resolve the legacy worker `?url` import to the polyfilled file.
 * Returns null for every other id.
 */
export function resolvePdfWorkerUrl(id) {
  const queryAt = id.indexOf("?");
  const spec = queryAt === -1 ? id : id.slice(0, queryAt);
  const query = queryAt === -1 ? "" : id.slice(queryAt);
  if (!/(?:^|[?&])url(?:&|$)/.test(query)) return null;
  if (spec !== PDF_WORKER_SPECIFIER && !spec.endsWith(`/${PDF_WORKER_SPECIFIER}`)) return null;
  return `${writePolyfilledWorker()}?url`;
}

export function pdfWorkerUrlPlugin() {
  return {
    name: "salon-pdf-worker-url",
    enforce: "pre",
    resolveId(id) {
      return resolvePdfWorkerUrl(id);
    },
  };
}
