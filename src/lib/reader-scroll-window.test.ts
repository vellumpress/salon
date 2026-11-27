import assert from "node:assert/strict";
import test from "node:test";
import {
  browseWindow,
  extendBrowseRange,
  followBrowseRange,
  growBrowseRange,
  prefixDropCount,
  keptScrollTop,
  restoredScrollTop,
  SCROLL_GULP,
} from "./reader-scroll-window.ts";

test("a gulp adds a few lines on one side and does not drop the other", () => {
  assert.equal(SCROLL_GULP, 8);
  const forward = extendBrowseRange(
    { from: 10, to: 40 },
    200,
    { scrollTop: 3000, scrollHeight: 3800, clientHeight: 800, lead: 1600 },
    SCROLL_GULP,
    "forward",
  );
  assert.deepEqual(forward, { from: 10, to: 48 });
  const back = extendBrowseRange(
    forward,
    200,
    { scrollTop: 40, scrollHeight: 5000, clientHeight: 800, lead: 1600 },
    SCROLL_GULP,
    "back",
  );
  assert.deepEqual(back, { from: 2, to: 48 });
  const idle = extendBrowseRange(
    forward,
    200,
    { scrollTop: 1000, scrollHeight: 8000, clientHeight: 800, lead: 1600 },
    SCROLL_GULP,
    "forward",
  );
  assert.equal(idle, forward);
});

test("lines already above the glass can be dropped only when they fit in that gap", () => {
  assert.equal(prefixDropCount([100, 120, 80, 90], 250, 4), 2);
  assert.equal(prefixDropCount([400, 100], 250, 4), 0);
  assert.equal(prefixDropCount([40, 40, 40, 40, 40], 1000, 4), 4);
  assert.equal(prefixDropCount([40], 0, 4), 0);
});

test("a settled page is the breaths around the sentence", () => {
  assert.deepEqual(browseWindow(50, 200, 24, 36), { from: 26, to: 87 });
  assert.deepEqual(browseWindow(0, 10, 24, 36), { from: 0, to: 10 });
  assert.deepEqual(browseWindow(8, 10, 24, 36), { from: 0, to: 10 });
});

test("the page grows before the reader reaches the edge and keeps the lines already painted", () => {
  const range = { from: 10, to: 46 };
  const grown = growBrowseRange(
    range,
    400,
    { scrollTop: 3200, scrollHeight: 4200, clientHeight: 844, lead: 1700 },
    36,
  );
  assert.deepEqual(grown, { from: 10, to: 82 });
  const idle = growBrowseRange(
    grown,
    400,
    { scrollTop: 3200, scrollHeight: 9000, clientHeight: 844, lead: 1700 },
    36,
  );
  assert.equal(idle, grown);
});

test("scrolling up adds earlier lines and does not drop the later ones", () => {
  const range = { from: 40, to: 80 };
  const grown = growBrowseRange(
    range,
    400,
    { scrollTop: 200, scrollHeight: 6000, clientHeight: 844, lead: 1700 },
    36,
  );
  assert.deepEqual(grown, { from: 4, to: 80 });
});

test("a long scroll drops lines above the glass and does not load them straight back", () => {
  const edges = { scrollTop: 5200, scrollHeight: 11000, clientHeight: 844, lead: 1700 };
  const next = followBrowseRange({ from: 0, to: 80 }, 400, edges, 36, "forward");
  assert.equal(next.from, 6);
  assert.ok(next.to >= 80);
  const pulled = followBrowseRange(next, 400, { ...edges, scrollTop: 200, scrollHeight: 5000 }, 36, "forward");
  assert.equal(pulled.from, next.from);
  const back = followBrowseRange(next, 400, { ...edges, scrollTop: 80, scrollHeight: 5000 }, 36, "back");
  assert.ok(back.from < next.from);
});

test("dropping lines above the glass does not subtract the height twice", () => {
  // The page was at the bottom. Removing lines above it shrinks the
  // document, and the browser has already clamped the offset by that amount.
  assert.equal(
    keptScrollTop(
      { scrollTop: 82421, scrollHeight: 83265 },
      { scrollTop: 76606, scrollHeight: 77450 },
    ),
    76606,
  );
  // The page was not at the bottom, so the offset has not moved yet.
  assert.equal(
    keptScrollTop(
      { scrollTop: 50000, scrollHeight: 80000 },
      { scrollTop: 50000, scrollHeight: 74185 },
    ),
    44185,
  );
  // Lines added above the glass. The offset follows them down.
  assert.equal(
    keptScrollTop(
      { scrollTop: 100, scrollHeight: 5000 },
      { scrollTop: 100, scrollHeight: 5800 },
    ),
    900,
  );
});

test("restoring a line uses the scroll offset from before the browser clamped it", () => {
  assert.equal(
    restoredScrollTop(2156, { top: 8500, scrollTop: 8000 }, 1500),
    1000,
  );
  assert.equal(restoredScrollTop(8000, { top: 8500, scrollTop: 8000 }, 8500), 8000);
  assert.equal(restoredScrollTop(100, { top: 50, scrollTop: 0 }, 4000), 3950);
});

test("a short runway grows both ways, and the ends of the book stop it", () => {
  const range = { from: 10, to: 40 };
  const grown = growBrowseRange(
    range,
    50,
    { scrollTop: 40, scrollHeight: 900, clientHeight: 844, lead: 1700 },
    36,
  );
  assert.deepEqual(grown, { from: 0, to: 50 });
  const done = growBrowseRange(
    grown,
    50,
    { scrollTop: 0, scrollHeight: 900, clientHeight: 844, lead: 1700 },
    36,
  );
  assert.equal(done, grown);
});
