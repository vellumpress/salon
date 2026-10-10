import { useState } from "react";
import {
  clockValue,
  enableReminderPermission,
  reminderBody,
  scheduleCapacitorReminder,
  showStreakNotification,
  subscribeWebPush,
} from "@/lib/streak-notify";
import { useTbr } from "@/lib/store";

export function StreakCare({ streak }: { streak: number }) {
  const reminder = useTbr((s) => s.streakReminder);
  const setStreakReminder = useTbr((s) => s.setStreakReminder);
  const [clock, setClock] = useState(clockValue(reminder?.hour ?? 21, reminder?.minute ?? 0));
  const [note, setNote] = useState("");

  async function save(enabled: boolean) {
    const match = /^(\d{2}):(\d{2})$/.exec(clock);
    const hour = match ? Number(match[1]) : 21;
    const minute = match ? Number(match[2]) : 0;
    if (hour > 23 || minute > 59) return;
    const next = { enabled, hour, minute };
    if (enabled) {
      const permission = await enableReminderPermission();
      const native = await scheduleCapacitorReminder(next, reminderBody(streak));
      let push = false;
      if (permission === "granted") {
        try {
          push = Boolean(await subscribeWebPush());
        } catch {
          push = false;
        }
      }
      if (permission === "denied" && !native.scheduled) {
        setNote("Notifications are off for this browser. The hour is saved for the iOS app.");
      } else if (native.scheduled) {
        setNote("This phone will nudge you at that hour, even if tbr is closed.");
      } else if (push) {
        setNote("This install can take a nudge. A sender still has to be turned on.");
      } else {
        setNote("While tbr is open, it will nudge you at that hour.");
      }
    } else {
      await scheduleCapacitorReminder({ ...next, enabled: false }, reminderBody(streak));
      setNote("");
    }
    setStreakReminder(enabled ? next : null);
  }

  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Return</p>
      <div className="border-b border-ink px-4 py-4">
        <p className="font-serif text-lg">A nudge at the hour you pick.</p>
        <p className="mt-1 max-w-md font-sans text-sm text-ink/70">
          Opt in. One freeze is banked for a missed day. The hour stays on this phone.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-px bg-ink">
          <label className="flex h-12 min-w-0 flex-1 items-center bg-paper px-3">
            <span className="sr-only">Reminder time</span>
            <input
              type="time"
              value={clock}
              onChange={(event) => setClock(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent font-sans text-base text-ink focus-visible:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void save(!reminder?.enabled)}
            className="h-12 bg-ink px-4 font-sans text-sm text-paper"
          >
            {reminder?.enabled ? "On" : "Remind me"}
          </button>
          <button
            type="button"
            onClick={() => void showStreakNotification(reminderBody(streak))}
            className="h-12 bg-yellow px-4 font-sans text-sm text-ink"
          >
            Try the nudge
          </button>
        </div>
        {note ? <p className="mt-3 font-sans text-sm text-ink/70">{note}</p> : null}
      </div>
    </section>
  );
}
