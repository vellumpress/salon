/**
 * Reading score — six contributors, each 0–100 against the reader's own
 * baseline. Weights: Immersion 35, Rhythm 20, Return 15, Range 10,
 * Restfulness 10, Connection 10.
 *
 * Any reading is a reading day and gets a score. A day with no minutes is
 * rest: no number, and the hourglass stays empty. Missed days are a small
 * dip in Rhythm, never a streak reset. Pace and usual-sit baselines still
 * wait for a few substantial days so one short visit does not rewrite them.
 *
 * Contributors that existing ledgers cannot support are "still learning"
 * and drop out; the remaining weights scale so they still sum to 100%.
 * Connection is opt-in. Restfulness only applies on evenings the reader reads.
 * Nothing here is invented to fill a gap.
 */

import { dayKey } from "./day-key.ts";
import { isDeviceImport } from "./import/private.ts";

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;

export const READING_DAY_MINUTES = 3;
export const CONTRIBUTOR_WEIGHTS = {
  immersion: 35,
  rhythm: 20,
  return: 15,
  range: 10,
  restfulness: 10,
  connection: 10,
} as const;

export const CONTRIBUTOR_IDS = [
  "immersion",
  "rhythm",
  "return",
  "range",
  "restfulness",
  "connection",
] as const;

export type ContributorId = (typeof CONTRIBUTOR_IDS)[number];
export type ContributorStatus = "scored" | "learning" | "excluded";
export type DayKind = "reading" | "rest" | "quick-visit";

export type ContributorResult = {
  id: ContributorId;
  /** Rounded 0–100 when scored. */
  value: number | null;
  /** Unrounded value used in the daily weighting. */
  raw: number | null;
  status: ContributorStatus;
  note: string;
};

export type DailyScore = {
  total: number;
  kind: DayKind;
  label: string;
  line: string;
  /** True only on a scored reading day. Homepage glance stays a dash otherwise. */
  hasSignal: boolean;
  contributors: ContributorResult[];
  /** Today minus the median of recent reading-day scores. Null while learning. */
  versusUsual: number | null;
  learningNote: string | null;
  minutes: number;
  plausibleMinutes: number;
  usualMinutes: number | null;
  skimmed: boolean;
  /** False until four earlier reading days have a pace. */
  paceKnown: boolean;
};

export type TrendDay = {
  key: string;
  label: string;
  kind: DayKind | "paused";
  score: number | null;
  minutes: number;
};

export type WindowScore = {
  total: number;
  label: string;
  detail: string;
};

export type WeekView = {
  score: number | null;
  readingDays: number;
  /** "4–5" from the previous eight weeks. Null while rhythm is learning. */
  usualDays: string | null;
  /** Middle of recent reading-day scores, for the shaded band. */
  usualBand: { low: number; high: number } | null;
  days: TrendDay[];
  contributors: ContributorResult[];
  detail: string;
};

export type MonthView = {
  score: number | null;
  versusPrior: number | null;
  line: string;
  contributors: ContributorResult[];
  detail: string;
};

export type YearView = {
  books: number;
  hours: number;
  lines: number;
  countries: number;
  forms: number;
  months: { key: string; label: string; score: number | null }[];
};

export type InsightCard = {
  id: string;
  kicker: string;
  title: string;
  body: string;
};

export type ReadingModel = {
  daily: DailyScore;
  week: WeekView;
  month: MonthView;
  year: YearView;
  insight: InsightCard | null;
  paused: boolean;
};

export type SitPoint = {
  workId: string;
  minutes: number;
  endedAt: number;
};

export type WorkSnapshot = {
  id: string;
  title?: string;
  form?: string | null;
  country?: string | null;
  year?: number | null;
  /** 0–1 of the book, when the length is known. */
  progress?: number | null;
  finishedAt?: number | null;
};

export type ReadingScoreInput = {
  ledgers: DayLedgers;
  now?: number;
  sittingMinutes?: number;
  daylight?: boolean;
  sits?: SitPoint[];
  works?: WorkSnapshot[];
  connection?: {
    optIn: boolean;
    /** Timestamps of shared sessions (club, hosted, read-together). */
    sessions?: number[];
    /** Timestamps of lines kept together. */
    keeps?: number[];
  };
  ignoredDays?: string[];
  dismissedInsights?: string[];
  lastInsight?: { id: string; day: string } | null;
  together?: { handle: string; workTitle: string; at: number } | null;
  /** When set, the score is frozen at this instant. */
  pausedAt?: number | null;
};

export type DayLedgers = {
  readingMinutesByDay?: Record<string, number>;
  advancesByDay?: Record<string, number>;
  sceneCrossesByDay?: Record<string, number>;
  keepsByDay?: Record<string, number>;
  worksTouchedByDay?: Record<string, string[]>;
  hostOpensByDay?: Record<string, number>;
  sitsByDay?: Record<string, number>;
  clubTouchesByDay?: Record<string, number>;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function clamp(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function noon(ts: number): Date {
  const d = new Date(ts);
  d.setHours(12, 0, 0, 0);
  return d;
}

function endOfKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999).getTime();
}

function calendarDaysEnding(endTs: number, count: number, skip: Set<string>): string[] {
  const out: string[] = [];
  const cursor = noon(endTs);
  let guard = 0;
  while (out.length < count && guard < 900) {
    const key = dayKey(cursor.getTime());
    if (!skip.has(key)) out.push(key);
    cursor.setDate(cursor.getDate() - 1);
    guard += 1;
  }
  return out.reverse();
}

function lastCalendarDays(endTs: number, count: number): string[] {
  const out: string[] = [];
  const cursor = noon(endTs);
  for (let i = 0; i < count; i++) {
    out.push(dayKey(cursor.getTime()));
    cursor.setDate(cursor.getDate() - 1);
  }
  return out.reverse();
}

