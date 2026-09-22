/**
 * Daily reading score (0–100) — Mike-approved pillars for live Salon.
 *
 * Focused time uses *active* sentence-tap minutes only (same ledger as
 * Today / Week after the active-read clock). Idle open time never scores.
 *
 * Pillars sum to 100:
 *   Focused time 40 · Depth 25 · Engagement 15 · Consistency 10 · Mix 10
 * Mix is optional: 90+ is reachable without it; 100 needs the mix bonus.
 */

import { dayKey } from "./day-key.ts";

const MS_DAY = 24 * 60 * 60 * 1000;

/** Full focused-time pillar at this many active minutes. */
export const FOCUS_FULL_MINUTES = 30;
export const FOCUS_MAX = 40;
export const DEPTH_MAX = 25;
export const ENGAGEMENT_MAX = 15;
export const CONSISTENCY_MAX = 10;
export const MIX_MAX = 10;

/** Advances that alone fill the depth pillar (no scene cross required). */
export const DEPTH_FULL_ADVANCES = 20;
/** One scene/chapter cross contributes this many depth points. */
export const DEPTH_SCENE_PTS = 10;

/** Extra points on the weekly score when ≥5 reading days that week. */
export const WEEKLY_STREAK_BONUS = 4;
/** Distinct works meaningfully advanced in a month before the score can reach 100. */
export const MONTHLY_BREADTH_WORKS = 3;

export type DailyScoreInput = {
  /** Active sentence-tap minutes for the day. */
  minutes: number;
  /** Forward advances (new breath / finished last line). */
  advances: number;
  /** Scene or chapter boundaries crossed by a forward advance. */
  sceneCrosses: number;
  /** Lines kept that day. */
  keeps: number;
  /** Hosted sits opened that day (you as host). */
  hostOpens: number;
  /** Finished sits that day (active advances closed a sit). */
  sits: number;
  /** Club / together touches that day. */
  clubTouches: number;
  /** Distinct works that received a forward advance. */
  worksTouched: number;
};

export type DailyPillars = {
  focused: number;
  depth: number;
  engagement: number;
  consistency: number;
  mix: number;
};

export type DailyScore = {
  total: number;
  pillars: DailyPillars;
  label: string;
  line: string;
  /** True when any active-read or engagement signal exists. */
  hasSignal: boolean;
};

export type WindowScore = {
  total: number;
  label: string;
  detail: string;
};

