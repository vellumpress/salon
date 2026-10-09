export type TurnZone = "prev" | "next";

type Box = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
};

/**
 * A finger that barely moves, and lifts quickly, is a tap.
 * Tall breaths use this same slop so a scroll drag is not a tap.
 */
export const TAP_SLOP_PX = 10;
export const TAP_MS = 350;

/** A tall sentence starts scrolling only after the finger has clearly dragged. */
export const SCROLL_ARM_PX = 24;

/**
 * A still finger becomes a repeat after this long. A lift before it is one tap.
 * The repeat starts at a reading pace and speeds up while the finger stays down.
 */
export const HOLD_ARM_MS = 350;
export const HOLD_START_PER_SEC = 4;
export const HOLD_MAX_PER_SEC = 12;
/** How long the repeat takes to climb from the slow pace to the fast one. */
export const HOLD_RAMP_MS = 1500;

/**
 * Milliseconds until the next sentence while a finger is held.
 * At the start of the repeat this is 4 a second. After the ramp it is 12.
 */
export function holdStepIntervalMs(heldAfterArmMs: number): number {
  const t = Math.min(1, Math.max(0, heldAfterArmMs) / HOLD_RAMP_MS);
  const eased = t * t * (3 - 2 * t);
  const rate = HOLD_START_PER_SEC + (HOLD_MAX_PER_SEC - HOLD_START_PER_SEC) * eased;
  return 1000 / rate;
}

/**
 * Auto-steps a still hold produces. The lift does not add another.
 * Shorter than the arm is a tap, counted by the caller, not here.
 */
export function holdStepCount(holdMs: number): number {
  if (!(holdMs >= HOLD_ARM_MS)) return 0;
  let steps = 0;
  let t = HOLD_ARM_MS;
  while (t <= holdMs + 0.001 && steps < 10_000) {
    steps += 1;
    t += holdStepIntervalMs(t - HOLD_ARM_MS);
  }
  return steps;
}

/**
 * Ghost mouse that iOS and Chromium synthesize after a touch.
 * The click itself is swallowed by a counter, not this clock. The window
 * only drops the extra pointerup, which can land late when the main thread
 * is busy. A real mouse click after it still turns.
 */
export const GHOST_MOUSE_MS = 1500;

/**
 * A compatibility click can sit in the queue behind a long layout, so it
 * arrives after the short window. It still lands on the finger. A real
 * mouse click somewhere else is not that finger.
 */
export const GHOST_PLACE_MS = 12_000;
export const GHOST_PLACE_PX = 24;

export type TurnGesture = "tap" | "swipe-next" | "swipe-prev" | "scroll" | "ignore";

/**
 * Page turn for a tap inside the reading column.
 * The left third, at every height, goes back one sentence.
 * The center and the right side go forward.
 * The focus line does not split the page: a tap on the lower left is back.
 */
export function turnZone(input: {
  x: number;
  y: number;
  host: Box;
  focusTop?: number | null;
  focusBottom?: number | null;
  tall?: boolean;
}): TurnZone | null {
  const { x, y, host } = input;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < host.left || x >= host.right || y < host.top || y >= host.bottom) return null;
  return x < host.left + host.width / 3 ? "prev" : "next";
}

/**
 * Mouse events synthesized from a touch. They are the same finger, not a
 * second tap. `firesTouchEvents` is the platform signal; the time window
 * covers Safari, which often omits it.
 */
export function ghostMousePointer(input: {
  pointerType: string;
  firesTouchEvents?: boolean;
  now: number;
  lastTouchAt: number;
  windowMs?: number;
  x?: number;
  y?: number;
  lastX?: number | null;
  lastY?: number | null;
  places?: { x: number; y: number; t: number }[];
}): boolean {
  if (input.pointerType !== "mouse") return false;
  if (input.firesTouchEvents) return true;
  if (!(input.lastTouchAt > 0)) return false;
  const windowMs = input.windowMs ?? GHOST_MOUSE_MS;
  if (input.now - input.lastTouchAt < windowMs) return true;
  const x = input.x;
  const y = input.y;
  if (x == null || y == null) return false;
  const places =
    input.places ??
    (input.lastX != null && input.lastY != null
      ? [{ x: input.lastX, y: input.lastY, t: input.lastTouchAt }]
      : []);
  return places.some(
    (place) => input.now - place.t < GHOST_PLACE_MS && Math.hypot(x - place.x, y - place.y) <= GHOST_PLACE_PX,
  );
}

/**
 * One lift. A tall breath treats a vertical move as a scroll; a fitted
 * breath keeps a wider slop so a shaky finger still turns. A short, still
 * touch (under 10px and under 350ms) is always a tap.
 */
export function classifyTurnGesture(input: {
  dx: number;
  dy: number;
  dt: number;
  canScroll: boolean;
  scrolled: boolean;
}): TurnGesture {
  if (input.scrolled) return "scroll";
  const dist = Math.hypot(input.dx, input.dy);
  if (
    Math.abs(input.dx) >= 56 &&
    Math.abs(input.dx) > Math.abs(input.dy) * 1.25 &&
    input.dt < 900
  ) {
    return input.dx < 0 ? "swipe-next" : "swipe-prev";
  }
  if (
    input.canScroll &&
    Math.abs(input.dy) >= SCROLL_ARM_PX &&
    Math.abs(input.dy) >= Math.abs(input.dx)
  ) {
    return "scroll";
  }
  if (dist <= TAP_SLOP_PX && input.dt <= TAP_MS) return "tap";
  const slop = input.canScroll ? SCROLL_ARM_PX : 44;
  const limit = input.canScroll ? 700 : 900;
  if (dist <= slop && input.dt <= limit) return "tap";
  return "ignore";
}

/**
 * Page inside a breath that is taller than the column.
 * Forward reveals the rest; back reveals what is above.
 * Null means that edge is already in view, so the caller steps a breath.
 */
export function breathPageTop(input: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  direction: 1 | -1;
}): number | null {
  const max = Math.max(0, input.scrollHeight - input.clientHeight);
  const edge = 3;
  if (!(max > edge)) return null;
  const page = Math.max(48, Math.floor(input.clientHeight * 0.9));
  if (input.direction > 0) {
    if (input.scrollTop >= max - edge) return null;
    return Math.min(max, input.scrollTop + page);
  }
  if (input.scrollTop <= edge) return null;
  return Math.max(0, input.scrollTop - page);
}
