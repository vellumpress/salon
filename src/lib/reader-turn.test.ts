import assert from "node:assert/strict";
import test from "node:test";
import {
  breathPageTop,
  classifyTurnGesture,
  ghostMousePointer,
  turnZone,
} from "./reader-turn.ts";

const host = { left: 0, top: 49, right: 390, bottom: 844, width: 390 };

test("a tap on the already-read lines goes back, including the right side", () => {
  const focusTop = 520;
  const focusBottom = 560;
  assert.equal(
    turnZone({ x: 300, y: focusTop - 24, host, focusTop, focusBottom }),
    "prev",
  );
  assert.equal(
    turnZone({ x: 40, y: focusTop - 80, host, focusTop, focusBottom }),
    "prev",
  );
  assert.equal(
    turnZone({ x: 200, y: 60, host, focusTop, focusBottom }),
    "prev",
  );
});

test("a tap on the focus line or the preview goes forward", () => {
  const focusTop = 520;
  const focusBottom = 560;
  assert.equal(turnZone({ x: 300, y: focusTop + 4, host, focusTop, focusBottom }), "next");
  assert.equal(turnZone({ x: 40, y: focusBottom + 30, host, focusTop, focusBottom }), "next");
  assert.equal(turnZone({ x: 360, y: 800, host, focusTop, focusBottom }), "next");
});

test("taps outside the reading column do not turn the page", () => {
  assert.equal(
    turnZone({ x: 20, y: 20, host, focusTop: 520, focusBottom: 560 }),
    null,
  );
  assert.equal(
    turnZone({ x: 400, y: 600, host, focusTop: 520, focusBottom: 560 }),
    null,
  );
});

test("with the focus off the column, the left third is still back", () => {
  assert.equal(
    turnZone({ x: 40, y: 400, host, focusTop: 2000, focusBottom: 2040 }),
    "prev",
  );
  assert.equal(
    turnZone({ x: 300, y: 400, host, focusTop: null, focusBottom: null }),
    "next",
  );
});

test("a tall breath keeps a back zone on the sentence itself", () => {
  assert.equal(
    turnZone({ x: 40, y: 700, host, focusTop: 60, focusBottom: 1400, tall: true }),
    "prev",
  );
  assert.equal(
    turnZone({ x: 300, y: 200, host, focusTop: 60, focusBottom: 1400, tall: true }),
    "next",
  );
  assert.equal(
    turnZone({ x: 20, y: 20, host, focusTop: 60, focusBottom: 1400, tall: true }),
    null,
  );
});

test("a ghost mouse after touch is the same finger", () => {
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      firesTouchEvents: true,
      now: 5000,
      lastTouchAt: 0,
    }),
    true,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      now: 1200,
      lastTouchAt: 1000,
    }),
    true,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      now: 2400,
      lastTouchAt: 1000,
    }),
    true,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      now: 5000,
      lastTouchAt: 1000,
    }),
    false,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "touch",
      firesTouchEvents: true,
      now: 1200,
      lastTouchAt: 1000,
    }),
    false,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      now: 5000,
      lastTouchAt: 1000,
      x: 200,
      y: 400,
      lastX: 204,
      lastY: 398,
    }),
    true,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      now: 5000,
      lastTouchAt: 1000,
      x: 40,
      y: 80,
      lastX: 200,
      lastY: 400,
    }),
    false,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      now: 20_000,
      lastTouchAt: 1000,
      x: 200,
      y: 400,
      lastX: 200,
      lastY: 400,
    }),
    false,
  );
  assert.equal(
    ghostMousePointer({
      pointerType: "mouse",
      now: 5000,
      lastTouchAt: 1000,
      x: 80,
      y: 90,
      lastX: 300,
      lastY: 500,
      places: [
        { x: 80, y: 88, t: 2000 },
        { x: 300, y: 500, t: 1000 },
      ],
    }),
    true,
  );
});

test("a short still touch is a tap, and a vertical drag in a tall breath scrolls", () => {
  assert.equal(
    classifyTurnGesture({ dx: 2, dy: 4, dt: 120, canScroll: true, scrolled: false }),
    "tap",
  );
  assert.equal(
    classifyTurnGesture({ dx: 1, dy: 8, dt: 340, canScroll: false, scrolled: false }),
    "tap",
  );
  assert.equal(
    classifyTurnGesture({ dx: 4, dy: 3, dt: 520, canScroll: false, scrolled: false }),
    "tap",
  );
  assert.equal(
    classifyTurnGesture({ dx: 2, dy: 28, dt: 180, canScroll: true, scrolled: false }),
    "scroll",
  );
  assert.equal(
    classifyTurnGesture({ dx: -80, dy: 10, dt: 160, canScroll: true, scrolled: false }),
    "swipe-next",
  );
  assert.equal(
    classifyTurnGesture({ dx: 0, dy: 80, dt: 200, canScroll: false, scrolled: true }),
    "scroll",
  );
  assert.equal(
    classifyTurnGesture({ dx: 4, dy: 2, dt: 1200, canScroll: false, scrolled: false }),
    "ignore",
  );
});

test("a tall breath pages before it steps", () => {
  assert.equal(
    breathPageTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 1200, direction: 1 }),
    360,
  );
  assert.equal(
    breathPageTop({ scrollTop: 760, clientHeight: 400, scrollHeight: 1200, direction: 1 }),
    800,
  );
  assert.equal(
    breathPageTop({ scrollTop: 800, clientHeight: 400, scrollHeight: 1200, direction: 1 }),
    null,
  );
  assert.equal(
    breathPageTop({ scrollTop: 400, clientHeight: 400, scrollHeight: 1200, direction: -1 }),
    40,
  );
  assert.equal(
    breathPageTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 1200, direction: -1 }),
    null,
  );
  assert.equal(
    breathPageTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 402, direction: 1 }),
    null,
  );
});
