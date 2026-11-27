/**
 * How much of a book is painted while someone is scrolling.
 * The page grows before the finger reaches the edge, and it only adds
 * lines. Dropping lines in the middle of a fling yanks the page backward.
 */

export type BreathRange = {
  /** First breath index painted. */
  from: number;
  /** One past the last breath index painted. */
  to: number;
};

export type ScrollEdges = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  /** Pixels of text to keep ready past the fold. */
  lead: number;
};

export function browseWindow(index: number, count: number, back: number, ahead: number): BreathRange {
  const last = Math.max(0, Math.floor(count));
  const at = Math.min(last, Math.max(0, Math.floor(index)));
  const from = Math.max(0, at - Math.max(0, Math.floor(back)));
  const to = Math.min(last, at + 1 + Math.max(0, Math.floor(ahead)));
  return { from, to };
}

/**
 * Add breaths in the direction the page is running out.
 * Returns the same range when the runway is already long enough, or the
 * book has no more lines that way.
 */
export function growBrowseRange(
  range: BreathRange,
  count: number,
  edges: ScrollEdges,
  step: number,
): BreathRange {
  const last = Math.max(0, Math.floor(count));
  const from0 = Math.max(0, Math.min(range.from, last));
  const to0 = Math.max(from0, Math.min(range.to, last));
  if (!(edges.clientHeight > 0) || !(edges.scrollHeight > 0)) return range;
  const lead = Number.isFinite(edges.lead) ? Math.max(0, edges.lead) : 0;
  const add = Math.max(1, Math.floor(step));
  const roomBelow = edges.scrollHeight - edges.scrollTop - edges.clientHeight;
  const roomAbove = edges.scrollTop;
  let from = from0;
  let to = to0;
  if (roomBelow < lead && to < last) to = Math.min(last, to + add);
  if (roomAbove < lead && from > 0) from = Math.max(0, from - add);
  if (from === range.from && to === range.to) return range;
  return { from, to };
}

/**
 * Lines drawn in one gulp. Enough to cover a fast flick, and short enough
 * that a slow phone does not spend the whole frame on it.
 */
export const SCROLL_GULP = 8;

/**
 * Add a few lines on the side the reader is moving toward.
 * It does not drop lines. Dropping and adding in the same breath moves the line.
 */
export function extendBrowseRange(
  range: BreathRange,
  count: number,
  edges: ScrollEdges,
  gulp: number,
  direction: "forward" | "back",
): BreathRange {
  const last = Math.max(0, Math.floor(count));
  let from = Math.max(0, Math.min(range.from, last));
  let to = Math.max(from, Math.min(range.to, last));
  if (!(edges.clientHeight > 0) || !(edges.scrollHeight > 0)) return range;
  const lead = Number.isFinite(edges.lead) ? Math.max(0, edges.lead) : 0;
  const add = Math.max(1, Math.floor(gulp));
  const roomBelow = edges.scrollHeight - edges.scrollTop - edges.clientHeight;
  const roomAbove = edges.scrollTop;
  if (direction !== "back" && roomBelow < lead && to < last) to = Math.min(last, to + add);
  else if (direction === "back" && roomAbove < lead && from > 0) from = Math.max(0, from - add);
  if (from === range.from && to === range.to) return range;
  return { from, to };
}

/**
 * How many leading blocks fit inside `budget` pixels, and no more than `gulp`.
 * The caller measures those blocks before removing them.
 */
export function prefixDropCount(heights: readonly number[], budget: number, gulp: number): number {
  if (!(budget > 0)) return 0;
  const cap = Math.max(0, Math.floor(gulp));
  let used = 0;
  let count = 0;
  for (const height of heights) {
    if (count >= cap) break;
    if (!(height > 0)) continue;
    if (used + height > budget) break;
    used += height;
    count += 1;
  }
  return count;
}

/**
 * Grow the side the reader is moving toward, and drop lines well behind
 * them. Pulling the other side back in the same breath puts the page in a
 * loop: drop the top, the scroll offset falls, and the page loads the top again.
 */
export function followBrowseRange(
  range: BreathRange,
  count: number,
  edges: ScrollEdges,
  step: number,
  direction: "forward" | "back",
): BreathRange {
  const last = Math.max(0, Math.floor(count));
  let from = Math.max(0, Math.min(range.from, last));
  let to = Math.max(from, Math.min(range.to, last));
  if (!(edges.clientHeight > 0) || !(edges.scrollHeight > 0)) return range;
  const lead = Number.isFinite(edges.lead) ? Math.max(0, edges.lead) : 0;
  const add = Math.max(1, Math.floor(step));
  const tail = Math.max(1, Math.floor(step / 6));
  const roomBelow = edges.scrollHeight - edges.scrollTop - edges.clientHeight;
  const roomAbove = edges.scrollTop;
  if (direction !== "back" && roomBelow < lead && to < last) to = Math.min(last, to + add);
  if (direction === "back" && roomAbove < lead && from > 0) from = Math.max(0, from - add);
  // Leave the first screenful alone. A short fling stays inside it, and
  // dropping those lines remounts the text the reader still has on screen.
  if (
    direction !== "back" &&
    to - from > add + tail &&
    edges.scrollTop >= edges.clientHeight * 6 &&
    from + tail < to
  ) {
    from = Math.min(to - 1, from + tail);
  }
  if (direction === "back" && to - from > add + tail && roomBelow >= edges.clientHeight * 6 && to - tail > from) {
    to = Math.max(from + 1, to - tail);
  }
  if (from === range.from && to === range.to) return range;
  return { from, to };
}

/**
 * Where to put scrollTop so a line stays on screen after the page above it
 * changes length. Browsers clamp scrollTop as soon as those lines unmount,
 * so the correction has to start from the offset taken before the change.
 */
export function restoredScrollTop(
  scrollTopNow: number,
  anchor: { top: number; scrollTop: number },
  offsetNow: number,
): number {
  const base = Number.isFinite(anchor.scrollTop) ? anchor.scrollTop : scrollTopNow;
  const next = base + (offsetNow - anchor.top);
  if (!Number.isFinite(next)) return Math.max(0, scrollTopNow);
  return Math.max(0, next);
}
