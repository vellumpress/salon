import { countryFor } from "@/lib/catalog/countries";
import { shelfWork, type ShelfForm } from "@/lib/catalog/shelf";
import {
  dayKey,
  readingStreak,
  type SitSession,
  type WorkProgress,
} from "@/lib/store";

export type FormCount = { form: ShelfForm; label: string; count: number };
export type OriginCount = { country: string; count: number };

export type PaceInfo = {
  label: string;
  detail: string;
  breathsPerMinute: number | null;
  avgSitMinutes: number | null;
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
};

const FORM_LABEL: Record<ShelfForm, string> = {
  novel: "Novels",
  stories: "Stories",
  play: "Plays",
  poem: "Poems",
  other: "Other",
};

const MS_DAY = 24 * 60 * 60 * 1000;

function sumMap(map: Record<string, number> | undefined) {
  if (!map) return 0;
  let total = 0;
  for (const n of Object.values(map)) total += n || 0;
  return Math.round(total * 4) / 4;
}

function sumSince(map: Record<string, number> | undefined, sinceKey: string) {
  if (!map) return 0;
  let total = 0;
  for (const [day, n] of Object.entries(map)) {
    if (day >= sinceKey) total += n || 0;
  }
  return Math.round(total * 4) / 4;
}

/** Rough minutes from breath progress × shelf length when no sits recorded yet. */
function estimateMinutes(progress: Record<string, WorkProgress>) {
  let total = 0;
  for (const [workId, item] of Object.entries(progress)) {
    if (!item.entered || item.breathIndex <= 0) continue;
    const work = shelfWork(workId);
    if (!work) continue;
    const breaths = Math.max(
      1,
      work.breaths ?? Math.max(40, Math.round(work.minutes * 8)),
    );
    const ratio = Math.min(1, item.breathIndex / breaths);
    total += ratio * work.minutes;
  }
  return Math.round(total);
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

function paceFrom(
  sitHistory: SitSession[],
  progress: Record<string, WorkProgress>,
  minutesAll: number,
): PaceInfo {
  const sessions = sitHistory ?? [];
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
  } else if (breathsPerMinute != null) {
    if (breathsPerMinute >= 2.5) label = "Quick sits";
    else if (breathsPerMinute <= 0.8) label = "Long sits";
  }

  const detailParts: string[] = [];
  if (breathsPerMinute != null) detailParts.push(`${breathsPerMinute} breaths/min`);
  if (avgSit != null) detailParts.push(`~${Math.round(avgSit)} min sits`);

  return {
    label,
    detail: detailParts.join(" · ") || "After a few sits, pace appears here.",
    breathsPerMinute,
    avgSitMinutes: avgSit != null ? Math.round(avgSit * 10) / 10 : null,
  };
}

function minutesStreak(readingMinutesByDay: Record<string, number> | undefined) {
  const map = readingMinutesByDay ?? {};
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - MS_DAY);
  let cursor: string | null =
    map[today] > 0 ? today : map[yesterday] > 0 ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (cursor && (map[cursor] ?? 0) > 0) {
    streak += 1;
    const [y, m, d] = cursor.split("-").map(Number);
    const prev = new Date(y!, m! - 1, d!);
    prev.setDate(prev.getDate() - 1);
    cursor = dayKey(prev.getTime());
  }
  return streak;
}

export function deriveReadingStats(input: {
  progress: Record<string, WorkProgress>;
  favorites: string[];
  readingMinutesByDay?: Record<string, number>;
  sitHistory?: SitSession[];
}): ReadingStats {
  const progress = input.progress ?? {};
  const favorites = input.favorites ?? [];
  const favSet = new Set(favorites);
  const byDay = input.readingMinutesByDay ?? {};
  const sitHistory = input.sitHistory ?? [];

  const today = dayKey(Date.now());
  const recordedAll = sumMap(byDay);
  const recordedToday = byDay[today] ?? 0;
  const recordedWeek = sumSince(byDay, dayKey(Date.now() - 6 * MS_DAY));

  const estimated = recordedAll <= 0 ? estimateMinutes(progress) : 0;
  const minutesAreEstimated = recordedAll <= 0 && estimated > 0;
  const minutesAll = recordedAll > 0 ? recordedAll : estimated;
  const minutesToday = recordedAll > 0 ? recordedToday : 0;
  const minutesWeek = recordedAll > 0 ? recordedWeek : estimated;

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

  const streak = Math.max(readingStreak(progress), minutesStreak(byDay));
  const forms = topForms([...workIds], progress, favSet, minutesByWork);
  const origins = topOrigins([...workIds], progress, favSet, minutesByWork);
  const pace = paceFrom(sitHistory, progress, minutesAll);

  const hasSignal =
    opened > 0 ||
    favorites.length > 0 ||
    kept > 0 ||
    recordedAll > 0 ||
    estimated > 0;

  return {
    hasSignal,
    minutesToday: Math.round(minutesToday),
    minutesWeek: Math.round(minutesWeek),
    minutesAll: Math.round(minutesAll),
    minutesAreEstimated,
    streak,
    pace,
    forms,
    origins,
    opened,
    completed,
    favorites: favorites.length,
    kept,
  };
}

export function formatMinutes(n: number) {
  if (n <= 0) return "0";
  if (n < 60) return String(n);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formLabel(form: ShelfForm) {
  return FORM_LABEL[form];
}
