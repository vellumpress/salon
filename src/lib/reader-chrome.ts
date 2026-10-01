/**
 * Solo reader bottom bar: Keep, heart, Send, kept-sentence squares.
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
