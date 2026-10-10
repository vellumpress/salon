import { dayKey } from "./day-key.ts";

/** One banked freeze. A missed day can borrow it once. */
export const FREEZE_CAP = 1;

export type StreakFreeze = {
  banked: number;
  /** Local day key the freeze stood in for, if it has been used. */
  usedOn: string | null;
};

export type ResolvedStreak = StreakFreeze & {
  streak: number;
  /** True when this evaluation spent a banked freeze. */
  spent: boolean;
};

function shiftDay(key: string, delta: number) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  const next = new Date(year, month - 1, day + delta, 12, 0, 0, 0);
  return dayKey(next.getTime());
}

function walk(hasDay: (key: string) => boolean, now: number) {
  const today = dayKey(now);
  const yesterday = shiftDay(today, -1);
  let cursor: string | null = hasDay(today) ? today : hasDay(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (cursor && hasDay(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/**
 * A freeze covers exactly one finished gap (yesterday) when the day before
 * that was a real sit. Today is never treated as missed. A new freeze is
 * banked on a later sitting once the run is seven days, not in the same
 * breath that spent the last one.
 */
export function resolveStreak(input: {
  hasDay: (key: string) => boolean;
  now: number;
  banked: number;
  usedOn: string | null;
}): ResolvedStreak {
  let banked = input.banked > 0 ? 1 : 0;
  let usedOn = input.usedOn;
  let spent = false;
  const today = dayKey(input.now);
  const yesterday = shiftDay(today, -1);
  const before = shiftDay(today, -2);

  if (!input.hasDay(yesterday) && yesterday !== usedOn && banked > 0 && input.hasDay(before)) {
    usedOn = yesterday;
    banked = 0;
    spent = true;
  }

  const present = (key: string) => input.hasDay(key) || key === usedOn;
  const streak = walk(present, input.now);

  if (!spent && banked === 0 && input.hasDay(today) && streak >= 7) {
    banked = 1;
  }

  return { streak, banked, usedOn, spent };
}
