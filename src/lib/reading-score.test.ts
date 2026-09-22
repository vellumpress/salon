import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  consistencyPts,
  dailyReadingScore,
  dailyScoreGlance,
  depthPts,
  deriveWindowScores,
  engagementPts,
  focusedTimePts,
  mixPts,
  monthlyReadingScore,
  scoreForDay,
  weeklyReadingScore,
} from "./reading-score.ts";
import { deriveReadingStats } from "./reading-stats.ts";
import { dayKey } from "./day-key.ts";

test("focused time is linear to 40 at 30 active minutes and never exceeds 40", () => {
  assert.equal(focusedTimePts(0), 0);
  assert.equal(focusedTimePts(15), 20);
  assert.equal(focusedTimePts(30), 40);
  assert.equal(focusedTimePts(90), 40);
});

test("depth scores peeking (no advance) at zero and fills with breaths or a scene", () => {
  assert.equal(depthPts(0, 0), 0);
  assert.ok(depthPts(5, 0) > 0);
  assert.ok(depthPts(5, 0) < 25);
  assert.equal(depthPts(20, 0), 25);
  assert.ok(depthPts(2, 1) >= 10);
  assert.equal(depthPts(20, 3), 25);
});

test("engagement fills on any keep, host open, sit, or club touch", () => {
  assert.equal(engagementPts({ keeps: 0, hostOpens: 0, sits: 0, clubTouches: 0 }), 0);
  assert.equal(engagementPts({ keeps: 1, hostOpens: 0, sits: 0, clubTouches: 0 }), 15);
  assert.equal(engagementPts({ keeps: 0, hostOpens: 1, sits: 0, clubTouches: 0 }), 15);
  assert.equal(engagementPts({ keeps: 0, hostOpens: 0, sits: 1, clubTouches: 0 }), 15);
  assert.equal(engagementPts({ keeps: 0, hostOpens: 0, sits: 0, clubTouches: 2 }), 15);
});

test("consistency and mix pillars", () => {
  assert.equal(consistencyPts(false), 0);
  assert.equal(consistencyPts(true), 10);
  assert.equal(mixPts(1, 0), 0);
  assert.equal(mixPts(2, 0), 10);
  assert.equal(mixPts(1, 1), 10);
});

test("band: under ~10 min usually stays below 50", () => {
  const score = dailyReadingScore({
    minutes: 9,
    advances: 8,
    sceneCrosses: 0,
    keeps: 0,
    hostOpens: 0,
    sits: 0,
    clubTouches: 0,
    worksTouched: 1,
  });
  assert.ok(score.total < 50, `expected <50, got ${score.total}`);
});

test("band: 15–20 min with depth lands in the 70s when engaged", () => {
  const score = dailyReadingScore({
    minutes: 18,
    advances: 20,
    sceneCrosses: 1,
    keeps: 1,
    hostOpens: 0,
    sits: 0,
    clubTouches: 0,
    worksTouched: 1,
  });
  assert.ok(score.total >= 70 && score.total < 90, `expected 70s, got ${score.total}`);
  // Mix optional — 90 without second work
  assert.equal(score.pillars.mix, 0);
});

test("band: 30+ min attentive with keep or chapter → 90+; mix optional", () => {
  const base = dailyReadingScore({
    minutes: 30,
    advances: 20,
    sceneCrosses: 1,
    keeps: 1,
    hostOpens: 0,
    sits: 0,
    clubTouches: 0,
    worksTouched: 1,
  });
  assert.equal(base.total, 90);
  assert.equal(base.pillars.mix, 0);

  const full = dailyReadingScore({
    minutes: 30,
    advances: 20,
    sceneCrosses: 1,
    keeps: 1,
    hostOpens: 0,
    sits: 1,
    clubTouches: 0,
    worksTouched: 1,
  });
  assert.equal(full.total, 100);
});

test("empty day is 0, not NaN", () => {
  const score = dailyReadingScore({
    minutes: 0,
    advances: 0,
    sceneCrosses: 0,
    keeps: 0,
    hostOpens: 0,
    sits: 0,
    clubTouches: 0,
    worksTouched: 0,
  });
  assert.equal(score.total, 0);
  assert.equal(score.label, "Unopened");
  assert.equal(Number.isNaN(score.total), false);
});

