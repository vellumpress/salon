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
 * Already-read lines — everything above the focus sentence — go back.
 * The focus line and the preview below it go forward.
 * When the focus line is off the column, the left third stays the back zone.
 * A breath taller than the column has no band above the line, so the left
 * third of the whole column (including the scrolled text) goes back.
 */
export function turnZone(input: {
  x: number;
  y: number;
  host: Box;
  focusTop: number | null;
  focusBottom: number | null;
  tall?: boolean;
}): TurnZone | null {
  const { x, y, host } = input;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < host.left || x >= host.right || y < host.top || y >= host.bottom) return null;
  if (input.tall) return x < host.left + host.width / 3 ? "prev" : "next";
  const focusTop = input.focusTop;
  const focusBottom = input.focusBottom;
  const focusVisible =
    focusTop != null &&
    focusBottom != null &&
    Number.isFinite(focusTop) &&
    Number.isFinite(focusBottom) &&
    focusBottom > host.top &&
    focusTop < host.bottom;
  if (focusVisible && y < (focusTop as number)) return "prev";
  if (focusVisible) return "next";
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
}): boolean {
  if (input.pointerType !== "mouse") return false;
  if (input.firesTouchEvents) return true;
  if (!(input.lastTouchAt > 0)) return false;
  const windowMs = input.windowMs ?? GHOST_MOUSE_MS;
  if (input.now - input.lastTouchAt < windowMs) return true;
  if (input.now - input.lastTouchAt >= GHOST_PLACE_MS) return false;
  if (input.lastX == null || input.lastY == null || input.x == null || input.y == null) {
    return false;
  }
  return Math.hypot(input.x - input.lastX, input.y - input.lastY) <= GHOST_PLACE_PX;
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
    Math.abs(input.dy) >= TAP_SLOP_PX &&
    Math.abs(input.dy) >= Math.abs(input.dx)
  ) {
    return "scroll";
  }
  if (dist <= TAP_SLOP_PX && input.dt <= TAP_MS) return "tap";
  const slop = input.canScroll ? TAP_SLOP_PX : 44;
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
