import { isDeviceImport } from "./import/private.ts";

/** Windows reserved inside one sentence so a later window still moves the bar. */
const WINDOW_SLOTS = 32;

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/**
 * Breaths in the whole book. An opening bind is shorter than the shelf
 * count; the bar still measures against the shelf. An imported PDF is the
 * file itself.
 */
export function readingLength(id: string, loaded: number, shelfBreaths?: number | null): number {
  const count = Number.isFinite(loaded) ? Math.max(0, Math.floor(loaded)) : 0;
  if (isDeviceImport(id)) return Math.max(1, count);
  const shelf =
    shelfBreaths != null && Number.isFinite(shelfBreaths) ? Math.max(0, Math.floor(shelfBreaths)) : 0;
  return Math.max(1, count, shelf);
}

/** First breath of each scene, in order. Chapter ticks sit on these. */
export function chapterStartOffsets(breaths: readonly { sceneId: string }[]): number[] {
  const starts: number[] = [];
  let prev: string | null = null;
  for (let i = 0; i < breaths.length; i += 1) {
    const id = breaths[i]?.sceneId ?? "";
    if (id === prev) continue;
    starts.push(i);
    prev = id;
  }
  return starts;
}

export type ReadingProgressInput = {
  index: number;
  sentenceAt: number;
  sentenceCount: number;
  window: number;
  length: number;
};

/**
 * Position in the whole book, 0 at the opening window.
 * A later breath, sentence, or window is a larger fraction.
 */
export function readingProgressRatio(input: ReadingProgressInput): number {
  const length = Math.max(1, clampInt(input.length, 1, 1_000_000));
  const index = clampInt(input.index, 0, length - 1);
  const sentences = Math.max(1, clampInt(input.sentenceCount, 1, 10_000));
  const at = clampInt(input.sentenceAt, 0, sentences - 1);
  const window = clampInt(input.window, 0, WINDOW_SLOTS - 1);
  const sentenceShare = 1 / sentences;
  const windowShare = sentenceShare / WINDOW_SLOTS;
  if (index === length - 1 && at === sentences - 1 && window === WINDOW_SLOTS - 1) return 1;
  const place = index + at * sentenceShare + window * windowShare;
  return Math.min(1, Math.max(0, place / length));
}

/** Chapter boundaries as percentages along the bar. The opening is the bar's start. */
export function chapterTickPercents(starts: readonly number[], length: number): number[] {
  const total = Math.max(1, clampInt(length, 1, 1_000_000));
  const seen = new Set<string>();
  const ticks: number[] = [];
  for (const start of starts) {
    if (!Number.isFinite(start) || start <= 0 || start >= total) continue;
    const pct = (start / total) * 100;
    const key = pct.toFixed(4);
    if (seen.has(key)) continue;
    seen.add(key);
    ticks.push(pct);
  }
  return ticks;
}
