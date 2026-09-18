import assert from "node:assert/strict";
import test from "node:test";
import {
  nextStripCount,
  STRIP_BATCH,
  STRIP_CYCLE_CAP,
  STRIP_DRIFT_PX_PER_SEC,
  stripDriftDelta,
  stripItems,
} from "./works-strip.ts";
import type { ShelfWork } from "./catalog/shelf.ts";

function work(id: string, title = id): ShelfWork {
  return {
    id,
    title,
    author: `Author ${id}`,
    year: 1925,
    form: "novel",
    language: "English",
    minutes: 40,
  };
}

const POOL = ["passing", "we", "dalloway", "manhattan", "gold"].map((id) => work(id));

test("stripItems is empty for an empty pool or non-positive count", () => {
  assert.deepEqual(stripItems([], 7, 10), []);
  assert.deepEqual(stripItems(POOL, 7, 0), []);
});

test("seed 0 keeps catalog order on the first cycle", () => {
  const rows = stripItems(POOL, 0, 3);
  assert.deepEqual(
    rows.map((row) => row.work.id),
    ["passing", "we", "dalloway"],
  );
});

test("keys stay unique after the pool wraps into the next cycle", () => {
  const rows = stripItems(POOL, 11, POOL.length + 2);
  assert.equal(rows.length, POOL.length + 2);
  assert.equal(new Set(rows.map((row) => row.key)).size, rows.length);
  assert.ok(rows[0]?.key.startsWith("0:"));
  assert.ok(rows[POOL.length]?.key.startsWith("1:"));
});

test("later cycles can reorder the same shelf instead of repeating the first mix", () => {
  const first = stripItems(POOL, 19, POOL.length).map((row) => row.work.id);
  const second = stripItems(POOL, 19, POOL.length * 2)
    .slice(POOL.length)
    .map((row) => row.work.id);
  assert.notDeepEqual(first, second);
  assert.deepEqual([...first].sort(), [...second].sort());
});

test("stripDriftDelta is a slow step and ignores non-positive time", () => {
  assert.equal(stripDriftDelta(0), 0);
  assert.equal(stripDriftDelta(-8), 0);
  assert.equal(stripDriftDelta(16), (STRIP_DRIFT_PX_PER_SEC * 16) / 1000);
  assert.ok(stripDriftDelta(16) < 0.3);
  assert.equal(stripDriftDelta(1000), stripDriftDelta(48));
  let carry = 0;
  for (let i = 0; i < 80; i++) carry += stripDriftDelta(16);
  assert.ok(carry >= 1);
});

test("nextStripCount appends a batch and stops at the cycle cap", () => {
  assert.equal(nextStripCount(STRIP_BATCH, 0), STRIP_BATCH);
  assert.equal(nextStripCount(10, 5), 10 + STRIP_BATCH);
  const cap = 5 * STRIP_CYCLE_CAP;
  assert.equal(nextStripCount(cap, 5), cap);
  assert.equal(nextStripCount(cap - 2, 5), cap);
});
