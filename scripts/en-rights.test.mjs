import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shelf = readFileSync(join(root, "src/lib/catalog/shelf.ts"), "utf8");
const pitches = readFileSync(join(root, "src/lib/catalog/pitches.ts"), "utf8");
const rights = readFileSync(join(root, "src/lib/catalog/en-rights.ts"), "utf8");

function shelfBlock(id) {
  const start = shelf.indexOf(`id: "${id}"`);
  if (start < 0) return null;
  const from = shelf.lastIndexOf("{", start);
  const to = shelf.indexOf("}", start);
  return shelf.slice(from, to + 1);
}

const PULL_HOLD = [
  "metamorphosis",
  "siddhartha",
  "mama-blanca",
  "skylark",
  "nirmala",
  "zaynab",
  "cat",
  "wild-geese",
  "rashomon",
  "quiroga",
  "grand-hotel",
];

const KEEP_OFF = [
  "ramires",
  "villes-tentaculaires",
  "heures-claires",
  "trophees",
  "emaux",
];

test("Thea PULL/HOLD ids stay catalog-only (no local or Gutenberg bind)", () => {
  for (const id of PULL_HOLD) {
    const block = shelfBlock(id);
    assert.ok(block, `${id} remains on the shelf`);
    assert.equal(/\blocal:\s*true\b/.test(block), false, `${id} local`);
    assert.equal(/\bgutenberg:\s*\d+/.test(block), false, `${id} gutenberg`);
    assert.match(rights, new RegExp(`"${id}"`));
  }
});

test("grand-hotel is German catalog-only and Creighton EN is not pitched", () => {
  const block = shelfBlock("grand-hotel");
  assert.match(block, /language:\s*"German"/);
  assert.doesNotMatch(block, /He came out of No\. 7 box/);
  assert.doesNotMatch(pitches, /"grand-hotel"/);
});

test("KEEP_OFF_EN FR/PT originals are not shelf binds", () => {
  for (const id of KEEP_OFF) {
    assert.equal(shelfBlock(id), null, id);
    assert.match(rights, new RegExp(`"${id}"`));
  }
});

test("Dragon's Teeth stays the Serrano 1889 stand-in, not Cousin Basilio", () => {
  const block = shelfBlock("basilio");
  assert.ok(block);
  assert.match(block, /title:\s*"Dragon/);
  assert.match(block, /local:\s*true/);
  assert.match(block, /Serrano/);
  assert.match(block, /1889/);
  assert.doesNotMatch(block, /title:\s*"[^"]*Cousin Basilio/i);
  assert.equal(shelfBlock("cousin-basilio"), null);
  assert.match(pitches, /Serrano/);
  assert.match(pitches, /1889/);
  assert.doesNotMatch(pitches, /Rizal/);
});
