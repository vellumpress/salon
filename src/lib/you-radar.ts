/** FIFA-hex radar for the You hero — geometry and axis mapping, no React. */

export const RADAR_AXIS_IDS = [
  "today",
  "week",
  "breaths",
  "keeps",
  "streak",
  "sits",
] as const;

export type RadarAxisId = (typeof RADAR_AXIS_IDS)[number];

export type RadarAxis = {
  id: RadarAxisId;
  label: string;
  value: number;
  max: number;
  /** 0–100, used to place the polygon. */
  score: number;
  display: string;
  unit: string;
};

export type RadarPoint = { x: number; y: number };

export type RadarLabel = RadarPoint & {
  id: RadarAxisId;
  label: string;
  display: string;
  anchor: "start" | "middle" | "end";
};

export type RadarLayout = {
  size: number;
  cx: number;
  cy: number;
  r: number;
  grids: string[];
  spokes: { x1: number; y1: number; x2: number; y2: number }[];
  polygon: string;
  labels: RadarLabel[];
};

/** ViewBox size — labels live outside the hexagon. */
export const RADAR_SIZE = 336;
export const RADAR_RADIUS = 86;
export const RADAR_LABEL_RADIUS = 118;
export const RADAR_RINGS = 4;
/** Vertex at 12 o'clock, clockwise — FIFA hex. */
export const RADAR_START_ANGLE = -Math.PI / 2;

const SIT_DAY_CAP = 7;
const BREATH_CAP = 40;
const KEEP_CAP = 8;

export function radarScore(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function compactMinutes(n: number) {
  if (n <= 0) return "0";
  if (n < 60) return String(Math.round(n));
  const whole = Math.round(n);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function buildRadarAxes(input: {
  minutesToday: number;
  minutesWeek: number;
  breaths: number;
  kept: number;
  streak: number;
  sits: number;
  sittingMinutes?: number;
  minutesAreEstimated?: boolean;
}): RadarAxis[] {
  const sitTarget = input.sittingMinutes && input.sittingMinutes > 0 ? input.sittingMinutes : 20;
  const minUnit = input.minutesAreEstimated ? "est. min" : "min";
  const today = Math.max(0, Math.round(input.minutesToday));
  const week = Math.max(0, Math.round(input.minutesWeek));
  const breaths = Math.max(0, Math.round(input.breaths));
  const kept = Math.max(0, Math.round(input.kept));
  const streak = Math.max(0, Math.round(input.streak));
  const sits = Math.max(0, Math.round(input.sits));

  return [
    {
      id: "today",
      label: "Today",
      value: today,
      max: sitTarget,
      score: radarScore(today, sitTarget),
      display: compactMinutes(today),
      unit: minUnit,
    },
    {
      id: "week",
      label: "Week",
      value: week,
      max: sitTarget * 5,
      score: radarScore(week, sitTarget * 5),
      display: compactMinutes(week),
      unit: minUnit,
    },
    {
      id: "breaths",
      label: "Breaths",
      value: breaths,
      max: BREATH_CAP,
      score: radarScore(breaths, BREATH_CAP),
      display: String(breaths),
      unit: breaths === 1 ? "sentence" : "sentences",
    },
    {
      id: "keeps",
      label: "Keeps",
      value: kept,
      max: KEEP_CAP,
      score: radarScore(kept, KEEP_CAP),
      display: String(kept),
      unit: kept === 1 ? "line" : "lines",
    },
    {
      id: "streak",
      label: "Streak",
      value: streak,
      max: SIT_DAY_CAP,
      score: radarScore(streak, SIT_DAY_CAP),
      display: String(streak),
      unit: streak === 1 ? "day" : "days",
    },
    {
      id: "sits",
      label: "Sits",
      value: sits,
      max: SIT_DAY_CAP,
      score: radarScore(sits, SIT_DAY_CAP),
      display: String(sits),
      unit: sits === 1 ? "sit" : "sits",
    },
  ];
}

export function radarAngle(index: number, count: number = RADAR_AXIS_IDS.length): number {
  return RADAR_START_ANGLE + (index * 2 * Math.PI) / count;
}

export function radarPoint(
  index: number,
  radius: number,
  cx = RADAR_SIZE / 2,
  cy = RADAR_SIZE / 2,
  count: number = RADAR_AXIS_IDS.length,
): RadarPoint {
  const angle = radarAngle(index, count);
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

export function pointsToPath(points: RadarPoint[]): string {
  if (points.length === 0) return "";
  return `${points.map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join(" ")} Z`;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function labelAnchor(index: number, count: number = RADAR_AXIS_IDS.length): RadarLabel["anchor"] {
  const c = Math.cos(radarAngle(index, count));
  if (c > 0.4) return "start";
  if (c < -0.4) return "end";
  return "middle";
}

export function radarLayout(axes: RadarAxis[]): RadarLayout {
  const cx = RADAR_SIZE / 2;
  const cy = RADAR_SIZE / 2;
  const count = Math.max(axes.length, 1);
  const grids: string[] = [];
  for (let ring = 1; ring <= RADAR_RINGS; ring++) {
    const r = (RADAR_RADIUS * ring) / RADAR_RINGS;
    grids.push(
      pointsToPath(Array.from({ length: count }, (_, i) => radarPoint(i, r, cx, cy, count))),
    );
  }

  const spokes = Array.from({ length: count }, (_, i) => {
    const tip = radarPoint(i, RADAR_RADIUS, cx, cy, count);
    return { x1: cx, y1: cy, x2: round(tip.x), y2: round(tip.y) };
  });

  const polygon = pointsToPath(
    axes.map((axis, i) => radarPoint(i, (RADAR_RADIUS * axis.score) / 100, cx, cy, count)),
  );

  const labels: RadarLabel[] = axes.map((axis, i) => {
    const p = radarPoint(i, RADAR_LABEL_RADIUS, cx, cy, count);
    return {
      id: axis.id,
      label: axis.label,
      display: axis.display,
      x: round(p.x),
      y: round(p.y),
      anchor: labelAnchor(i, count),
    };
  });

  return {
    size: RADAR_SIZE,
    cx,
    cy,
    r: RADAR_RADIUS,
    grids,
    spokes,
    polygon,
    labels,
  };
}

export function radarCaption(axes: RadarAxis[]): string {
  return axes.map((axis) => `${axis.label} ${axis.display} ${axis.unit}`).join(". ");
}