function clampScore(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampPts(n: number, max: number) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

/** Focused time — linear to 40 at ≥30 active minutes; never exceeds 40. */
export function focusedTimePts(minutes: number): number {
  if (!(minutes > 0)) return 0;
  return clampPts((minutes / FOCUS_FULL_MINUTES) * FOCUS_MAX, FOCUS_MAX);
}

/**
 * Depth — real progress. Breaths alone can fill the pillar; a scene/chapter
 * cross accelerates it. Zero advances and zero crosses → 0 (peek scores low).
 */
export function depthPts(advances: number, sceneCrosses: number): number {
  const adv = Math.max(0, Math.round(advances) || 0);
  const scenes = Math.max(0, Math.round(sceneCrosses) || 0);
  if (adv <= 0 && scenes <= 0) return 0;
  const fromBreaths = (adv / DEPTH_FULL_ADVANCES) * DEPTH_MAX;
  const fromScenes = Math.min(DEPTH_MAX, scenes * DEPTH_SCENE_PTS);
  // Scene cross without many taps still counts as real progress, but needs
  // at least one advance in practice (caller only increments on advance).
  return clampPts(Math.max(fromBreaths, fromScenes, fromBreaths * 0.55 + fromScenes), DEPTH_MAX);
}

/** Engagement — keeps, Host opens, or sit/club touch. One clear signal fills 15. */
export function engagementPts(input: {
  keeps: number;
  hostOpens: number;
  sits: number;
  clubTouches: number;
}): number {
  const signals =
    (input.keeps > 0 ? 1 : 0) +
    (input.hostOpens > 0 ? 1 : 0) +
    (input.sits > 0 ? 1 : 0) +
    (input.clubTouches > 0 ? 1 : 0);
  if (signals <= 0) return 0;
  return ENGAGEMENT_MAX;
}

/** Consistency — reading today awards the full 10 (streak length is separate). */
export function consistencyPts(didRead: boolean): number {
  return didRead ? CONSISTENCY_MAX : 0;
}

/**
 * Mix — optional bonus. Second work touched, or a sit that day.
 * Never required for a high 90.
 */
export function mixPts(worksTouched: number, sits: number): number {
  if (worksTouched >= 2 || sits > 0) return MIX_MAX;
  return 0;
}

export function scoreLabel(total: number): string {
  if (total <= 0) return "Unopened";
  if (total < 50) return "Light";
  if (total < 70) return "Present";
  if (total < 90) return "Settled";
  if (total < 100) return "Deep";
  return "Full";
}

export function scoreLine(total: number, pillars: DailyPillars): string {
  if (total <= 0) {
    return "Sit once — active minutes and a quiet score will gather here.";
  }
  if (total < 50) {
    return "Under about ten attentive minutes the day usually stays below 50.";
  }
  if (total < 70) {
    return "Fifteen to twenty minutes with real progress lands in the 70s.";
  }
  if (total < 90) {
    if (pillars.engagement <= 0) {
      return "A keep, a Host open, or a finished sit lifts a long sit into the 90s.";
    }
    return "Thirty attentive minutes with depth and a keep reach 90 and above.";
  }
  if (total < 100) {
    return "A second work or a sit fills the optional mix for 100.";
  }
  return "Time, depth, engagement, and a little mix — a full day.";
}

export function dailyReadingScore(input: DailyScoreInput): DailyScore {
  const minutes = Math.max(0, input.minutes || 0);
  const advances = Math.max(0, Math.round(input.advances) || 0);
  const sceneCrosses = Math.max(0, Math.round(input.sceneCrosses) || 0);
  const keeps = Math.max(0, Math.round(input.keeps) || 0);
  const hostOpens = Math.max(0, Math.round(input.hostOpens) || 0);
  const sits = Math.max(0, Math.round(input.sits) || 0);
  const clubTouches = Math.max(0, Math.round(input.clubTouches) || 0);
  const worksTouched = Math.max(0, Math.round(input.worksTouched) || 0);

  const didRead = minutes > 0 || advances > 0;
  const pillars: DailyPillars = {
    focused: focusedTimePts(minutes),
    depth: depthPts(advances, sceneCrosses),
    engagement: engagementPts({ keeps, hostOpens, sits, clubTouches }),
    consistency: consistencyPts(didRead),
    mix: mixPts(worksTouched, sits),
  };

  const raw =
    pillars.focused +
    pillars.depth +
    pillars.engagement +
    pillars.consistency +
    pillars.mix;
  const total = clampScore(raw);
  const hasSignal =
    didRead || keeps > 0 || hostOpens > 0 || sits > 0 || clubTouches > 0 || worksTouched > 0;

  return {
    total: hasSignal || total > 0 ? total : 0,
    pillars,
    label: scoreLabel(total),
    line: scoreLine(total, pillars),
    hasSignal,
  };
}

/**
 * Weekly (0–100): mean of the best 5 of 7 daily scores, plus a small streak
 * bonus when there are ≥5 reading days. Forgives one soft day.
 */
export function weeklyReadingScore(
  dailyTotals: number[],
  readingDays: number,
): WindowScore {
  const scores = dailyTotals
    .map((n) => (Number.isFinite(n) && n > 0 ? Math.min(100, n) : 0))
    .slice(0, 7);
  while (scores.length < 7) scores.push(0);

  const bestFive = [...scores].sort((a, b) => b - a).slice(0, 5);
  const avg = bestFive.reduce((s, n) => s + n, 0) / 5;
  const bonus = readingDays >= 5 ? WEEKLY_STREAK_BONUS : 0;
  const total = clampScore(avg + bonus);

  return {
    total,
    label: "Week",
    detail:
      readingDays >= 5
        ? `Best five days · ${readingDays} reading days`
        : readingDays > 0
          ? `Best five of seven · ${readingDays} reading day${readingDays === 1 ? "" : "s"}`
          : "Best five of seven",
  };
}

/**
 * Monthly (0–100): mean of weekly scores in the month, with a light breadth
 * ceiling so a month of thin skims cannot look like 100.
 */
export function monthlyReadingScore(
  weeklyTotals: number[],
  worksAdvanced: number,
): WindowScore {
  const weeks = weeklyTotals.filter((n) => Number.isFinite(n));
  const mean =
    weeks.length > 0 ? weeks.reduce((s, n) => s + Math.max(0, n), 0) / weeks.length : 0;
  const breadth = Math.max(0, Math.round(worksAdvanced) || 0);
  // Cap: 1 work → 82, 2 → 91, ≥3 → no ceiling.
  const ceiling =
    breadth >= MONTHLY_BREADTH_WORKS
      ? 100
      : breadth <= 0
        ? 70
        : 70 + breadth * 11;
  const total = clampScore(Math.min(mean, ceiling));

  return {
    total,
    label: "Month",
    detail:
      breadth >= MONTHLY_BREADTH_WORKS
        ? `${breadth} works advanced`
        : breadth > 0
          ? `${breadth} work${breadth === 1 ? "" : "s"} advanced · breadth soft-cap`
          : "Breadth soft-cap until three works move",
  };
}

/** Local Monday 00:00 for the week containing `now`. */
export function startOfLocalWeek(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 6 Sat
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

/** Seven local day keys ending on `now`'s calendar day (oldest → newest). */
export function lastSevenDayKeys(now: number): string[] {
  return dayKeysInclusive(now - 6 * MS_DAY, now);
}

/** ISO-ish week buckets in the month of `now` (Mon–Sun, clipped to month). */
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

export function dayScoreInput(ledgers: DayLedgers, key: string): DailyScoreInput {
  const works = ledgers.worksTouchedByDay?.[key] ?? [];
  return {
    minutes: ledgers.readingMinutesByDay?.[key] ?? 0,
    advances: ledgers.advancesByDay?.[key] ?? 0,
    sceneCrosses: ledgers.sceneCrossesByDay?.[key] ?? 0,
    keeps: ledgers.keepsByDay?.[key] ?? 0,
    hostOpens: ledgers.hostOpensByDay?.[key] ?? 0,
    sits: ledgers.sitsByDay?.[key] ?? 0,
    clubTouches: ledgers.clubTouchesByDay?.[key] ?? 0,
    worksTouched: new Set(works.filter(Boolean)).size,
  };
}

export function scoreForDay(ledgers: DayLedgers, key: string): DailyScore {
  return dailyReadingScore(dayScoreInput(ledgers, key));
}

export function deriveWindowScores(
  ledgers: DayLedgers,
  now = Date.now(),
): { daily: DailyScore; weekly: WindowScore; monthly: WindowScore } {
  const today = dayKey(now);
  const daily = scoreForDay(ledgers, today);

  const weekKeys = lastSevenDayKeys(now);
  const weekTotals = weekKeys.map((key) => scoreForDay(ledgers, key).total);
  const readingDays = weekKeys.filter((key) => {
    const input = dayScoreInput(ledgers, key);
    return input.minutes > 0 || input.advances > 0;
  }).length;
  const weekly = weeklyReadingScore(weekTotals, readingDays);

  const buckets = weekBucketsInMonth(now);
  const weeklyTotals = buckets.map((keys) => {
    const totals = keys.map((key) => scoreForDay(ledgers, key).total);
    const days = keys.filter((key) => {
      const input = dayScoreInput(ledgers, key);
      return input.minutes > 0 || input.advances > 0;
    }).length;
    return weeklyReadingScore(
      // Pad to 7 so best-of-5 still works on partial weeks
      [...totals, ...Array(Math.max(0, 7 - totals.length)).fill(0)],
      days,
    ).total;
  });

  const monthKeys = dayKeysInclusive(startOfLocalMonth(now), now);
  const advanced = new Set<string>();
  for (const key of monthKeys) {
    const works = ledgers.worksTouchedByDay?.[key] ?? [];
    const advances = ledgers.advancesByDay?.[key] ?? 0;
    const scenes = ledgers.sceneCrossesByDay?.[key] ?? 0;
    // Meaningful: a scene cross, or at least a handful of advances on a work.
    if (scenes > 0 || advances >= 5) {
      for (const id of works) if (id) advanced.add(id);
    } else if (advances > 0) {
      for (const id of works) if (id) advanced.add(id);
    }
  }
  // Prefer counting works that actually moved; fall back to any touch.
  if (advanced.size === 0) {
    for (const key of monthKeys) {
      for (const id of ledgers.worksTouchedByDay?.[key] ?? []) {
        if (id) advanced.add(id);
      }
    }
  }

  const monthly = monthlyReadingScore(weeklyTotals, advanced.size);
  return { daily, weekly, monthly };
}

/** Merge a work id into that day's touched list (deduped, capped). */
export function touchWorkOnDay(
  map: Record<string, string[]> | undefined,
  day: string,
  workId: string,
  cap = 40,
): Record<string, string[]> {
  if (!workId || workId === "page") return map ?? {};
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
