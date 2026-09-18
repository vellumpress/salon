import { hashSeed } from "./mondrian.ts";

/** In-memory only — a full reload mints a new mix. Not written to storage. */
let visitSeed = 0;

export function peekVisitSeed() {
  return visitSeed;
}

export function ensureVisitSeed() {
  if (visitSeed === 0 && typeof window !== "undefined") {
    visitSeed = ((Math.random() * 0xffffffff) >>> 0) || 1;
  }
  return visitSeed;
}

export function mixSeed(visit: number, lane: string) {
  if (visit === 0) return 0;
  return (visit ^ hashSeed(lane)) >>> 0;
}

/** Fisher–Yates with a seeded mulberry-style step. Does not mutate `items`. */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const next = items.slice();
  let h = seed >>> 0;
  for (let i = next.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    const j = h % (i + 1);
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

/** Seed `0` keeps catalog order (SSR / first paint). Otherwise shuffle, then slice. */
export function takeShuffled<T>(
  items: readonly T[],
  seed: number,
  count?: number,
): T[] {
  const mixed = seed === 0 ? items.slice() : shuffleWithSeed(items, seed);
  return count == null ? mixed : mixed.slice(0, count);
}
