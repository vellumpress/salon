import assert from "node:assert/strict";
import test from "node:test";
import { browseWindow, followBrowseRange, growBrowseRange, restoredScrollTop } from "./reader-scroll-window.ts";

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
