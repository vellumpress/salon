import { dayKey } from "./day-key.ts";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function addJointDay(days: readonly string[] | null | undefined, day: string): string[] {
  const kept = (days ?? []).filter((item) => DAY.test(item));
  if (!DAY.test(day) || kept.includes(day)) return kept;
  return [...kept, day].sort().slice(-60);
}

function previousDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const cursor = new Date(year, (month ?? 1) - 1, date ?? 1);
  cursor.setDate(cursor.getDate() - 1);
  return dayKey(cursor.getTime());
}

/**
 * Days you and someone else were in the same room.
 * The run counts through today, or through yesterday if today has not happened yet.
 */
export function jointStreakCount(days: readonly string[] | null | undefined, today: string): number {
  if (!DAY.test(today)) return 0;
  const set = new Set((days ?? []).filter((item) => DAY.test(item)));
  let cursor = set.has(today) ? today : previousDay(today);
  if (!set.has(cursor)) return 0;
  let count = 0;
  while (set.has(cursor) && count < 400) {
    count += 1;
    cursor = previousDay(cursor);
  }
  return count;
}

export function jointStreakLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "Together · 1 day";
  return `Together · ${count} days`;
}
