/**
 * A kept line remembers the sentence, not only the breath id.
 * Editorial re-binds can retire ids; the stored sentence still renders.
 */

export const KEPT_LINE_VERSION = 1;

export type KeptLineRecord = {
  v: typeof KEPT_LINE_VERSION;
  /** Breath id at the time of the save, or the id we last re-anchored to. */
  id: string;
  text: string;
  workId: string;
  title: string;
  author: string;
  scene?: string;
  savedAt: number;
};

/** Older snapshots stored a bare breath id. Leave those strings in place. */
export type KeptStored = string | KeptLineRecord;

export type BreathRemap = {
  byWork: Record<string, Record<string, string>>;
  flat: Record<string, string>;
  /**
   * Breath count of the bind a remap replaces, per work.
   * An index-only save can scale against this when it has no breath id.
   */
  fromCount?: Record<string, number>;
};

export type KeptBreath = { id: string; text: string; sceneId?: string };

export type KeptWork = {
  title: string;
  author: string;
  scenes?: { id: string; title: string }[];
  breaths: KeptBreath[];
};

export type VisibleKeptLine = {
  workId: string;
  breathId: string;
  text: string;
  title: string;
  author: string;
  scene?: string;
  /** Index when this sentence still sits in the book. -1 when it does not. */
  at: number;
  savedAt: number;
};

export type KeptAnchor = {
  /** Null: open the book at its start or last progress. */
  index: number | null;
  breathId: string | null;
  updated: boolean;
};

/** Shorter than this, containment is too loose (a "No." inside a paragraph). */
const MIN_CONTAIN_CHARS = 16;

const WRAPPER_KEYS = new Set(["works", "breaths", "map", "ids", "at", "remap"]);

export function emptyBreathRemap(): BreathRemap {
  return { byWork: {}, flat: {}, fromCount: {} };
}

export function keptBreathId(entry: unknown): string {
  if (typeof entry === "string") return entry.trim();
  if (!entry || typeof entry !== "object") return "";
  const id = (entry as { id?: unknown }).id;
  return typeof id === "string" ? id.trim() : "";
}

export function asKeptRecord(entry: unknown): KeptLineRecord | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as Partial<KeptLineRecord>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if (!id || !text) return null;
  const scene = typeof row.scene === "string" ? row.scene.trim() : "";
  return {
    v: KEPT_LINE_VERSION,
    id,
    text,
    workId: typeof row.workId === "string" ? row.workId : "",
    title: typeof row.title === "string" ? row.title : "",
    author: typeof row.author === "string" ? row.author : "",
    ...(scene ? { scene } : {}),
    savedAt: typeof row.savedAt === "number" && Number.isFinite(row.savedAt) ? row.savedAt : 0,
  };
}

export function keptIncludes(kept: readonly unknown[] | undefined, breathId: string): boolean {
  if (!breathId) return false;
  return (kept ?? []).some((entry) => keptBreathId(entry) === breathId);
}

/**
 * Compare sentences across a re-bind: whitespace, quotation marks, and
 * italics markup (`_em_`, `*em*`, `<em>`) do not count as a different line.
 * A moved footnote does not either: `[n]` markers and a leading `Note: `
 * are the same sentence.
 */
export function normalizeKeptText(text: string): string {
  const stripped = text
    .replace(/<em>([\s\S]*?)<\/em>/gi, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[_*]/g, "")
    .replace(/\s*\[\d+\]/g, "");
  let quotes = "";
  for (const ch of stripped) {
    quotes +=
      ch === "\u201C" || ch === "\u201D" || ch === "\u201E" || ch === "\u00AB" || ch === "\u00BB"
        ? '"'
        : ch === "\u2018" || ch === "\u2019" || ch === "\u201A" || ch === "\u2039" || ch === "\u203A"
          ? "'"
          : ch;
  }
  return quotes
    .replace(/\s+/g, " ")
    .replace(/^(?:Note:\s+)+/i, "")
    .replace(/(?:…|\.{3})+$/g, "")
    .trim();
}

/**
 * True when a saved id is missing, or an id-only line may have been reused
 * by a re-bind (the id is still in the book, so the old "missing id" check
 * would never open the remap).
 */
