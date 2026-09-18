import type { Fill } from "./mondrian";

export const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{10,24}$/;
export const CLUB_ID_RE = /^[a-z0-9]{4,16}$/;

const FILL_SET = new Set<string>(["red", "blue", "yellow", "forest", "paper", "ink"]);

export function asClubFill(value: string | null | undefined): Fill {
  if (value && FILL_SET.has(value)) return value as Fill;
  return "paper";
}

export function asInviteToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const token = value.trim();
  if (!INVITE_TOKEN_RE.test(token)) return undefined;
  return token;
}

export function asClubId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim().toLowerCase();
  if (!CLUB_ID_RE.test(id)) return undefined;
  return id;
}

export function clubInvitePath(token: string) {
  return `/club/invite/${encodeURIComponent(token)}`;
}

export function clubJoinPath(token: string) {
  return `/together?join=${encodeURIComponent(token)}`;
}

export function clubInviteUrl(token: string) {
  if (typeof window === "undefined") return clubInvitePath(token);
  return `${window.location.origin}${clubInvitePath(token)}`;
}

/** Scheduled sits are authored and shown in Eastern Time. */
export const CLUB_TZ = "America/New_York";

export type EtParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function calendarDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return calendarDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function zonedParts(date: Date, timeZone = CLUB_TZ): EtParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const hourRaw = map.hour === "24" ? "0" : (map.hour ?? "0");
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(hourRaw),
    minute: Number(map.minute),
  };
}

/** Interpret a wall-clock date + time as America/New_York and return UTC ISO. */
export function etWallToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || hour == null || minute == null) return null;
  if (hour > 23 || minute > 59) return null;

  const want = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utc = want;
  for (let i = 0; i < 4; i += 1) {
    const got = zonedParts(new Date(utc));
    const gotUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, 0);
    utc += want - gotUtc;
  }
  const check = zonedParts(new Date(utc));
  if (
    check.year !== year ||
    check.month !== month ||
    check.day !== day ||
    check.hour !== hour ||
    check.minute !== minute
  ) {
    return null;
  }
  return new Date(utc).toISOString();
}

export function defaultSitClock(now = new Date()) {
  const parts = zonedParts(now);
  const today = calendarDate(parts.year, parts.month, parts.day);
  return { date: addCalendarDays(today, 1), time: "19:00" };
}

/** Short Eastern listing: "Sun, Sep 21 · 7:00 PM ET". */
export function formatClubWhen(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const start = date.getTime();
  const age = now.getTime() - start;
  if (age >= 0 && age < 8 * 60 * 60 * 1000) return `${when} ET · sitting`;
  if (start > now.getTime()) return `${when} ET`;
  return `${when} ET`;
}

export function formatClubWhenLong(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function isIsoInWindow(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const min = now.getTime() - 24 * 60 * 60 * 1000 * 7;
  const max = now.getTime() + 366 * 24 * 60 * 60 * 1000;
  return date.getTime() >= min && date.getTime() <= max;
}
