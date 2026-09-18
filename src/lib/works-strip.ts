import type { ShelfWork } from "./catalog/shelf.ts";
import { mixSeed, takeShuffled } from "./recommend.ts";

/** First paint and each append. Thin enough to stay a strip, long enough to overflow. */
export const STRIP_BATCH = 16;

/** Load the next cycle when this much of the tail is in view. */
export const STRIP_PRELOAD_PX = 360;

export const STRIP_CYCLE_CAP = 6;

/** Pixels per second — slow enough to read as a hint, not a marquee. */
export const STRIP_DRIFT_PX_PER_SEC = 14;

/** Let the home settle before the strip starts to move. */
export const STRIP_DRIFT_START_MS = 800;

/** Cap a rAF hitch so a backgrounded tab does not jump. */
export const STRIP_DRIFT_MAX_STEP_MS = 48;

export function stripDriftDelta(
  elapsedMs: number,
  speed = STRIP_DRIFT_PX_PER_SEC,
  maxStepMs = STRIP_DRIFT_MAX_STEP_MS,
) {
  if (!(elapsedMs > 0) || speed <= 0) return 0;
  return (speed * Math.min(elapsedMs, maxStepMs)) / 1000;
}

export type StripItem = {
  key: string;
  work: ShelfWork;
};

/**
 * Window into an endless shelf: shuffled cycles of `pool`, appended in order.
 * Seed `0` keeps catalog order (SSR / first paint), matching other mix lanes.
 */
export function stripItems(
  pool: readonly ShelfWork[],
  seed: number,
  count: number,
): StripItem[] {
  if (pool.length === 0 || count <= 0) return [];
  const cycles = new Map<number, ShelfWork[]>();
  const mix = (cycle: number) => {
    let mixed = cycles.get(cycle);
    if (!mixed) {
      mixed = takeShuffled(pool, mixSeed(seed, `strip-${cycle}`));
      cycles.set(cycle, mixed);
    }
    return mixed;
  };
  const out: StripItem[] = [];
  const limit = Math.min(count, pool.length * STRIP_CYCLE_CAP);
  for (let i = 0; i < limit; i++) {
    const cycle = Math.floor(i / pool.length);
    const work = mix(cycle)[i % pool.length];
    if (!work) break;
    out.push({ key: `${cycle}:${work.id}`, work });
  }
  return out;
}

export function nextStripCount(current: number, poolSize: number, batch = STRIP_BATCH) {
  if (poolSize <= 0) return current;
  const cap = poolSize * STRIP_CYCLE_CAP;
  if (current >= cap) return current;
  return Math.min(cap, current + batch);
}