function minutesOf(ledgers: DayLedgers, key: string): number {
  const raw = ledgers.readingMinutesByDay?.[key] ?? 0;
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

function advancesOf(ledgers: DayLedgers, key: string): number {
  return Math.max(0, Math.round(ledgers.advancesByDay?.[key] ?? 0) || 0);
}

function firstReadingKey(ledgers: DayLedgers, skip: Set<string>): string | null {
  let first: string | null = null;
  for (const [key, minutes] of Object.entries(ledgers.readingMinutesByDay ?? {})) {
    if (skip.has(key) || !(minutes >= READING_DAY_MINUTES)) continue;
    if (!first || key < first) first = key;
  }
  return first;
}

function priorReadingMinutes(ledgers: DayLedgers, beforeKey: string, skip: Set<string>, limit = 28): number[] {
  const found: number[] = [];
  const cursor = noon(endOfKey(beforeKey));
  cursor.setDate(cursor.getDate() - 1);
  let guard = 0;
  while (found.length < limit && guard < 900) {
    const key = dayKey(cursor.getTime());
    if (!skip.has(key)) {
      const minutes = minutesOf(ledgers, key);
      if (minutes >= READING_DAY_MINUTES) found.push(minutes);
    }
    cursor.setDate(cursor.getDate() - 1);
    guard += 1;
  }
  return found;
}

/** Median seconds per breath on prior reading days. Null until four samples. */
function usualPaceSec(ledgers: DayLedgers, beforeKey: string, skip: Set<string>): number | null {
  const samples: number[] = [];
  const cursor = noon(endOfKey(beforeKey));
  cursor.setDate(cursor.getDate() - 1);
  let guard = 0;
  while (samples.length < 28 && guard < 900) {
    const key = dayKey(cursor.getTime());
    if (!skip.has(key)) {
      const minutes = minutesOf(ledgers, key);
      const advances = advancesOf(ledgers, key);
      if (minutes >= READING_DAY_MINUTES && advances > 0) {
        samples.push((minutes * 60) / advances);
      }
    }
    cursor.setDate(cursor.getDate() - 1);
    guard += 1;
  }
  if (samples.length < 4) return null;
  return median(samples);
}

/**
 * Minutes that count toward Immersion. Breaths faster than twice the reader's
 * usual pace are scaled down. Without a pace baseline the raw minutes stand,
 * and the sheet says pace is still learning.
 */
export function plausibleMinutes(
  minutes: number,
  advances: number,
  paceSec: number | null,
): { minutes: number; skimmed: boolean } {
  if (!(minutes > 0)) return { minutes: 0, skimmed: false };
  if (!(advances > 0) || !(paceSec != null && paceSec > 0)) {
    return { minutes, skimmed: false };
  }
  const pace = (minutes * 60) / advances;
  const limit = paceSec / 2;
  if (pace >= limit) return { minutes, skimmed: false };
  return { minutes: minutes * (pace / limit), skimmed: true };
}

function usualMinutes(prior: number[], sittingMinutes: number): { usual: number; learning: boolean } {
  if (prior.length < 4) {
    return { usual: sittingMinutes > 0 ? sittingMinutes : 20, learning: true };
  }
  const floor = sittingMinutes > 0 && sittingMinutes <= 5 ? 5 : 8;
  return { usual: Math.max(floor, median(prior)), learning: false };
}

/** Positive minutes score. Zero stays rest. Length does not gate the day. */
function dayKind(raw: number): DayKind {
  if (!(raw > 0)) return "rest";
  return "reading";
}

type RhythmResult = {
  raw: number | null;
  status: ContributorStatus;
  rate: number | null;
  note: string;
};

function rhythmFor(focusTs: number, ledgers: DayLedgers, skip: Set<string>): RhythmResult {
  const window = calendarDaysEnding(focusTs, 14, skip);
  if (window.length === 0) {
    return { raw: null, status: "learning", rate: null, note: "Still learning." };
  }
  let num = 0;
  let den = 0;
  window.forEach((key, index) => {
    const age = window.length - 1 - index;
    const weight = 0.9 ** age;
    const kind = dayKind(minutesOf(ledgers, key));
    den += weight;
    if (kind === "reading") num += weight;
  });

  const oldest = window[0] ?? dayKey(focusTs);
  const priorCursor = noon(endOfKey(oldest));
  priorCursor.setDate(priorCursor.getDate() - 1);
  const prior = calendarDaysEnding(priorCursor.getTime(), 56, skip);
  const first = firstReadingKey(ledgers, skip);
  const eligibleKeys = first ? prior.filter((key) => key >= first) : [];
  let eligible = 0;
  let read = 0;
  for (const key of eligibleKeys) {
    const kind = dayKind(minutesOf(ledgers, key));
    eligible += 1;
    if (kind === "reading") read += 1;
  }
  if (read < 4 || eligible < 7 || !(den > 0)) {
    return {
      raw: null,
      status: "learning",
      rate: null,
      note: "Still learning — rhythm needs a few weeks of your own reading days.",
    };
  }
  const rate = read / eligible;
  if (!(rate > 0)) {
    return { raw: null, status: "learning", rate: null, note: "Still learning." };
  }
  const ratio = Math.min(1, num / (rate * den));
  return {
    raw: ratio * 100,
    status: "scored",
    rate,
    note: "Reading days over two weeks, set against your previous eight.",
  };
}

function minuteOfDay(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

function circDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 1440 - d);
}

/** Up to +10 when this sit lands within 90 minutes of the reader's usual time. */
function timeBonus(sits: SitPoint[], focusTs: number): number {
  const recent = sits
    .filter((sit) => sit.endedAt <= focusTs && sit.minutes >= READING_DAY_MINUTES)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, 24);
  if (recent.length < 4) return 0;
  const hours = recent.map((sit) => new Date(sit.endedAt).getHours());
  const counts = new Map<number, number>();
  for (const hour of hours) counts.set(hour, (counts.get(hour) ?? 0) + 1);
  let mode = 0;
  let modeCount = 0;
  for (const [hour, count] of counts) {
    if (count > modeCount) {
      mode = hour;
      modeCount = count;
    }
  }
  if (modeCount < 4) return 0;
  const target = mode * 60 + 30;
  const todayKey = dayKey(focusTs);
  const today = recent.find((sit) => dayKey(sit.endedAt) === todayKey);
  if (!today) return 0;
  return circDiff(minuteOfDay(today.endedAt), target) <= 90 ? 10 : 0;
}

