import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dayKey } from "./day-key.ts";
import {
  parseClock,
  reminderDue,
  reminderLine,
  ritualName,
  TBR_LINES,
} from "./streak-notify.ts";

test("a nudge is due after the chosen minute, once, unless today was read", () => {
  const now = new Date(2026, 9, 4, 21, 5, 0, 0).getTime();
  const today = dayKey(now);
  assert.equal(
    reminderDue({ now, hour: 21, minute: 0, firedDay: null, readToday: false }),
    true,
  );
  assert.equal(
    reminderDue({ now, hour: 21, minute: 30, firedDay: null, readToday: false }),
    false,
  );
  assert.equal(
    reminderDue({ now, hour: 21, minute: 0, firedDay: today, readToday: false }),
    false,
  );
  assert.equal(
    reminderDue({ now, hour: 21, minute: 0, firedDay: null, readToday: true }),
    false,
  );
});

test("the nudge lives on Rituals", () => {
  const rituals = readFileSync(new URL("../routes/rituals.tsx", import.meta.url), "utf8");
  const you = readFileSync(new URL("../routes/profile.index.tsx", import.meta.url), "utf8");
  const care = readFileSync(new URL("../components/streak-care.tsx", import.meta.url), "utf8");
  assert.match(rituals, /<StreakCare \/>/);
  assert.doesNotMatch(you, /StreakCare/);
  assert.match(care, /Your ritual/);
  assert.match(care, /Make reading a ritual\./);
  assert.match(care, /Pick a time and we'll remind you\. Miss a day\? We'll save your streak once\./);
  assert.match(care, /Try it/);
  assert.doesNotMatch(care, /freeze|banked|opt in|this phone/i);
});

test("a ritual name rides with the hour", () => {
  assert.equal(ritualName("  Sunday pages  "), "Sunday pages");
  assert.equal(ritualName(""), "Night reading");
  assert.equal(ritualName(null), "Night reading");
  assert.equal(ritualName("x".repeat(40)).length, 24);
  const care = readFileSync(new URL("../components/streak-care.tsx", import.meta.url), "utf8");
  const store = readFileSync(new URL("./store.ts", import.meta.url), "utf8");
  assert.match(care, /Ritual name/);
  assert.match(care, /maxLength=\{RITUAL_NAME_MAX\}/);
  assert.match(store, /streakReminder: ReminderClock \| null/);
});

test("the reminder plays off tbr", () => {
  const seen = new Set<string>();
  for (let i = 0; i < TBR_LINES.length; i += 1) {
    const line = reminderLine(Date.UTC(2026, 0, 1 + i, 12));
    seen.add(line);
    assert.match(line, /tbr/);
    assert.doesNotMatch(line, /to be read/i);
    assert.doesNotMatch(line, /TBR/);
  }
  assert.equal(seen.size, TBR_LINES.length);
  const notify = readFileSync(new URL("./streak-notify.ts", import.meta.url), "utf8");
  assert.match(notify, /title: ritualName\(clock\.name\)/);
  assert.match(notify, /showStreakNotification\(ritualName\(input\.reminder\?\.name\), reminderLine\(\)\)/);
});

test("clock values stay on a day", () => {
  assert.deepEqual(parseClock("21:05"), { hour: 21, minute: 5 });
  assert.equal(parseClock("24:00"), null);
});
