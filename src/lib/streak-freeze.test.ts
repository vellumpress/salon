import assert from "node:assert/strict";
import test from "node:test";
import { dayKey } from "./day-key.ts";
import { resolveStreak } from "./streak-freeze.ts";

function at(dayOffset: number) {
  return new Date(2026, 9, 4 + dayOffset, 12, 0, 0, 0);
}

function key(dayOffset: number) {
  return dayKey(at(dayOffset).getTime());
}

const now = at(0).getTime();

test("a continuous run keeps the banked freeze", () => {
  const days = new Set([key(0), key(-1), key(-2)]);
  const resolved = resolveStreak({
    hasDay: (day) => days.has(day),
    now,
    banked: 1,
    usedOn: null,
  });
  assert.equal(resolved.streak, 3);
  assert.equal(resolved.banked, 1);
  assert.equal(resolved.spent, false);
  assert.equal(resolved.usedOn, null);
});

test("one missed day spends the freeze and keeps the run", () => {
  const days = new Set([key(-2), key(-3)]);
  const resolved = resolveStreak({
    hasDay: (day) => days.has(day),
    now,
    banked: 1,
    usedOn: null,
  });
  assert.equal(resolved.spent, true);
  assert.equal(resolved.usedOn, key(-1));
  assert.equal(resolved.banked, 0);
  assert.equal(resolved.streak, 3);
});

test("two missed days leave the freeze banked and break the run", () => {
  const days = new Set([key(-3)]);
  const resolved = resolveStreak({
    hasDay: (day) => days.has(day),
    now,
    banked: 1,
    usedOn: null,
  });
  assert.equal(resolved.spent, false);
  assert.equal(resolved.banked, 1);
  assert.equal(resolved.streak, 0);
});

test("a seven-day sit after a spent freeze banks another", () => {
  const days = new Set([0, -1, -2, -3, -4, -5, -6].map(key));
  const resolved = resolveStreak({
    hasDay: (day) => days.has(day),
    now,
    banked: 0,
    usedOn: key(-10),
  });
  assert.equal(resolved.spent, false);
  assert.equal(resolved.streak, 7);
  assert.equal(resolved.banked, 1);
});

test("spending a freeze does not immediately earn it back", () => {
  const days = new Set([-2, -3, -4, -5, -6, -7, -8].map(key));
  const resolved = resolveStreak({
    hasDay: (day) => days.has(day),
    now,
    banked: 1,
    usedOn: null,
  });
  assert.equal(resolved.spent, true);
  assert.equal(resolved.banked, 0);
  assert.ok(resolved.streak >= 7);
});
