/**
 * How much of the page is sharp. One scale, kept on this device.
 * 40 is today's band: 43% to 73% of the screen, then the same line steps.
 * Nothing saved means that band. A saved choice is left as it is.
 */

export const FOCUS_KEY = "salon-focus";
export const FOCUS_MIN = 0;
export const FOCUS_MAX = 100;
export const FOCUS_STEP = 1;
export const FOCUS_DEFAULT = 40;

/** Narrow end: three and a half lines, centered where today's band sits. */
const NARROW_LINES = 3.5;
const NARROW_CENTER = 58;
/** Wide end: a short fade, and never more than this much of the screen. */
const WIDE_EDGE_LINES = 2;
const WIDE_EDGE_CAP = 12;

export type FocusBand = {
  top: string;
  bottom: string;
  /** 1 is today's step. Smaller packs that step into a shorter fade. */
  ramp: number;
  isDefault: boolean;
};

type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function snap(value: number): number {
  const snapped = Math.round(value / FOCUS_STEP) * FOCUS_STEP;
  return Math.round(snapped);
}

export function clampFocus(value: number): number {
  if (!Number.isFinite(value)) return FOCUS_DEFAULT;
  const next = snap(value);
  if (next < FOCUS_MIN) return FOCUS_MIN;
  if (next > FOCUS_MAX) return FOCUS_MAX;
  return next;
}

export function formatFocus(value: number): string {
  return String(clampFocus(value));
}

export function readFocus(store: Store | null = defaultStore()): number {
  if (!store) return FOCUS_DEFAULT;
  try {
    const raw = store.getItem(FOCUS_KEY);
    if (raw == null) return FOCUS_DEFAULT;
    const value = raw.trim();
    if (value === "") return FOCUS_DEFAULT;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < FOCUS_MIN || parsed > FOCUS_MAX) return FOCUS_DEFAULT;
    return snap(parsed);
  } catch {
    return FOCUS_DEFAULT;
  }
}

export function writeFocus(value: number, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(FOCUS_KEY, formatFocus(value));
  } catch {
    /* private mode */
  }
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function num(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

function edge(percent: number, lines: number): string {
  const pct = num(percent);
  if (lines === 0) return `${pct}%`;
  const span = num(Math.abs(lines));
  return lines < 0
    ? `calc(${pct}% - ${span} * var(--focus-line))`
    : `calc(${pct}% + ${span} * var(--focus-line))`;
}

/**
 * The sharp band and the length of the fade.
 * Default is the live band, written as plain percentages so the mask
 * does not change when nothing is saved.
 */
export function focusBand(value: number): FocusBand {
  const t = clampFocus(value);
  if (t === FOCUS_DEFAULT) {
    return { top: "43%", bottom: "73%", ramp: 1, isDefault: true };
  }
  if (t < FOCUS_DEFAULT) {
    const amount = t / FOCUS_DEFAULT;
    const half = NARROW_LINES / 2;
    return {
      top: edge(mix(NARROW_CENTER, 43, amount), mix(-half, 0, amount)),
      bottom: edge(mix(NARROW_CENTER, 73, amount), mix(half, 0, amount)),
      ramp: 1,
      isDefault: false,
    };
  }
  const amount = (t - FOCUS_DEFAULT) / (FOCUS_MAX - FOCUS_DEFAULT);
  const keep = num(1 - amount);
  const move = num(amount);
  const ramp = mix(1, WIDE_EDGE_LINES / 9, amount);
  if (amount === 1) {
    return {
      top: `min(${WIDE_EDGE_CAP}%, calc(${WIDE_EDGE_LINES} * var(--focus-line)))`,
      bottom: `max(${100 - WIDE_EDGE_CAP}%, calc(100% - ${WIDE_EDGE_LINES} * var(--focus-line)))`,
      ramp,
      isDefault: false,
    };
  }
  return {
    top: `calc(${keep} * 43% + ${move} * min(${WIDE_EDGE_CAP}%, calc(${WIDE_EDGE_LINES} * var(--focus-line))))`,
    bottom: `calc(${keep} * 73% + ${move} * max(${100 - WIDE_EDGE_CAP}%, calc(100% - ${WIDE_EDGE_LINES} * var(--focus-line))))`,
    ramp,
    isDefault: false,
  };
}

/** Paint the band on the mask frame. The page underneath is not moved. */
export function applyFocusBand(node: HTMLElement | null, value: number): void {
  if (!node) return;
  const band = focusBand(value);
  if (band.isDefault) {
    node.style.removeProperty("--focus-ink-top");
    node.style.removeProperty("--focus-ink-bottom");
    node.style.removeProperty("--focus-ramp");
    return;
  }
  node.style.setProperty("--focus-ink-top", band.top);
  node.style.setProperty("--focus-ink-bottom", band.bottom);
  if (band.ramp === 1) node.style.removeProperty("--focus-ramp");
  else node.style.setProperty("--focus-ramp", num(band.ramp));
}
