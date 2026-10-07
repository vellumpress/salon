/**
 * Retired catalog ids. Saved progress, Kept lines, favorites, and share
 * links may still name the old id. Resolve them to the live book.
 */
export const WORK_ID_ALIASES: Readonly<Record<string, string>> = {
  immoralist: "the-immoralist",
};

export function canonicalWorkId(id: string): string {
  return WORK_ID_ALIASES[id] ?? id;
}

type ProgressRow = {
  lastOpenedAt?: number;
  kept?: string[];
};

type AliasState = {
  progress?: Record<string, ProgressRow>;
  favorites?: string[];
  lastShuffle?: string | null;
  readingNow?: { id: string } | null;
  worksTouchedByDay?: Record<string, string[]>;
  sitHistory?: { workId: string }[];
  togetherKeeps?: { workId: string }[];
  hostedSits?: { workId: string }[];
};

function preferProgress(current: ProgressRow | undefined, incoming: ProgressRow): ProgressRow {
  if (!current) return { ...incoming, kept: [...(incoming.kept ?? [])] };
  const winner = (incoming.lastOpenedAt ?? 0) > (current.lastOpenedAt ?? 0) ? incoming : current;
  const other = winner === incoming ? current : incoming;
  return {
    ...winner,
    kept: [...new Set([...(winner.kept ?? []), ...(other.kept ?? [])])],
  };
}

function remapProgress(progress: Record<string, ProgressRow>): Record<string, ProgressRow> {
  const next: Record<string, ProgressRow> = {};
  for (const [id, row] of Object.entries(progress)) {
    const key = canonicalWorkId(id);
    next[key] = preferProgress(next[key], row);
  }
  return next;
}

function remapIds(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const key = canonicalWorkId(id);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/** Rewrite retired work ids in a persisted reading snapshot. Idempotent. */
export function remapAliasedWorkIds<T extends AliasState>(state: T): T {
  if (!state || typeof state !== "object") return state;
  const next = { ...state };
  if (state.progress) next.progress = remapProgress(state.progress);
  if (state.favorites) next.favorites = remapIds(state.favorites);
  if (typeof state.lastShuffle === "string") next.lastShuffle = canonicalWorkId(state.lastShuffle);
  if (state.readingNow && typeof state.readingNow.id === "string") {
    next.readingNow = { ...state.readingNow, id: canonicalWorkId(state.readingNow.id) };
  }
  if (state.worksTouchedByDay) {
    const days: Record<string, string[]> = {};
    for (const [day, ids] of Object.entries(state.worksTouchedByDay)) days[day] = remapIds(ids);
    next.worksTouchedByDay = days;
  }
  if (state.sitHistory) {
    next.sitHistory = state.sitHistory.map((row) => ({ ...row, workId: canonicalWorkId(row.workId) }));
  }
  if (state.togetherKeeps) {
    next.togetherKeeps = state.togetherKeeps.map((row) => ({
      ...row,
      workId: canonicalWorkId(row.workId),
    }));
  }
  if (state.hostedSits) {
    next.hostedSits = state.hostedSits.map((row) => ({ ...row, workId: canonicalWorkId(row.workId) }));
  }
  return next;
}