export function keptIdsNeedRemap(
  kept: readonly unknown[] | undefined,
  breaths: readonly { id: string }[] | undefined,
): boolean {
  if (!kept?.length || !breaths?.length) return false;
  const live = new Set(breaths.map((breath) => breath.id));
  return kept.some((entry) => {
    const id = keptBreathId(entry);
    if (!id) return false;
    if (!live.has(id)) return true;
    return asKeptRecord(entry) === null;
  });
}

export function keptTextsMatch(a: string, b: string): boolean {
  const left = normalizeKeptText(a);
  const right = normalizeKeptText(b);
  return left.length > 0 && left === right;
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function putRemap(into: BreathRemap, from: string, to: string, workId?: string) {
  if (!from || !to || from === to) return;
  if (workId) {
    into.byWork[workId] = { ...(into.byWork[workId] ?? {}), [from]: to };
    return;
  }
  into.flat[from] = to;
}

function absorbRemap(raw: unknown, into: BreathRemap, workId?: string) {
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const record = row as Record<string, unknown>;
      const from = textOf(record.from ?? record.old ?? record.id);
      const to = textOf(record.to ?? record.next ?? record.breathId);
      const scoped = textOf(record.workId ?? record.work) || workId;
      putRemap(into, from, to, scoped || undefined);
    }
    return;
  }
  if (!raw || typeof raw !== "object") return;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      if (workId && (key === "fromCount" || key === "_count")) {
        into.fromCount = { ...(into.fromCount ?? {}), [workId]: Math.floor(value) };
      }
      continue;
    }
    if (typeof value === "string") {
      putRemap(into, key.trim(), value.trim(), workId);
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const nested = value as Record<string, unknown>;
    const leaves = Object.values(nested).filter((item) => item != null);
    const countable =
      leaves.length > 0 &&
      leaves.every((item) => typeof item === "string" || typeof item === "number");
    if (countable && leaves.some((item) => typeof item === "string")) {
      absorbRemap(nested, into, key.trim());
      continue;
    }
    if (!workId && WRAPPER_KEYS.has(key)) absorbRemap(nested, into);
  }
}

/** Accept a per-work map, a flat id map, or a list of `{ workId, from, to }`. */
export function parseBreathRemap(raw: unknown): BreathRemap {
  const into = emptyBreathRemap();
  absorbRemap(raw, into);
  return into;
}

export function mergeRemap(base: BreathRemap, extra: BreathRemap): BreathRemap {
  const byWork: BreathRemap["byWork"] = { ...base.byWork };
  for (const [workId, map] of Object.entries(extra.byWork)) {
    byWork[workId] = { ...(byWork[workId] ?? {}), ...map };
  }
  return {
    byWork,
    flat: { ...base.flat, ...extra.flat },
    fromCount: { ...(base.fromCount ?? {}), ...(extra.fromCount ?? {}) },
  };
}

export function remapBreathId(
  remap: BreathRemap | undefined,
  workId: string,
  breathId: string,
): string | undefined {
  if (!remap || !breathId) return undefined;
  const scoped = remap.byWork[workId]?.[breathId];
  if (scoped && scoped !== breathId) return scoped;
  const flat = remap.flat[breathId];
  if (flat && flat !== breathId) return flat;
  return undefined;
}

export function makeKeptRecord(input: {
  workId: string;
  id: string;
  text: string;
  title: string;
  author: string;
  scene?: string;
  savedAt: number;
}): KeptLineRecord | null {
  const id = input.id.trim();
  const text = input.text.trim();
  if (!id || !text) return null;
  const scene = input.scene?.trim();
  return {
    v: KEPT_LINE_VERSION,
    id,
    text,
    workId: input.workId,
    title: input.title.trim(),
    author: input.author.trim(),
    ...(scene ? { scene } : {}),
    savedAt: Number.isFinite(input.savedAt) ? input.savedAt : 0,
  };
}

export function toggleKeptList(
  workId: string,
  kept: readonly unknown[] | undefined,
  breathId: string,
  snapshot: {
    text: string;
    title: string;
    author: string;
    scene?: string;
    savedAt: number;
  } | null,
): KeptStored[] {
  const id = breathId.trim();
  const current = normalizeKeptList(kept);
  if (!id) return current;
  if (keptIncludes(current, id)) return current.filter((entry) => keptBreathId(entry) !== id);
  const record = snapshot ? makeKeptRecord({ workId, id, ...snapshot }) : null;
  return [...current, record ?? id];
}

