import assert from "node:assert/strict";
import test from "node:test";
import {
  READER_PHONE_VIEWPORT,
  closedReaderBar,
  freshReaderMark,
  markRevealPull,
  reduceReaderBar,
  reduceReaderMark,
  readerBarOpen,
} from "./reader-chrome.ts";

test("a page tap does not open the bar", () => {
  const next = reduceReaderBar(closedReaderBar, "page");
  assert.equal(readerBarOpen(next), false);
  assert.equal(next, closedReaderBar);
  assert.equal(reduceReaderBar(next, "outside"), closedReaderBar);
});

test("an hourglass tap opens the bar", () => {
  const next = reduceReaderBar(closedReaderBar, "hourglass");
  assert.equal(readerBarOpen(next), true);
  assert.equal(next.still, false);
  assert.equal(next.navReveal, true);
});

test("a second hourglass tap closes the bar", () => {
  const open = reduceReaderBar(closedReaderBar, "hourglass");
  const closed = reduceReaderBar(open, "hourglass");
  assert.equal(readerBarOpen(closed), false);
  assert.deepEqual(closed, closedReaderBar);
});

test("a tap outside an open bar closes it and a page tap does not reopen it", () => {
  const open = reduceReaderBar(closedReaderBar, "hourglass");
  const closed = reduceReaderBar(open, "outside");
  assert.deepEqual(closed, closedReaderBar);
  assert.equal(reduceReaderBar(closed, "page"), closedReaderBar);
});

test("Keep and Send live inside the bar, so those taps leave it open", () => {
  const open = reduceReaderBar(closedReaderBar, "hourglass");
  assert.equal(reduceReaderBar(open, "chrome"), open);
});

test("the mark row hides when reading starts and comes back on a reveal", () => {
  assert.equal(freshReaderMark.mark, "shown");
  assert.equal(freshReaderMark.started, false);

  const reading = reduceReaderMark(freshReaderMark, "forward");
  assert.equal(reading.mark, "hidden");
  assert.equal(reading.started, true);
  assert.equal(reduceReaderMark(reading, "back").mark, "hidden");
  assert.equal(reduceReaderMark(reading, "scroll").mark, "hidden");

  const back = reduceReaderMark(reduceReaderMark(freshReaderMark, "back"), "reveal");
  assert.equal(back.mark, "shown");
  assert.equal(reduceReaderMark(back, "back").mark, "shown");
  assert.equal(reduceReaderMark(back, "forward").mark, "hidden");
  assert.equal(reduceReaderMark(back, "scroll").mark, "hidden");

  const pulled = reduceReaderMark(reading, "reveal");
  assert.equal(pulled.mark, "shown");
  assert.equal(markRevealPull(80, 200), true);
  assert.equal(markRevealPull(40, 200), false);
  assert.equal(markRevealPull(80, 900), false);
  assert.equal(markRevealPull(-80, 120), false);
});

test("reader bar checks use a touch-sized phone viewport", () => {
  assert.equal(READER_PHONE_VIEWPORT.hasTouch, true);
  assert.equal(READER_PHONE_VIEWPORT.isMobile, true);
  assert.ok(READER_PHONE_VIEWPORT.width >= 320 && READER_PHONE_VIEWPORT.width <= 430);
  assert.ok(READER_PHONE_VIEWPORT.height >= 700);
});
