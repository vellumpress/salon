import assert from "node:assert/strict";
import test from "node:test";
import type { HostedSit } from "./hosted-sit.ts";
import {
  activityTimeline,
  deriveReadingStats,
  formatMinutes,
  hostedSitsAttended,
  readinessFrom,
  ritualLanesUsed,
  streakLine,
  timeOfDayPattern,
  weekMinutesSeries,
} from "./reading-stats.ts";
import { dayKey } from "./day-key.ts";
import type { SitSession, WorkProgress } from "./store.ts";
import type { TogetherKeep } from "./together-keep.ts";

function progress(partial: Partial<WorkProgress>): WorkProgress {
  return {
    breathIndex: 0,
    lastOpenedAt: 0,
    sittingStartedAt: null,
    keywords: {},
    kept: [],
    completedAt: null,
    entered: false,
    ...partial,
  };
}

function hosted(partial: Partial<HostedSit>): HostedSit {
  return {
    id: "sit-1",
    hostHandle: "ada",
    hostName: "Ada",
    workId: "passing",
    workTitle: "Passing",
    author: "Nella Larsen",
    minutes: 20,
    createdAt: 1,
    invitees: [],
    rsvps: [],
    keeps: [],
    endedAt: null,
    ...partial,
  };
}

const NOW = Date.parse("2026-09-16T14:00:00");

test("empty stats invite a first sit", () => {
  const reading = deriveReadingStats({
    progress: {},
    favorites: [],
    now: NOW,
  });
  assert.equal(reading.hasSignal, false);
  assert.equal(reading.readiness.score, 0);
  assert.equal(reading.readiness.label, "Unopened");
  assert.match(reading.readiness.line, /Sit once/);
  assert.equal(reading.weekDays.length, 7);
  assert.equal(reading.activity.length, 0);
  assert.equal(reading.rings.length, 5);
  assert.equal(reading.radar.length, 6);
  assert.equal(reading.sits, 0);
});

test("recorded sits drive today, week, and rings", () => {
  const today = dayKey(NOW);
  const yesterday = dayKey(NOW - 24 * 60 * 60 * 1000);
  const reading = deriveReadingStats({
    progress: {
      passing: progress({
        entered: true,
        breathIndex: 12,
        kept: ["a", "b"],
        lastOpenedAt: NOW,
      }),
    },
    favorites: ["passing"],
    readingMinutesByDay: { [today]: 18, [yesterday]: 12 },
    sitHistory: [
      { workId: "passing", minutes: 18, endedAt: NOW - 60_000 },
      { workId: "passing", minutes: 12, endedAt: NOW - 24 * 60 * 60 * 1000 },
    ],
    sittingMinutes: 20,
    now: NOW,
  });
  assert.equal(reading.hasSignal, true);
  assert.equal(reading.minutesToday, 18);
  assert.equal(reading.minutesWeek, 30);
  assert.equal(reading.kept, 2);
  assert.equal(reading.favorites, 1);
  assert.equal(reading.breaths, 12);
  assert.equal(reading.inProgress, 1);
  assert.ok(reading.readiness.score > 0);
  assert.ok(reading.readiness.score <= 100);
  assert.equal(reading.rings[0]?.value, 18);
  assert.equal(reading.rings[0]?.max, 20);
  assert.equal(reading.sits, 2);
  assert.equal(reading.radar[0]?.id, "today");
  assert.equal(reading.radar[0]?.score, 90);
  assert.equal(reading.radar[5]?.id, "sits");
  assert.equal(reading.radar[5]?.value, 2);
});

test("readiness labels stay literary", () => {
  assert.equal(
    readinessFrom({
      hasSignal: false,
      minutesToday: 0,
      minutesWeek: 0,
      sittingMinutes: 20,
      daysPresent: 0,
      kept: 0,
      opened: 0,
      completed: 0,
    }).label,
    "Unopened",
  );
  const present = readinessFrom({
    hasSignal: true,
    minutesToday: 20,
    minutesWeek: 80,
    sittingMinutes: 20,
    daysPresent: 5,
    kept: 3,
    opened: 2,
    completed: 1,
  });
  assert.ok(["Present", "Settled", "Deep"].includes(present.label));
  assert.ok(present.score >= 50);
});

test("ritual lanes and time of day come from real works and sit hours", () => {
  const lanes = ritualLanesUsed(["passing", "dalloway"]);
  assert.ok(lanes.some((row) => row.id === "bite-sized"));
  assert.ok(lanes.some((row) => row.id === "on-a-walk"));

  const evening: SitSession[] = [
    { workId: "passing", minutes: 12, endedAt: Date.parse("2026-09-16T22:15:00") },
  ];
  const hours = timeOfDayPattern(evening, lanes);
  assert.equal(hours[0]?.id, "before-sleep");
});

test("week series is seven local days ending now", () => {
  const today = dayKey(NOW);
  const days = weekMinutesSeries({ [today]: 9 }, NOW);
  assert.equal(days.length, 7);
  assert.equal(days[6]?.key, today);
  assert.equal(days[6]?.minutes, 9);
  assert.equal(
    days.slice(0, 6).every((row) => row.minutes === 0),
    true,
  );
});

test("activity timeline mixes sits, together-keeps, hosted sits, and finishes", () => {
  const keep: TogetherKeep = {
    id: "tk-1",
    workId: "passing",
    workTitle: "Passing",
    author: "Nella Larsen",
    theirs: {
      handle: "jules",
      name: "Jules",
      breathId: "b1",
      line: "A line",
      at: NOW - 4000,
    },
    yours: {
      handle: "mina",
      name: "Mina",
      breathId: "b2",
      line: "Another",
      at: NOW - 3000,
    },
    createdAt: NOW - 2000,
  };
  const items = activityTimeline({
    sitHistory: [{ workId: "dalloway", minutes: 20, endedAt: NOW - 1000 }],
    togetherKeeps: [keep],
    hostedSits: [hosted({ createdAt: NOW - 5000, endedAt: NOW - 4000, hostHandle: "mina" })],
    progress: {
      gatsby: progress({ entered: true, completedAt: NOW - 8000, lastOpenedAt: NOW - 8000 }),
    },
    handle: "mina",
  });
  assert.equal(items[0]?.kind, "sit");
  assert.ok(items.some((row) => row.kind === "together"));
  assert.ok(items.some((row) => row.kind === "hosted" && row.detail === "Hosted a sit"));
  assert.ok(items.some((row) => row.kind === "finished" && row.title === "The Great Gatsby"));
});

test("hosted sits attended counts host or yes, not later", () => {
  const sits = [
    hosted({ id: "a", hostHandle: "mina" }),
    hosted({
      id: "b",
      hostHandle: "ada",
      rsvps: [{ handle: "mina", name: "Mina", status: "yes", at: 1 }],
    }),
    hosted({
      id: "c",
      hostHandle: "ada",
      rsvps: [{ handle: "mina", name: "Mina", status: "later", at: 1 }],
    }),
  ];
  assert.equal(hostedSitsAttended(sits, "mina"), 2);
  assert.equal(hostedSitsAttended(sits, ""), 3);
});

test("streak copy stays optional and unashamed", () => {
  assert.match(streakLine(0), /sit can start/);
  assert.match(streakLine(1), /Tomorrow can join/);
  assert.match(streakLine(4), /quiet run of 4/);
});

test("formatMinutes stays compact", () => {
  assert.equal(formatMinutes(0), "0");
  assert.equal(formatMinutes(18), "18");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatMinutes(75), "1h 15m");
});
