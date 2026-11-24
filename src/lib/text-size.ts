/**
 * Reader text size. Five steps, and the middle one is the size the page
 * already used. Stored beside Daylight colors and Center the line.
 * Missing or unreadable values stay on that middle step.
 */

export const TEXT_SIZE_KEY = "salon-text-size";
export const TEXT_SIZE_COUNT = 5;
export const TEXT_SIZE_DEFAULT = 2;

/** Multipliers of the current breath size. Step 2 is 1, so it does not change the page. */
export const TEXT_SIZE_SCALE = [0.84, 0.92, 1, 1.12, 1.26] as const;

export type TextSizeStep = 0 | 1 | 2 | 3 | 4;

type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isTextSizeStep(value: number): value is TextSizeStep {
  return Number.isInteger(value) && value >= 0 && value < TEXT_SIZE_COUNT;
}

/** Missing key is the current size. Anything else unreadable is that same step. */
export function readTextSize(store: Store | null = defaultStore()): TextSizeStep {
  if (!store) return TEXT_SIZE_DEFAULT;
  try {
    const raw = store.getItem(TEXT_SIZE_KEY);
    if (raw == null) return TEXT_SIZE_DEFAULT;
    const value = raw.trim();
    if (value === "") return TEXT_SIZE_DEFAULT;
    const step = Number(value);
    return isTextSizeStep(step) ? step : TEXT_SIZE_DEFAULT;
  } catch {
    return TEXT_SIZE_DEFAULT;
  }
}

export function writeTextSize(step: TextSizeStep, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(TEXT_SIZE_KEY, String(step));
  } catch {
    /* private mode */
  }
}

export function textSizeScale(step: TextSizeStep): number {
  return TEXT_SIZE_SCALE[step];
}
