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

test("Vera is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("vera"), false);
  assert.equal(isBoundLocal({ id: "vera", local: true }), true);
  assert.equal(isBoundReadable({ id: "vera", local: true, gutenberg: 34366 }), true);
});

test("On a Chinese Screen is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("on-a-chinese-screen"), false);
  assert.equal(isBoundLocal({ id: "on-a-chinese-screen", local: true }), true);
  assert.equal(isBoundReadable({ id: "on-a-chinese-screen", local: true, gutenberg: 48788 }), true);
});

test("Futility is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("futility"), false);
  assert.equal(isBoundLocal({ id: "futility", local: true }), true);
  assert.equal(isBoundReadable({ id: "futility", local: true, gutenberg: 77253 }), true);
});

test("The Poison Tree is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("poison-tree"), false);
  assert.equal(isBoundLocal({ id: "poison-tree", local: true }), true);
  assert.equal(isBoundReadable({ id: "poison-tree", local: true, gutenberg: 17455 }), true);
});

test("Trooper Peter Halket is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("trooper-peter-halket"), false);
  assert.equal(isBoundLocal({ id: "trooper-peter-halket", local: true }), true);
  assert.equal(isBoundReadable({ id: "trooper-peter-halket", local: true, gutenberg: 1431 }), true);
});
