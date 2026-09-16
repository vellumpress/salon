import { WORKS, getWork, type Work } from "../catalog/works";
import type { ShelfState, WorkProgress } from "./storage";

export function continueWorks(state: Pick<ShelfState, "progress">): Work[] {
  return WORKS.filter((work) => {
    const item = state.progress[work.id];
    return Boolean(
      item?.entered && (item.paragraphIndex > 0 || item.scrollRatio > 0),
    );
  }).sort(
    (a, b) =>
      (state.progress[b.id]?.lastOpenedAt ?? 0) -
      (state.progress[a.id]?.lastOpenedAt ?? 0),
  );
}

export function favoriteWorks(state: Pick<ShelfState, "favorites">): Work[] {
  return state.favorites
    .map((id) => getWork(id))
    .filter((work): work is Work => Boolean(work));
}

export function shelfStats(state: ShelfState): {
  started: number;
  finished: number;
  favorites: number;
} {
  const values = Object.values(state.progress);
  return {
    started: values.filter((item) => item.entered).length,
    finished: values.filter((item) => Boolean(item.completedAt)).length,
    favorites: state.favorites.length,
  };
}

export function progressRatio(
  progress: WorkProgress | undefined,
  fallback = 200,
): number {
  if (!progress?.entered) return 0;
  if (progress.completedAt) return 1;
  if (progress.scrollRatio > 0) return Math.min(0.92, progress.scrollRatio);
  return Math.min(0.92, progress.paragraphIndex / Math.max(12, fallback));
}
