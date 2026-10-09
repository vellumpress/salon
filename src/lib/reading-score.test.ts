import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { hourglassCopy } from "./score-hourglass.ts";
import {
  QUIET_DAY_SCORE,
  buildReadingScore,
  dailyScoreGlance,
  deriveWindowScores,
  plausibleMinutes,
  restfulnessPoints,
  scoreLabel,
  weightedContributorScore,
  type SitPoint,
  type WorkSnapshot,
} from "./reading-score.ts";
import { deriveReadingStats } from "./reading-stats.ts";
import { dayKey } from "./day-key.ts";

const NOW = Date.parse("2026-06-15T16:00:00");
const MS_DAY = 24 * 60 * 60 * 1000;

function keyAt(offset: number, now = NOW) {
  return dayKey(now - offset * MS_DAY);
}

function atHour(offset: number, hour: number, minute = 0, now = NOW) {
  const date = new Date(now - offset * MS_DAY);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

function fillDays(days: number, minutes: number, advances: number, now = NOW) {
  const readingMinutesByDay: Record<string, number> = {};
  const advancesByDay: Record<string, number> = {};
  const worksTouchedByDay: Record<string, string[]> = {};
  for (let i = 0; i < days; i++) {
    const key = keyAt(i, now);
    readingMinutesByDay[key] = minutes;
    advancesByDay[key] = advances;
    worksTouchedByDay[key] = ["the-house-of-mirth"];
  }
  return { readingMinutesByDay, advancesByDay, worksTouchedByDay };
}

const novel: WorkSnapshot = {
  id: "the-house-of-mirth",
  title: "The House of Mirth",
  form: "novel",
  country: "United States",
  year: 1905,
  progress: 0.4,
  finishedAt: null,
};

test("example day lands on 81, Settled, with Connection left out", () => {
  const total = weightedContributorScore([
    { weight: 35, raw: 82 },
    { weight: 20, raw: 88 },
    { weight: 15, raw: 75 },
    { weight: 10, raw: 60 },
    { weight: 10, raw: 90 },
  ]);
  assert.equal(total, 81);
  assert.equal(scoreLabel(81), "Settled");
  assert.equal(scoreLabel(49), "Light");
  assert.equal(scoreLabel(50), "Present");
  assert.equal(scoreLabel(69), "Present");
  assert.equal(scoreLabel(70), "Settled");
  assert.equal(scoreLabel(84), "Settled");
  assert.equal(scoreLabel(85), "Deep");
  assert.equal(scoreLabel(100), "Deep");
});

test("a one-minute day scores, and rows that are not ready stay learning", () => {
  const model = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers: {
      readingMinutesByDay: { [keyAt(0)]: 1 },
      advancesByDay: { [keyAt(0)]: 1 },
      sitsByDay: { [keyAt(0)]: 1 },
    },
    sits: [{ workId: "the-house-of-mirth", minutes: 1, endedAt: atHour(0, 21, 5) }],
  });
  assert.equal(model.daily.kind, "reading");
  assert.equal(Number.isFinite(model.daily.total), true);
  assert.ok(model.daily.total > 0 && model.daily.total <= 100, `total ${model.daily.total}`);
  assert.equal(model.daily.hasSignal, true);
  assert.equal(dailyScoreGlance(model.daily), String(model.daily.total));
  assert.notEqual(model.daily.label, "Rest");
  assert.equal(model.month.score, model.daily.total);

  const immersion = model.daily.contributors.find((part) => part.id === "immersion");
  assert.equal(immersion?.status, "scored");
  assert.ok((immersion?.value ?? 0) > 0 && (immersion?.value ?? 0) < 50);

  const learning = model.daily.contributors.filter((part) => part.status === "learning");
  assert.ok(learning.length > 0, "expected at least one still-learning row");
  for (const part of learning) {
    assert.equal(part.value, null);
    assert.match(part.note, /still learning/i);
  }

  const copy = hourglassCopy({
    kind: model.daily.kind,
    total: model.daily.total,
    label: model.daily.label,
    hide: false,
    paused: false,
    learning: Boolean(model.daily.learningNote),
    scored: model.daily.contributors.some((part) => part.status === "scored" && part.value != null),
  });
  assert.equal(copy.sand, model.daily.total);
  assert.equal(copy.primary, String(model.daily.total));
  assert.equal(copy.secondary, "Still learning");
  assert.notEqual(copy.state, "rest");

  const rest = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers: { readingMinutesByDay: { [keyAt(0)]: 0 } },
  });
  assert.equal(rest.daily.kind, "rest");
  assert.equal(rest.daily.total, QUIET_DAY_SCORE);
  assert.equal(dailyScoreGlance(rest.daily), String(QUIET_DAY_SCORE));
  assert.notEqual(rest.daily.label, "Rest");
});

