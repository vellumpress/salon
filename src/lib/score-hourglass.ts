/**
 * Score hourglass geometry. The same classical drawing as the reader
 * hourglass in `components/hourglass.tsx`: thin bowtie, a bar at each end.
 * Sand is stippled grain. 0 keeps the top bulb full, 100 leaves the sand
 * in the bottom. A quiet day keeps a little sand, matching its low number.
 */

import { CONTRIBUTOR_WEIGHTS, type ContributorId, type ContributorResult, type DayKind } from "./reading-score.ts";

/** Reader bowtie, unchanged: `16,12 104,12 60,110 104,208 16,208 60,110`. */
export const GLASS = {
  viewW: 120,
  viewH: 220,
  outline: "16,12 104,12 60,110 104,208 16,208 60,110",
  stroke: 3,
  cap: { x: 10, width: 100, height: 8, top: 8, bottom: 204 },
  /** Sand field, just inside the stroke. Both bulbs are the same height. */
  upper: { left: 22, right: 98, top: 22, apexX: 60, apexY: 108 },
  lower: { left: 22, right: 98, bottom: 198, apexX: 60, apexY: 112 },
} as const;

export const GLASS_UPPER_CLIP = `${GLASS.upper.left},${GLASS.upper.top} ${GLASS.upper.right},${GLASS.upper.top} ${GLASS.upper.apexX},${GLASS.upper.apexY}`;
export const GLASS_LOWER_CLIP = `${GLASS.lower.apexX},${GLASS.lower.apexY} ${GLASS.lower.right},${GLASS.lower.bottom} ${GLASS.lower.left},${GLASS.lower.bottom}`;

/** Contributor colors stay on the score rows. The glass itself is ink on paper. */
export const SCORE_SAND_COLOR: Record<ContributorId, string> = {
  immersion: "var(--color-forest)",
  rhythm: "var(--color-yellow)",
  return: "var(--color-blue)",
  range: "var(--color-red)",
  restfulness: "var(--color-ink)",
  connection: "var(--color-navy)",
};

/** One settle, on first paint. Not a loop. */
export const SETTLE_MS = 600;

export function easeSettle(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return 1 - (1 - x) ** 3;
}

export type HourglassState = "scored" | "quick-visit" | "learning" | "rest" | "paused";