export function retargetKeptList(kept: readonly unknown[] | undefined, fromId: string, toId: string): KeptStored[] {
  const from = fromId.trim();
  const to = toId.trim();
  if (!Array.isArray(kept)) return [];
  const current = kept as KeptStored[];
  if (!from || !to || from === to) return current;
  let changed = false;
  const next = current.map((entry) => {
    if (keptBreathId(entry) !== from) return entry;
    changed = true;
    const record = asKeptRecord(entry);
    if (!record) return to;
    return { ...record, id: to };
  });
  if (!changed) return current;
  return mergeKept(next, []);
}

/** Prefer a copy that still has the sentence when two saves share an id. */
export function mergeKept(primary: unknown, secondary: unknown): KeptStored[] {
  const out: KeptStored[] = [];
  const indexOf = (id: string) => out.findIndex((entry) => keptBreathId(entry) === id);
  const absorb = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      const id = keptBreathId(entry);
      if (!id) continue;
      const record = asKeptRecord(entry);
      const at = indexOf(id);
      if (at < 0) {
        out.push(record ?? id);
        continue;
      }
      if (record && typeof out[at] === "string") out[at] = record;
    }
  };
  absorb(primary);
  absorb(secondary);
  return out;
}

function normalizeKeptList(kept: unknown): KeptStored[] {
  if (!Array.isArray(kept)) return [];
  return mergeKept(kept, []);
}

export function needsKeptBackfill(kept: unknown): boolean {
  if (!Array.isArray(kept)) return false;
  return kept.some((entry) => {
    const id = keptBreathId(entry);
    if (!id) return false;
    return asKeptRecord(entry) === null;
  });
}

function breathIndex(breaths: readonly KeptBreath[], id: string): number {
  if (!id) return -1;
  return breaths.findIndex((breath) => breath.id === id);
}

function sceneTitle(work: KeptWork, breath: KeptBreath | undefined): string {
  if (!breath?.sceneId) return "";
  return work.scenes?.find((scene) => scene.id === breath.sceneId)?.title?.trim() ?? "";
}

function recordFromBreath(
  workId: string,
  work: KeptWork,
  breath: KeptBreath,
  savedAt: number,
): KeptLineRecord | null {
  return makeKeptRecord({
    workId,
    id: breath.id,
    text: breath.text,
    title: work.title,
    author: work.author,
    scene: sceneTitle(work, breath),
    savedAt,
  });
}

/**
 * Id-only saves: if the breath is still in the catalog, store its sentence.
 * If it is not, leave the entry untouched. Never invent a sentence.
 */
export function migrateKeptList(
  workId: string,
  kept: unknown,
  work: KeptWork | undefined,
  remap: BreathRemap | undefined,
  complete: boolean,
  savedAt = 0,
): { kept: KeptStored[]; changed: boolean } {
  if (!Array.isArray(kept)) return { kept: [], changed: false };
  if (!work) return { kept: normalizeKeptList(kept), changed: false };
  let changed = false;
  const next: KeptStored[] = [];
  for (const entry of kept) {
    const record = asKeptRecord(entry);
    if (record) {
      const moved = retargetRecord(workId, record, work, remap);
      if (moved !== record) changed = true;
      next.push(moved);
      continue;
    }
    const id = keptBreathId(entry);
    if (!id) {
      next.push(typeof entry === "string" ? entry : id);
      continue;
    }
    const breath = resolveIdOnly(workId, id, work, remap, complete);
    if (!breath) {
      next.push(typeof entry === "string" ? entry : id);
      continue;
    }
    const filled = recordFromBreath(workId, work, breath, savedAt);
    if (!filled) {
      next.push(typeof entry === "string" ? entry : id);
      continue;
    }
    changed = true;
    next.push(filled);
  }
  return { kept: changed ? mergeKept(next, []) : normalizeKeptList(kept), changed };
}

