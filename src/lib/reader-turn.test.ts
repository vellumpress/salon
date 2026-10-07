import assert from "node:assert/strict";
import test from "node:test";
import { turnZone } from "./reader-turn.ts";

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
