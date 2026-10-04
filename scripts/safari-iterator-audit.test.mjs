import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function codeOnly(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function forAwaitTargets(source) {
  const targets = new Set();
  const re = /for\s+await\s*\([^)]*?\sof\s+([A-Za-z0-9_$.]+)\)/g;
  for (const match of source.matchAll(re)) targets.add(match[1]);
  return [...targets].sort();
}

test("pdf.js legacy for-await is only over ReadableStreams", () => {
  const main = forAwaitTargets(read("node_modules/pdfjs-dist/legacy/build/pdf.mjs"));
  const worker = forAwaitTargets(read("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"));
  assert.deepEqual(main, ["readable", "readableStream"]);
  assert.deepEqual(worker, ["readable"]);
  const legacyMain = read("node_modules/pdfjs-dist/legacy/build/pdf.mjs");
  const legacyWorker = read("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  assert.match(legacyMain, /es\.iterator\.to-array\.js/);
  assert.match(legacyMain, /es\.set\.intersection\.v2\.js/);
  assert.match(legacyWorker, /es\.iterator\.to-array\.js/);
  assert.match(legacyWorker, /es\.set\.intersection\.v2\.js/);
  assert.equal(legacyMain.includes("Array.fromAsync"), false);
  assert.equal(legacyWorker.includes("Array.fromAsync"), false);
});

test("our import code does not iterate Safari 16–18 gaps", () => {
  const dir = join(root, "src/lib/import");
  const files = readdirSync(dir).filter((name) => (name.endsWith(".ts") || name.endsWith(".js")) && !name.endsWith(".test.ts"));
  const banned = [
    /for\s+await\s*\(/,
    /Array\.fromAsync/,
    /\.toArray\s*\(/,
    /\.intersection\s*\(/,
    /\.symmetricDifference\s*\(/,
    /\.isSubsetOf\s*\(/,
    /\.isSupersetOf\s*\(/,
    /\.isDisjointFrom\s*\(/,
  ];
  for (const name of files) {
    const source = codeOnly(readFileSync(join(dir, name), "utf8"));
    for (const pattern of banned) {
      assert.equal(pattern.test(source), false, `${name} matches ${pattern}`);
    }
  }
});