test("weekly uses best 5 of 7 and adds a streak bonus at ≥5 reading days", () => {
  const soft = weeklyReadingScore([90, 90, 90, 90, 90, 10, 0], 5);
  // avg of five 90s = 90, +4 bonus
  assert.equal(soft.total, 94);

  const thin = weeklyReadingScore([80, 0, 0, 0, 0, 0, 0], 1);
  assert.equal(thin.total, 16); // (80+0+0+0+0)/5
});

test("monthly mean soft-caps without breadth across three works", () => {
  const capped = monthlyReadingScore([95, 95, 95, 95], 1);
  assert.ok(capped.total <= 81, `expected soft-cap, got ${capped.total}`);

  const open = monthlyReadingScore([95, 95, 95, 95], 3);
  assert.equal(open.total, 95);
});

test("homepage glance matches the You-page daily total and stays soft at zero", () => {
  const now = Date.parse("2026-09-22T15:00:00");
  const today = dayKey(now);
  const reading = deriveReadingStats({
    progress: {},
    favorites: [],
    readingMinutesByDay: { [today]: 30 },
    advancesByDay: { [today]: 22 },
    sceneCrossesByDay: { [today]: 1 },
    keepsByDay: { [today]: 1 },
    worksTouchedByDay: { [today]: ["passing", "quicksand"] },
    sitsByDay: { [today]: 1 },
    now,
  });
  assert.equal(reading.dailyScore.total, 100);
  assert.equal(dailyScoreGlance(reading.dailyScore), "100");
  assert.equal(dailyScoreGlance(reading.dailyScore), String(reading.dailyScore.total));

  const empty = deriveReadingStats({ progress: {}, favorites: [], now });
  assert.equal(empty.dailyScore.total, 0);
  assert.equal(dailyScoreGlance(empty.dailyScore), "—");
  assert.equal(dailyScoreGlance(null), "—");
  assert.equal(
    dailyScoreGlance({ total: 0, hasSignal: true }),
    "—",
  );
});

test("homepage chip is a tap to You and reuses the You daily score", () => {
  const mark = readFileSync(new URL("../components/you-friends-mark.tsx", import.meta.url), "utf8");
  const chip = readFileSync(new URL("../components/daily-score-chip.tsx", import.meta.url), "utf8");
  assert.match(mark, /Friends[\s\S]*<DailyScoreChip[\s\S]*\bYou\b/);

  assert.match(chip, /deriveReadingStats\(/);
  assert.match(chip, /\.dailyScore/);
  assert.match(chip, /dailyScoreGlance\(/);
  assert.match(chip, /to=["']\/profile["']/);
  assert.doesNotMatch(chip, /weeklyScore|monthlyScore/);
  for (const key of [
    "readingMinutesByDay",
    "advancesByDay",
    "sceneCrossesByDay",
    "keepsByDay",
    "worksTouchedByDay",
    "hostOpensByDay",
    "sitsByDay",
    "clubTouchesByDay",
    "sitHistory",
    "togetherKeeps",
    "hostedSits",
    "handle",
  ]) {
    assert.match(chip, new RegExp(key));
  }
});

test("deriveWindowScores wires daily / weekly / monthly from day ledgers", () => {
  const now = Date.parse("2026-09-22T15:00:00");
  const today = dayKey(now);
  const ledgers = {
    readingMinutesByDay: { [today]: 30 },
    advancesByDay: { [today]: 22 },
    sceneCrossesByDay: { [today]: 1 },
    keepsByDay: { [today]: 1 },
    worksTouchedByDay: { [today]: ["passing", "quicksand"] },
    hostOpensByDay: {},
    sitsByDay: { [today]: 1 },
    clubTouchesByDay: {},
  };
  const windows = deriveWindowScores(ledgers, now);
  assert.equal(windows.daily.total, 100);
  assert.ok(windows.weekly.total > 0);
  assert.ok(windows.monthly.total > 0);
  assert.equal(scoreForDay(ledgers, "1999-01-01").total, 0);
});
