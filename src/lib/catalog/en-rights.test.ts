import assert from "node:assert/strict";
import test from "node:test";
import {
  EN_OFF_READABLE_IDS,
  isBoundLocal,
  isBoundReadable,
  isEnReadableOff,
} from "./en-rights.ts";

test("hold/pull ids are marked off English readable", () => {
  for (const id of [
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
    "ramires",
    "villes-tentaculaires",
    "heures-claires",
    "trophees",
    "emaux",
    "cousin-basilio",
  ]) {
    assert.equal(isEnReadableOff(id), true, id);
    assert.equal(EN_OFF_READABLE_IDS.has(id), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg: 1 }), false, id);
    assert.equal(isBoundLocal({ id, local: true }), false, id);
  }
});

test("Dragon's Teeth (basilio) is not on the EN-off list", () => {
  assert.equal(isEnReadableOff("basilio"), false);
  assert.equal(isBoundLocal({ id: "basilio", local: true }), true);
  assert.equal(isBoundReadable({ id: "basilio", local: true }), true);
});
