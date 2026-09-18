import assert from "node:assert/strict";
import test from "node:test";
import {
  asSittingMinutes,
  nearestSitPreset,
  sitLabel,
} from "./sitting";

test("clamps and accepts presets", () => {
  assert.equal(asSittingMinutes(12), 12);
  assert.equal(asSittingMinutes("5"), 5);
  assert.equal(asSittingMinutes(0), 0);
  assert.equal(asSittingMinutes(999), 180);
  assert.equal(asSittingMinutes(-3), 20);
});

test("maps ritual estimates to presets", () => {
  assert.equal(nearestSitPreset(5), 5);
  assert.equal(nearestSitPreset(12), 12);
  assert.equal(nearestSitPreset(20), 20);
  assert.equal(nearestSitPreset(30), 30);
  assert.equal(nearestSitPreset(60), 45);
  assert.equal(nearestSitPreset(120), 0);
});

test("labels presets and custom minutes", () => {
  assert.equal(sitLabel(5), "~5 min");
  assert.equal(sitLabel(45), "One sitting");
  assert.equal(sitLabel(0), "Open");
  assert.equal(sitLabel(18), "18 min");
});
