import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { copyPdfWorker, LEGACY_WORKER_REL, WITH_RESOLVERS_POLYFILL, WORKER_PREAMBLE } from "./copy-pdf-worker.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("copy-pdf-worker sources the legacy worker and starts with the polyfill", () => {
  assert.equal(LEGACY_WORKER_REL, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  const script = readFileSync(join(root, "scripts/copy-pdf-worker.mjs"), "utf8");
  assert.match(script, /node_modules\/pdfjs-dist\/legacy\/build\/pdf\.worker\.min\.mjs/);
  assert.equal(script.includes("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"), false);

  copyPdfWorker();
  const copied = readFileSync(join(root, "public/pdf.worker.min.js"), "utf8");
  assert.equal(copied.startsWith(WITH_RESOLVERS_POLYFILL), true);
  assert.match(copied.slice(0, WORKER_PREAMBLE.length), /releaseLock/);
  assert.match(WORKER_PREAMBLE, /Symbol\.asyncIterator/);
  const legacy = readFileSync(join(root, LEGACY_WORKER_REL), "utf8");
  assert.equal(copied, WORKER_PREAMBLE + legacy);
});