test("a zero-reading day shows a very low number", () => {
  const ledgers = fillDays(30, 20, 16);
  ledgers.readingMinutesByDay[keyAt(0)] = 0;
  const model = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers,
    works: [novel],
  });
  assert.equal(model.daily.kind, "rest");
  assert.equal(model.daily.total, QUIET_DAY_SCORE);
  assert.ok(model.daily.total > 0 && model.daily.total < 15);
  assert.equal(dailyScoreGlance(model.daily), String(model.daily.total));
  assert.doesNotMatch(model.daily.line, /isn.t scored|Quick visit/);
  assert.notEqual(model.daily.label, "Rest");
  assert.ok((model.week.score ?? 0) > model.daily.total, "the week stays higher than a quiet day");
  const copy = hourglassCopy({
    kind: model.daily.kind,
    total: model.daily.total,
    label: model.daily.label,
    hide: false,
    paused: false,
    learning: Boolean(model.daily.learningNote),
    scored: model.daily.contributors.some((part) => part.status === "scored" && part.value != null),
  });
  assert.match(copy.primary, /^\d+$/);
  assert.equal(copy.primary, String(model.daily.total));
  assert.equal(copy.sand, model.daily.total);
  assert.notEqual(copy.primary, "Rest");
  assert.notEqual(copy.primary, "Quick visit");
});

test("a one-minute day shows a number from the minutes", () => {
  const model = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers: {
      readingMinutesByDay: { [keyAt(0)]: 1 },
      advancesByDay: { [keyAt(0)]: 1 },
    },
  });
  const quiet = buildReadingScore({ now: NOW, sittingMinutes: 20, ledgers: {} });
  assert.equal(model.daily.kind, "reading");
  assert.ok(model.daily.total > quiet.daily.total, `${model.daily.total} should beat a quiet ${quiet.daily.total}`);
  assert.equal(dailyScoreGlance(model.daily), String(model.daily.total));
  const copy = hourglassCopy({
    kind: model.daily.kind,
    total: model.daily.total,
    label: model.daily.label,
    hide: false,
    paused: false,
    learning: Boolean(model.daily.learningNote),
    scored: true,
  });
  assert.match(copy.primary, /^\d+$/);
  assert.equal(copy.sand, model.daily.total);
});

test("a brand-new reader with no history shows a number", () => {
  const model = buildReadingScore({ now: NOW, ledgers: {}, sittingMinutes: 20 });
  assert.equal(model.daily.total, QUIET_DAY_SCORE);
  assert.equal(dailyScoreGlance(model.daily), String(QUIET_DAY_SCORE));
  assert.doesNotMatch(`${model.daily.label} ${model.daily.line}`, /Quick visit|isn.t scored|^Rest$/);
  const learning = model.daily.contributors.filter((part) => part.status === "learning");
  assert.ok(learning.length > 0);
  for (const part of learning) {
    assert.equal(part.value, null);
    assert.match(part.note, /still learning/i);
  }
  const copy = hourglassCopy({
    kind: model.daily.kind,
    total: model.daily.total,
    label: model.daily.label,
    hide: false,
    paused: false,
    learning: Boolean(model.daily.learningNote),
    scored: false,
  });
  assert.equal(copy.primary, String(QUIET_DAY_SCORE));
  assert.equal(copy.sand, QUIET_DAY_SCORE);
  assert.equal(copy.secondary, "Still learning");
});

test("under a minute scores from the minutes", () => {
  const half = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers: {
      readingMinutesByDay: { [keyAt(0)]: 0.5 },
      advancesByDay: { [keyAt(0)]: 1 },
    },
  });
  const none = buildReadingScore({ now: NOW, sittingMinutes: 20, ledgers: {} });
  assert.equal(half.daily.kind, "reading");
  assert.ok(half.daily.total > none.daily.total);
  assert.equal(dailyScoreGlance(half.daily), String(half.daily.total));
  assert.doesNotMatch(half.daily.line, /isn.t scored|Quick visit/);
});

