import { remapBreathId, type BreathRemap } from "./kept-lines.ts";

/**
 * Breath count of the bind a re-bind replaces, keyed by shelf work id
 * (`falcon`, not the title). `falcon: 6154` is the sentence bind the
 * paragraph bind replaced. Tiny on purpose, so a legacy index can notice
 * the re-bind without parsing the remap file. Once the save is stamped
 * with the new count, this row is ignored.
 */
export const REBOUND_FROM_COUNT: Readonly<Record<string, number>> = {
  falcon: 6154,
};

export type FromCountTable = Readonly<Record<string, number>>;

export function reboundFromCount(workId: string, table: FromCountTable = REBOUND_FROM_COUNT): number | undefined {
  const n = table[workId];
  if (n == null || !Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

/** A save from before the guard: index only, no breath id, count, or hash. */
export function isUnstampedPlace(stored: StoredPlace | undefined): boolean {
  if (!stored) return true;
  if (stored.bindHash) return false;
  if (stored.breathId?.trim()) return false;
  if (stored.breathCount != null && stored.breathCount > 0) return false;
  return true;
}

/**
 * Where a reader was, plus the bind that index belonged to.
 * Older saves have only `breathIndex`.
 */
export type StoredPlace = {
  breathIndex?: number;
  breathId?: string;
  breathCount?: number;
  bindHash?: string;
};

export type PlaceBreath = {
  id: string;
  sceneId?: string;
  text?: string;
};

export type PlaceStamp = {
  breathId: string;
  breathCount: number;
  bindHash: string;
};

export type ReanchorResult = PlaceStamp & {
  index: number;
  /** The index changed because this bind is not the one that was saved. */
  moved: boolean;
};

function clampIndex(index: number, count: number) {
  if (count <= 0) return 0;
  const at = Number.isFinite(index) ? Math.floor(index) : 0;
  return Math.max(0, Math.min(count - 1, at));
}

/** Stable id of a bind: the breath ids, in order. */
export function bindHash(breaths: readonly { id: string }[]): string {
  let hash = 5381;
  for (const breath of breaths) {
    const id = breath.id;
    for (let i = 0; i < id.length; i += 1) {
      hash = ((hash << 5) + hash) ^ id.charCodeAt(i);
    }
    hash = ((hash << 5) + hash) ^ 31;
  }
  return (hash >>> 0).toString(36);
}

export function placeStamp(breaths: readonly { id: string }[], index: number): PlaceStamp {
  const at = clampIndex(index, breaths.length);
  return {
    breathId: breaths[at]?.id ?? "",
    breathCount: breaths.length,
    bindHash: bindHash(breaths),
  };
}

function sceneIdFromBreathId(id: string): string {
  const match = /^(.*)-\d+$/.exec(id.trim());
  return match?.[1] ?? "";
}

function chapterStart(breaths: readonly PlaceBreath[], sceneId: string): number {
  if (!sceneId) return 0;
  const at = breaths.findIndex((breath) => breath.sceneId === sceneId);
  return at >= 0 ? at : 0;
}

function parseSceneBreath(id: string): [number, number] | null {
  const match = /^s(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

/** Earliest index from which breath ids increase by scene, then number. */
function sortedSuffixStart(keys: readonly string[]): number {
  let start = keys.length;
  let next: [number, number] | null = null;
  for (let i = keys.length - 1; i >= 0; i -= 1) {
    const cur = parseSceneBreath(keys[i] ?? "");
    if (!cur) break;
    if (next && (cur[0] > next[0] || (cur[0] === next[0] && cur[1] > next[1]))) break;
    start = i;
    next = cur;
  }
  return start;
}

const legacyOrderCache = new WeakMap<object, readonly string[] | null>();

/**
 * Old breath ids in reading order, rebuilt from a remap whose entries were
 * written in that order after a short chain prefix. Ids the remap omits
 * (a paragraph that kept its sentence id) are filled back into the gaps.
 * Returns null when that order is not the old bind's length.
 */
function legacyBreathOrder(table: Readonly<Record<string, string>>, oldCount: number): readonly string[] | null {
  const cached = legacyOrderCache.get(table);
  if (cached !== undefined) return cached && cached.length === oldCount ? cached : null;
  const keys = Object.keys(table);
  const ordered = keys.slice(sortedSuffixStart(keys));
  const known = new Set(keys);
  const seq: string[] = [];
  let prev: [number, number] | null = null;
  for (const key of ordered) {
    const parsed = parseSceneBreath(key);
    if (!parsed) {
      legacyOrderCache.set(table, null);
      return null;
    }
    const from = !prev || prev[0] !== parsed[0] ? 0 : prev[1] + 1;
    for (let n = from; n < parsed[1]; n += 1) {
      const id = `s${parsed[0]}-${n}`;
      if (!known.has(id)) seq.push(id);
    }
    seq.push(key);
    prev = parsed;
  }
  legacyOrderCache.set(table, seq);
  return seq.length === oldCount ? seq : null;
}

/**
 * The paragraph that holds the sentence a legacy index was on.
 * Falls through when the remap cannot rebuild that old bind.
 */
function legacyParagraphIndex(
  remap: BreathRemap | undefined,
  workId: string,
  index: number,
  breaths: readonly PlaceBreath[],
  oldCount: number,
): number | undefined {
  const table = workId ? remap?.byWork[workId] : undefined;
  if (!table || oldCount <= 0) return undefined;
  const order = legacyBreathOrder(table, oldCount);
  if (!order) return undefined;
  const at = Math.max(0, Math.min(oldCount - 1, Math.floor(index)));
  const oldId = order[at];
  if (!oldId) return undefined;
  const mapped = remapBreathId(remap, workId, oldId) ?? oldId;
  const found = breaths.findIndex((breath) => breath.id === mapped);
  return found >= 0 ? found : undefined;
}

/** Map an index from the old bind onto the new one, by proportion. */
export function scaleBreathIndex(index: number, oldCount: number, newCount: number): number {
  if (newCount <= 0) return 0;
  if (oldCount <= 1 || newCount <= 1) return 0;
  const at = Math.max(0, Math.min(oldCount - 1, Math.floor(index)));
  const scaled = Math.round((at * (newCount - 1)) / (oldCount - 1));
  return Math.max(0, Math.min(newCount - 1, scaled));
}

function oldCountOf(
  stored: StoredPlace | undefined,
  remap: BreathRemap | undefined,
  workId: string,
  fromCounts?: FromCountTable,
): number | undefined {
  // A stamp is the bind this index was saved against. It wins over the
  // table so a reader who already moved is not migrated again.
  if (stored?.breathCount != null && stored.breathCount > 0) return stored.breathCount;
  const listed = reboundFromCount(workId, fromCounts);
  if (listed != null) return listed;
  const declared = remap?.fromCount?.[workId];
  if (declared != null && declared > 0) return declared;
  return undefined;
}

function finish(
  breaths: readonly PlaceBreath[],
  index: number,
  moved: boolean,
): ReanchorResult {
  const stamp = placeStamp(breaths, index);
  return { ...stamp, index: clampIndex(index, breaths.length), moved };
}

/**
 * The saved index is trusted only while the bind's id and count still match.
 * After a re-bind: follow the remap, then the breath id, then the paragraph
 * that held that sentence, then scale by the old count, then the chapter start.
 */
export function reanchorProgress(
  stored: StoredPlace | undefined,
  breaths: readonly PlaceBreath[],
  remap?: BreathRemap,
  workId = "",
  fromCounts?: FromCountTable,
): ReanchorResult {
  const count = breaths.length;
  const hash = bindHash(breaths);
  const raw = Number.isFinite(stored?.breathIndex) ? Math.floor(stored?.breathIndex ?? 0) : 0;
  const oldCount = oldCountOf(stored, remap, workId, fromCounts);
  const countMismatch = oldCount != null && oldCount !== count;
  const hashMismatch = Boolean(stored?.bindHash && stored.bindHash !== hash);
  const breathId = stored?.breathId?.trim() ?? "";
  const changed = countMismatch || hashMismatch;

  if (!changed) {
    if (raw >= 0 && raw < count) return finish(breaths, raw, false);
    if (count === 0) return finish(breaths, 0, raw !== 0);
    const scene = chapterStart(breaths, sceneIdFromBreathId(breathId));
    return finish(breaths, scene, true);
  }

  if (breathId) {
    const mapped = remapBreathId(remap, workId, breathId);
    if (mapped) {
      const at = breaths.findIndex((breath) => breath.id === mapped);
      if (at >= 0) return finish(breaths, at, at !== raw);
    }
    const remapNamesIt = Boolean(mapped);
    if (!remapNamesIt) {
      const at = breaths.findIndex((breath) => breath.id === breathId);
      if (at >= 0) return finish(breaths, at, at !== raw);
    }
  }

  if (!breathId && oldCount != null && oldCount > 0) {
    const fromRemap = legacyParagraphIndex(remap, workId, raw, breaths, oldCount);
    if (fromRemap != null) return finish(breaths, fromRemap, fromRemap !== raw);
  }

  if (oldCount != null && oldCount > 0 && count > 0) {
    const scaled = scaleBreathIndex(raw, oldCount, count);
    return finish(breaths, scaled, scaled !== raw);
  }

  const scene = chapterStart(breaths, sceneIdFromBreathId(breathId));
  return finish(breaths, scene, scene !== raw);
}

/**
 * Load the remap only when this save cannot belong to the open bind.
 * An in-range index with no stamp is the current book, unless that work
 * is listed in `REBOUND_FROM_COUNT` with a different breath count.
 */
export function shouldLoadBindRemap(
  stored: StoredPlace | undefined,
  breaths: readonly { id: string }[],
  workId = "",
  fromCounts?: FromCountTable,
): boolean {
  if (!stored) return false;
  const count = breaths.length;
  const raw = Number.isFinite(stored.breathIndex) ? Math.floor(stored.breathIndex ?? 0) : 0;
  if (count > 0 && (raw < 0 || raw >= count)) return true;
  if (stored.breathCount != null && stored.breathCount !== count) return true;
  if (stored.bindHash && stored.bindHash !== bindHash(breaths)) return true;
  if (stored.breathId) {
    const at = count > 0 ? Math.max(0, Math.min(count - 1, raw)) : 0;
    if (breaths[at]?.id !== stored.breathId) return true;
  }
  if (isUnstampedPlace(stored)) {
    const listed = reboundFromCount(workId, fromCounts);
    if (listed != null && listed !== count) return true;
  }
  return false;
}
