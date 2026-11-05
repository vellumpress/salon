/**
 * Freehand marks on the passage in a live sitting.
 * Points are 0–1 across the current passage, so a stroke stays on that
 * sentence when the column moves. The live view fades them; the marks
 * themselves stay until the reader undoes or clears their own.
 */

export const PASSAGE_STROKE_CAP = 16;
export const STROKE_POINT_CAP = 40;
export const MIN_STROKE_LENGTH = 0.02;
export const INK_OPACITY = 0.45;
/** How long a mark stays solid on the live view before it fades. */
export const INK_HOLD_MS = 3200;
export const INK_FADE_MS = 1400;

export type StrokePoint = { x: number; y: number };

export type PassageStroke = {
  id: string;
  from: string;
  breath: number;
  at: number;
  points: StrokePoint[];
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function roundUnit(value: number) {
  return Math.round(clamp01(value) * 10000) / 10000;
}

export function cleanPassageStroke(input: unknown): PassageStroke | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<PassageStroke>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const from = typeof raw.from === "string" ? raw.from.trim() : "";
  if (!id || id.length > 80 || !from || from.length > 40) return null;
  if (typeof raw.breath !== "number" || !Number.isFinite(raw.breath) || raw.breath < 0) return null;
  const at = typeof raw.at === "number" && Number.isFinite(raw.at) ? raw.at : 0;
  if (!Array.isArray(raw.points)) return null;
  const points: StrokePoint[] = [];
  for (const point of raw.points) {
    if (!point || typeof point !== "object") continue;
    const x = (point as StrokePoint).x;
    const y = (point as StrokePoint).y;
    if (typeof x !== "number" || typeof y !== "number") continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    points.push({ x: roundUnit(x), y: roundUnit(y) });
    if (points.length >= STROKE_POINT_CAP) break;
  }
  if (points.length < 2) return null;
  return { id, from, breath: Math.floor(raw.breath), at, points };
}

/** Drop samples that sit on top of each other, and keep the stroke inside the passage. */
export function tidyStroke(points: readonly StrokePoint[], minDist = 0.007): StrokePoint[] {
  if (points.length === 0) return [];
  const out: StrokePoint[] = [{ x: roundUnit(points[0]?.x ?? 0), y: roundUnit(points[0]?.y ?? 0) }];
  for (let i = 1; i < points.length; i += 1) {
    const point = { x: roundUnit(points[i]?.x ?? 0), y: roundUnit(points[i]?.y ?? 0) };
    const last = out[out.length - 1]!;
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    if (dx * dx + dy * dy < minDist * minDist) continue;
    if (out.length >= STROKE_POINT_CAP) {
      out[out.length - 1] = point;
      continue;
    }
    out.push(point);
  }
  const end = points[points.length - 1];
  if (end && out.length > 0) {
    const last = out[out.length - 1]!;
    const point = { x: roundUnit(end.x), y: roundUnit(end.y) };
    if (point.x !== last.x || point.y !== last.y) {
      if (out.length >= STROKE_POINT_CAP) out[out.length - 1] = point;
      else out.push(point);
    }
  }
  return out;
}

export function strokeLength(points: readonly StrokePoint[]) {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const next = points[i]!;
    length += Math.hypot(next.x - prev.x, next.y - prev.y);
  }
  return length;
}

/** One Chaikin pass. Corners become curves without adding a second stroke. */
export function smoothStroke(points: readonly StrokePoint[]): StrokePoint[] {
  const tidy = tidyStroke(points);
  if (tidy.length < 3) return tidy;
  const out: StrokePoint[] = [tidy[0]!];
  for (let i = 0; i < tidy.length - 1; i += 1) {
    const a = tidy[i]!;
    const b = tidy[i + 1]!;
    out.push({ x: roundUnit(a.x * 0.75 + b.x * 0.25), y: roundUnit(a.y * 0.75 + b.y * 0.25) });
    if (out.length >= STROKE_POINT_CAP - 1) break;
    out.push({ x: roundUnit(a.x * 0.25 + b.x * 0.75), y: roundUnit(a.y * 0.25 + b.y * 0.75) });
    if (out.length >= STROKE_POINT_CAP - 1) break;
  }
  const end = tidy[tidy.length - 1]!;
  const last = out[out.length - 1]!;
  if (last.x !== end.x || last.y !== end.y) out.push(end);
  return out.slice(0, STROKE_POINT_CAP);
}

