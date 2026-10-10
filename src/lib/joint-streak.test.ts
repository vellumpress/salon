import assert from "node:assert/strict";
import test from "node:test";
import { addJointDay, jointStreakCount, jointStreakLabel } from "./joint-streak.ts";

test("a shared day starts a joint streak and a miss breaks it", () => {
  const days = addJointDay(addJointDay([], "2026-10-08"), "2026-10-09");
  assert.deepEqual(days, ["2026-10-08", "2026-10-09"]);
  assert.equal(addJointDay(days, "2026-10-09").length, 2);
  assert.equal(jointStreakCount(days, "2026-10-09"), 2);
  assert.equal(jointStreakCount(days, "2026-10-10"), 2);
  assert.equal(jointStreakCount(days, "2026-10-11"), 0);
  assert.equal(jointStreakCount([], "2026-10-10"), 0);
  assert.equal(jointStreakLabel(0), "");
  assert.equal(jointStreakLabel(1), "Together · 1 day");
  assert.equal(jointStreakLabel(2), "Together · 2 days");
});
