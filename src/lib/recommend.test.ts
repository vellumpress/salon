import assert from "node:assert/strict";
import test from "node:test";
import { mixSeed, shuffleWithSeed, takeShuffled } from "./recommend";

test("shuffleWithSeed does not mutate the input", () => {
  const src = ["a", "b", "c", "d", "e"];
  const copy = src.slice();
  shuffleWithSeed(src, 42);
  assert.deepEqual(src, copy);
});

test("same seed yields the same permutation", () => {
  const src = ["a", "b", "c", "d", "e", "f", "g", "h"];
  assert.deepEqual(shuffleWithSeed(src, 99), shuffleWithSeed(src, 99));
});

test("different seeds yield a different mix", () => {
  const src = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  const a = shuffleWithSeed(src, 1).join(",");
  const b = shuffleWithSeed(src, 2).join(",");
  assert.notEqual(a, b);
});

test("takeShuffled with seed 0 keeps catalog order", () => {
  const src = ["spring", "passing", "dalloway"];
  assert.deepEqual(takeShuffled(src, 0, 2), ["spring", "passing"]);
});

test("takeShuffled slices after the mix", () => {
  const src = ["a", "b", "c", "d", "e", "f"];
  const mixed = takeShuffled(src, 7, 3);
  assert.equal(mixed.length, 3);
  for (const id of mixed) assert.ok(src.includes(id));
});

test("mixSeed is stable per lane and differs across lanes", () => {
  assert.equal(mixSeed(12, "curated"), mixSeed(12, "curated"));
  assert.notEqual(mixSeed(12, "curated"), mixSeed(12, "poems"));
});

test("mixSeed of 0 stays 0 so first paint keeps catalog order", () => {
  assert.equal(mixSeed(0, "curated"), 0);
  assert.equal(mixSeed(0, "poems"), 0);
});