test("a one-minute burst still scores when pace is unknown", () => {
  const model = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers: {
      readingMinutesByDay: { [keyAt(0)]: 1 },
      advancesByDay: { [keyAt(0)]: 20 },
      sitsByDay: { [keyAt(0)]: 1 },
    },
  });
  assert.equal(model.daily.kind, "reading");
  assert.ok(model.daily.total > 0 && model.daily.total <= 100);
  assert.equal(dailyScoreGlance(model.daily), String(model.daily.total));
  assert.equal(model.daily.skimmed, false);
});

test("a longer skim against a slow baseline does not score high", () => {
  const ledgers = fillDays(40, 20, 20);
  const today = keyAt(0);
  ledgers.readingMinutesByDay[today] = 12;
  ledgers.advancesByDay[today] = 240;
  const model = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers,
    works: [novel],
    sits: [{ workId: novel.id, minutes: 12, endedAt: atHour(0, 15) }],
  });
  const immersion = model.daily.contributors.find((part) => part.id === "immersion");
  assert.ok(
    model.daily.kind === "quick-visit" || (immersion?.value ?? 100) < 50,
    `expected a low or unscored skim, kind ${model.daily.kind} immersion ${immersion?.value}`,
  );
  if (model.daily.kind === "reading") {
    assert.ok(model.daily.total < 70, `skim day scored ${model.daily.total}`);
  }
});

test("time past one and a half times the usual sit earns nothing extra", () => {
  const usual = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers: {
      ...fillDays(20, 20, 16),
    },
  });
  const longLedgers = fillDays(20, 20, 16);
  longLedgers.readingMinutesByDay[keyAt(0)] = 80;
  longLedgers.advancesByDay[keyAt(0)] = 64;
  const long = buildReadingScore({ now: NOW, sittingMinutes: 20, ledgers: longLedgers });
  const usualImmersion = usual.daily.contributors.find((part) => part.id === "immersion")?.value;
  const longImmersion = long.daily.contributors.find((part) => part.id === "immersion")?.value;
  assert.equal(usualImmersion, 100);
  assert.equal(longImmersion, usualImmersion);
});

test("a missed day costs a daily reader about 2 points", () => {
  const days = 80;
  const fullMinutes: Record<string, number> = {};
  const fullAdvances: Record<string, number> = {};
  const touched: Record<string, string[]> = {};
  const sits: SitPoint[] = [];
  for (let i = 0; i < days; i++) {
    const key = keyAt(i);
    fullMinutes[key] = 20;
    fullAdvances[key] = 16;
    touched[key] = [novel.id];
    sits.push({ workId: novel.id, minutes: 20, endedAt: atHour(i, i === 0 ? 21 : 15, 10) });
  }
  const missedMinutes = { ...fullMinutes };
  const missedAdvances = { ...fullAdvances };
  const missedTouched = { ...touched };
  const missedSits = sits.filter((sit) => dayKey(sit.endedAt) !== keyAt(1));
  delete missedMinutes[keyAt(1)];
  delete missedAdvances[keyAt(1)];
  delete missedTouched[keyAt(1)];

  const shared = {
    sittingMinutes: 20,
    works: [novel],
    connection: { optIn: true, sessions: [atHour(0, 21), atHour(2, 15)], keeps: [] },
  };
  const steady = buildReadingScore({
    now: NOW,
    ...shared,
    ledgers: { readingMinutesByDay: fullMinutes, advancesByDay: fullAdvances, worksTouchedByDay: touched },
    sits,
  });
  const missed = buildReadingScore({
    now: NOW,
    ...shared,
    ledgers: {
      readingMinutesByDay: missedMinutes,
      advancesByDay: missedAdvances,
      worksTouchedByDay: missedTouched,
    },
    sits: missedSits,
  });

  const steadyRhythm = steady.daily.contributors.find((part) => part.id === "rhythm");
  const missedRhythm = missed.daily.contributors.find((part) => part.id === "rhythm");
  assert.equal(steadyRhythm?.value, 100);
  assert.equal(missedRhythm?.value, 88);
  const drop = steady.daily.total - missed.daily.total;
  assert.ok(drop >= 2 && drop <= 3, `expected about 2 points, drop was ${drop} (${steady.daily.total} → ${missed.daily.total})`);
  assert.equal(steady.daily.label, "Deep");
  assert.notEqual(missed.daily.label, "Full");
});