function returnFor(sits: SitPoint[], focusTs: number): { raw: number | null; status: ContributorStatus; note: string; share: number | null } {
  const start = focusTs - 7 * MS_DAY;
  const recent = sits
    .filter((sit) => sit.endedAt <= focusTs && sit.endedAt >= start && sit.minutes > 0)
    .sort((a, b) => a.endedAt - b.endedAt);
  let opportunities = 0;
  let continued = 0;
  for (const sit of recent) {
    const prior = sits
      .filter((row) => row.workId === sit.workId && row.endedAt < sit.endedAt && row.minutes > 0)
      .sort((a, b) => b.endedAt - a.endedAt)[0];
    if (!prior) continue;
    opportunities += 1;
    if (sit.endedAt - prior.endedAt <= 72 * MS_HOUR) continued += 1;
  }
  if (opportunities === 0) {
    return {
      raw: null,
      status: "learning",
      share: null,
      note: "Still learning — continuity shows up once you come back to a book you already started.",
    };
  }
  return {
    raw: (continued / opportunities) * 100,
    status: "scored",
    share: continued / opportunities,
    note: "Coming back to the same book. Revisiting kept lines is still learning, so it isn’t in the number.",
  };
}

function listOrEmpty(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
}

function eraOf(year: number): string {
  if (year < 1500) return "to-1500";
  if (year < 1800) return "1500-1799";
  if (year < 1900) return "1800s";
  if (year < 2000) return "1900s";
  return "2000s";
}