function retargetRecord(
  workId: string,
  record: KeptLineRecord,
  work: KeptWork,
  remap: BreathRemap | undefined,
): KeptLineRecord {
  const direct = breathIndex(work.breaths, record.id);
  if (direct >= 0 && keptTextsMatch(record.text, work.breaths[direct]?.text ?? "")) return record;
  const mapped = remapBreathId(remap, workId, record.id);
  if (!mapped) return record;
  const at = breathIndex(work.breaths, mapped);
  if (at < 0 || !keptTextsMatch(record.text, work.breaths[at]?.text ?? "")) return record;
  return { ...record, id: mapped };
}

/**
 * A re-bind can reuse an id for a different paragraph. The remap target is
 * the passage when that paragraph is a different length or a different chapter.
 */
export function reusedBreathId(live: KeptBreath, mapped: KeptBreath): boolean {
  if (!live.id || !mapped.id || live.id === mapped.id) return false;
  if (live.sceneId && mapped.sceneId && live.sceneId !== mapped.sceneId) return true;
  return live.text.trim().length !== mapped.text.trim().length;
}

function breathAt(breaths: readonly KeptBreath[], id: string): { index: number; breath: KeptBreath } | null {
  const index = breathIndex(breaths, id);
  const breath = index >= 0 ? breaths[index] : undefined;
  if (!breath) return null;
  return { index, breath };
}

/** Remap wins when the live id was reused. Otherwise the id, then the remap. */
export function resolveBreathId(
  workId: string,
  id: string,
  breaths: readonly KeptBreath[],
  remap: BreathRemap | undefined,
): { index: number; breath: KeptBreath } | null {
  const direct = id ? breathAt(breaths, id) : null;
  const mappedId = remapBreathId(remap, workId, id);
  const mapped = mappedId ? breathAt(breaths, mappedId) : null;
  if (direct && mapped && reusedBreathId(direct.breath, mapped.breath)) return mapped;
  if (direct) return direct;
  if (mapped) return mapped;
  return null;
}

/** A bare id resolves, or a published remap names a breath that does. No text search. */
function resolveIdOnly(
  workId: string,
  id: string,
  work: KeptWork,
  remap: BreathRemap | undefined,
  complete: boolean,
): KeptBreath | undefined {
  const found = resolveBreathId(workId, id, work.breaths, remap);
  if (found) return found.breath;
  if (!complete) return undefined;
  return undefined;
}

