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

test("Rashōmon is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("rashomon"), false);
  assert.equal(isBoundLocal({ id: "rashomon", local: true }), true);
  assert.equal(isBoundReadable({ id: "rashomon", local: true, gutenberg: 78105 }), true);
});

test("A High Wind in Jamaica is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("high-wind-jamaica"), false);
  assert.equal(isBoundLocal({ id: "high-wind-jamaica", local: true }), true);
  assert.equal(isBoundReadable({ id: "high-wind-jamaica", local: true, gutenberg: 75530 }), true);
});

test("Noli Me Tangere is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("noli-me-tangere"), false);
  assert.equal(isBoundLocal({ id: "noli-me-tangere", local: true }), true);
  assert.equal(isBoundReadable({ id: "noli-me-tangere", local: true, gutenberg: 6737 }), true);
});
