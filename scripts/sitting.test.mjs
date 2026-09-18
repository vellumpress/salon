import assert from "node:assert/strict";
import test from "node:test";

const PRESETS = [5, 12, 20, 30, 45, 0];

function asSittingMinutes(value, fallback = 20) {
  if (typeof value === "string" && /^\d+$/.test(value)) value = Number.parseInt(value, 10);
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  if (n === 0) return 0;
  if (n < 0) return fallback;
  return Math.min(180, n);
}

function nearestSitPreset(estimateMinutes) {
  if (!Number.isFinite(estimateMinutes) || estimateMinutes <= 0) return 20;
  if (estimateMinutes <= 7) return 5;
  if (estimateMinutes <= 14) return 12;
  if (estimateMinutes <= 22) return 20;
  if (estimateMinutes <= 40) return 30;
  if (estimateMinutes <= 90) return 45;
  return 0;
}

test("sitting clamp", () => {
  assert.equal(asSittingMinutes(12), 12);
  assert.equal(asSittingMinutes("5"), 5);
  assert.equal(asSittingMinutes(0), 0);
  assert.equal(asSittingMinutes(999), 180);
  assert.ok(PRESETS.includes(nearestSitPreset(12)));
  assert.equal(nearestSitPreset(60), 45);
});
