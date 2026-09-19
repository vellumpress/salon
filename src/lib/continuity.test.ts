import assert from "node:assert/strict";
import test from "node:test";
import { keptRefs, lastReadCue, lastReadPercent, lastReadProgress } from "./continuity.ts";
import type { WorkProgress } from "./store.ts";

function progress(partial: Partial<WorkProgress>): WorkProgress {
  return {
    breathIndex: 0,
    lastOpenedAt: 0,
    sittingStartedAt: null,
    keywords: {},
    kept: [],
    completedAt: null,
    entered: false,
    ...partial,
  };
}

test("lastReadProgress picks the newest entered work", () => {
  assert.equal(lastReadProgress({}), null);
  assert.equal(
    lastReadProgress({
      passing: progress({ entered: true, lastOpenedAt: 10, breathIndex: 3 }),
      we: progress({ entered: true, lastOpenedAt: 40, breathIndex: 8 }),
      page: progress({ entered: true, lastOpenedAt: 99, breathIndex: 1 }),
    })?.id,
    "we",
  );
});

test("keptRefs lists newest works first and skips page", () => {
  const rows = keptRefs({
    passing: progress({
      entered: true,
      lastOpenedAt: 20,
      kept: ["s0-2", "s0-4"],
    }),
    we: progress({ entered: true, lastOpenedAt: 50, kept: ["s1-0"] }),
    page: progress({ entered: true, lastOpenedAt: 90, kept: ["s0-1"] }),
  });
  assert.deepEqual(
    rows.map((row) => `${row.workId}:${row.breathId}`),
    ["we:s1-0", "passing:s0-2", "passing:s0-4"],
  );
});

test("lastReadCue names progress without requiring a catalog lookup", () => {
  assert.equal(lastReadCue(0), "Just opened");
  assert.equal(lastReadCue(11), "Sentence 12");
  assert.equal(lastReadCue(0, 200), "Opened · beginning");
  assert.equal(lastReadCue(50, 200), "25% in · sentence 51");
  assert.equal(lastReadPercent(50, 200), 25);
  assert.equal(lastReadPercent(3), null);
});

test("keptRefs honors a small limit and Infinity for the full collection", () => {
  const progressMap = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [
      `w${i}`,
      progress({ entered: true, lastOpenedAt: i, kept: [`s${i}`] }),
    ]),
  );
  assert.equal(keptRefs(progressMap, 3).length, 3);
  assert.equal(keptRefs(progressMap, Number.POSITIVE_INFINITY).length, 30);
});
