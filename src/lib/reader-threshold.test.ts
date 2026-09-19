import assert from "node:assert/strict";
import test from "node:test";
import { SHELF } from "./catalog/shelf.ts";
import {
  shouldShowPreface,
  thresholdKind,
  thresholdPreface,
} from "./reader-threshold.ts";
import type { Work } from "./works.ts";

function work(id: string): Work {
  const item = SHELF.find((row) => row.id === id);
  assert.ok(item, id);
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    year: String(item.year),
    note: item.intro ?? "",
    minutes: item.minutes,
    cover: "",
    coverAlt: "",
    scenes: [],
    breaths: [],
  };
}

test("first open shows preface", () => {
  assert.equal(shouldShowPreface(undefined), true);
  assert.equal(shouldShowPreface({ entered: false, breathIndex: 0, lastOpenedAt: 0 }), true);
  const copy = thresholdPreface(work("of-human-bondage"));
  assert.ok(copy.length > 24, copy);
  assert.equal(thresholdKind({ progress: null, gateMode: "full" }), "preface");
});

test("resume skips preface", () => {
  const prior = { entered: true, breathIndex: 12, lastOpenedAt: 1_700_000_000_000 };
  assert.equal(shouldShowPreface(prior), false);
  assert.equal(thresholdPreface(work("of-human-bondage"), prior), "");
  assert.equal(thresholdKind({ progress: prior, gateMode: "full" }), "sit-gate");
});

test("deep link and pair+sit skip the whole gate", () => {
  assert.equal(thresholdKind({ skipGate: true, progress: null, gateMode: "full" }), "none");
});

test("together share overlay stays share even on a first sit", () => {
  assert.equal(
    thresholdKind({
      gateMode: "share",
      progress: { entered: false, breathIndex: 0, lastOpenedAt: 0 },
    }),
    "share",
  );
});
