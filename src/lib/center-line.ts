import type { Breath, Work } from "./literature.ts";

/**
 * Reader preference: keep the current breath near the middle of the reading
 * area, with a short preview of what comes next. Stored beside Daylight colors.
 * Missing key is on. Only an explicit off value restores the bottom anchor.
 */
export const CENTER_LINE_KEY = "salon-center-line";

/**
 * Vertical center of the current breath, as a fraction of the reading pane
 * (the area between the top nav / safe area and the bottom bar).
 */
export const CENTER_LINE_ANCHOR = 0.475;

/**
 * Upcoming breaths drawn under the current line. Same bound as lookback so a
 * long book never mounts the rest of its text.
 */
export const UPCOMING_WINDOW = 12;

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

/** Missing key is on. Only an explicit off value pins the line to the bottom. */
export function readCenterLineEnabled(store: Store | null = defaultStore()): boolean {
  if (!store) return true;
  try {
    const raw = store.getItem(CENTER_LINE_KEY);
    if (raw == null) return true;
    const value = raw.trim().toLowerCase();
    if (value === "") return true;
    return value !== "0" && value !== "off" && value !== "false";
  } catch {
    return true;
  }
}

export function writeCenterLineEnabled(on: boolean, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(CENTER_LINE_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

/**
 * Next breaths in this scene only. Chapter and poem breaks clear the preview
 * the same way they clear lookback, and the scan stops at `limit`.
 */
export function upcomingBreaths(work: Work, index: number, limit = UPCOMING_WINDOW): Breath[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const current = work.breaths[index];
  if (!current) return [];
  const cap = Math.floor(limit);
  const out: Breath[] = [];
  const breaths = work.breaths;
  for (let i = index + 1; i < breaths.length && out.length < cap; i += 1) {
    const breath = breaths[i];
    if (!breath || breath.sceneId !== current.sceneId) break;
    out.push(breath);
  }
  return out;
}

/**
 * Translate so the breath's vertical center lands on the anchor.
 * `lineTop` is the breath's layout top inside the moving track (no transform).
 * A short lookback or a short preview still lands on the anchor — the caller
 * pads with empty space rather than letting the line jump to an edge.
 */
export function centerLineOffset(input: {
  paneHeight: number;
  lineTop: number;
  lineHeight: number;
  anchor?: number;
}): number {
  const paneHeight = input.paneHeight;
  if (!Number.isFinite(paneHeight) || paneHeight <= 0) return 0;
  const anchorRatio = input.anchor ?? CENTER_LINE_ANCHOR;
  const lineHeight = Number.isFinite(input.lineHeight) ? input.lineHeight : 0;
  const lineTop = Number.isFinite(input.lineTop) ? input.lineTop : 0;
  const anchorY = paneHeight * anchorRatio;
  return Math.round(anchorY - (lineTop + lineHeight / 2));
}

/**
 * Preview opacity. The nearest upcoming line is a touch fainter than the
 * nearest read line (0.5). The far edge stays readable — it is a preview,
 * not a fade to nothing.
 */
export function upcomingOpacity(index: number, count: number): number {
  if (count <= 1) return 0.4;
  const t = index / (count - 1);
  return 0.44 - t * 0.12;
}
