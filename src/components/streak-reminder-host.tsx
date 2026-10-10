import { useEffect } from "react";
import { dayKey } from "@/lib/day-key";
import { armStreakReminder, reminderBody } from "@/lib/streak-notify";
import { useTbr } from "@/lib/store";

/** Keeps an opted-in nudge alive on whatever page is open. */
export function StreakReminderHost() {
  const reminder = useTbr((s) => s.streakReminder);
  const minutes = useTbr((s) => s.readingMinutesByDay);
  const sits = useTbr((s) => s.sitsByDay);

  useEffect(() => {
    const today = dayKey(Date.now());
    const readToday = (minutes?.[today] ?? 0) > 0 || (sits?.[today] ?? 0) > 0;
    return armStreakReminder({
      reminder,
      readToday,
      body: reminderBody(0),
    });
  }, [reminder, minutes, sits]);

  return null;
}
