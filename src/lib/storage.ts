export type WorkProgress = {
  paragraphIndex: number;
  scrollRatio: number;
  lastOpenedAt: number;
  entered: boolean;
  completedAt: number | null;
};

export type ShelfState = {
  favorites: string[];
  progress: Record<string, WorkProgress>;
  fontSize: number;
  lastShuffle: string | null;
};

const KEY = "vellum-lite-v1";
const FONT_MIN = 18;
const FONT_MAX = 26;

export const EMPTY_PROGRESS: WorkProgress = {
  paragraphIndex: 0,
  scrollRatio: 0,
  lastOpenedAt: 0,
  entered: false,
  completedAt: null,
};

const initial: ShelfState = {
  favorites: [],
  progress: {},
  fontSize: 20,
  lastShuffle: null,
};

let state: ShelfState = load();
const listeners = new Set<() => void>();

function load(): ShelfState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<ShelfState>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      progress:
        parsed.progress && typeof parsed.progress === "object"
          ? parsed.progress
          : {},
      fontSize:
        typeof parsed.fontSize === "number" ? parsed.fontSize : initial.fontSize,
      lastShuffle: parsed.lastShuffle ?? null,
    };
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

export function saveProgress(workId: string, patch: Partial<WorkProgress>) {
  setState((prev) => {
    const current = prev.progress[workId] ?? EMPTY_PROGRESS;
    const paragraphIndex = patch.paragraphIndex ?? current.paragraphIndex;
    const scrollRatio = patch.scrollRatio ?? current.scrollRatio;
    const completedAt =
      patch.completedAt !== undefined ? patch.completedAt : current.completedAt;
    const samePlace =
      paragraphIndex === current.paragraphIndex &&
      Math.abs(scrollRatio - current.scrollRatio) < 0.004 &&
      Boolean(completedAt) === Boolean(current.completedAt);
    if (current.entered && samePlace) return prev;
    return {
      ...prev,
      progress: {
        ...prev.progress,
        [workId]: {
          ...current,
          ...patch,
          paragraphIndex,
          scrollRatio,
          completedAt,
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

export function setLastShuffle(workId: string) {
  setState((prev) =>
    prev.lastShuffle === workId ? prev : { ...prev, lastShuffle: workId },
  );
}

export function getProgress(workId: string): WorkProgress {
  return state.progress[workId] ?? EMPTY_PROGRESS;
}

export { FONT_MIN, FONT_MAX };