export function strokePath(points: readonly StrokePoint[]): string {
  if (points.length === 0) return "";
  const fmt = (value: number) => value.toFixed(4);
  const first = points[0]!;
  let d = `M ${fmt(first.x)} ${fmt(first.y)}`;
  if (points.length === 1) return d;
  if (points.length === 2) {
    const last = points[1]!;
    return `${d} L ${fmt(last.x)} ${fmt(last.y)}`;
  }
  for (let i = 1; i < points.length - 1; i += 1) {
    const point = points[i]!;
    const next = points[i + 1]!;
    const mx = (point.x + next.x) / 2;
    const my = (point.y + next.y) / 2;
    d += ` Q ${fmt(point.x)} ${fmt(point.y)} ${fmt(mx)} ${fmt(my)}`;
  }
  const last = points[points.length - 1]!;
  d += ` L ${fmt(last.x)} ${fmt(last.y)}`;
  return d;
}

/** Latest copy of each stroke, then the newest marks on each passage, capped. */
export function mergePassageStrokes(
  prev: readonly PassageStroke[],
  incoming: readonly unknown[],
  cap = PASSAGE_STROKE_CAP,
): PassageStroke[] {
  const byId = new Map<string, PassageStroke>();
  for (const item of [...prev, ...incoming]) {
    const clean = cleanPassageStroke(item);
    if (!clean) continue;
    const kept = byId.get(clean.id);
    if (kept && kept.at > clean.at) continue;
    byId.set(clean.id, clean);
  }
  const all = [...byId.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const buckets = new Map<number, PassageStroke[]>();
  for (const stroke of all) {
    const list = buckets.get(stroke.breath) ?? [];
    list.push(stroke);
    buckets.set(stroke.breath, list);
  }
  const kept: PassageStroke[] = [];
  const limit = Math.max(1, Math.floor(cap));
  for (const list of buckets.values()) kept.push(...list.slice(-limit));
  kept.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return kept;
}

export function strokesOnPassage(strokes: readonly PassageStroke[], breath: number) {
  if (!Number.isFinite(breath)) return [];
  const index = Math.floor(breath);
  return strokes.filter((stroke) => stroke.breath === index);
}

export function undoOwnStroke(
  strokes: readonly PassageStroke[],
  from: string,
  breath: number,
): { next: PassageStroke[]; removed: PassageStroke | null } {
  const mine = strokesOnPassage(strokes, breath)
    .filter((stroke) => stroke.from === from)
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const removed = mine[mine.length - 1] ?? null;
  if (!removed) return { next: [...strokes], removed: null };
  return { next: strokes.filter((stroke) => stroke.id !== removed.id), removed };
}

export function clearOwnStrokes(strokes: readonly PassageStroke[], from: string, breath: number) {
  if (!Number.isFinite(breath)) return [...strokes];
  const index = Math.floor(breath);
  return strokes.filter((stroke) => !(stroke.from === from && stroke.breath === index));
}

/** Solid for a few seconds, then a soft falloff. Zero once the fade has finished. */
export function inkOpacity(ageMs: number): number {
  if (!Number.isFinite(ageMs) || ageMs <= INK_HOLD_MS) return INK_OPACITY;
  const t = Math.min(1, (ageMs - INK_HOLD_MS) / INK_FADE_MS);
  const eased = t * t * (3 - 2 * t);
  const opacity = INK_OPACITY * (1 - eased);
  return opacity < 0.02 ? 0 : opacity;
}
