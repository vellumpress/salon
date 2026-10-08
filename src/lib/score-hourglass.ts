/**
 * Score hourglass geometry. Same drawing as the reader hourglass in
 * `components/hourglass.tsx` — flat caps, straight bulbs, one neck — opened
 * wider so it holds the ring's square. Fill height follows the score the way
 * the reader glass fills: 0 keeps the top bulb full, 100 leaves the sand
 * in the bottom.
 */

import { CONTRIBUTOR_WEIGHTS, type ContributorId, type ContributorResult, type DayKind } from "./reading-score.ts";

/**
 * Reader bowtie, widened for the ring's square. Same parts: flat caps,
 * two straight bulbs, a single neck. The timer icon stays narrow
 * (`16,12 104,12 60,110 …`); this one is the same drawing opened up so
 * it holds the 13rem box.
 */
export const GLASS = {
  viewW: 200,
  viewH: 206,
  outline: "18,14 182,14 100,105 182,196 18,196 100,105",
  stroke: 2.5,
  cap: { x: 12, width: 176, height: 6, top: 6, bottom: 198 },
  /** Sand field, just inside the stroke. Both bulbs are the same height. */
  upper: { left: 26, right: 174, top: 22, apexX: 100, apexY: 98 },
  lower: { left: 26, right: 174, bottom: 188, apexX: 100, apexY: 112 },
} as const;

export const GLASS_UPPER_CLIP = `${GLASS.upper.left},${GLASS.upper.top} ${GLASS.upper.right},${GLASS.upper.top} ${GLASS.upper.apexX},${GLASS.upper.apexY}`;
export const GLASS_LOWER_CLIP = `${GLASS.lower.apexX},${GLASS.lower.apexY} ${GLASS.lower.right},${GLASS.lower.bottom} ${GLASS.lower.left},${GLASS.lower.bottom}`;

/** Empty glass. Same neutral the score ring used for its track. */
export const SCORE_TRACK = "var(--color-paper-deep)";

/** Contributor colors, in the same order and variables as the old ring. */
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
  const showNumber = input.kind === "reading" && !input.hide && input.scored;
  const sand = input.kind === "reading" && input.scored ? total : null;

  let state: HourglassState;
  if (input.paused && !showNumber) state = "paused";
  else if (input.kind === "quick-visit") state = "quick-visit";
  else if (input.kind === "rest") state = "rest";
  else if (input.learning || !input.scored) state = "learning";
  else state = "scored";

  let primary: string;
  if (input.paused && !showNumber) primary = "Paused";
  else if (showNumber) primary = String(total);
  else if (input.kind === "reading" && !input.scored) primary = "Still learning";
  else primary = input.label;

  const secondary = showNumber ? (input.learning ? "Still learning" : input.label) : null;

  let aria: string;
  if (input.paused) aria = "Scoring is paused";
  else if (input.kind !== "reading") aria = input.label;
  else if (!input.scored) aria = "Still learning";
  else if (input.hide) aria = input.learning ? `${input.label}. Still learning` : input.label;
  else if (input.learning) aria = `Reading score ${total}, ${input.label}. Still learning`;
  else aria = `Reading score ${total}, ${input.label}`;

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

export type SandLayer = {
  id: string;
  color: string;
  points: string;
};

type Bulb = "upper" | "lower";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** `t` is 0 at the neck (apex) and 1 at the wide end of that bulb. */
function edge(bulb: Bulb, t: number): { xL: number; xR: number; y: number } {
  const u = Math.max(0, Math.min(1, t));
  if (bulb === "upper") {
    const { left, right, top, apexX, apexY } = GLASS.upper;
    return {
      y: round(apexY + (top - apexY) * u),
      xL: round(apexX + (left - apexX) * u),
      xR: round(apexX + (right - apexX) * u),
    };
  }
  const { left, right, bottom, apexX, apexY } = GLASS.lower;
  return {
    y: round(apexY + (bottom - apexY) * u),
    xL: round(apexX + (left - apexX) * u),
    xR: round(apexX + (right - apexX) * u),
  };
}

function trapezoid(bulb: Bulb, t0: number, t1: number): string {
  const a = edge(bulb, t0);
  const b = edge(bulb, t1);
  return [
    [a.xL, a.y],
    [a.xR, a.y],
    [b.xR, b.y],
    [b.xL, b.y],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

/**
 * Split a bulb's sand into contributor bands.
 * `fraction` is the share of that bulb's height that holds sand (0–1).
 * Upper sand sits on the neck; lower sand sits on the base.
 * Height tracks the score, so 80 reads as a nearly full bottom bulb.
 */
function bulbLayers(bulb: Bulb, fraction: number, bands: SandBand[]): SandLayer[] {
  if (!(fraction > 0) || bands.length === 0) return [];
  const f = Math.min(1, fraction);
  const t0 = bulb === "upper" ? 0 : 1 - f;
  const t1 = bulb === "upper" ? f : 1;
  const span = t1 - t0;
  if (!(span > 0)) return [];
  const weightSum = bands.reduce((sum, band) => sum + band.weight, 0);
  if (!(weightSum > 0)) return [];
  // Gravity: the first contributor rests nearest the neck in the top bulb
  // and nearest the base in the bottom bulb, so the pile reads as one stack.
  const ordered = bulb === "lower" ? [...bands].reverse() : bands;
  let cursor = t0;
  const layers: SandLayer[] = [];
  for (const band of ordered) {
    const next = cursor + span * (band.weight / weightSum);
    if (next - cursor > 0.004) {
      layers.push({
        id: `${bulb}-${band.id}`,
        color: band.color,
        points: trapezoid(bulb, cursor, next),
      });
    }
    cursor = next;
  }
  return layers;
}

export function sandLayers(
  score: number,
  bands: SandBand[],
): { upper: SandLayer[]; lower: SandLayer[] } {
  const settled = Math.max(0, Math.min(1, score / 100));
  return {
    upper: bulbLayers("upper", 1 - settled, bands),
    lower: bulbLayers("lower", settled, bands),
  };
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
export function sandHeight(layers: SandLayer[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const layer of layers) {
    for (const pair of layer.points.split(" ")) {
      const y = Number(pair.split(",")[1]);
      if (!Number.isFinite(y)) continue;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  return max - min;
}
