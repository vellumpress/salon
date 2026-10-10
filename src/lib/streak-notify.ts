import { dayKey } from "./day-key.ts";

export const NUDGE_STORAGE_KEY = "tbr-streak-nudge";
export const PUSH_STORAGE_KEY = "tbr-push-subscription";
const NUDGE_ID = 7101;

export type ReminderClock = { enabled: boolean; hour: number; minute: number };

type LocalNote = {
  requestPermissions: () => Promise<{ display?: string }>;
  schedule: (options: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      schedule: { on: { hour: number; minute: number }; repeats?: boolean; allowWhileIdle?: boolean };
    }>;
  }) => Promise<unknown>;
  cancel: (options: { notifications: Array<{ id: number }> }) => Promise<unknown>;
};

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  Plugins?: { LocalNotifications?: LocalNote };
};

function bridge(): CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  const cap = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
  return cap ?? null;
}

export function reminderBody(streak: number) {
  if (streak >= 2) return `A quiet run of ${streak} days. The page is here, if you like.`;
  if (streak === 1) return "Yesterday sat with you. The page is here, if you like.";
  return "A sitting is waiting, if you like.";
}

export function parseClock(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function clockValue(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Due once the chosen minute has passed today, and not after a sit today. */
export function reminderDue(input: {
  now: number;
  hour: number;
  minute: number;
  firedDay: string | null;
  readToday: boolean;
}) {
  if (input.readToday) return false;
  const today = dayKey(input.now);
  if (input.firedDay === today) return false;
  const date = new Date(input.now);
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins >= input.hour * 60 + input.minute;
}

export function readFiredDay() {
  try {
    return localStorage.getItem(NUDGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markFired(now = Date.now()) {
  try {
    localStorage.setItem(NUDGE_STORAGE_KEY, dayKey(now));
  } catch {
    /* private mode */
  }
}

function vapidKey(): string {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    return (env?.VITE_VAPID_PUBLIC_KEY ?? "").trim();
  } catch {
    return "";
  }
}

function urlBase64ToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function subscribeWebPush() {
  const key = vapidKey();
  if (!key || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const push = (window as Window & { PushManager?: unknown }).PushManager;
  if (!push) return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(key),
    }));
  try {
    localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify(sub.toJSON()));
  } catch {
    /* ignore */
  }
  return sub;
}

/** iOS path: Capacitor local notifications. No-op in the browser. */
export async function scheduleCapacitorReminder(clock: ReminderClock, body: string) {
  const cap = bridge();
  const notes = cap?.isNativePlatform?.() ? cap.Plugins?.LocalNotifications : undefined;
  if (!notes) return { scheduled: false as const, reason: "web" as const };
  const perm = await notes.requestPermissions();
  if (perm.display === "denied") return { scheduled: false as const, reason: "denied" as const };
  await notes.cancel({ notifications: [{ id: NUDGE_ID }] });
  if (!clock.enabled) return { scheduled: false as const, reason: "off" as const };
  await notes.schedule({
    notifications: [
      {
        id: NUDGE_ID,
        title: "tbr",
        body,
        schedule: {
          on: { hour: clock.hour, minute: clock.minute },
          repeats: true,
          allowWhileIdle: true,
        },
      },
    ],
  });
  return { scheduled: true as const, reason: "capacitor" as const };
}

export async function showStreakNotification(body: string) {
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "show-reminder",
      title: "tbr",
      body,
      url: "/salon/",
    });
    return;
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("tbr", { body });
  }
}

export async function enableReminderPermission() {
  if (typeof Notification === "undefined") return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  const next = await Notification.requestPermission();
  if (next === "granted" || next === "denied" || next === "default") return next;
  return "default" as const;
}

export function armStreakReminder(input: {
  reminder: ReminderClock | null;
  readToday: boolean;
  body: string;
}) {
  if (typeof window === "undefined" || !input.reminder?.enabled) return () => undefined;
  const tick = () => {
    if (
      !reminderDue({
        now: Date.now(),
        hour: input.reminder!.hour,
        minute: input.reminder!.minute,
        firedDay: readFiredDay(),
        readToday: input.readToday,
      })
    ) {
      return;
    }
    markFired();
    void showStreakNotification(input.body);
  };
  tick();
  const id = window.setInterval(tick, 30_000);
  const onVis = () => {
    if (!document.hidden) tick();
  };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVis);
  };
}
