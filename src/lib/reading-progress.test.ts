import assert from "node:assert/strict";
import test from "node:test";
import {
  chapterStartOffsets,
  chapterTickPercents,
  readingLength,
  readingProgressRatio,
} from "./reading-progress.ts";

test("a catalog opening is measured against the whole shelf", () => {
  assert.equal(readingLength("passing", 96, 3032), 3032);
  assert.equal(readingLength("passing", 3032, 3032), 3032);
  assert.equal(readingLength("passing", 3100, 3032), 3100);
  assert.equal(readingLength("page", 12, 3032), 12);
  assert.equal(readingLength("import-1", 4, null), 4);
  assert.equal(readingLength("orphan", 0, null), 1);
});

test("a forward breath, sentence, or window moves the fraction up", () => {
  const base = { index: 4, sentenceAt: 0, sentenceCount: 3, window: 0, length: 3032 };
  const opened = readingProgressRatio(base);
  assert.ok(opened > 0 && opened < 0.01);
  assert.ok(readingProgressRatio({ ...base, window: 1 }) > opened);
  assert.ok(readingProgressRatio({ ...base, sentenceAt: 1, window: 0 }) > readingProgressRatio({ ...base, window: 31 }));
  assert.ok(readingProgressRatio({ ...base, index: 5, sentenceAt: 0, window: 0 }) > readingProgressRatio({ ...base, sentenceAt: 2, window: 31 }));
  assert.equal(readingProgressRatio({ index: 0, sentenceAt: 0, sentenceCount: 1, window: 0, length: 10 }), 0);
  assert.equal(
    readingProgressRatio({ index: 9, sentenceAt: 0, sentenceCount: 1, window: 31, length: 10 }),
    1,
  );
});

test("chapter ticks mark later boundaries and skip the opening edge", () => {
  const breaths = [
    { sceneId: "a" },
    { sceneId: "a" },
    { sceneId: "b" },
    { sceneId: "b" },
    { sceneId: "c" },
  ];
  const starts = chapterStartOffsets(breaths);
  assert.deepEqual(starts, [0, 2, 4]);
  const ticks = chapterTickPercents(starts, 10);
  assert.deepEqual(ticks, [20, 40]);
  assert.deepEqual(chapterTickPercents([0, 10], 10), []);
});
