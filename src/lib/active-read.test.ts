import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ADVANCE_CREDIT_MS,
  addMinutes,
  beginSit,
  closeSit,
  emptySitClock,
  migrateReadingClock,
  noteAdvance,
  notePause,
  noteResume,
} from "./active-read.ts";

const HOUR = 60 * 60_000;

test("an open page with no advances adds no reading time", () => {
  const started = beginSit(emptySitClock(), 1_000, false);
  // An hour later the hourglass or a route change closes the sit.
  // Nothing was tapped, so the ledger must stay empty.
  const closed = closeSit(started);
  assert.equal(closed.countSit, false);
  assert.equal(closed.minutes, 0);
  assert.equal(closed.clock.activeMs, 0);
  assert.equal(closed.clock.sittingStartedAt, null);
});

test("a long absence then one tap credits only the cap", () => {
  let clock = beginSit(emptySitClock(), 0, false);
  const stepped = noteAdvance(clock, HOUR);
  assert.equal(stepped.creditMs, MAX_ADVANCE_CREDIT_MS);
  assert.ok(stepped.creditMs < 30 * 60_000);
  assert.equal(stepped.clock.activeAdvances, 1);
  clock = stepped.clock;
  const closed = closeSit(clock);
  assert.equal(closed.countSit, true);
  assert.equal(closed.minutes, Math.round((MAX_ADVANCE_CREDIT_MS / 60_000) * 1000) / 1000);
});

test("steady taps sum the real gaps and ignore nothing in between", () => {
  let clock = beginSit(emptySitClock(), 0, false);
  let total = 0;
  for (const at of [20_000, 45_000, 70_000]) {
    const next = noteAdvance(clock, at);
    total += next.creditMs;
    clock = next.clock;
  }
  assert.equal(total, 70_000);
  assert.equal(clock.activeAdvances, 3);
  const closed = closeSit(clock);
  assert.equal(closed.minutes, Math.round((70_000 / 60_000) * 1000) / 1000);
});

test("backgrounding drops the hidden gap", () => {
  let clock = beginSit(emptySitClock(), 0, false);
  clock = noteAdvance(clock, 15_000).clock;
  clock = notePause(clock);
  // Ten minutes hidden. Resume starts a new anchor; only the next dwell counts.
  clock = noteResume(clock, 10 * 60_000);
  const next = noteAdvance(clock, 10 * 60_000 + 12_000);
  assert.equal(next.creditMs, 12_000);
  assert.equal(next.clock.activeMs, 15_000 + 12_000);
});

test("pause without a later tap does not invent the idle stretch", () => {
  let clock = beginSit(emptySitClock(), 0, false);
  clock = notePause(clock);
  const closed = closeSit({ ...clock, activeMs: clock.activeMs });
  assert.equal(closed.minutes, 0);
  assert.equal(closed.countSit, false);
});

test("repositioning is not an advance: the next tap measures the new sentence", () => {
  let clock = beginSit(emptySitClock(), 0, false);
  // Caller clears the anchor on retreat / jump (notePause) and resumes on the new line.
  clock = noteResume(notePause(clock), 5 * 60_000);
  const next = noteAdvance(clock, 5 * 60_000 + 8_000);
  assert.equal(next.creditMs, 8_000);
});

test("migration drops wall-clock minutes and keeps the sit count", () => {
  const next = migrateReadingClock(
    {
      readingMinutesByDay: { "2026-09-16": 181 },
      sitHistory: [
        { workId: "passing", minutes: 181, endedAt: 1 },
        { workId: "dalloway", minutes: 40, endedAt: 2 },
      ],
    },
    0,
  );
  assert.deepEqual(next.readingMinutesByDay, {});
  assert.equal(next.sitHistory?.length, 2);
  assert.ok(next.sitHistory?.every((row) => row.minutes === 0));
  assert.equal(next.activeReadVersion, 1);
  assert.equal(next.lastActiveReadAt, 0);

  const kept = migrateReadingClock(
    {
      ...next,
      readingMinutesByDay: { "2026-09-22": 4 },
      advancesByDay: { "2026-09-22": 6 },
      lastActiveReadAt: 50,
    },
    2,
  );
  assert.equal(kept.readingMinutesByDay?.["2026-09-22"], 4);
  assert.equal(kept.advancesByDay?.["2026-09-22"], 6);
  assert.equal(kept.lastActiveReadAt, 50);
});

test("minute sums keep sub-minute taps instead of rounding each one up", () => {
  let total = 0;
  for (let i = 0; i < 8; i++) total = addMinutes(total, 8_000);
  const exact = (8 * 8_000) / 60_000;
  assert.ok(Math.abs(total - exact) < 0.001);
  assert.ok(total < 1.2);
});
