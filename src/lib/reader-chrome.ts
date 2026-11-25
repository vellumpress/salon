/**
 * Solo reader bottom bar: Keep, shelf, Send, kept-sentence squares.
 *
 * `still` is the immersive state — the bar is hidden. Page and breath taps
 * must never open it. Only the hourglass toggles it. A tap outside closes
 * it; the caller still turns the page.
 */

export type ReaderBarState = {
  /** True while Keep / Send / progress are hidden. */
  still: boolean;
  /** Hourglass sheet (page controls + sitting length) open with the bar. */
  navReveal: boolean;
};

export const closedReaderBar: ReaderBarState = {
  still: true,
  navReveal: false,
};

/**
 * iPhone logical viewport the bar interaction is exercised against.
 * Width stays inside a touch phone (not a desktop window).
 */
export const READER_PHONE_VIEWPORT = {
  width: 390,
  height: 844,
  hasTouch: true,
  isMobile: true,
} as const;

export type ReaderMark = "shown" | "hidden";

export type ReaderMarkEvent = "forward" | "back" | "scroll" | "reveal";

export type ReaderMarkState = {
  mark: ReaderMark;
  /** True after the first tap or scroll. A reveal stays until the next forward step or scroll. */
  started: boolean;
};

export const freshReaderMark: ReaderMarkState = {
  mark: "shown",
  started: false,
};

/** A quick pull toward the start of the book. Finger moves down the screen. */
export const MARK_REVEAL_PULL_PX = 72;
export const MARK_REVEAL_PULL_MS = 360;

/**
 * The mark row is up until reading starts.
 * The first tap or scroll hides it. A top-edge tap or a quick pull
 * toward the start brings it back. The next forward step, or another
 * reading scroll, hides it again. A back tap after that reveal leaves
 * it up, so Home is still there.
 * Opening the hourglass brings the row back while that sheet is open.
 * Closing the sheet, or reading again, hides it. See `readerMarkVisible`.
 */
export function reduceReaderMark(state: ReaderMarkState, event: ReaderMarkEvent): ReaderMarkState {
  if (event === "reveal") return { mark: "shown", started: true };
  if (!state.started) return { mark: "hidden", started: true };
  if (event === "forward" || event === "scroll") return { mark: "hidden", started: true };
  return state;
}

/**
 * The hourglass sheet lifts the mark row at the same moment it opens.
 * The row drops when the sheet closes. A forward step or reading scroll
 * drops it even if the sheet is still open. A top-edge reveal stays up
 * on its own, including after the sheet closes.
 */
export function readerMarkVisible(
  state: ReaderMarkState,
  hourglassOpen: boolean,
  readingResumed: boolean,
) {
  if (state.mark === "shown") return true;
  return hourglassOpen && !readingResumed;
}

export function markRevealPull(dy: number, dt: number) {
  return dy >= MARK_REVEAL_PULL_PX && dt >= 0 && dt <= MARK_REVEAL_PULL_MS;
}

export type ReaderBarTap = "page" | "outside" | "hourglass" | "chrome";

export function readerBarOpen(state: ReaderBarState) {
  return !state.still || state.navReveal;
}

/**
 * Page taps never reveal the bar. Hourglass opens it, and a second
 * hourglass tap closes it. Outside taps close it when it is open.
 */
export function reduceReaderBar(state: ReaderBarState, tap: ReaderBarTap): ReaderBarState {
  if (tap === "chrome") return state;
  if (tap === "hourglass") {
    return readerBarOpen(state) ? closedReaderBar : { still: false, navReveal: true };
  }
  if (!readerBarOpen(state)) return state;
  return closedReaderBar;
}
