/**
 * How the reader moves through the text. One mode at a time.
 * Missing or unreadable values are Scroll, including readers who never chose.
 * Stored beside text size, Daylight colors, and Center the line.
 */

export const MOVE_BY_KEY = "salon-move-by";

export type MoveBy = "scroll" | "tap";

export const MOVE_BY_DEFAULT: MoveBy = "scroll";

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

export function isMoveBy(value: string | null | undefined): value is MoveBy {
  return value === "scroll" || value === "tap";
}

/**
 * Missing key is Scroll. Anything other than an explicit "tap" is Scroll,
 * so a reader who never chose, and any old saved junk, stays on Scroll.
 */
export function readMoveBy(store: Store | null = defaultStore()): MoveBy {
  if (!store) return MOVE_BY_DEFAULT;
  try {
    const raw = store.getItem(MOVE_BY_KEY);
    if (raw == null) return MOVE_BY_DEFAULT;
    const value = raw.trim().toLowerCase();
    if (value === "tap") return "tap";
    return MOVE_BY_DEFAULT;
  } catch {
    return MOVE_BY_DEFAULT;
  }
}

export function writeMoveBy(mode: MoveBy, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(MOVE_BY_KEY, mode === "tap" ? "tap" : "scroll");
  } catch {
    /* private mode */
  }
}

/** A tap on the text steps a sentence only in Tap mode. */
export function textTapSteps(mode: MoveBy): boolean {
  return mode === "tap";
}

/**
 * Where the column sits after a finger drag.
 * Tap mode puts it back. Scroll mode keeps the drag.
 */
export function fingerScrollTop(mode: MoveBy, startTop: number, draggedTop: number): number {
  if (mode === "tap") return startTop;
  return draggedTop;
}

/**
 * A tap in the top band can reveal a hidden top bar.
 * `edgeBottom` is the bottom of that band in client pixels.
 * These taps are not sentence taps.
 */
export function isTopEdgeTap(clientY: number, edgeBottom: number): boolean {
  if (!Number.isFinite(clientY) || !Number.isFinite(edgeBottom)) return false;
  return clientY <= edgeBottom + 0.5;
}