export type HourglassCopy = {
  state: HourglassState;
  /** 0–100 when sand is drawn. Null keeps both bulbs empty. */
  sand: number | null;
  primary: string;
  secondary: string | null;
  aria: string;
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function hourglassCopy(input: {
  kind: DayKind;
  total: number;
  label: string;
  hide: boolean;
  paused: boolean;
  learning: boolean;
  scored: boolean;
}): HourglassCopy {
  const total = clampScore(input.total);
  const scoredReading = input.kind === "reading" && input.scored && total > 0;
  const pausedWithoutNumber = input.paused && !scoredReading;
  const display = total > 0 ? total : 1;
  const showNumber = !input.hide && !pausedWithoutNumber;
  const sand = showNumber || scoredReading ? display : null;

  let state: HourglassState;
  if (pausedWithoutNumber) state = "paused";
  else if (showNumber && input.learning) state = "learning";
  else if (showNumber || scoredReading) state = "scored";
  else state = "rest";

  let primary: string;
  if (pausedWithoutNumber) primary = "Paused";
  else if (showNumber) primary = String(display);
  else if (input.hide && input.label) primary = input.label;
  else primary = "Still learning";
  if (!primary || primary === "NaN" || primary === "Quick visit" || primary === "Rest") {
    primary = String(display);
  }

  const secondary = showNumber ? (input.learning ? "Still learning" : input.label) : null;

  let aria: string;
  if (input.paused) aria = "Scoring is paused";
  else if (showNumber && input.learning) aria = `Reading score ${display}, ${input.label}. Still learning`;
  else if (showNumber) aria = `Reading score ${display}, ${input.label}`;
  else if (input.hide) aria = input.learning ? `${input.label}. Still learning` : input.label;
  else aria = primary;

  return { state, sand, primary, secondary, aria };
}

export type SandBand = {
  id: ContributorId;
  color: string;
  weight: number;
};

export function sandBands(parts: ContributorResult[]): SandBand[] {
  const bands: SandBand[] = [];
  for (const part of parts) {
    if (part.status !== "scored" || part.value == null) continue;
    const weight = CONTRIBUTOR_WEIGHTS[part.id];
    if (!(weight > 0)) continue;
    bands.push({ id: part.id, color: SCORE_SAND_COLOR[part.id], weight });
  }
  return bands;
}

type Bulb = "upper" | "lower";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export type SandGrain = {
  id: string;
  cx: number;
  cy: number;
  r: number;
};

const UPPER_TRI = [
  [GLASS.upper.left, GLASS.upper.top],
  [GLASS.upper.right, GLASS.upper.top],
  [GLASS.upper.apexX, GLASS.upper.apexY],
] as const;

const LOWER_TRI = [
  [GLASS.lower.apexX, GLASS.lower.apexY],
  [GLASS.lower.right, GLASS.lower.bottom],
  [GLASS.lower.left, GLASS.lower.bottom],
] as const;

function grainHash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function insideTriangle(
  x: number,
  y: number,
  tri: readonly (readonly [number, number])[],
  margin: number,
): boolean {
  const [a, b, c] = tri;
  if (!a || !b || !c) return false;
  const v0x = c[0] - a[0];
  const v0y = c[1] - a[1];
  const v1x = b[0] - a[0];
  const v1y = b[1] - a[1];
  const v2x = x - a[0];
  const v2y = y - a[1];
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const denom = dot00 * dot11 - dot01 * dot01;
  if (!(denom > 0)) return false;
  const inv = 1 / denom;
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;
  return u >= margin && v >= margin && u + v <= 1 - margin;
}

/**
 * Stipple one bulb. `fraction` is how much of that bulb holds sand.
 * Upper sand sits on the neck; lower sand sits on the base.
 */
function bulbGrains(bulb: Bulb, fraction: number): SandGrain[] {
  if (!(fraction > 0.015)) return [];
  const tri = bulb === "upper" ? UPPER_TRI : LOWER_TRI;
  const top = Math.min(...tri.map((point) => point[1]));
  const bottom = Math.max(...tri.map((point) => point[1]));
  const height = bottom - top;
  const sandTop = bulb === "upper" ? bottom - fraction * height : top;
  const sandBottom = bulb === "upper" ? bottom : top + fraction * height;
  const grains: SandGrain[] = [];
  const step = 6.4;
  let n = bulb === "upper" ? 11 : 410;
  for (let y = top + 2.2; y <= bottom - 1.2; y += step) {
    for (let x = GLASS.upper.left; x <= GLASS.upper.right; x += step) {
      n += 1;
      const cx = x + (grainHash(n) - 0.5) * 1.4;
      const cy = y + (grainHash(n + 17) - 0.5) * 1.2;
      if (cy < sandTop || cy > sandBottom) continue;
      if (!insideTriangle(cx, cy, tri, 0.02)) continue;
      grains.push({
        id: `${bulb}-${grains.length}`,
        cx: round(cx),
        cy: round(cy),
        r: round(1.55 + grainHash(n + 29) * 0.55),
      });
    }
  }
  return grains;
}

/** Fine grain for a 0–100 sand level. Empty when there is nothing to pour. */
export function sandGrains(score: number): SandGrain[] {
  if (!Number.isFinite(score)) return [];
  const settled = Math.max(0, Math.min(1, score / 100));
  const grains = [...bulbGrains("upper", 1 - settled), ...bulbGrains("lower", settled)];
  if (settled > 0.06 && settled < 0.94) {
    for (let i = 0; i < 3; i++) {
      grains.push({ id: `neck-${i}`, cx: GLASS.upper.apexX, cy: round(109.2 + i * 1.5), r: 1.35 });
    }
  }
  return grains;
}

/** Shoelace area. */
export function polygonArea(points: string): number {
  const nums = points
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const n = Math.floor(nums.length / 2);
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const x1 = nums[i * 2] ?? 0;
    const y1 = nums[i * 2 + 1] ?? 0;
    const x2 = nums[((i + 1) % n) * 2] ?? 0;
    const y2 = nums[((i + 1) % n) * 2 + 1] ?? 0;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/** Vertical span of a sand pile, in viewBox units. */
export function sandHeight(grains: { cy: number }[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const grain of grains) {
    if (!Number.isFinite(grain.cy)) continue;
    min = Math.min(min, grain.cy);
    max = Math.max(max, grain.cy);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  return max - min;
}
