import { countryFor } from "./catalog/countries.ts";
import { RITUAL_LANES } from "./catalog/rituals.ts";
import { shelfWork, type ShelfForm } from "./catalog/shelf.ts";
import { sitInvolves, type HostedSit } from "./hosted-sit.ts";
import { formatHandle, normalizeHandle } from "./social.ts";
import { dayKey } from "./day-key.ts";
import type { SitSession, WorkProgress } from "./store.ts";
import type { TogetherKeep } from "./together-keep.ts";
import { buildRadarAxes, type RadarAxis } from "./you-radar.ts";
import {
  deriveWindowScores,
  type DailyScore,
  type WindowScore,
} from "./reading-score.ts";

export type FormCount = { form: ShelfForm; label: string; count: number };
export type OriginCount = { country: string; count: number };

export type PaceInfo = {
  label: string;
  detail: string;
  breathsPerMinute: number | null;
  avgSitMinutes: number | null;
  /** Mean credited gap between forward advances, in seconds. */
  avgGapSec: number | null;
};

export type Readiness = {
  score: number;
  label: string;
  line: string;
};

export type LaneCount = { id: string; label: string; count: number };

export type DayMinutes = {
  key: string;
  label: string;
  minutes: number;
};

export type RingStat = {
  id: string;
  label: string;
  value: number;
  max: number;
  display: string;
  unit: string;
};

export type ActivityItem = {
  at: number;
  kind: "sit" | "together" | "hosted" | "finished";
  title: string;
  detail: string;
  workId?: string;
};

export type DeskWork = {
  id: string;
  title: string;
  author: string;
  breathIndex: number;
  lastOpenedAt: number;
};

export type ReadingStats = {
  hasSignal: boolean;
  minutesToday: number;
  minutesWeek: number;
  minutesAll: number;
  minutesAreEstimated: boolean;
  streak: number;
  pace: PaceInfo;
  forms: FormCount[];
  origins: OriginCount[];
  opened: number;
  completed: number;
  favorites: number;
  kept: number;
  readiness: Readiness;
  /** Daily reading score (0–100) — active-tap pillars. Hero number on You. */
  dailyScore: DailyScore;
  weeklyScore: WindowScore;
  monthlyScore: WindowScore;
  breaths: number;
  /** Forward advances today — taps that moved to a new breath. */
  advancesToday: number;
  /** Forward advances since the active-clock reset. */
  advancesAll: number;
  /** Last forward advance. 0 if none since the clock reset. */
  lastActiveReadAt: number;
  inProgress: number;
  togetherKeeps: number;
  hostedSits: number;
  lanes: LaneCount[];
  hourPattern: LaneCount[];
  weekDays: DayMinutes[];
  rings: RingStat[];
  radar: RadarAxis[];
  sits: number;
  activity: ActivityItem[];
  desk: DeskWork[];
};

const FORM_LABEL: Record<ShelfForm, string> = {
  novel: "Novels",
  stories: "Stories",
  play: "Plays",
  poem: "Poems",
  other: "Other",
};

const MS_DAY = 24 * 60 * 60 * 1000;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Ritual lanes that name a time of day, not a mood. */
const HOUR_LANES = [
  { id: "waking-up", label: "Waking", start: 5, end: 10 },
  { id: "on-a-walk", label: "On a walk", start: 10, end: 17 },
  { id: "unwind", label: "Unwind", start: 17, end: 21 },
  { id: "before-sleep", label: "Before sleep", start: 21, end: 5 },
] as const;

function sumMap(map: Record<string, number> | undefined) {
  if (!map) return 0;
  let total = 0;
  for (const n of Object.values(map)) total += n || 0;
  return Math.round(total * 1000) / 1000;
}

function sumSince(map: Record<string, number> | undefined, sinceKey: string) {
  if (!map) return 0;
  let total = 0;
  for (const [day, n] of Object.entries(map)) {
    if (day >= sinceKey) total += n || 0;
  }
  return Math.round(total * 1000) / 1000;
}

function weightFor(
  workId: string,
  progress: Record<string, WorkProgress>,
  favorites: Set<string>,
  minutesByWork: Record<string, number>,
) {
  const item = progress[workId];
  let w = 0;
  if (favorites.has(workId)) w += 3;
  if (item?.completedAt) w += 2;
  w += Math.min(4, item?.kept?.length ?? 0);
  if (item?.entered) w += 1;
  w += Math.min(6, (minutesByWork[workId] ?? 0) / 10);
  return w;
}

