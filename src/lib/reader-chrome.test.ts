import assert from "node:assert/strict";
import test from "node:test";
import {
  READER_PHONE_VIEWPORT,
  closedReaderBar,
  reduceReaderBar,
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

test("reader bar checks use a touch-sized phone viewport", () => {
  assert.equal(READER_PHONE_VIEWPORT.hasTouch, true);
  assert.equal(READER_PHONE_VIEWPORT.isMobile, true);
  assert.ok(READER_PHONE_VIEWPORT.width >= 320 && READER_PHONE_VIEWPORT.width <= 430);
  assert.ok(READER_PHONE_VIEWPORT.height >= 700);
});
