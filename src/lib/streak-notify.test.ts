import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dayKey } from "./day-key.ts";
import { parseClock, reminderDue } from "./streak-notify.ts";

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
  assert.match(care, /Nudges aren't on for this phone yet\./);
  assert.match(care, /A nudge at the hour you pick\./);
});

test("clock values stay on a day", () => {
  assert.deepEqual(parseClock("21:05"), { hour: 21, minute: 5 });
  assert.equal(parseClock("24:00"), null);
});
