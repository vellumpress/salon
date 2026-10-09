import type { Breath, Work } from "./literature.ts";

/**
 * Reader preference: keep the current breath low in the reading area, with a
 * short preview of what comes next. Stored beside Daylight colors.
 * Missing key is on. Only an explicit off value restores the bottom anchor.
 */
export const CENTER_LINE_KEY = "salon-center-line";

/**
 * Vertical center of the current breath, as a fraction of the reading pane
 * (the area between the top nav / safe area and the bottom bar).
 * Already-read lines fill the space above this; the next lines sit below.
 */
export const CENTER_LINE_ANCHOR = 0.64;

/**
 * Upcoming breaths drawn under the current line. Enough to fill the space
 * below a 64% anchor on a tall phone, including the band behind the hourglass,
 * without mounting the rest of the book. Lookback stays the shorter window.
 */
export const UPCOMING_WINDOW = 20;

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
 * A breath whose center sits on the anchor stays inside the pane only while
 * it is no taller than the shorter side of that anchor. Past that — and past
 * 90% of the pane — it scrolls in place instead of clipping.
 */
/**
 * Y of the focus anchor inside a pane that may run behind the hourglass
 * and up through the status bar.
 * `overlapPx` is the bottom band (hourglass row plus the home indicator).
 * `leadPx` is the top band (mark row plus the status-bar inset). The anchor
 * stays 64% of the reading area between those bands, so extending the column
 * does not move the focus line.
 */
export function focusAnchorPx(
  paneHeight: number,
  overlapPx = 0,
  anchor = CENTER_LINE_ANCHOR,
  leadPx = 0,
): number {
  if (!Number.isFinite(paneHeight) || paneHeight <= 0) return 0;
  const overlap = Number.isFinite(overlapPx) ? Math.min(paneHeight, Math.max(0, overlapPx)) : 0;
  const room = paneHeight - overlap;
  const lead = Number.isFinite(leadPx) ? Math.min(room, Math.max(0, leadPx)) : 0;
  return lead + (room - lead) * anchor;
}

export function breathTooTall(scrollHeight: number, paneHeight: number, anchor = CENTER_LINE_ANCHOR): boolean {
  if (!Number.isFinite(paneHeight) || paneHeight <= 0) return false;
  if (!Number.isFinite(scrollHeight) || scrollHeight <= 0) return false;
  const anchorPx = paneHeight * anchor;
  const fitLimit = 2 * Math.min(anchorPx, Math.max(0, paneHeight - anchorPx));
  return scrollHeight > Math.min(paneHeight * 0.9, fitLimit);
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
 * Preview opacity. The nearest upcoming line is fainter than a just-read
 * line, and a single soft blur on the upcoming slot (styles.css) does the
 * rest of the defocus. The far edge stays a readable shape.
 */
export function upcomingOpacity(index: number, count: number): number {
  if (count <= 1) return 0.36;
  const t = index / (count - 1);
  return 0.4 - t * 0.1;
}
