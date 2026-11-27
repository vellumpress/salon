import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("a scroll that reaches a new sentence writes the ledger", () => {
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const store = readFileSync(new URL("./store.ts", import.meta.url), "utf8");
  const settle = reader.slice(
    reader.indexOf("if (!Number.isFinite(next) || next === current) return;"),
    reader.indexOf("let resizeQuietUntil"),
  );
  assert.match(settle, /noteScrolledBreath/);
  assert.doesNotMatch(settle, /setBreath\(work\.id, next/);
  assert.match(store, /function creditScrolledSentences/);
  assert.match(store, /noteScrolledBreath: \(workId, index, place\)/);
  const credit = store.slice(store.indexOf("function creditScrolledSentences"), store.indexOf("function applyAdvance"));
  assert.match(credit, /sittingStartedAt/);
  assert.match(credit, /to > from/);
  assert.match(credit, /applyAdvance/);
});
