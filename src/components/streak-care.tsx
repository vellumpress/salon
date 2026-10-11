import { useState } from "react";
import {
  clockValue,
  enableReminderPermission,
  parseClock,
  reminderLine,
  RITUAL_NAME_MAX,
  ritualName,
  scheduleCapacitorReminder,
  showStreakNotification,
  subscribeWebPush,
  type ReminderClock,
} from "@/lib/streak-notify";
import { useTbr } from "@/lib/store";

export function StreakCare() {
  const reminder = useTbr((s) => s.streakReminder);
  const setStreakReminder = useTbr((s) => s.setStreakReminder);
  const [clock, setClock] = useState(clockValue(reminder?.hour ?? 21, reminder?.minute ?? 0));
  const [name, setName] = useState(ritualName(reminder?.name));
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);

  function parts() {
    return parseClock(clock) ?? { hour: 21, minute: 0 };
  }

  function draft(enabled: boolean): ReminderClock {
    const { hour, minute } = parts();
    return { enabled, hour, minute, name: ritualName(name) };
  }

  function rememberName() {
    const clean = ritualName(name);
    setName(clean);
    if (!reminder?.enabled) return;
    const { hour, minute } = parts();
    setStreakReminder({ enabled: true, hour, minute, name: clean });
  }

  async function save(enabled: boolean) {
    const next = draft(enabled);
    setName(next.name ?? ritualName(name));
    if (enabled) {
      const permission = await enableReminderPermission();
      const native = await scheduleCapacitorReminder(next, reminderLine());
      let push = false;
      if (permission === "granted") {
        try {
          push = Boolean(await subscribeWebPush());
        } catch {
          push = false;
        }
      }
      if (permission === "denied" && !native.scheduled) {
        setNote("Reminders are off in the browser. Your time is saved for the app.");
      } else if (native.scheduled) {
        setNote("We'll remind you then, even if you're away.");
      } else if (push) {
        setNote("Reminders aren't ready yet.");
      } else {
        setNote("We'll remind you then, while you're here.");
      }
    } else {
      await scheduleCapacitorReminder({ ...next, enabled: false }, reminderLine());
      setNote("");
    }
    setStreakReminder(enabled ? next : null);
  }

  async function tryIt() {
    const title = ritualName(name);
    const body = reminderLine();
    setName(title);
    setPreview({ title, body });
    await showStreakNotification(title, body);
  }

  return (
    <section className="cell-nudge bg-paper text-ink">
      <p className="border-b border-ink px-4 py-3 type-kicker">Your ritual</p>
      <div className="px-4 py-4">
        <p className="type-card">Make reading a ritual.</p>
        <p className="mt-1 max-w-md font-sans text-sm text-ink/70">
          Pick a time and we'll remind you. Miss a day? We'll save your streak once.
        </p>
        <div className="mt-4 grid gap-px bg-ink">
          <label className="flex h-12 items-center bg-paper px-3">
            <span className="sr-only">Ritual name</span>
            <input
              type="text"
              value={name}
              maxLength={RITUAL_NAME_MAX}
              onChange={(event) => setName(event.target.value.slice(0, RITUAL_NAME_MAX))}
              onBlur={rememberName}
              className="min-w-0 flex-1 border-0 bg-transparent font-sans text-base text-ink focus-visible:outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-px bg-ink">
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
              onClick={() => void tryIt()}
              className="h-12 bg-yellow px-4 font-sans text-sm text-ink"
            >
              Try it
            </button>
          </div>
        </div>
        {preview ? (
          <div className="mt-4 border border-ink px-3 py-3">
            <p className="font-sans text-sm text-ink">{preview.title}</p>
            <p className="mt-1 font-sans text-sm text-ink/70">{preview.body}</p>
          </div>
        ) : null}
        {note ? <p className="mt-3 font-sans text-sm text-ink/70">{note}</p> : null}
      </div>
    </section>
  );
}
