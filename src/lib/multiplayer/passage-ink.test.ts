import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  INK_FADE_MS,
  INK_HOLD_MS,
  INK_OPACITY,
  PASSAGE_STROKE_CAP,
  clearOwnStrokes,
  inkOpacity,
  mergePassageStrokes,
  smoothStroke,
  strokeLength,
  strokePath,
  tidyStroke,
  undoOwnStroke,
  type PassageStroke,
} from "./passage-ink.ts";

function stroke(partial: Partial<PassageStroke> & Pick<PassageStroke, "id" | "from" | "breath">): PassageStroke {
  return {
    at: partial.at ?? 1,
    points: partial.points ?? [
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ],
    ...partial,
  };
}

test("a stroke keeps a smooth curve and stays inside the passage", () => {
  const tidy = tidyStroke([
    { x: -0.2, y: 0.2 },
    { x: 0.2, y: 0.25 },
    { x: 0.201, y: 0.251 },
    { x: 0.55, y: 0.7 },
    { x: 1.4, y: 0.8 },
  ]);
  assert.ok(tidy.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1));
  assert.ok(tidy.length >= 2 && tidy.length < 5);
  const smooth = smoothStroke(tidy);
  assert.ok(smooth.length >= tidy.length);
  const path = strokePath(smooth);
  assert.match(path, /^M /);
  assert.match(path, / Q /);
  assert.ok(strokeLength(smooth) > 0.2);
});

test("passage ink merges live updates, ignores junk, and caps each passage", () => {
  const first = stroke({ id: "a", from: "p-aaaaaa", breath: 3, at: 10 });
  const grown = stroke({
    id: "a",
    from: "p-aaaaaa",
    breath: 3,
    at: 12,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.6 },
      { x: 0.8, y: 0.3 },
    ],
  });
  const stale = stroke({ id: "a", from: "p-aaaaaa", breath: 3, at: 11 });
  const merged = mergePassageStrokes([first], [grown, stale, { id: "nope" }, null]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.points.length, 3);

  const many: PassageStroke[] = [];
  for (let i = 0; i < PASSAGE_STROKE_CAP + 4; i += 1) {
    many.push(stroke({ id: `s-${i}`, from: i % 2 ? "p-aaaaaa" : "p-bbbbbb", breath: 2, at: i + 1 }));
  }
  many.push(stroke({ id: "other", from: "p-aaaaaa", breath: 9, at: 1 }));
  const capped = mergePassageStrokes([], many);
  const onTwo = capped.filter((item) => item.breath === 2);
  assert.equal(onTwo.length, PASSAGE_STROKE_CAP);
  assert.equal(onTwo[0]?.id, "s-4");
  assert.equal(capped.some((item) => item.id === "other"), true);
});

test("undo and clear touch only your own marks on this passage", () => {
  const marks = [
    stroke({ id: "mine-old", from: "p-aaaaaa", breath: 4, at: 1 }),
    stroke({ id: "theirs", from: "p-bbbbbb", breath: 4, at: 2 }),
    stroke({ id: "mine-new", from: "p-aaaaaa", breath: 4, at: 3 }),
    stroke({ id: "elsewhere", from: "p-aaaaaa", breath: 5, at: 4 }),
  ];
  const undone = undoOwnStroke(marks, "p-aaaaaa", 4);
  assert.equal(undone.removed?.id, "mine-new");
  assert.deepEqual(
    undone.next.map((item) => item.id),
    ["mine-old", "theirs", "elsewhere"],
  );
  const cleared = clearOwnStrokes(marks, "p-aaaaaa", 4);
  assert.deepEqual(
    cleared.map((item) => item.id),
    ["theirs", "elsewhere"],
  );
  assert.equal(undoOwnStroke(marks, "p-cccccc", 4).removed, null);
});

test("live ink stays solid for a few seconds, then fades to nothing", () => {
  assert.equal(inkOpacity(0), INK_OPACITY);
  assert.equal(inkOpacity(INK_HOLD_MS), INK_OPACITY);
  const mid = inkOpacity(INK_HOLD_MS + INK_FADE_MS / 2);
  assert.ok(mid < INK_OPACITY && mid > 0.05);
  assert.equal(inkOpacity(INK_HOLD_MS + INK_FADE_MS + 50), 0);
});

test("Read Together no longer reserves a reaction gutter beside the passage", () => {
  const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.together-lock \.look-line[\s\S]{0,180}padding-right:\s*7\.5rem/);
  assert.doesNotMatch(css, /\.together-lock \.breath-now[\s\S]{0,80}padding-right:\s*7\.5rem/);
  const shell = readFileSync(new URL("../../components/sitting-room.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(shell, /A word on this sentence/);
  assert.doesNotMatch(shell, /SIT_REACTIONS/);
  assert.match(shell, /aria-label="Pen"/);
  assert.match(shell, /PassageInk/);
  const ink = readFileSync(new URL("../../components/passage-ink.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(ink, /outline|border:\s*1px/);
});