function rangeFor(
  works: WorkSnapshot[],
  sits: SitPoint[],
  ledgers: DayLedgers,
  focusTs: number,
): { raw: number | null; status: ContributorStatus; note: string; route: "variety" | "commitment" | null } {
  const start = focusTs - 28 * MS_DAY;
  const minutesByWork = new Map<string, number>();
  const touched = new Set<string>();
  for (const sit of sits) {
    if (sit.endedAt > focusTs || sit.endedAt < start || !sit.workId) continue;
    touched.add(sit.workId);
    minutesByWork.set(sit.workId, (minutesByWork.get(sit.workId) ?? 0) + Math.max(0, sit.minutes));
  }
  const cursor = noon(focusTs);
  for (let i = 0; i < 28; i++) {
    const key = dayKey(cursor.getTime());
    for (const id of listOrEmpty(ledgers.worksTouchedByDay?.[key])) {
      if (id) touched.add(id);
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  const byId = new Map(works.map((work) => [work.id, work]));
  const meaningful = [...touched]
    .map((id) => byId.get(id))
    .filter((work): work is WorkSnapshot => Boolean(work))
    .filter((work) => (minutesByWork.get(work.id) ?? 0) >= 15);

  let variety: number | null = null;
  if (meaningful.length > 0) {
    const forms = new Set(meaningful.map((work) => work.form).filter(Boolean));
    const countries = new Set(meaningful.map((work) => work.country).filter(Boolean));
    const eras = new Set(
      meaningful
        .map((work) => (work.year != null && Number.isFinite(work.year) ? eraOf(work.year) : null))
        .filter(Boolean),
    );
    const parts: number[] = [];
    if (forms.size > 0) parts.push(Math.min(100, Math.round((forms.size / 3) * 100)));
    if (countries.size > 0) parts.push(Math.min(100, Math.round((countries.size / 4) * 100)));
    if (eras.size > 0) parts.push(Math.min(100, Math.round((eras.size / 2) * 100)));
    if (parts.length > 0) variety = parts.reduce((sum, n) => sum + n, 0) / parts.length;
  }

  let commitment: number | null = null;
  const progressed = [...touched]
    .map((id) => byId.get(id))
    .filter((work): work is WorkSnapshot => Boolean(work && work.progress != null && Number.isFinite(work.progress)));
  if (progressed.length > 0) {
    const best = Math.max(...progressed.map((work) => Math.max(0, Math.min(1, work.progress ?? 0))));
    commitment = Math.min(100, (best / 0.2) * 100);
  }

  if (variety == null && commitment == null) {
    return {
      raw: null,
      status: "learning",
      route: null,
      note: "Still learning — range needs either a stretch of one book or a few forms and places.",
    };
  }
  const varietyScore = variety ?? 0;
  const commitmentScore = commitment ?? 0;
  const route = commitmentScore >= varietyScore ? "commitment" : "variety";
  return {
    raw: Math.max(varietyScore, commitmentScore),
    status: "scored",
    route,
    note:
      route === "commitment"
        ? "One book carried these weeks. Variety isn’t required."
        : "Forms, places, and eras over the last 28 days.",
  };
}

function isEveningHour(hour: number): boolean {
  return hour >= 20 || hour < 5;
}

/** Evening sit only. Timed and done near the plan scores 100; past 1am it falls. */
export function restfulnessPoints(input: {
  endedAt: number;
  minutes: number;
  planned: number;
  daylight: boolean;
}): number {
  const ended = new Date(input.endedAt);
  const hour = ended.getHours();
  const minute = ended.getMinutes();
  let score = 100;
  if (!(input.planned > 0)) {
    score = 80;
  } else if (input.minutes > input.planned + 30) {
    const twice = input.planned * 2;
    if (input.minutes >= twice) {
      score = Math.max(0, 70 - (input.minutes - twice) * 1.5);
    } else {
      const span = Math.max(1, twice - (input.planned + 30));
      const t = (input.minutes - (input.planned + 30)) / span;
      score = 100 - t * 30;
    }
  }
  if (hour >= 1 && hour < 5) {
    const past = (hour - 1) * 60 + minute;
    score -= past * 0.7;
  }
  if (input.daylight) score += 10;
  return clamp(score);
}

function restFor(
  sits: SitPoint[],
  focusTs: number,
  planned: number,
  daylight: boolean,
): { raw: number | null; status: ContributorStatus; note: string; late: boolean } {
  const key = dayKey(focusTs);
  const evening = sits
    .filter((sit) => dayKey(sit.endedAt) === key && sit.endedAt <= focusTs && sit.minutes > 0)
    .filter((sit) => isEveningHour(new Date(sit.endedAt).getHours()))
    .sort((a, b) => b.endedAt - a.endedAt);
  const sit = evening[0];
  if (!sit) {
    return {
      raw: null,
      status: "excluded",
      late: false,
      note: "Only on evenings you read. Daytime sits leave this out.",
    };
  }
  const late = (() => {
    const hour = new Date(sit.endedAt).getHours();
    return hour >= 1 && hour < 5;
  })();
  return {
    raw: restfulnessPoints({
      endedAt: sit.endedAt,
      minutes: sit.minutes,
      planned,
      daylight,
    }),
    status: "scored",
    late,
    note: late
      ? "The evening ran past 1am, so restfulness steps down. Nothing about sleep is claimed."
      : "An evening sit with a stopping point. Daylight colors, when on, are comfort — not a sleep claim.",
  };
}

function connectionFor(
  connection: ReadingScoreInput["connection"],
  focusTs: number,
): { raw: number | null; status: ContributorStatus; note: string } {
  if (!connection?.optIn) {
    return {
      raw: null,
      status: "excluded",
      note: "Opt in by joining a club or reading with someone. Until then it stays out, and the other weights scale up.",
    };
  }
  const start = focusTs - 14 * MS_DAY;
  const sessions = (connection.sessions ?? []).filter((ts) => ts <= focusTs && ts >= start).length;
  const keeps = (connection.keeps ?? []).filter((ts) => ts <= focusTs && ts >= start).length;
  let raw = sessions <= 0 ? 0 : sessions === 1 ? 70 : 100;
  if (keeps > 0) raw = Math.min(100, raw + 10);
  return {
    raw,
    status: "scored",
    note: "Shared sits and lines kept together. Never a count of friends.",
  };
}

function contributor(
  id: ContributorId,
  raw: number | null,
  status: ContributorStatus,
  note: string,
  bonus = 0,
): ContributorResult {
  if (status !== "scored" || raw == null) {
    return { id, value: null, raw: null, status, note };
  }
  const scored = Math.max(0, Math.min(100, raw + bonus));
  return { id, value: clamp(scored), raw: scored, status: "scored", note };
}

export function weightedContributorScore(
  parts: { weight: number; raw: number }[],
): number {
  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (!(weight > 0)) return 0;
  const total = parts.reduce((sum, part) => sum + part.weight * part.raw, 0);
  return clamp(total / weight);
}

function combine(parts: ContributorResult[]): number {
  return weightedContributorScore(
    parts
      .filter((part) => part.status === "scored" && part.raw != null)
      .map((part) => ({ weight: CONTRIBUTOR_WEIGHTS[part.id], raw: part.raw ?? 0 })),
  );
}

export function scoreLabel(total: number): string {
  if (total < 50) return "Light";
  if (total < 70) return "Present";
  if (total < 85) return "Settled";
  return "Deep";
}

function readingLine(total: number): string {
  if (total < 50) return "A light day. The number is a mirror, not a target.";
  if (total < 70) return "Present. A little more unhurried time would settle it.";
  if (total < 85) return "Settled. The reading found its pace.";
  return "Deep. A long, quiet day with the book.";
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  let hour = d.getHours();
  const minute = d.getMinutes();
  const suffix = hour >= 12 ? "pm" : "am";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  if (minute === 0) return `${hour} ${suffix}`;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatUsualDays(rate: number): string {
  const expected = rate * 7;
  const low = Math.max(0, Math.floor(expected));
  const high = Math.max(low, Math.ceil(expected - 1e-9));
  if (low === high) return String(low);
  return `${low}–${high}`;
}

type DayCore = {
  key: string;
  kind: DayKind;
  total: number;
  minutes: number;
  plausible: number;
  contributors: ContributorResult[];
  skimmed: boolean;
  paceKnown: boolean;
  usual: number;
  baselineLearning: boolean;
  priorCount: number;
  rhythmRate: number | null;
  rhythmRaw: number | null;
  late: boolean;
  lateAt: number | null;
  continuityTitle: string | null;
  continuityGapDays: number | null;
};

function emptyContributors(): ContributorResult[] {
  return CONTRIBUTOR_IDS.map((id) => ({
    id,
    value: null,
    raw: null,
    status: "excluded" as const,
    note: "",
  }));
}

export function buildReadingScore(input: ReadingScoreInput): ReadingModel {
  const paused = input.pausedAt != null && input.pausedAt > 0;
  const now = paused ? (input.pausedAt as number) : (input.now ?? Date.now());
  const ledgers = input.ledgers ?? {};
  const skip = new Set(input.ignoredDays ?? []);
  const sittingMinutes = input.sittingMinutes ?? 20;
  const daylight = Boolean(input.daylight);
  const sits = input.sits ?? [];
  const works = input.works ?? [];
  const cache = new Map<string, DayCore>();

  function compute(focusTs: number): DayCore {
    const key = dayKey(focusTs);
    const hit = cache.get(key);
    if (hit) return hit;

    const rawMinutes = minutesOf(ledgers, key);
    const advances = advancesOf(ledgers, key);
    const paceSec = usualPaceSec(ledgers, key, skip);
    const plausible = plausibleMinutes(rawMinutes, advances, paceSec);
    const kind = dayKind(rawMinutes);
    const prior = priorReadingMinutes(ledgers, key, skip, 28);
    const usual = usualMinutes(prior, sittingMinutes);
    const capped = Math.min(plausible.minutes, usual.usual * 1.5);
    const time = usual.usual > 0 ? Math.min(1, capped / usual.usual) : 0;
    const immersion = contributor(
      "immersion",
      kind === "reading" ? time * 100 : null,
      kind === "reading" ? "scored" : "excluded",
      paceSec == null
        ? "Focused minutes against your sit length. Per-breath pace, unbroken runs, and times you left the app are still learning."
        : plausible.skimmed
          ? "Some of this sit was faster than twice your usual pace, so those minutes didn’t count. Unbroken runs are still learning."
          : "Focused minutes against your usual. Unbroken runs and times you left the app are still learning.",
    );

    const rhythm = rhythmFor(focusTs, ledgers, skip);
    const bonus = rhythm.status === "scored" ? timeBonus(sits, focusTs) : 0;
    const rhythmPart = contributor(
      "rhythm",
      rhythm.raw,
      rhythm.status,
      bonus > 0 ? `${rhythm.note} The sit landed near your usual time.` : rhythm.note,
      bonus,
    );

    const returned = returnFor(sits, focusTs);
    const range = rangeFor(works, sits, ledgers, focusTs);
    const rest = restFor(sits, focusTs, sittingMinutes, daylight);
    const connection = connectionFor(input.connection, focusTs);

    const contributors: ContributorResult[] = [
      immersion,
      rhythmPart,
      contributor("return", kind === "reading" ? returned.raw : null, kind === "reading" ? returned.status : "excluded", returned.note),
      contributor("range", kind === "reading" ? range.raw : null, kind === "reading" ? range.status : "excluded", range.note),
      contributor("restfulness", kind === "reading" ? rest.raw : null, kind === "reading" ? rest.status : "excluded", rest.note),
      contributor("connection", kind === "reading" ? connection.raw : null, kind === "reading" ? connection.status : "excluded", connection.note),
    ];

    let continuityTitle: string | null = null;
    let continuityGapDays: number | null = null;
    const todaySits = sits
      .filter((sit) => dayKey(sit.endedAt) === key && sit.endedAt <= focusTs && sit.minutes > 0)
      .sort((a, b) => b.endedAt - a.endedAt);
    for (const sit of todaySits) {
      const priorSit = sits
        .filter((row) => row.workId === sit.workId && row.endedAt < sit.endedAt && row.minutes > 0)
        .sort((a, b) => b.endedAt - a.endedAt)[0];
      if (!priorSit) continue;
      const gap = sit.endedAt - priorSit.endedAt;
      if (gap > 12 * MS_HOUR && gap <= 72 * MS_HOUR) {
        continuityTitle = works.find((work) => work.id === sit.workId)?.title || "the book";
        continuityGapDays = Math.max(1, Math.round(gap / MS_DAY));
        break;
      }
    }

    const lateSit = sits
      .filter((sit) => dayKey(sit.endedAt) === key && sit.endedAt <= focusTs)
      .filter((sit) => {
        const hour = new Date(sit.endedAt).getHours();
        return hour >= 1 && hour < 5;
      })
      .sort((a, b) => b.endedAt - a.endedAt)[0];

    const core: DayCore = {
      key,
      kind,
      total: kind === "reading" ? combine(contributors) : 0,
      minutes: rawMinutes,
      plausible: plausible.minutes,
      contributors,
      skimmed: plausible.skimmed,
      paceKnown: paceSec != null,
      usual: usual.usual,
      baselineLearning: usual.learning,
      priorCount: prior.length,
      rhythmRate: rhythm.rate,
      rhythmRaw: rhythmPart.raw,
      late: Boolean(lateSit),
      lateAt: lateSit?.endedAt ?? null,
      continuityTitle,
      continuityGapDays,
    };
    cache.set(key, core);
    return core;
  }

  const today = compute(now);
  const todayKey = today.key;

  const historyKeys = calendarDaysEnding(now - MS_DAY, 28, skip).filter(
    (key) => minutesOf(ledgers, key) >= READING_DAY_MINUTES,
  );
  const history = historyKeys.map((key) => compute(endOfKey(key))).filter((day) => day.kind === "reading");
  const historyTotals = history.map((day) => day.total).filter((n) => n > 0);
  const versusUsual =
    today.kind === "reading" && historyTotals.length >= 4
      ? clampSigned(today.total - median(historyTotals))
      : null;

  const sortedBand = [...historyTotals].sort((a, b) => a - b);
  const usualBand =
    sortedBand.length >= 4
      ? { low: Math.round(percentile(sortedBand, 0.25)), high: Math.round(percentile(sortedBand, 0.75)) }
      : null;

  const weekKeys = lastCalendarDays(now, 7);
  const weekDays: TrendDay[] = weekKeys.map((key) => {
    if (skip.has(key)) {
      return { key, label: weekdayLetter(key), kind: "paused", score: null, minutes: minutesOf(ledgers, key) };
    }
    const day = key === todayKey ? today : compute(endOfKey(key));
    return {
      key,
      label: weekdayLetter(key),
      kind: day.kind,
      score: day.kind === "reading" ? day.total : null,
      minutes: day.minutes,
    };
  });
  const weekReading = weekDays.filter((day) => day.kind === "reading" && day.score != null);
  const weekScore =
    weekReading.length > 0
      ? clamp(weekReading.reduce((sum, day) => sum + (day.score ?? 0), 0) / weekReading.length)
      : null;

  const trendSpan = calendarDaysEnding(now, 28, skip)
    .map((key) => (key === todayKey ? today : compute(endOfKey(key))))
    .filter((day) => day.kind === "reading");
  const weekContributors = rollupContributors(trendSpan.length > 0 ? trendSpan : today.kind === "reading" ? [today] : []);

  const month = monthView(now, ledgers, skip, compute, todayKey, today);
  const year = yearView(now, ledgers, works, skip, compute, todayKey, today);

  const learningNote =
    today.kind === "reading" && today.baselineLearning
      ? `Learning your rhythm — ${Math.max(1, 4 - today.priorCount)} more reading day${4 - today.priorCount === 1 ? "" : "s"}.`
      : null;

  const daily: DailyScore = {
    total: today.kind === "reading" ? today.total : 0,
    kind: today.kind,
    label: today.kind === "reading" ? scoreLabel(today.total) : today.kind === "quick-visit" ? "Quick visit" : "Rest",
    line:
      today.kind === "reading"
        ? readingLine(today.total)
        : today.kind === "quick-visit"
          ? "A short visit still counts. Rows that need more days say they are still learning."
          : "Rest day. Nothing is lost — the week keeps its shape.",
    hasSignal: today.kind === "reading" && today.total > 0,
    contributors: today.kind === "reading" ? today.contributors : weekContributors,
    versusUsual,
    learningNote,
    minutes: today.minutes,
    plausibleMinutes: today.plausible,
    usualMinutes: today.kind === "reading" ? today.usual : null,
    skimmed: today.skimmed,
    paceKnown: today.paceKnown,
  };

  const usualDays = today.rhythmRate != null ? formatUsualDays(today.rhythmRate) : null;
  const week: WeekView = {
    score: weekScore,
    readingDays: weekReading.length,
    usualDays,
    usualBand,
    days: weekDays,
    contributors: weekContributors,
    detail:
      weekReading.length > 0
        ? usualDays
          ? `${weekReading.length} reading day${weekReading.length === 1 ? "" : "s"} · usual ${usualDays}`
          : `${weekReading.length} reading day${weekReading.length === 1 ? "" : "s"}`
        : "No reading days in this week yet",
  };

  const insight = pickInsight({
    today,
    week,
    dismissed: input.dismissedInsights ?? [],
    last: input.lastInsight ?? null,
    sits,
    works,
    ledgers,
    now,
    together: input.together ?? null,
  });

  return { daily, week, month, year, insight, paused };
}

function clampSigned(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-99, Math.min(99, Math.round(n)));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low] ?? 0;
  const weight = index - low;
  return (sorted[low] ?? 0) * (1 - weight) + (sorted[high] ?? 0) * weight;
}

function weekdayLetter(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return WEEKDAYS[date.getDay()] ?? "";
}

function rollupContributors(days: DayCore[]): ContributorResult[] {
  return CONTRIBUTOR_IDS.map((id) => {
    const rows = days.map((day) => day.contributors.find((part) => part.id === id));
    const scored = rows.filter((part): part is ContributorResult => part?.status === "scored" && part.raw != null);
    if (scored.length === 0) {
      const learning = rows.some((part) => part?.status === "learning");
      return {
        id,
        value: null,
        raw: null,
        status: learning ? "learning" : "excluded",
        note: rows.find((part) => part?.note)?.note ?? "",
      };
    }
    const raw = scored.reduce((sum, part) => sum + (part.raw ?? 0), 0) / scored.length;
    return {
      id,
      value: clamp(raw),
      raw,
      status: "scored",
      note: scored[scored.length - 1]?.note ?? "",
    };
  });
}

function monthKeys(year: number, monthIndex: number, untilTs: number): string[] {
  const keys: string[] = [];
  const cursor = new Date(year, monthIndex, 1, 12, 0, 0, 0);
  const untilKey = dayKey(untilTs);
  while (cursor.getMonth() === monthIndex && dayKey(cursor.getTime()) <= untilKey) {
    keys.push(dayKey(cursor.getTime()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function weeksOf(keys: string[]): string[][] {
  const buckets: string[][] = [];
  let current: string[] = [];
  for (const key of keys) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
    const monday = date.getDay() === 1;
    if (monday && current.length > 0) {
      buckets.push(current);
      current = [];
    }
    current.push(key);
  }
  if (current.length > 0) buckets.push(current);
  return buckets;
}

function monthScoreFrom(
  keys: string[],
  ledgers: DayLedgers,
  skip: Set<string>,
  compute: (ts: number) => DayCore,
  todayKey: string,
  today: DayCore,
): { score: number | null; days: DayCore[] } {
  const days: DayCore[] = [];
  for (const key of keys) {
    if (skip.has(key)) continue;
    const raw = key === todayKey ? today.minutes : minutesOf(ledgers, key);
    if (!(raw > 0)) continue;
    const day = key === todayKey ? today : compute(endOfKey(key));
    if (day.kind === "reading") days.push(day);
  }
  if (days.length === 0) return { score: null, days };
  const buckets = weeksOf(days.map((day) => day.key));
  let weighted = 0;
  let weight = 0;
  for (const bucket of buckets) {
    const inBucket = days.filter((day) => bucket.includes(day.key));
    if (inBucket.length === 0) continue;
    const avg = inBucket.reduce((sum, day) => sum + day.total, 0) / inBucket.length;
    weighted += avg * inBucket.length;
    weight += inBucket.length;
  }
  return { score: weight > 0 ? clamp(weighted / weight) : null, days };
}

function monthView(
  now: number,
  ledgers: DayLedgers,
  skip: Set<string>,
  compute: (ts: number) => DayCore,
  todayKey: string,
  today: DayCore,
): MonthView {
  const date = new Date(now);
  const current = monthScoreFrom(
    monthKeys(date.getFullYear(), date.getMonth(), now),
    ledgers,
    skip,
    compute,
    todayKey,
    today,
  );
  const priors: { score: number; contributors: ContributorResult[] }[] = [];
  for (let back = 1; back <= 3; back++) {
    const prior = new Date(date.getFullYear(), date.getMonth() - back, 1, 12, 0, 0, 0);
    const end = new Date(prior.getFullYear(), prior.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const scored = monthScoreFrom(
      monthKeys(prior.getFullYear(), prior.getMonth(), end),
      ledgers,
      skip,
      compute,
      todayKey,
      today,
    );
    if (scored.score != null) {
      priors.push({ score: scored.score, contributors: rollupContributors(scored.days) });
    }
  }
  const versus =
    current.score != null && priors.length > 0
      ? clampSigned(current.score - priors.reduce((sum, row) => sum + row.score, 0) / priors.length)
      : null;
  const contributors = rollupContributors(current.days);
  const returnNow = contributors.find((part) => part.id === "return");
  const returnThen = priors[0]?.contributors.find((part) => part.id === "return");
  let line = "This month, so far.";
  if (
    returnNow?.value != null &&
    returnThen?.value != null &&
    returnNow.value - returnThen.value >= 15
  ) {
    line = `A steadier month. Return climbed from ${returnThen.value} to ${returnNow.value} — you went back to the same book within a few days.`;
  } else if (versus != null && versus >= 3) {
    line = "A steadier month.";
  } else if (versus != null && versus <= -3) {
    line = "A lighter month. Nothing is lost.";
  } else if (versus != null) {
    line = "About the same as your recent months.";
  }
  return {
    score: current.score,
    versusPrior: versus,
    line,
    contributors,
    detail: current.score != null ? "Average of this month’s weeks, weighted by reading days" : "No reading days this month yet",
  };
}

function yearView(
  now: number,
  ledgers: DayLedgers,
  works: WorkSnapshot[],
  skip: Set<string>,
  compute: (ts: number) => DayCore,
  todayKey: string,
  today: DayCore,
): YearView {
  const date = new Date(now);
  const year = date.getFullYear();
  const prefix = String(year);
  let minutes = 0;
  for (const [key, value] of Object.entries(ledgers.readingMinutesByDay ?? {})) {
    if (!key.startsWith(prefix) || skip.has(key)) continue;
    minutes += value || 0;
  }
  let lines = 0;
  for (const [key, value] of Object.entries(ledgers.keepsByDay ?? {})) {
    if (!key.startsWith(prefix)) continue;
    lines += value || 0;
  }
  const touched = new Set<string>();
  for (const [key, ids] of Object.entries(ledgers.worksTouchedByDay ?? {})) {
    if (!key.startsWith(prefix) || !Array.isArray(ids)) continue;
    for (const id of ids) if (id) touched.add(id);
  }
  const byId = new Map(works.map((work) => [work.id, work]));
  const forms = new Set<string>();
  const countries = new Set<string>();
  for (const id of touched) {
    const work = byId.get(id);
    if (work?.form) forms.add(work.form);
    if (work?.country) countries.add(work.country);
  }
  const books = works.filter((work) => work.finishedAt && new Date(work.finishedAt).getFullYear() === year).length;
  const months: YearView["months"] = [];
  for (let month = 0; month <= date.getMonth(); month++) {
    const end =
      month === date.getMonth()
        ? now
        : new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    const scored = monthScoreFrom(monthKeys(year, month, end), ledgers, skip, compute, todayKey, today);
    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: MONTHS[month] ?? "",
      score: scored.score,
    });
  }
  return {
    books,
    hours: Math.round(minutes / 60),
    lines: Math.round(lines),
    countries: countries.size,
    forms: forms.size,
    months,
  };
}

function pickInsight(input: {
  today: DayCore;
  week: WeekView;
  dismissed: string[];
  last: { id: string; day: string } | null;
  sits: SitPoint[];
  works: WorkSnapshot[];
  ledgers: DayLedgers;
  now: number;
  together: { handle: string; workTitle: string; at: number } | null;
}): InsightCard | null {
  if (input.today.kind !== "reading") return null;
  const blocked = new Set(input.dismissed);
  const yesterday = dayKey(input.now - MS_DAY);
  const paceShownYesterday = input.last?.id === "pace" && input.last.day === yesterday;

  if (input.today.late && input.today.lateAt && !blocked.has("late")) {
    return {
      id: "late",
      kicker: "Restfulness · Late",
      title: "A late one.",
      body: `You read until ${formatClock(input.today.lateAt)}. Good book. Tonight, try a 20-minute sit — the hourglass will tell you when to stop.`,
    };
  }

  if (input.today.skimmed && !blocked.has("pace") && !paceShownYesterday) {
    return {
      id: "pace",
      kicker: "Immersion · Pace",
      title: "A quick one today.",
      body: "Some breaths went by faster than your usual pace, so we didn’t count those toward Immersion. Skimming for the plot is fine; tomorrow’s chapter will keep.",
    };
  }

  return finishInsight(input, blocked);
}

function finishInsight(
  input: {
    today: DayCore;
    week: WeekView;
    sits: SitPoint[];
    works: WorkSnapshot[];
    ledgers: DayLedgers;
    now: number;
    together: { handle: string; workTitle: string; at: number } | null;
    last: { id: string; day: string } | null;
  },
  blocked: Set<string>,
): InsightCard | null {
  const { today } = input;
  const rhythm = today.contributors.find((part) => part.id === "rhythm");
  if (rhythm?.status === "scored" && rhythm.raw != null && !blocked.has("rhythm-dip")) {
    const prev = previousReadingDayRhythm(input);
    if (prev != null && prev - rhythm.raw >= 15) {
      const usual = input.week.usualDays ?? "your usual";
      return {
        id: "rhythm-dip",
        kicker: "Rhythm · Dip",
        title: "A lighter week.",
        body: `${input.week.readingDays} reading day${input.week.readingDays === 1 ? "" : "s"} instead of your usual ${usual}. Nothing is lost. A ten-minute sit tonight picks the thread back up.`,
      };
    }
  }

  if (today.continuityTitle && today.continuityGapDays && !blocked.has("continuity")) {
    const gap = today.continuityGapDays === 1 ? "a day" : `${today.continuityGapDays} days`;
    return {
      id: "continuity",
      kicker: "Return · Continuity",
      title: `Back with ${today.continuityTitle}.`,
      body: `You picked it up again after ${gap}. Coming back within a few days keeps the characters and plot fresh.`,
    };
  }

  if (!blocked.has("time")) {
    const habit = timeHabit(input.sits, input.now);
    if (habit) {
      return {
        id: "time",
        kicker: "Rhythm · Ritual",
        title: "Your hour is becoming a habit.",
        body: `${habit.count} of your last ${habit.of} sits ended within an hour and a half of ${habit.label}. Keeping the same time is what makes reading feel automatic.`,
      };
    }
  }

  if (!blocked.has("longest") && longestThisMonth(input.ledgers, input.now, today)) {
    const rounded = Math.max(1, Math.round(today.minutes));
    return {
      id: "longest",
      kicker: "Immersion · Up",
      title: "Settled in.",
      body: `You read ${rounded} minute${rounded === 1 ? "" : "s"} — your longest sit this month. Long, quiet stretches are where a story really takes hold.`,
    };
  }

  if (!blocked.has("keeps")) {
    const kept = keptWaiting(input.ledgers, input.works, input.now);
    if (kept) {
      return {
        id: "keeps",
        kicker: "Return · Lines",
        title: "Your lines are waiting.",
        body: kept.title
          ? `You kept ${kept.count} line${kept.count === 1 ? "" : "s"} from ${kept.title} last week. Want to see if you remember how one ends? Trying to recall it helps it stay.`
          : `You kept ${kept.count} line${kept.count === 1 ? "" : "s"} last week. Want to see if you remember how one ends? Trying to recall it helps it stay.`,
      };
    }
  }

  if (!blocked.has("together") && input.together && input.now - input.together.at < 14 * MS_DAY && input.now >= input.together.at) {
    const handle = input.together.handle.startsWith("@") ? input.together.handle : `@${input.together.handle}`;
    return {
      id: "together",
      kicker: "Connection",
      title: `You and ${handle} kept the same line.`,
      body: `${input.together.workTitle}. Read the next stretch together when you both have a quiet hour?`,
    };
  }

  return null;
}

function previousReadingDayRhythm(input: {
  ledgers: DayLedgers;
  now: number;
  today: DayCore;
}): number | null {
  // A one-day miss is about 12 rhythm points. The card waits for 15.
  // Compare against a perfect recent rate by reusing today's rate and the
  // window math already stored: if today's raw is 15 under a full score.
  const raw = input.today.rhythmRaw;
  if (raw == null) return null;
  // Without a second full evaluation, treat "usual" as 100 for a daily reader
  // whose rate is at least 0.95, else the rate scaled to 100.
  const rate = input.today.rhythmRate;
  if (rate == null) return null;
  const baseline = rate >= 0.9 ? 100 : Math.min(100, rate * 100 + 20);
  return baseline;
}

function timeHabit(sits: SitPoint[], now: number): { count: number; of: number; label: string } | null {
  const recent = sits
    .filter((sit) => sit.endedAt <= now && sit.minutes >= READING_DAY_MINUTES)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, 5);
  if (recent.length < 5) return null;
  if (!recent.some((sit) => dayKey(sit.endedAt) === dayKey(now))) return null;
  const mid = median(recent.map((sit) => minuteOfDay(sit.endedAt)));
  const count = recent.filter((sit) => circDiff(minuteOfDay(sit.endedAt), mid) <= 90).length;
  if (count < 4) return null;
  return { count, of: recent.length, label: formatClock(recent[0] ? clockFromMinute(mid, recent[0].endedAt) : now) };
}

function clockFromMinute(minute: number, near: number): number {
  const d = new Date(near);
  d.setHours(Math.floor(minute / 60), Math.round(minute % 60), 0, 0);
  return d.getTime();
}

function longestThisMonth(ledgers: DayLedgers, now: number, today: DayCore): boolean {
  if (today.kind !== "reading" || today.minutes < 15) return false;
  const date = new Date(now);
  const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  for (const [key, minutes] of Object.entries(ledgers.readingMinutesByDay ?? {})) {
    if (!key.startsWith(prefix) || key === today.key) continue;
    if ((minutes || 0) >= today.minutes) return false;
  }
  return true;
}

function keptWaiting(
  ledgers: DayLedgers,
  works: WorkSnapshot[],
  now: number,
): { count: number; title: string | null } | null {
  let count = 0;
  const days: string[] = [];
  const cursor = noon(now);
  for (let back = 3; back <= 10; back++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - back);
    const key = dayKey(day.getTime());
    const keeps = ledgers.keepsByDay?.[key] ?? 0;
    if (keeps > 0) {
      count += keeps;
      days.push(key);
    }
  }
  if (count <= 0) return null;
  const titles = new Set<string>();
  for (const key of days) {
    for (const id of listOrEmpty(ledgers.worksTouchedByDay?.[key])) {
      const title = works.find((work) => work.id === id)?.title;
      if (title) titles.add(title);
    }
  }
  return { count, title: titles.size === 1 ? ([...titles][0] ?? null) : null };
}

export function dailyScoreGlance(
  score: Pick<DailyScore, "total" | "hasSignal"> & { kind?: DayKind } | null | undefined,
): string {
  if (!score) return "—";
  if (score.kind && score.kind !== "reading") return "—";
  if (!score.hasSignal || !(score.total > 0)) return "—";
  return String(score.total);
}

export function dayScoreInput(ledgers: DayLedgers, key: string): {
  minutes: number;
  advances: number;
  sceneCrosses: number;
  keeps: number;
  hostOpens: number;
  sits: number;
  clubTouches: number;
  worksTouched: number;
} {
  const works = listOrEmpty(ledgers.worksTouchedByDay?.[key]);
  return {
    minutes: minutesOf(ledgers, key),
    advances: ledgers.advancesByDay?.[key] ?? 0,
    sceneCrosses: ledgers.sceneCrossesByDay?.[key] ?? 0,
    keeps: ledgers.keepsByDay?.[key] ?? 0,
    hostOpens: ledgers.hostOpensByDay?.[key] ?? 0,
    sits: ledgers.sitsByDay?.[key] ?? 0,
    clubTouches: ledgers.clubTouchesByDay?.[key] ?? 0,
    worksTouched: new Set(works.filter(Boolean)).size,
  };
}

export function scoreForDay(ledgers: DayLedgers, key: string, now = Date.now()): DailyScore {
  const focus = dayKey(now) === key ? now : endOfKey(key);
  return buildReadingScore({ ledgers, now: focus }).daily;
}

export function deriveWindowScores(ledgers: DayLedgers, now = Date.now()) {
  const model = buildReadingScore({ ledgers, now, sittingMinutes: 20 });
  const weekly: WindowScore = {
    total: model.week.score ?? 0,
    label: "Week",
    detail: model.week.detail,
  };
  const monthly: WindowScore = {
    total: model.month.score ?? 0,
    label: "Month",
    detail: model.month.detail,
  };
  return { daily: model.daily, weekly, monthly };
}

/** Local Monday 00:00 for the week containing `now`. */
export function startOfLocalWeek(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d.getTime();
}

/** Local 1st of the month containing `now`. */
export function startOfLocalMonth(now: number): number {
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayKeysInclusive(fromTs: number, toTs: number): string[] {
  const keys: string[] = [];
  const start = new Date(fromTs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toTs);
  end.setHours(0, 0, 0, 0);
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    keys.push(dayKey(t));
  }
  return keys;
}

export function lastSevenDayKeys(now: number): string[] {
  return dayKeysInclusive(now - 6 * MS_DAY, now);
}

export function weekBucketsInMonth(now: number): string[][] {
  const monthStart = startOfLocalMonth(now);
  const monthEnd = new Date(now);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(0, 0, 0, 0);
  const endTs = Math.min(monthEnd.getTime(), new Date(now).setHours(0, 0, 0, 0));
  const buckets: string[][] = [];
  let cursor = startOfLocalWeek(monthStart);
  const last = endTs;
  while (cursor <= last + 6 * MS_DAY) {
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const ts = cursor + i * MS_DAY;
      if (ts < monthStart || ts > endTs) continue;
      keys.push(dayKey(ts));
    }
    if (keys.length > 0) buckets.push(keys);
    cursor += 7 * MS_DAY;
    if (cursor > last + 7 * MS_DAY) break;
  }
  return buckets;
}

export function touchWorkOnDay(
  map: Record<string, string[]> | undefined,
  day: string,
  workId: string,
  cap = 40,
): Record<string, string[]> {
  if (!workId || isDeviceImport(workId)) return map ?? {};
  const prev = map ?? {};
  const list = prev[day] ?? [];
  if (list.includes(workId)) return prev;
  return { ...prev, [day]: [...list, workId].slice(-cap) };
}

export function bumpDayCount(
  map: Record<string, number> | undefined,
  day: string,
  by = 1,
): Record<string, number> {
  if (!(by > 0)) return map ?? {};
  const prev = map ?? {};
  return { ...prev, [day]: (prev[day] ?? 0) + by };
}
