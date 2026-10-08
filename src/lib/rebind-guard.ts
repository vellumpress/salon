import { remapBreathId, type BreathRemap } from "./kept-lines.ts";

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

/** Map an index from the old bind onto the new one, by proportion. */
export function scaleBreathIndex(index: number, oldCount: number, newCount: number): number {
  if (newCount <= 0) return 0;
  if (oldCount <= 1 || newCount <= 1) return 0;
  const at = Math.max(0, Math.min(oldCount - 1, Math.floor(index)));
  const scaled = Math.round((at * (newCount - 1)) / (oldCount - 1));
  return Math.max(0, Math.min(newCount - 1, scaled));
}

function oldCountOf(stored: StoredPlace | undefined, remap: BreathRemap | undefined, workId: string): number | undefined {
  if (stored?.breathCount != null && stored.breathCount > 0) return stored.breathCount;
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
 * After a re-bind: follow the remap, then the breath id, then scale by the
 * old count, then the start of that chapter.
 */
export function reanchorProgress(
  stored: StoredPlace | undefined,
  breaths: readonly PlaceBreath[],
  remap?: BreathRemap,
  workId = "",
): ReanchorResult {
  const count = breaths.length;
  const hash = bindHash(breaths);
  const raw = Number.isFinite(stored?.breathIndex) ? Math.floor(stored?.breathIndex ?? 0) : 0;
  const oldCount = oldCountOf(stored, remap, workId);
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

  if (oldCount != null && oldCount > 0 && count > 0) {
    const scaled = scaleBreathIndex(raw, oldCount, count);
    return finish(breaths, scaled, scaled !== raw);
  }

  const scene = chapterStart(breaths, sceneIdFromBreathId(breathId));
  return finish(breaths, scene, scene !== raw);
}

/** Load the remap before re-anchoring when this save may belong to another bind. */
export function shouldLoadBindRemap(
  stored: StoredPlace | undefined,
  breaths: readonly { id: string }[],
): boolean {
  if (!stored) return false;
  const count = breaths.length;
  const raw = Number.isFinite(stored.breathIndex) ? Math.floor(stored.breathIndex ?? 0) : 0;
  if (!stored.bindHash) return raw > 0 || Boolean(stored.breathId);
  if (stored.breathCount != null && stored.breathCount !== count) return true;
  if (stored.bindHash !== bindHash(breaths)) return true;
  if (raw < 0 || raw >= count) return true;
  return false;
}
