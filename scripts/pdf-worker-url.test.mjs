import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { LEGACY_WORKER_REL, WITH_RESOLVERS_POLYFILL } from "./copy-pdf-worker.mjs";
import { POLYFILLED_WORKER_REL, resolvePdfWorkerUrl } from "./pdf-worker-url-plugin.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("legacy worker ?url resolves to a polyfilled .js asset", () => {
  const resolved = resolvePdfWorkerUrl("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  assert.equal(typeof resolved, "string");
  assert.equal(resolved.endsWith(`${POLYFILLED_WORKER_REL}?url`), true);
  assert.equal(POLYFILLED_WORKER_REL.endsWith("pdf.worker.min.js"), true);

  const copied = readFileSync(join(root, POLYFILLED_WORKER_REL), "utf8");
  const legacy = readFileSync(join(root, LEGACY_WORKER_REL), "utf8");
  assert.equal(copied.startsWith(WITH_RESOLVERS_POLYFILL), true);
  assert.equal(copied, WITH_RESOLVERS_POLYFILL + legacy);

  assert.equal(resolvePdfWorkerUrl("pdfjs-dist/legacy/build/pdf.worker.min.mjs"), null);
  assert.equal(resolvePdfWorkerUrl("pdfjs-dist/build/pdf.worker.min.mjs?url"), null);
});
