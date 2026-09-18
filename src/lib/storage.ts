export type WorkProgress = {
  breathIndex: number;
  breathMigrated: boolean;
  paragraphIndex: number;
  scrollRatio: number;
  kept: string[];
  lastOpenedAt: number;
  entered: boolean;
  completedAt: number | null;
  sittingStartedAt: number | null;
  sittingMinutes: number | null;
};

export type ShelfState = {
  favorites: string[];
  progress: Record<string, WorkProgress>;
  fontSize: number;
  lastShuffle: string | null;
  sittingMinutes: number;
};

const KEY = "vellum-lite-v1";
const FONT_MIN = 18;
const FONT_MAX = 26;

export const EMPTY_PROGRESS: WorkProgress = {
  breathIndex: 0,
  breathMigrated: false,
  paragraphIndex: 0,
  scrollRatio: 0,
  kept: [],
  lastOpenedAt: 0,
  entered: false,
  completedAt: null,
  sittingStartedAt: null,
  sittingMinutes: null,
};

const initial: ShelfState = {
  favorites: [],
  progress: {},
  fontSize: 20,
  lastShuffle: null,
  sittingMinutes: 20,
};

function asKept(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeProgress(raw: Partial<WorkProgress> | undefined): WorkProgress {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PROGRESS };
  const hasBreath = typeof raw.breathIndex === "number" && Number.isFinite(raw.breathIndex);
  const paragraphIndex =
    typeof raw.paragraphIndex === "number" && Number.isFinite(raw.paragraphIndex)
      ? Math.max(0, Math.floor(raw.paragraphIndex))
      : 0;
  return {
    breathIndex: hasBreath ? Math.max(0, Math.floor(raw.breathIndex as number)) : 0,
    breathMigrated: raw.breathMigrated === true || hasBreath,
    paragraphIndex,
    scrollRatio:
      typeof raw.scrollRatio === "number" && Number.isFinite(raw.scrollRatio)
        ? Math.min(1, Math.max(0, raw.scrollRatio))
        : 0,
    kept: asKept(raw.kept),
    lastOpenedAt: typeof raw.lastOpenedAt === "number" ? raw.lastOpenedAt : 0,
    entered: Boolean(raw.entered),
    completedAt: typeof raw.completedAt === "number" ? raw.completedAt : null,
    sittingStartedAt:
      typeof raw.sittingStartedAt === "number" ? raw.sittingStartedAt : null,
    sittingMinutes:
      typeof raw.sittingMinutes === "number" ? raw.sittingMinutes : null,
  };
}

function normalizeState(parsed: Partial<ShelfState>): ShelfState {
  const progress: Record<string, WorkProgress> = {};
  if (parsed.progress && typeof parsed.progress === "object") {
    for (const [id, item] of Object.entries(parsed.progress)) {
      progress[id] = normalizeProgress(item);
    }
  }
  return {
    favorites: Array.isArray(parsed.favorites)
      ? parsed.favorites.filter((id): id is string => typeof id === "string")
      : [],
    progress,
    fontSize:
      typeof parsed.fontSize === "number" ? parsed.fontSize : initial.fontSize,
    lastShuffle: parsed.lastShuffle ?? null,
    sittingMinutes:
      typeof parsed.sittingMinutes === "number"
        ? parsed.sittingMinutes
        : initial.sittingMinutes,
  };
}

let state: ShelfState = load();
const listeners = new Set<() => void>();

function load(): ShelfState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    return normalizeState(JSON.parse(raw) as Partial<ShelfState>);
  } catch {
    return initial;
  }
}

function persist() {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

function setState(patch: Partial<ShelfState> | ((prev: ShelfState) => ShelfState)) {
  const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
  if (next === state) return;
  state = next;
  persist();
  listeners.forEach((fn) => fn());
}

export function getShelf(): ShelfState {
  return state;
}

export function subscribeShelf(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toggleFavorite(workId: string) {
  setState((prev) => {
    const has = prev.favorites.includes(workId);
    return {
      ...prev,
      favorites: has
        ? prev.favorites.filter((id) => id !== workId)
        : [...prev.favorites, workId],
    };
  });
}

export function markEntered(workId: string) {
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    if (current.entered) return prev;
    return {
      ...prev,
      progress: {
        ...prev.progress,
        [workId]: {
          ...current,
          entered: true,
          lastOpenedAt: Date.now(),
        },
      },
    };
  });
}

