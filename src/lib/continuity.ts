import type { WorkProgress } from "./store";

export type LastReadProgress = {
  id: string;
  breathIndex: number;
  lastOpenedAt: number;
};

export type KeptRef = {
  workId: string;
  breathId: string;
  lastOpenedAt: number;
};

/** Most recently opened sitting (persisted progress). Skips imported `/page`. */
export function lastReadProgress(
  progress: Record<string, WorkProgress>,
): LastReadProgress | null {
  const row = Object.entries(progress)
    .filter(([id, item]) => Boolean(item?.entered) && id !== "page")
    .sort((a, b) => (b[1].lastOpenedAt ?? 0) - (a[1].lastOpenedAt ?? 0))[0];
  if (!row) return null;
  const [id, item] = row;
  return {
    id,
    breathIndex: Math.max(0, item.breathIndex ?? 0),
    lastOpenedAt: item.lastOpenedAt ?? 0,
  };
}

/** Kept breath ids, newest works first. Pass `Infinity` for the full collection. */
export function keptRefs(
  progress: Record<string, WorkProgress>,
  limit = 24,
): KeptRef[] {
  const rows: KeptRef[] = [];
  for (const [workId, item] of Object.entries(progress)) {
    if (workId === "page") continue;
    for (const breathId of item.kept ?? []) {
      if (!breathId) continue;
      rows.push({
        workId,
        breathId,
        lastOpenedAt: item.lastOpenedAt ?? 0,
      });
    }
  }
  rows.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  if (!Number.isFinite(limit)) return rows;
  return rows.slice(0, Math.max(0, Math.floor(limit)));
}