test("a one-minute day counts as reading for rhythm, a blank day does not", () => {
  const ledgers = fillDays(70, 20, 16);
  const yesterday = keyAt(1);
  ledgers.readingMinutesByDay[yesterday] = 1;
  ledgers.advancesByDay[yesterday] = 1;
  const withVisit = buildReadingScore({ now: NOW, sittingMinutes: 20, ledgers, works: [novel] });
  delete ledgers.readingMinutesByDay[yesterday];
  delete ledgers.advancesByDay[yesterday];
  const withMiss = buildReadingScore({ now: NOW, sittingMinutes: 20, ledgers, works: [novel] });
  const visitRhythm = withVisit.daily.contributors.find((part) => part.id === "rhythm")?.value ?? 0;
  const missRhythm = withMiss.daily.contributors.find((part) => part.id === "rhythm")?.value ?? 0;
  assert.ok(visitRhythm > missRhythm, `visit ${visitRhythm} should beat a real miss ${missRhythm}`);
  assert.ok(visitRhythm >= 98);
});

test("connection drops out until the reader opts in, and weights scale up", () => {
  const ledgers = fillDays(70, 20, 16);
  const solitary = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers,
    works: [novel],
    sits: [{ workId: novel.id, minutes: 20, endedAt: atHour(0, 15) }],
  });
  const connection = solitary.daily.contributors.find((part) => part.id === "connection");
  assert.equal(connection?.status, "excluded");
  assert.equal(connection?.value, null);
  assert.equal(solitary.daily.total, 100);
});

test("restfulness is only scored on evenings, and falls after 1am", () => {
  assert.equal(
    restfulnessPoints({ endedAt: atHour(0, 21, 10), minutes: 20, planned: 20, daylight: false }),
    100,
  );
  const late = restfulnessPoints({
    endedAt: atHour(0, 1, 40),
    minutes: 20,
    planned: 20,
    daylight: false,
  });
  assert.ok(late < 90, `expected a late sit to fall, got ${late}`);

  const afternoon = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers: fillDays(10, 20, 16),
    sits: [{ workId: novel.id, minutes: 20, endedAt: atHour(0, 15) }],
    works: [novel],
  });
  assert.equal(afternoon.daily.contributors.find((part) => part.id === "restfulness")?.status, "excluded");

  const evening = buildReadingScore({
    now: Date.parse("2026-06-15T22:30:00"),
    sittingMinutes: 20,
    ledgers: fillDays(10, 20, 16),
    sits: [{ workId: novel.id, minutes: 20, endedAt: atHour(0, 21, 10) }],
    works: [novel],
  });
  assert.equal(evening.daily.contributors.find((part) => part.id === "restfulness")?.status, "scored");
  assert.equal(evening.daily.contributors.find((part) => part.id === "restfulness")?.value, 100);
});

test("a new reader’s missing contributors stay learning and do not invent numbers", () => {
  const model = buildReadingScore({
    now: NOW,
    sittingMinutes: 12,
    ledgers: {
      readingMinutesByDay: { [keyAt(0)]: 12 },
      advancesByDay: { [keyAt(0)]: 8 },
    },
  });
  assert.equal(model.daily.kind, "reading");
  assert.match(model.daily.learningNote ?? "", /Learning your rhythm/);
  const rhythm = model.daily.contributors.find((part) => part.id === "rhythm");
  const returned = model.daily.contributors.find((part) => part.id === "return");
  const range = model.daily.contributors.find((part) => part.id === "range");
  assert.equal(rhythm?.status, "learning");
  assert.equal(rhythm?.value, null);
  assert.equal(returned?.status, "learning");
  assert.equal(range?.status, "learning");
  assert.equal(model.daily.contributors.find((part) => part.id === "immersion")?.status, "scored");
  assert.ok(model.daily.total > 0 && model.daily.total <= 100);
});

test("kept lines do not raise the score by how many were collected", () => {
  const base = {
    now: NOW,
    sittingMinutes: 20,
    ledgers: fillDays(8, 20, 16),
    works: [novel],
  };
  const few = buildReadingScore(base);
  const many = buildReadingScore({
    ...base,
    ledgers: { ...base.ledgers, keepsByDay: { [keyAt(0)]: 40, [keyAt(1)]: 40 } },
  });
  assert.equal(few.daily.total, many.daily.total);
});

