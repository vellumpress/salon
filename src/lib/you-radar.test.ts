import assert from "node:assert/strict";
import test from "node:test";
import {
  RADAR_AXIS_IDS,
  RADAR_RINGS,
  RADAR_SIZE,
  buildRadarAxes,
  pointsToPath,
  radarCaption,
  radarLayout,
  radarScore,
} from "./you-radar.ts";

test("radar scores clamp to 0–100", () => {
  assert.equal(radarScore(0, 20), 0);
  assert.equal(radarScore(10, 20), 50);
  assert.equal(radarScore(20, 20), 100);
  assert.equal(radarScore(40, 20), 100);
  assert.equal(radarScore(5, 0), 0);
  assert.equal(radarScore(Number.NaN, 20), 0);
});

test("six FIFA-hex axes map live reading stats", () => {
  const axes = buildRadarAxes({
    minutesToday: 18,
    minutesWeek: 30,
    breaths: 12,
    kept: 2,
    streak: 2,
    sits: 2,
    sittingMinutes: 20,
  });
  assert.deepEqual(
    axes.map((row) => row.id),
    [...RADAR_AXIS_IDS],
  );
  assert.equal(axes[0]?.score, 90);
  assert.equal(axes[0]?.display, "18");
  assert.equal(axes[0]?.unit, "active min");
  assert.equal(axes[1]?.score, 30);
  assert.equal(axes[1]?.label, "Week");
  assert.equal(axes[2]?.score, 30);
  assert.equal(axes[3]?.score, 25);
  assert.equal(axes[4]?.score, 29);
  assert.equal(axes[5]?.id, "sits");
  assert.equal(axes[5]?.score, 29);
  assert.equal(axes[5]?.unit, "sits");
});

test("empty stats stay on the grid at zero", () => {
  const axes = buildRadarAxes({
    minutesToday: 0,
    minutesWeek: 0,
    breaths: 0,
    kept: 0,
    streak: 0,
    sits: 0,
  });
  assert.equal(axes.length, 6);
  assert.ok(axes.every((row) => row.score === 0 && row.display === "0"));
});

test("estimated minutes keep the est. unit", () => {
  const axes = buildRadarAxes({
    minutesToday: 0,
    minutesWeek: 75,
    breaths: 1,
    kept: 1,
    streak: 1,
    sits: 0,
    minutesAreEstimated: true,
  });
  assert.equal(axes[1]?.display, "1h 15m");
  assert.equal(axes[1]?.unit, "est. min");
  assert.equal(axes[2]?.unit, "sentence");
  assert.equal(axes[3]?.unit, "line");
  assert.equal(axes[4]?.unit, "day");
  assert.equal(axes[5]?.unit, "sits");
});

test("radar layout is a closed hex with labels outside the grid", () => {
  const axes = buildRadarAxes({
    minutesToday: 20,
    minutesWeek: 100,
    breaths: 40,
    kept: 8,
    streak: 7,
    sits: 7,
  });
  const layout = radarLayout(axes);
  assert.equal(layout.size, RADAR_SIZE);
  assert.equal(layout.grids.length, RADAR_RINGS);
  assert.equal(layout.spokes.length, 6);
  assert.equal(layout.labels.length, 6);
  assert.match(layout.polygon, /^M/);
  assert.match(layout.polygon, /Z$/);
  assert.ok(layout.labels.every((row) => row.x > 0 && row.x < RADAR_SIZE));
  assert.ok(layout.labels.every((row) => row.y > 0 && row.y < RADAR_SIZE));
  const top = layout.labels[0]!;
  assert.equal(top.anchor, "middle");
  assert.ok(top.y < layout.cy - layout.r);
  const right = layout.labels[1]!;
  assert.equal(right.anchor, "start");
  assert.ok(right.x > layout.cx);
});

test("pointsToPath closes a polygon", () => {
  assert.equal(pointsToPath([]), "");
  assert.equal(pointsToPath([{ x: 1, y: 2 }]), "M1 2 Z");
});

test("caption lists every axis for assistive text", () => {
  const axes = buildRadarAxes({
    minutesToday: 18,
    minutesWeek: 30,
    breaths: 12,
    kept: 2,
    streak: 2,
    sits: 2,
    sittingMinutes: 20,
  });
  const caption = radarCaption(axes);
  assert.match(caption, /Today 18 active min/);
  assert.match(caption, /Sits 2 sits/);
});
