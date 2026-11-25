import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { focusBands } from "./center-line.ts";
import {
  MOVE_BY_DEFAULT,
  MOVE_BY_KEY,
  fingerScrollTop,
  isTopEdgeTap,
  readMoveBy,
  textTapSteps,
  writeMoveBy,
} from "./move-by.ts";

function memoryStore(initial?: Record<string, string>) {
  const data = { ...(initial ?? {}) };
  return {
    data,
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

test("move by defaults to scroll for readers who never chose, and the choice persists", () => {
  const fresh = memoryStore({ "salon-text-size": "1.20", "salon-center-line": "1" });
  assert.equal(MOVE_BY_DEFAULT, "scroll");
  assert.equal(readMoveBy(fresh), "scroll");
  assert.equal(fresh.data[MOVE_BY_KEY], undefined);
  assert.equal(readMoveBy(memoryStore()), "scroll");
  assert.equal(readMoveBy(memoryStore({ [MOVE_BY_KEY]: "" })), "scroll");
  assert.equal(readMoveBy(memoryStore({ [MOVE_BY_KEY]: "wheel" })), "scroll");
  assert.equal(readMoveBy(memoryStore({ [MOVE_BY_KEY]: "TAP" })), "tap");
  assert.equal(readMoveBy(memoryStore({ [MOVE_BY_KEY]: " scroll " })), "scroll");
  assert.equal(readMoveBy(null), "scroll");

  writeMoveBy("tap", fresh);
  assert.equal(fresh.data[MOVE_BY_KEY], "tap");
  assert.equal(readMoveBy(fresh), "tap");
  writeMoveBy("scroll", fresh);
  assert.equal(fresh.data[MOVE_BY_KEY], "scroll");
  assert.equal(readMoveBy(fresh), "scroll");
  assert.equal(fresh.data["salon-text-size"], "1.20");
});

test("only one way to move is active, and a finger drag snaps back in tap mode", () => {
  assert.equal(textTapSteps("tap"), true);
  assert.equal(textTapSteps("scroll"), false);
  assert.equal(fingerScrollTop("scroll", 40, 180), 180);
  assert.equal(fingerScrollTop("tap", 40, 180), 40);
  assert.equal(fingerScrollTop("tap", 12, 12), 12);
});

test("a top-edge tap is not a sentence tap", () => {
  assert.equal(isTopEdgeTap(12, 49), true);
  assert.equal(isTopEdgeTap(49, 49), true);
  assert.equal(isTopEdgeTap(49.4, 49), true);
  assert.equal(isTopEdgeTap(80, 49), false);
  assert.equal(isTopEdgeTap(Number.NaN, 49), false);
  assert.equal(isTopEdgeTap(10, Number.NaN), false);
});

test("move by sits next to text size, in Outfit, and leaves sits, scores, and the bands alone", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const sheet = reader.slice(reader.indexOf("Daylight colors"), reader.indexOf("<footer"));
  const textAt = sheet.indexOf("Text size");
  const moveAt = sheet.indexOf("Move by");
  assert.ok(textAt > -1, "text size missing from the sheet");
  assert.ok(moveAt > textAt, "Move by must sit with the text size slider");
  assert.match(sheet.slice(moveAt, moveAt + 900), /Scroll[\s\S]{0,500}Tap/);
  assert.match(reader, /aria-label="Sitting length"/);
  assert.match(sheet, /aria-pressed=\{moveBy\.mode === "scroll"\}/);
  assert.match(sheet, /aria-pressed=\{moveBy\.mode === "tap"\}/);
  assert.match(reader, /useMoveBy/);
  assert.match(reader, /data-move-by=\{moveBy\.mode\}/);
  assert.match(reader, /textTapSteps\(moveByRef\.current\)/);

  assert.match(css, /\.move-by-row\s*\{[^}]*font-family:\s*var\(--font-sans\)[^}]*text-transform:\s*none/);
  assert.match(css, /\.move-by-choices button\s*\{[^}]*font-family:\s*var\(--font-sans\)/);
  assert.doesNotMatch(css, /font-family:\s*["'](?!Outfit|Cormorant Garamond)[^"']+["']/);

  const bands = css.match(/\.focus-band-now\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(bands, /height:\s*calc\(\(100% - var\(--focus-lead\)\) \/ 3\)/);
  assert.doesNotMatch(bands, /move-by|text-size|text-breath/);
  const phone = focusBands(844, 49);
  assert.ok(Math.abs(phone.now.top - phone.read.bottom) < 1e-9);
  assert.ok(Math.abs(phone.next.top - phone.now.bottom) < 1e-9);

  assert.match(reader, /creditReadingStep/);
  assert.match(reader, /startSitting/);
  assert.match(reader, /savedSentenceAt/);
});
