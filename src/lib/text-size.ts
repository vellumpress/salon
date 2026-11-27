/**
 * Reader text size. One continuous scale. 0.90 is the size for a reader
 * who has not chosen. A saved value is left as it is.
 */

export const TEXT_SIZE_KEY = "salon-text-size";
export const TEXT_SIZE_MIN = 0.72;
export const TEXT_SIZE_MAX = 1.85;
export const TEXT_SIZE_STEP = 0.01;
export const TEXT_SIZE_DEFAULT = 0.9;

/** The five steps this control used before it became a slider. */
const LEGACY_STEP = [0.84, 0.92, 1, 1.12, 1.26] as const;

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

function snap(value: number): number {
  const snapped = Math.round(value / TEXT_SIZE_STEP) * TEXT_SIZE_STEP;
  return Number(snapped.toFixed(2));
}

/** Pull a slider value onto the scale. Values outside it sit on the nearer end. */
export function clampTextSize(value: number): number {
  if (!Number.isFinite(value)) return TEXT_SIZE_DEFAULT;
  const next = snap(value);
  if (next < TEXT_SIZE_MIN) return TEXT_SIZE_MIN;
  if (next > TEXT_SIZE_MAX) return TEXT_SIZE_MAX;
  return next;
}

export function formatTextSize(value: number): string {
  return clampTextSize(value).toFixed(2);
}

/**
 * Missing key is the current size. A single digit 0–4 is a leftover step
 * from the earlier control. Anything else outside the scale is the current size.
 */
export function readTextSize(store: Store | null = defaultStore()): number {
  if (!store) return TEXT_SIZE_DEFAULT;
  try {
    const raw = store.getItem(TEXT_SIZE_KEY);
    if (raw == null) return TEXT_SIZE_DEFAULT;
    const value = raw.trim();
    if (value === "") return TEXT_SIZE_DEFAULT;
    if (/^[0-4]$/.test(value)) return LEGACY_STEP[Number(value)] ?? TEXT_SIZE_DEFAULT;
    const scale = Number(value);
    if (!Number.isFinite(scale) || scale < TEXT_SIZE_MIN || scale > TEXT_SIZE_MAX) {
      return TEXT_SIZE_DEFAULT;
    }
    return snap(scale);
  } catch {
    return TEXT_SIZE_DEFAULT;
  }
}

export function writeTextSize(scale: number, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(TEXT_SIZE_KEY, formatTextSize(scale));
  } catch {
    /* private mode */
  }
}
