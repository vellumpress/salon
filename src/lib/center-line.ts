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
 * Prior breaths in the column, including the chapter or poem just above.
 * The window is still `limit` breaths. A break inside it is a signpost,
 * not a cut that leaves the page blank.
 */
export function lookbackBreaths(work: Work, index: number, limit = 12): Breath[] {
  const current = work.breaths[index];
  if (!current) return [];
  const start = Math.max(0, index - Math.max(0, Math.floor(limit)));
  const slice = work.breaths.slice(start, index);
  // The window can end exactly on a chapter's first line. Keep the last
  // line of the chapter above, so a scroll back is not a wall.
  const before = start > 0 ? work.breaths[start - 1] : undefined;
  const first = slice[0];
  if (before && first && before.sceneId !== first.sceneId) return [before, ...slice];
  return slice;
}

/**
 * The next breaths under the line, including the next chapter or poem.
 * The scan stops at `limit`, and at the end of the book. A chapter break
 * is a signpost in the column, not a place the page runs out.
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
    if (!breath) break;
    out.push(breath);
  }
  // A chapter of exactly `cap` breaths ends on the last line of this window.
  // Shallow Soil's prologue is one of those. Include the next chapter's
  // first line so the boundary is on the page, not one past it.
  const edge = breaths[index + 1 + out.length];
  const last = out[out.length - 1];
  if (edge && last && edge.sceneId !== last.sceneId) out.push(edge);
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
/**
 * Three fixed bands of the reader viewport below the status bar.
 * The ratio does not follow the sentence: each band is one third of the
 * area under `leadPx`, and the middle band is the sharp one.
 * On a phone whose status bar and mark row are about 13% of the screen,
 * that middle band sits near 42% to 70% of the screen height.
 */
export function focusBands(
  paneHeight: number,
  leadPx = 0,
): { read: { top: number; bottom: number }; now: { top: number; bottom: number }; next: { top: number; bottom: number } } {
  const empty = { top: 0, bottom: 0 };
  if (!Number.isFinite(paneHeight) || paneHeight <= 0) {
    return { read: empty, now: empty, next: empty };
  }
  const lead = Number.isFinite(leadPx) ? Math.min(paneHeight, Math.max(0, leadPx)) : 0;
  const third = (paneHeight - lead) / 3;
  return {
    read: { top: lead, bottom: lead + third },
    now: { top: lead + third, bottom: lead + 2 * third },
    next: { top: lead + 2 * third, bottom: paneHeight },
  };
}

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