export function startSitting(workId: string, minutes: number, restart = true) {
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    const startedAt =
      minutes > 0
        ? restart || !current.sittingStartedAt
          ? Date.now()
          : current.sittingStartedAt
        : null;
    return {
      ...prev,
      sittingMinutes: minutes,
      progress: {
        ...prev.progress,
        [workId]: {
          ...current,
          entered: true,
          sittingMinutes: minutes,
          sittingStartedAt: startedAt,
          lastOpenedAt: Date.now(),
        },
      },
    };
  });
}

export function clearSitting(workId: string) {
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    if (!current.sittingStartedAt && !current.sittingMinutes) return prev;
    return {
      ...prev,
      progress: {
        ...prev.progress,
        [workId]: {
          ...current,
          sittingStartedAt: null,
          sittingMinutes: null,
        },
      },
    };
  });
}

export function endSitting(workId: string) {
  clearSitting(workId);
}

export function setBreath(
  workId: string,
  breathIndex: number,
  meta?: { paragraphIndex?: number; total?: number },
) {
  const index = Math.max(0, Math.floor(breathIndex));
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    const total = meta?.total;
    const scrollRatio =
      total && total > 1 ? Math.min(1, index / (total - 1)) : current.scrollRatio;
    const paragraphIndex = meta?.paragraphIndex ?? current.paragraphIndex;
    if (
      current.entered &&
      current.breathMigrated &&
      current.breathIndex === index &&
      current.paragraphIndex === paragraphIndex &&
      Math.abs(scrollRatio - current.scrollRatio) < 0.004
    ) {
      return prev;
    }
    return {
      ...prev,
      progress: {
        ...prev.progress,
        [workId]: {
          ...current,
          breathIndex: index,
          breathMigrated: true,
          paragraphIndex,
          scrollRatio,
          entered: true,
          lastOpenedAt: Date.now(),
        },
      },
    };
  });
}

export function toggleKept(workId: string, breathId: string) {
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    const has = current.kept.includes(breathId);
    return {
      ...prev,
      progress: {
        ...prev.progress,
        [workId]: {
          ...current,
          entered: true,
          kept: has
            ? current.kept.filter((id) => id !== breathId)
            : [...current.kept, breathId],
          lastOpenedAt: Date.now(),
        },
      },
    };
  });
}

export function completeWork(workId: string) {
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    if (current.completedAt) return prev;
    return {
      ...prev,
      progress: {
        ...prev.progress,
        [workId]: {
          ...current,
          entered: true,
          completedAt: Date.now(),
          lastOpenedAt: Date.now(),
        },
      },
    };
  });
}

export function saveProgress(workId: string, patch: Partial<WorkProgress>) {
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    const next = normalizeProgress({ ...current, ...patch });
    const samePlace =
      next.breathIndex === current.breathIndex &&
      next.paragraphIndex === current.paragraphIndex &&
      Math.abs(next.scrollRatio - current.scrollRatio) < 0.004 &&
      Boolean(next.completedAt) === Boolean(current.completedAt) &&
      next.kept.length === current.kept.length;
    if (current.entered && samePlace) return prev;
    return {
      ...prev,
      progress: {
        ...prev.progress,
        [workId]: {
          ...next,
          entered: true,
          lastOpenedAt: Date.now(),
        },
      },
    };
  });
}

export function setFontSize(next: number) {
  const fontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, next));
  setState((prev) => (prev.fontSize === fontSize ? prev : { ...prev, fontSize }));
}

export function setSittingMinutes(minutes: number) {
  setState((prev) =>
    prev.sittingMinutes === minutes ? prev : { ...prev, sittingMinutes: minutes },
  );
}

export function setLastShuffle(workId: string) {
  setState((prev) =>
    prev.lastShuffle === workId ? prev : { ...prev, lastShuffle: workId },
  );
}

export function getProgress(workId: string): WorkProgress {
  return state.progress[workId] ?? EMPTY_PROGRESS;
}

export { FONT_MIN, FONT_MAX };
