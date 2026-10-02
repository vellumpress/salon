/**
 * Reader page colors that follow the device's local clock.
 *
 * Nominal phases (local time):
 *   morning  5:00–11:00  deep cobalt, cream text
 *   midday  11:00–16:00  bright yellow, dark text
 *   evening 16:00–21:00  bold green, dark text
 *   night   21:00–5:00   deep red, cream text (wraps midnight)
 *
 * Each boundary blends for 45 minutes, centered on the hour
 * (22 minutes before through 22 minutes after). Midnight is the
 * middle of night, not a boundary.
 */

export const DAYLIGHT_COLORS_KEY = "salon-daylight-colors";

/** Inclusive window: boundary ± 22 minutes = 45 minutes. */
export const BLEND_RADIUS_MINUTES = 22;
export const BLEND_MINUTES = BLEND_RADIUS_MINUTES * 2 + 1;

export const DAYLIGHT_PHASE_HOURS = {
  morning: { from: "5:00", to: "11:00" },
  midday: { from: "11:00", to: "16:00" },
  evening: { from: "16:00", to: "21:00" },
  night: { from: "21:00", to: "5:00" },
} as const;

const CREAM = "#fff8ee";
const DARK = "#111111";
const FALLBACK_LIGHT = "#ffffff";
const FALLBACK_DARK = "#000000";
const BRAND_KEEP = "#c41230";
const KEEP_GOLD = "#f2c14e";

export const DAYLIGHT_SOLIDS = {
  morning: { background: "#1348b0", ink: CREAM },
  midday: { background: "#ffd000", ink: DARK },
  evening: { background: "#2fbf5a", ink: DARK },
  night: { background: "#7a1832", ink: CREAM },
} as const;

export type DaylightPhase = keyof typeof DAYLIGHT_SOLIDS;

export type DaylightSample = {
  phase: DaylightPhase;
  from: DaylightPhase;
  to: DaylightPhase;
  /** 0 = fully `from`, 1 = fully `to`. 0 outside a blend. */
  blend: number;
  background: string;
  ink: string;
  muted: string;
  /** Kept-line mark and hourglass sand. Contrasts with the page. */
  keep: string;
  sand: string;
  rule: string;
};

type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const BOUNDARIES: ReadonlyArray<{ at: number; from: DaylightPhase; to: DaylightPhase }> = [
  { at: 5 * 60, from: "night", to: "morning" },
  { at: 11 * 60, from: "morning", to: "midday" },
  { at: 16 * 60, from: "midday", to: "evening" },
  { at: 21 * 60, from: "evening", to: "night" },
];

export function normalizeMinute(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  return ((Math.floor(minute) % 1440) + 1440) % 1440;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function hexChannel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

export function mixHex(from: string, to: string, t: number): string {
  if (t <= 0) return from.toLowerCase();
  if (t >= 1) return to.toLowerCase();
  const channels = [0, 1, 2].map((index) => {
    const a = hexChannel(from, index);
    const b = hexChannel(to, index);
    return Math.round(a + (b - a) * t);
  });
  return (
    "#" +
    channels
      .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const r = linearize(hexChannel(hex, 0));
  const g = linearize(hexChannel(hex, 1));
  const b = linearize(hexChannel(hex, 2));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio. Body text aims for 4.5; marks aim for 3. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableInk(background: string, preferred: string, alternate: string): string {
  const ranked = [preferred, alternate, FALLBACK_DARK, FALLBACK_LIGHT];
  let best = preferred;
  let bestScore = -1;
  const seen = new Set<string>();
  for (const ink of ranked) {
    const key = ink.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const score = contrastRatio(ink, background);
    if (score >= 4.5) return ink;
    if (score > bestScore) {
      best = ink;
      bestScore = score;
    }
  }
  return best;
}

function soften(ink: string, background: string): string {
  let best = ink;
  let lo = 0;
  let hi = 0.62;
  for (let step = 0; step < 14; step++) {
    const t = (lo + hi) / 2;
    const sample = mixHex(ink, background, t);
    if (contrastRatio(sample, background) >= 4.5) {
      best = sample;
      lo = t;
    } else {
      hi = t;
    }
  }
  return best;
}

function markColor(background: string, ink: string): string {
  if (contrastRatio(BRAND_KEEP, background) >= 3) return BRAND_KEEP;
  if (contrastRatio(KEEP_GOLD, background) >= 3) return KEEP_GOLD;
  return ink;
}

function solidPhase(minute: number): DaylightPhase {
  if (minute >= 5 * 60 + BLEND_RADIUS_MINUTES + 1 && minute <= 11 * 60 - BLEND_RADIUS_MINUTES - 1) {
    return "morning";
  }
  if (minute >= 11 * 60 + BLEND_RADIUS_MINUTES + 1 && minute <= 16 * 60 - BLEND_RADIUS_MINUTES - 1) {
    return "midday";
  }
  if (minute >= 16 * 60 + BLEND_RADIUS_MINUTES + 1 && minute <= 21 * 60 - BLEND_RADIUS_MINUTES - 1) {
    return "evening";
  }
  return "night";
}

export function daylightAtMinute(minute: number): DaylightSample {
  const m = normalizeMinute(minute);
  for (const boundary of BOUNDARIES) {
    const delta = m - boundary.at;
    if (delta < -BLEND_RADIUS_MINUTES || delta > BLEND_RADIUS_MINUTES) continue;
    const blend = smoothstep((delta + BLEND_RADIUS_MINUTES) / (BLEND_RADIUS_MINUTES * 2));
    const fromSolid = DAYLIGHT_SOLIDS[boundary.from];
    const toSolid = DAYLIGHT_SOLIDS[boundary.to];
    const background = mixHex(fromSolid.background, toSolid.background, blend);
    const nearer = blend < 0.5 ? fromSolid.ink : toSolid.ink;
    const farther = blend < 0.5 ? toSolid.ink : fromSolid.ink;
    const ink = readableInk(background, nearer, farther);
    const keep = markColor(background, ink);
    return {
      phase: blend < 0.5 ? boundary.from : boundary.to,
      from: boundary.from,
      to: boundary.to,
      blend,
      background,
      ink,
      muted: soften(ink, background),
      keep,
      sand: keep,
      rule: ink,
    };
  }

  const phase = solidPhase(m);
  const solid = DAYLIGHT_SOLIDS[phase];
  const keep = markColor(solid.background, solid.ink);
  return {
    phase,
    from: phase,
    to: phase,
    blend: 0,
    background: solid.background,
    ink: solid.ink,
    muted: soften(solid.ink, solid.background),
    keep,
    sand: keep,
    rule: solid.ink,
  };
}

/** Local clock — `getHours`, so the midnight wrap follows the device, not UTC. */
export function daylightAt(date: Date): DaylightSample {
  return daylightAtMinute(minutesOfDay(date));
}

function defaultStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Missing key is on. Only an explicit off value turns the page back to paper. */
export function readDaylightEnabled(store: Store | null = defaultStore()): boolean {
  if (!store) return true;
  try {
    const raw = store.getItem(DAYLIGHT_COLORS_KEY);
    if (raw == null) return true;
    const value = raw.trim().toLowerCase();
    if (value === "") return true;
    return value !== "0" && value !== "off" && value !== "false";
  } catch {
    return true;
  }
}

export function writeDaylightEnabled(on: boolean, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(DAYLIGHT_COLORS_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}