function topForms(
  workIds: string[],
  progress: Record<string, WorkProgress>,
  favorites: Set<string>,
  minutesByWork: Record<string, number>,
): FormCount[] {
  const scores = new Map<ShelfForm, number>();
  for (const id of workIds) {
    const work = shelfWork(id);
    if (!work) continue;
    const w = weightFor(id, progress, favorites, minutesByWork);
    if (w <= 0) continue;
    scores.set(work.form, (scores.get(work.form) ?? 0) + w);
  }
  return [...scores.entries()]
    .map(([form, count]) => ({
      form,
      label: FORM_LABEL[form],
      count: Math.round(count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function topOrigins(
  workIds: string[],
  progress: Record<string, WorkProgress>,
  favorites: Set<string>,
  minutesByWork: Record<string, number>,
): OriginCount[] {
  const scores = new Map<string, number>();
  for (const id of workIds) {
    const work = shelfWork(id);
    if (!work) continue;
    const country = countryFor(work);
    if (!country) continue;
    const w = weightFor(id, progress, favorites, minutesByWork);
    if (w <= 0) continue;
    scores.set(country, (scores.get(country) ?? 0) + w);
  }
  return [...scores.entries()]
    .map(([country, count]) => ({ country, count: Math.round(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function gapSeconds(minutes: number, advances: number): number | null {
  if (!(minutes > 0) || !(advances > 0)) return null;
  return Math.max(1, Math.round((minutes * 60) / advances));
}

function paceFrom(
  sitHistory: SitSession[],
  progress: Record<string, WorkProgress>,
  minutesAll: number,
  avgGapSec: number | null,
): PaceInfo {
  // Legacy rows were wall-clock and are stored as 0 after the clock migration.
  const sessions = (sitHistory ?? []).filter((row) => row.minutes > 0);
  const avgSit =
    sessions.length > 0
      ? sessions.reduce((s, x) => s + x.minutes, 0) / sessions.length
      : null;

  let breaths = 0;
  for (const item of Object.values(progress)) {
    if (!item.entered) continue;
    breaths += Math.max(0, item.breathIndex);
  }

  const breathsPerMinute =
    minutesAll > 0 && breaths > 0
      ? Math.round((breaths / minutesAll) * 10) / 10
      : null;

  let label = "Steady";
  if (avgSit != null) {
    if (avgSit < 12) label = "Quick sits";
    else if (avgSit > 35) label = "Long sits";
  } else if (avgGapSec != null) {
    if (avgGapSec < 12) label = "Quick sits";
    else if (avgGapSec > 45) label = "Long sits";
  } else if (breathsPerMinute != null) {
    if (breathsPerMinute >= 2.5) label = "Quick sits";
    else if (breathsPerMinute <= 0.8) label = "Long sits";
  }

  const detailParts: string[] = [];
  if (avgGapSec != null) detailParts.push(formatGap(avgGapSec));
  if (breathsPerMinute != null) detailParts.push(`${breathsPerMinute} breaths/min`);
  if (avgSit != null) detailParts.push(`~${Math.round(avgSit)} min sits`);

  return {
    label,
    detail: detailParts.join(" · ") || "After a few advances, pace appears here.",
    breathsPerMinute,
    avgSitMinutes: avgSit != null ? Math.round(avgSit * 10) / 10 : null,
    avgGapSec,
  };
}

function walkStreak(hasDay: (key: string) => boolean, now: number) {
  const today = dayKey(now);
  const yesterday = dayKey(now - MS_DAY);
  let cursor: string | null = hasDay(today) ? today : hasDay(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (cursor && hasDay(cursor)) {
    streak += 1;
    const [y, m, d] = cursor.split("-").map(Number);
    const prev = new Date(y!, m! - 1, d!);
    prev.setDate(prev.getDate() - 1);
    cursor = dayKey(prev.getTime());
  }
  return streak;
}

function minutesStreak(readingMinutesByDay: Record<string, number> | undefined, now: number) {
  const map = readingMinutesByDay ?? {};
  return walkStreak((key) => (map[key] ?? 0) > 0, now);
}

function progressStreak(progress: Record<string, WorkProgress>, now: number) {
  const days = new Set<string>();
  for (const item of Object.values(progress)) {
    if (!item.entered || !item.lastOpenedAt) continue;
    days.add(dayKey(item.lastOpenedAt));
  }
  return walkStreak((key) => days.has(key), now);
}

function workTitle(workId: string) {
  return shelfWork(workId)?.title?.trim() || workId;
}

function workAuthor(workId: string) {
  return shelfWork(workId)?.author?.trim() ?? "";
}

function countBreaths(progress: Record<string, WorkProgress>) {
  let breaths = 0;
  for (const [id, item] of Object.entries(progress)) {
    if (id === "page" || !item.entered) continue;
    breaths += Math.max(0, item.breathIndex);
  }
  return breaths;
}

export function weekMinutesSeries(
  byDay: Record<string, number> | undefined,
  now = Date.now(),
): DayMinutes[] {
  const map = byDay ?? {};
  const days: DayMinutes[] = [];
  for (let i = 6; i >= 0; i--) {
    const ts = now - i * MS_DAY;
    const key = dayKey(ts);
    days.push({
      key,
      label: DAY_LABELS[new Date(ts).getDay()] ?? "",
      minutes: Math.round((map[key] ?? 0) * 1000) / 1000,
    });
  }
  return days;
}

export function ritualLanesUsed(workIds: Iterable<string>): LaneCount[] {
  const ids = [...new Set(workIds)].filter((id) => id && id !== "page");
  const counts: LaneCount[] = [];
  for (const lane of RITUAL_LANES) {
    if (lane.workIds.length === 0) continue;
    const set = new Set(lane.workIds);
    const count = ids.filter((id) => set.has(id)).length;
    if (count > 0) counts.push({ id: lane.id, label: lane.label, count });
  }
  return counts.sort((a, b) => b.count - a.count);
}

function hourLaneId(hour: number) {
  if (hour >= 5 && hour < 10) return "waking-up";
  if (hour >= 10 && hour < 17) return "on-a-walk";
  if (hour >= 17 && hour < 21) return "unwind";
  return "before-sleep";
}

export function timeOfDayPattern(
  sitHistory: SitSession[],
  lanes: LaneCount[],
): LaneCount[] {
  const scores = new Map<string, number>();
  for (const lane of HOUR_LANES) scores.set(lane.id, 0);

  for (const sit of sitHistory) {
    const id = hourLaneId(new Date(sit.endedAt).getHours());
    scores.set(id, (scores.get(id) ?? 0) + 2);
  }

  for (const lane of lanes) {
    if (!scores.has(lane.id)) continue;
    scores.set(lane.id, (scores.get(lane.id) ?? 0) + lane.count);
  }

  return HOUR_LANES.map((lane) => ({
    id: lane.id,
    label: lane.label,
    count: scores.get(lane.id) ?? 0,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function hostedSitsAttended(sits: HostedSit[], handle: string): number {
  const me = normalizeHandle(handle);
  if (!me) return sits.length;
  return sits.filter((sit) => {
    if (sit.hostHandle === me) return true;
    return sit.rsvps.some((row) => row.handle === me && row.status === "yes");
  }).length;
}

function daysPresent(
  progress: Record<string, WorkProgress>,
  byDay: Record<string, number>,
  now: number,
) {
  const since = dayKey(now - 6 * MS_DAY);
  const today = dayKey(now);
  const days = new Set<string>();
  for (const [key, minutes] of Object.entries(byDay)) {
    if (minutes > 0 && key >= since && key <= today) days.add(key);
  }
  for (const [id, item] of Object.entries(progress)) {
    if (id === "page" || !item.entered || !item.lastOpenedAt) continue;
    const key = dayKey(item.lastOpenedAt);
    if (key >= since && key <= today) days.add(key);
  }
  return days.size;
}

export function readinessFrom(input: {
  hasSignal: boolean;
  minutesToday: number;
  minutesWeek: number;
  sittingMinutes: number;
  daysPresent: number;
  kept: number;
  opened: number;
  completed: number;
}): Readiness {
  if (!input.hasSignal) {
    return {
      score: 0,
      label: "Unopened",
      line: "Sit once — minutes, keeps, and a quiet rhythm will gather here.",
    };
  }

  const sitTarget = input.sittingMinutes > 0 ? input.sittingMinutes : 20;
  const todayPart = Math.min(1, input.minutesToday / sitTarget);
  const weekPart = Math.min(1, input.minutesWeek / (sitTarget * 5));
  const consistency = Math.min(1, input.daysPresent / 7);
  const recency =
    input.minutesToday > 0 ? 1 : input.minutesWeek > 0 ? 0.45 : 0.15;
  const depth = Math.min(1, (input.kept + input.completed * 2 + input.opened) / 8);

  const score = Math.max(
    1,
    Math.min(
      100,
      Math.round(todayPart * 32 + weekPart * 18 + consistency * 28 + recency * 12 + depth * 10),
    ),
  );

  if (score < 25) {
    return { score, label: "Still", line: "A page is waiting when you are." };
  }
  if (score < 50) {
    return { score, label: "Opening", line: "The hour is gathering." };
  }
  if (score < 75) {
    return { score, label: "Present", line: "You have been here." };
  }
  if (score < 90) {
    return { score, label: "Settled", line: "The week holds a rhythm." };
  }
  return { score, label: "Deep", line: "The sitting is full." };
}

function ringMax(value: number, fallback: number) {
  return Math.max(fallback, value);
}

export function activityTimeline(input: {
  sitHistory: SitSession[];
  togetherKeeps: TogetherKeep[];
  hostedSits: HostedSit[];
  progress: Record<string, WorkProgress>;
  handle?: string;
}): ActivityItem[] {
  const items: ActivityItem[] = [];
  const me = normalizeHandle(input.handle ?? "");

  for (const sit of input.sitHistory) {
    items.push({
      at: sit.endedAt,
      kind: "sit",
      title: workTitle(sit.workId),
      detail:
        sit.minutes > 0
          ? sit.minutes < 1
            ? `${formatActiveMinutes(sit.minutes)} active`
            : `${formatMinutes(sit.minutes)} min active`
          : "Sit",
      workId: sit.workId,
    });
  }

  for (const keep of input.togetherKeeps) {
    items.push({
      at: keep.createdAt,
      kind: "together",
      title: keep.workTitle || workTitle(keep.workId),
      detail: `Kept with ${formatHandle(keep.theirs.handle) || "a friend"}`,
      workId: keep.workId,
    });
  }

  for (const sit of input.hostedSits) {
    if (me && !sitInvolves(sit, me) && sit.hostHandle !== me) continue;
    items.push({
      at: sit.endedAt ?? sit.createdAt,
      kind: "hosted",
      title: sit.workTitle || workTitle(sit.workId),
      detail: sit.hostHandle === me ? "Hosted a sit" : `Sat with ${formatHandle(sit.hostHandle)}`,
      workId: sit.workId,
    });
  }

  for (const [id, item] of Object.entries(input.progress)) {
    if (id === "page" || !item.completedAt) continue;
    items.push({
      at: item.completedAt,
      kind: "finished",
      title: workTitle(id),
      detail: "Finished",
      workId: id,
    });
  }

  return items.sort((a, b) => b.at - a.at).slice(0, 12);
}

function deskWorks(progress: Record<string, WorkProgress>): DeskWork[] {
  return Object.entries(progress)
    .filter(([id, item]) => id !== "page" && item.entered && !item.completedAt && item.breathIndex > 0)
    .map(([id, item]) => ({
      id,
      title: workTitle(id),
      author: workAuthor(id),
      breathIndex: item.breathIndex,
      lastOpenedAt: item.lastOpenedAt,
    }))
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, 4);
}

export function deriveReadingStats(input: {
  progress: Record<string, WorkProgress>;
  favorites: string[];
  readingMinutesByDay?: Record<string, number>;
  advancesByDay?: Record<string, number>;
  sceneCrossesByDay?: Record<string, number>;
  keepsByDay?: Record<string, number>;
  worksTouchedByDay?: Record<string, string[]>;
  hostOpensByDay?: Record<string, number>;
  sitsByDay?: Record<string, number>;
  clubTouchesByDay?: Record<string, number>;
  lastActiveReadAt?: number;
  sitHistory?: SitSession[];
  togetherKeeps?: TogetherKeep[];
  hostedSits?: HostedSit[];
  handle?: string;
  sittingMinutes?: number;
  now?: number;
}): ReadingStats {
  const progress = input.progress ?? {};
  const favorites = input.favorites ?? [];
  const favSet = new Set(favorites);
  const byDay = input.readingMinutesByDay ?? {};
  const sitHistory = input.sitHistory ?? [];
  const togetherKeeps = input.togetherKeeps ?? [];
  const hostedSits = input.hostedSits ?? [];
  const now = input.now ?? Date.now();
  const sittingMinutes = input.sittingMinutes ?? 20;

  const today = dayKey(now);
  const advancesByDay = input.advancesByDay ?? {};
  // Active minutes only. Breath-progress estimates used to stand in for a
  // missing ledger and would refill Today/Week after the wall-clock reset.
  const recordedAll = sumMap(byDay);
  const recordedToday = byDay[today] ?? 0;
  const recordedWeek = sumSince(byDay, dayKey(now - 6 * MS_DAY));
  const minutesAreEstimated = false;
  const minutesAll = recordedAll;
  const minutesToday = recordedToday;
  const minutesWeek = recordedWeek;
  const advancesToday = Math.max(0, Math.round(advancesByDay[today] ?? 0));
  const advancesAll = Object.values(advancesByDay).reduce(
    (sum, n) => sum + Math.max(0, Math.round(n) || 0),
    0,
  );
  const lastActiveReadAt =
    typeof input.lastActiveReadAt === "number" && input.lastActiveReadAt > 0
      ? input.lastActiveReadAt
      : 0;
  const avgGapSec =
    gapSeconds(recordedToday, advancesToday) ?? gapSeconds(recordedAll, advancesAll);

  const minutesByWork: Record<string, number> = {};
  for (const sit of sitHistory) {
    minutesByWork[sit.workId] = (minutesByWork[sit.workId] ?? 0) + sit.minutes;
  }

  const workIds = new Set<string>([
    ...Object.keys(progress).filter((id) => progress[id]?.entered),
    ...favorites,
    ...Object.keys(minutesByWork),
  ]);

  let opened = 0;
  let completed = 0;
  let kept = 0;
  for (const [id, item] of Object.entries(progress)) {
    if (id === "page" || !item.entered) continue;
    opened += 1;
    if (item.completedAt) completed += 1;
    kept += item.kept?.length ?? 0;
  }

  const streak = Math.max(progressStreak(progress, now), minutesStreak(byDay, now));
  const forms = topForms([...workIds], progress, favSet, minutesByWork);
  const origins = topOrigins([...workIds], progress, favSet, minutesByWork);
  const pace = paceFrom(sitHistory, progress, minutesAll, avgGapSec);
  const breaths = countBreaths(progress);
  const desk = deskWorks(progress);
  const lanes = ritualLanesUsed(workIds);
  const hourPattern = timeOfDayPattern(sitHistory, lanes);
  const weekDays = weekMinutesSeries(byDay, now);
  const hostedCount = hostedSitsAttended(hostedSits, input.handle ?? "");

  const hasSignal =
    opened > 0 ||
    favorites.length > 0 ||
    kept > 0 ||
    recordedAll > 0 ||
    advancesAll > 0 ||
    togetherKeeps.length > 0 ||
    hostedCount > 0;

  const readiness = readinessFrom({
    hasSignal,
    minutesToday,
    minutesWeek,
    sittingMinutes,
    daysPresent: daysPresent(progress, byDay, now),
    kept,
    opened,
    completed,
  });

  // Backfill host / sit / club day maps from history when ledgers are empty
  // (pre-score installs). Active minutes and advances already come from the
  // active-tap clock.
  const hostOpensByDay = { ...(input.hostOpensByDay ?? {}) };
  const sitsByDay = { ...(input.sitsByDay ?? {}) };
  const clubTouchesByDay = { ...(input.clubTouchesByDay ?? {}) };
  const worksTouchedByDay = { ...(input.worksTouchedByDay ?? {}) };
  const me = normalizeHandle(input.handle ?? "");
  if (Object.keys(hostOpensByDay).length === 0) {
    for (const sit of hostedSits) {
      if (!sit.createdAt) continue;
      if (me && sit.hostHandle === me) {
        const key = dayKey(sit.createdAt);
        hostOpensByDay[key] = (hostOpensByDay[key] ?? 0) + 1;
      }
    }
  }
  if (Object.keys(sitsByDay).length === 0) {
    for (const sit of sitHistory) {
      const key = dayKey(sit.endedAt);
      sitsByDay[key] = (sitsByDay[key] ?? 0) + 1;
    }
  }
  if (Object.keys(worksTouchedByDay).length === 0) {
    for (const sit of sitHistory) {
      const key = dayKey(sit.endedAt);
      const list = worksTouchedByDay[key] ?? [];
      if (sit.workId && !list.includes(sit.workId)) {
        worksTouchedByDay[key] = [...list, sit.workId];
      }
    }
  }
  if (Object.keys(clubTouchesByDay).length === 0) {
    for (const keep of togetherKeeps) {
      if (!keep.createdAt) continue;
      const key = dayKey(keep.createdAt);
      clubTouchesByDay[key] = (clubTouchesByDay[key] ?? 0) + 1;
    }
  }

  const { daily: dailyScore, weekly: weeklyScore, monthly: monthlyScore } =
    deriveWindowScores(
      {
        readingMinutesByDay: byDay,
        advancesByDay,
        sceneCrossesByDay: input.sceneCrossesByDay,
        keepsByDay: input.keepsByDay,
        worksTouchedByDay,
        hostOpensByDay,
        sitsByDay,
        clubTouchesByDay,
      },
      now,
    );

  const sitTarget = sittingMinutes > 0 ? sittingMinutes : 20;
  const rings: RingStat[] = [
    {
      id: "today",
      label: "Today",
      value: minutesToday,
      max: sitTarget,
      display: formatActiveMinutes(minutesToday),
      unit: activeMinuteUnit(minutesToday),
    },
    {
      id: "week",
      label: "This week",
      value: minutesWeek,
      max: sitTarget * 5,
      display: formatActiveMinutes(minutesWeek),
      unit: activeMinuteUnit(minutesWeek),
    },
    {
      id: "breaths",
      label: "Breaths",
      value: breaths,
      max: ringMax(breaths, 40),
      display: String(breaths),
      unit: breaths === 1 ? "sentence" : "sentences",
    },
    {
      id: "keeps",
      label: "Keeps",
      value: kept,
      max: ringMax(kept, 5),
      display: String(kept),
      unit: kept === 1 ? "line" : "lines",
    },
    {
      id: "lanes",
      label: "Lanes",
      value: lanes.length,
      max: ringMax(lanes.length, Math.max(1, HOUR_LANES.length)),
      display: String(lanes.length),
      unit: lanes.length === 1 ? "ritual" : "rituals",
    },
  ];

  const sits = sitHistory.length;
  const radar = buildRadarAxes({
    minutesToday,
    minutesWeek,
    breaths,
    kept,
    streak,
    sits,
    sittingMinutes,
    minutesAreEstimated,
  });

  return {
    hasSignal,
    minutesToday,
    minutesWeek,
    minutesAll,
    minutesAreEstimated,
    streak,
    pace,
    forms,
    origins,
    opened,
    completed,
    favorites: favorites.length,
    kept,
    readiness,
    dailyScore,
    weeklyScore,
    monthlyScore,
    breaths,
    advancesToday,
    advancesAll,
    lastActiveReadAt,
    inProgress: desk.length,
    togetherKeeps: togetherKeeps.length,
    hostedSits: hostedCount,
    lanes,
    hourPattern,
    weekDays,
    rings,
    radar,
    sits,
    activity: activityTimeline({
      sitHistory,
      togetherKeeps,
      hostedSits,
      progress,
      handle: input.handle,
    }),
    desk,
  };
}

export function formatMinutes(n: number) {
  if (n <= 0) return "0";
  if (n < 60) return String(Math.round(n));
  const whole = Math.round(n);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Active-read span. Sub-minute credit stays visible as seconds. */
export function formatActiveMinutes(n: number) {
  if (!(n > 0)) return "0";
  if (n < 1) return `${Math.max(1, Math.round(n * 60))}s`;
  return formatMinutes(n);
}

export function activeMinuteUnit(n: number) {
  return n > 0 && n < 1 ? "active" : "active min";
}

/** Mean gap between advances, for the pace tile. */
export function formatGap(seconds: number) {
  if (!(seconds > 0)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s apart`;
  const whole = Math.round(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return s ? `${m}m ${s}s apart` : `${m}m apart`;
}

export function formatGapShort(seconds: number | null) {
  if (seconds == null || !(seconds > 0)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const whole = Math.round(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function formLabel(form: ShelfForm) {
  return FORM_LABEL[form];
}

export function formatActivityWhen(at: number, now = Date.now()) {
  const delta = Math.max(0, now - at);
  if (delta < 60_000) return "Just now";
  if (delta < 60 * 60_000) {
    const mins = Math.round(delta / 60_000);
    return `${mins}m ago`;
  }
  if (delta < 24 * 60 * 60_000) {
    const hours = Math.round(delta / (60 * 60_000));
    return `${hours}h ago`;
  }
  const days = Math.round(delta / MS_DAY);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function streakLine(streak: number) {
  if (streak <= 0) return "No run just now — a sit can start one.";
  if (streak === 1) return "A sitting today. Tomorrow can join it, if you like.";
  return `A quiet run of ${streak} days.`;
}