export function anchorKeptLine(
  entry: { id?: string; text?: string },
  breaths: readonly KeptBreath[],
  remap?: BreathRemap,
  workId = "",
): KeptAnchor {
  const id = (entry.id ?? "").trim();
  const text = (entry.text ?? "").trim();
  const miss: KeptAnchor = { index: null, breathId: null, updated: false };

  const byId = (candidate: string): KeptAnchor | null => {
    const index = breathIndex(breaths, candidate);
    if (index < 0) return null;
    const breath = breaths[index];
    if (!breath) return null;
    if (text && !keptTextsMatch(text, breath.text)) return null;
    return { index, breathId: breath.id, updated: breath.id !== id };
  };

  if (!text && id) {
    const found = resolveBreathId(workId, id, breaths, remap);
    if (found) {
      return {
        index: found.index,
        breathId: found.breath.id,
        updated: found.breath.id !== id,
      };
    }
    return miss;
  }

  const direct = id ? byId(id) : null;
  if (direct) return direct;
  const mapped = remapBreathId(remap, workId, id);
  if (mapped) {
    const viaMap = byId(mapped);
    if (viaMap) return viaMap;
  }
  if (!text) return miss;

  const needle = normalizeKeptText(text);
  if (!needle) return miss;
  const exact = breaths.findIndex((breath) => normalizeKeptText(breath.text) === needle);
  if (exact >= 0) {
    const breath = breaths[exact];
    if (!breath) return miss;
    return { index: exact, breathId: breath.id, updated: breath.id !== id };
  }

  let best = -1;
  let bestScore = 0;
  breaths.forEach((breath, index) => {
    const hay = normalizeKeptText(breath.text);
    if (!hay || hay === needle) return;
    const shorter = Math.min(needle.length, hay.length);
    if (shorter < MIN_CONTAIN_CHARS) return;
    const contains = hay.includes(needle) || needle.includes(hay);
    if (!contains) return;
    const score = shorter / Math.max(needle.length, hay.length);
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  if (best < 0) return miss;
  const breath = breaths[best];
  if (!breath) return miss;
  return { index: best, breathId: breath.id, updated: breath.id !== id };
}

export function visibleKeptLines(
  progress: Record<string, { kept?: unknown; lastOpenedAt?: number }>,
  lookup: (workId: string) => KeptWork | undefined,
  opts?: {
    limit?: number;
    remap?: BreathRemap;
    complete?: (workId: string) => boolean;
    skip?: (workId: string) => boolean;
    meta?: (workId: string) => { title?: string; author?: string } | undefined;
  },
): VisibleKeptLine[] {
  const rows: VisibleKeptLine[] = [];
  const works = Object.entries(progress)
    .filter(([workId]) => !(opts?.skip?.(workId) ?? false))
    .sort((a, b) => (b[1]?.lastOpenedAt ?? 0) - (a[1]?.lastOpenedAt ?? 0));
  for (const [workId, item] of works) {
    if (!Array.isArray(item?.kept)) continue;
    const work = lookup(workId);
    const complete = opts?.complete?.(workId) ?? Boolean(work);
    const meta = opts?.meta?.(workId);
    for (const entry of item.kept) {
      const line = visibleEntry(workId, entry, work, opts?.remap, complete, meta);
      if (line) rows.push(line);
    }
  }
  const limit = opts?.limit;
  if (limit == null || !Number.isFinite(limit)) return rows;
  return rows.slice(0, Math.max(0, Math.floor(limit)));
}

function visibleEntry(
  workId: string,
  entry: unknown,
  work: KeptWork | undefined,
  remap: BreathRemap | undefined,
  complete: boolean,
  meta: { title?: string; author?: string } | undefined,
): VisibleKeptLine | null {
  const record = asKeptRecord(entry);
  const id = keptBreathId(entry);
  if (!id) return null;
  if (record) {
    const anchor = work
      ? anchorKeptLine(record, work.breaths, remap, workId)
      : { index: null, breathId: null, updated: false };
    return {
      workId: record.workId || workId,
      breathId: record.id,
      text: record.text,
      title: record.title || work?.title || meta?.title || workId,
      author: record.author || work?.author || meta?.author || "",
      scene: record.scene,
      at: anchor.index ?? -1,
      savedAt: record.savedAt,
    };
  }
  if (!work) return null;
  const breath = resolveIdOnly(workId, id, work, remap, complete);
  if (!breath) return null;
  const at = breathIndex(work.breaths, breath.id);
  const text = breath.text.trim();
  if (!text || at < 0) return null;
  const scene = sceneTitle(work, breath);
  return {
    workId,
    breathId: id,
    text,
    title: work.title || meta?.title || workId,
    author: work.author || meta?.author || "",
    ...(scene ? { scene } : {}),
    at,
    savedAt: 0,
  };
}

export function keptProgressKey(progress: Record<string, { kept?: unknown }>): string {
  return Object.entries(progress)
    .map(([id, item]) => {
      const kept = Array.isArray(item?.kept)
        ? item.kept
            .map((entry) => {
              const idPart = keptBreathId(entry);
              const text = asKeptRecord(entry)?.text ?? "";
              return `${idPart}\t${text}`;
            })
            .join(",")
        : "";
      return `${id}:${kept}`;
    })
    .sort()
    .join("|");
}

export async function resolveKeptOpen(input: {
  workId: string;
  breathId?: string;
  text?: string;
  remap?: BreathRemap;
  load: (workId: string) => Promise<{ breaths: KeptBreath[] } | undefined>;
}): Promise<{ at?: number; nextId?: string }> {
  let work: { breaths: KeptBreath[] } | undefined;
  try {
    work = await input.load(input.workId);
  } catch {
    return {};
  }
  if (!work) return {};
  const anchor = anchorKeptLine(
    { id: input.breathId ?? "", text: input.text ?? "" },
    work.breaths,
    input.remap,
    input.workId,
  );
  if (anchor.index == null) return {};
  return {
    at: anchor.index,
    nextId: anchor.updated && anchor.breathId ? anchor.breathId : undefined,
  };
}