test("one novel can still reach a high month — no breadth cap, partial weeks are not zero-filled", () => {
  const ledgers = fillDays(20, 20, 16);
  const model = buildReadingScore({
    now: NOW,
    sittingMinutes: 20,
    ledgers,
    works: [novel],
    sits: Array.from({ length: 20 }, (_, i) => ({
      workId: novel.id,
      minutes: 20,
      endedAt: atHour(i, 15),
    })),
  });
  assert.ok((model.month.score ?? 0) > 81, `month ${model.month.score} should clear the old cap`);
  assert.equal(model.month.detail.includes("breadth"), false);
});

test("skim pace scales minutes and a slow pace does not", () => {
  assert.equal(plausibleMinutes(10, 20, null).skimmed, false);
  const skim = plausibleMinutes(10, 200, 60);
  assert.equal(skim.skimmed, true);
  assert.ok(skim.minutes < 3);
  const steady = plausibleMinutes(20, 20, 60);
  assert.equal(steady.skimmed, false);
  assert.equal(steady.minutes, 20);
});

test("a missing score object stays a dash, and a quiet day does not", () => {
  const rest = buildReadingScore({ now: NOW, ledgers: {}, sittingMinutes: 20 });
  assert.equal(rest.daily.total, QUIET_DAY_SCORE);
  assert.equal(dailyScoreGlance(rest.daily), String(QUIET_DAY_SCORE));
  assert.equal(dailyScoreGlance(null), "—");
  assert.equal(dailyScoreGlance({ total: 0, hasSignal: true }), "—");
});

test("homepage glance matches the You-page daily total, including a quiet day", () => {
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
  assert.equal(reading.dailyScore.kind, "reading");
  assert.ok(reading.dailyScore.total > 0 && reading.dailyScore.total <= 100);
  assert.equal(dailyScoreGlance(reading.dailyScore), String(reading.dailyScore.total));

  const empty = deriveReadingStats({ progress: {}, favorites: [], now });
  assert.equal(empty.dailyScore.total, QUIET_DAY_SCORE);
  assert.equal(dailyScoreGlance(empty.dailyScore), String(empty.dailyScore.total));
});

test("homepage score tile sits beside the resume column and reuses the You daily score", () => {
  const home = readFileSync(new URL("../routes/index.tsx", import.meta.url), "utf8");
  const mark = readFileSync(new URL("../components/you-friends-mark.tsx", import.meta.url), "utf8");
  const chip = readFileSync(new URL("../components/daily-score-chip.tsx", import.meta.url), "utf8");

  assert.match(
    home,
    /data-home-continue[\s\S]*className="resume-column[\s\S]*Resume[\s\S]*resume-continue[\s\S]*Continue[\s\S]*DailyScoreChip placement="continue"/,
  );
  assert.doesNotMatch(home, /continue-score/);
  assert.match(home, /showScore=\{hydrated && !showResume\}/);
  assert.match(mark, /showScore \? <DailyScoreChip \/> : null/);
  assert.match(mark, /Friends[\s\S]*You/);

  assert.match(chip, /deriveReadingStats\(/);
  assert.match(chip, /\.dailyScore/);
  assert.match(chip, /dailyScoreGlance\(/);
  assert.match(chip, /to=["']\/profile["']/);
  assert.match(chip, /placement\?: "mark" \| "continue"/);
  assert.doesNotMatch(chip, /bg-transparent/);
  assert.doesNotMatch(chip, /weeklyScore|monthlyScore/);

  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(home, /data-resume-fill=\{resumeFill\}/);
  assert.match(css, /\.daily-score-chip--continue \{[^}]*background: var\(--color-paper\);[^}]*color: var\(--color-ink\);/s);
  assert.match(
    css,
    /\.cell-resume\[data-resume-fill="paper"\] \.daily-score-chip--continue,\s*\.cell-resume\[data-resume-fill="yellow"\] \.daily-score-chip--continue \{\s*background: var\(--color-ink\);\s*color: var\(--color-paper\);/s,
  );
  assert.doesNotMatch(home, /weeklyScore|monthlyScore|Featured/);
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
  assert.equal(windows.daily.kind, "reading");
  assert.ok(windows.daily.total > 0);
  assert.ok(windows.weekly.total > 0);
  assert.ok(windows.monthly.total > 0);
  assert.equal(windows.daily.label === "Full", false);
});
