/**
 * A `?at=` link names a breath in the whole book. The opening excerpt is
 * shorter, so painting it first shows breath 0 and then jumps. Hold that
 * excerpt until the breath exists, and paint the link on the first frame.
 */

/** Breath a `?at=` link can show in this bind, or null when it is not here yet. */
export function pendingLinkAt(at: number | undefined, breathCount: number): number | null {
  if (typeof at !== "number" || !Number.isFinite(at) || at < 0) return null;
  const index = Math.floor(at);
  if (breathCount <= 0 || index >= breathCount) return null;
  return index;
}

/**
 * True while this bind is only the opening and `at` falls past it.
 * The reader stays on the title gate instead of painting breath 0.
 */
export function holdOpeningForAt(
  at: number | undefined,
  breathCount: number,
  complete: boolean,
  shelfBreaths?: number,
): boolean {
  if (typeof at !== "number" || !Number.isFinite(at) || at < 0) return false;
  if (Math.floor(at) < breathCount) return false;
  // A complete flag on a short opening still must not paint breath 0.
  // The shelf count is the whole book; this bind does not contain `at`.
  if (complete && (shelfBreaths == null || breathCount >= shelfBreaths)) return false;
  return true;
}

/**
 * Breath a tap should start from. The frame can show `?at=` before the store
 * has that breath. After the link is in the store, a burst of taps moves the
 * store before React paints, and the frame is the previous breath.
 */
export function adoptFrameIndex(input: {
  storeIndex: number;
  frameIndex: number | null;
  linkApplied: boolean;
  breathCount: number;
}): number {
  const store = Number.isFinite(input.storeIndex) ? Math.max(0, Math.floor(input.storeIndex)) : 0;
  const frame = input.frameIndex;
  const painted =
    frame == null || !Number.isFinite(frame) ? null : Math.floor(frame);
  // Hydration can put the store back on 0 while the frame still shows the
  // chapter a link painted. Stepping from that 0 sends the book home.
  if (store === 0 && painted != null && painted > 0 && painted < input.breathCount) return painted;
  if (input.linkApplied) return store;
  if (painted == null || painted === store || painted < 0 || painted >= input.breathCount) return store;
  return painted;
}

/**
 * Index to paint. Until the boot effect writes the link into the store,
 * the link wins, so the first frame is that breath. After that, the store
 * wins: a reload without `at`, a tap, and a sit already in progress.
 */
export function firstPaintIndex(input: {
  at?: number;
  breathCount: number;
  storedIndex: number;
  linkApplied: boolean;
}): number {
  const last = Math.max(0, input.breathCount - 1);
  const stored = Math.min(last, Math.max(0, Math.floor(input.storedIndex) || 0));
  const link = pendingLinkAt(input.at, input.breathCount);
  if (link !== null && !input.linkApplied) return link;
  return stored;
}

/**
 * `?at=` from the address. A recovered router tree can drop the search
 * param while the bar still has it. `0` is a real breath.
 */
export function atFromLocationSearch(search: string): number | null {
  const match = /(?:^|[?&])at=(\d+)(?:&|$)/.exec(search);
  if (!match) return null;
  return Number.parseInt(match[1]!, 10);
}

/**
 * The boot effect waits for the saved place before it writes `at`.
 * A tap in that gap has already moved the store. Writing the link, or the
 * chapter start, over that tap jumps the book back to the link or to 0.
 */
export function bootShouldKeepPlace(before: number, after: number): boolean {
  return after !== before;
}

/**
 * Sentence saved on this breath. `null` means this save has no sentence, so
 * the reader may still open the first sentence of the breath. A saved `0`
 * is that first sentence, not the start of the book.
 */
export function savedSentenceAt(
  progress: { breathIndex?: number; sentenceAt?: number } | null | undefined,
  breath: number,
): number | null {
  if (!progress || progress.breathIndex !== breath) return null;
  const at = progress.sentenceAt;
  if (typeof at !== "number" || !Number.isFinite(at) || at < 0) return null;
  return Math.floor(at);
}
