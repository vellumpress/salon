import assert from "node:assert/strict";
import test from "node:test";
import {
  breathPageTop,
  classifyTurnGesture,
  ghostMousePointer,
  HOLD_ARM_MS,
  HOLD_RAMP_MS,
  holdStepCount,
  holdStepIntervalMs,
  turnZone,
} from "./reader-turn.ts";

const host = { left: 0, top: 49, right: 390, bottom: 844, width: 390 };

test("the left third goes back at every height", () => {
  const focusTop = 520;
  const focusBottom = 560;
  const split = host.left + host.width / 3;
  assert.equal(turnZone({ x: split - 2, y: focusTop - 24, host, focusTop, focusBottom }), "prev");
  assert.equal(turnZone({ x: 40, y: focusTop + 8, host, focusTop, focusBottom }), "prev");
  assert.equal(turnZone({ x: 40, y: 800, host, focusTop, focusBottom }), "prev");
  assert.equal(turnZone({ x: 20, y: host.top + 4, host, focusTop, focusBottom }), "prev");
  assert.equal(turnZone({ x: split + 2, y: focusTop - 24, host, focusTop, focusBottom }), "next");
  assert.equal(turnZone({ x: 300, y: focusTop + 4, host, focusTop, focusBottom }), "next");
  assert.equal(turnZone({ x: 200, y: 60, host, focusTop, focusBottom }), "next");
});

test("the center and the right side go forward, including above the sentence", () => {
  const focusTop = 520;
  const focusBottom = 560;
  assert.equal(turnZone({ x: 300, y: focusTop - 40, host, focusTop, focusBottom }), "next");
  assert.equal(turnZone({ x: 300, y: focusTop + 4, host, focusTop, focusBottom }), "next");
  assert.equal(turnZone({ x: 160, y: focusBottom + 30, host, focusTop, focusBottom }), "next");
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

test("the left third stays back when the line is off the column or taller than it", () => {
  assert.equal(
    turnZone({ x: 40, y: 400, host, focusTop: 2000, focusBottom: 2040 }),
    "prev",
  );
  assert.equal(
    turnZone({ x: 300, y: 400, host, focusTop: null, focusBottom: null }),
    "next",
  );
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
    classifyTurnGesture({ dx: 2, dy: 16, dt: 180, canScroll: true, scrolled: false }),
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

test("a hold starts at four sentences a second and climbs to twelve", () => {
  assert.equal(Math.round(1000 / holdStepIntervalMs(0)), 4);
  assert.equal(Math.round(1000 / holdStepIntervalMs(HOLD_RAMP_MS)), 12);
  const mid = holdStepIntervalMs(HOLD_RAMP_MS / 2);
  assert.ok(mid < holdStepIntervalMs(0), `mid interval ${mid} was not faster than the start`);
  assert.ok(mid > holdStepIntervalMs(HOLD_RAMP_MS), `mid interval ${mid} was already at full speed`);
  assert.equal(holdStepIntervalMs(-40), holdStepIntervalMs(0));
  assert.equal(holdStepCount(HOLD_ARM_MS - 1), 0);
  assert.equal(holdStepCount(HOLD_ARM_MS), 1);
  const constant = 1 + Math.floor((2000 - HOLD_ARM_MS) / (1000 / 4));
  assert.ok(holdStepCount(2000) > constant, "two seconds of holding did not speed up");
});
