/** Shared sitting-length presets for the reader hourglass + shuffle. */

export type SittingMinutes = 5 | 12 | 20 | 30 | 45 | 0;

export const SIT_PRESETS: ReadonlyArray<{
  minutes: SittingMinutes;
  label: string;
  short: string;
}> = [
  { minutes: 5, label: "~5 min", short: "5" },
  { minutes: 12, label: "~12 min", short: "12" },
  { minutes: 20, label: "~20 min", short: "20" },
  { minutes: 30, label: "~30 min", short: "30" },
  { minutes: 45, label: "One sitting", short: "Sit" },
  { minutes: 0, label: "Open", short: "Open" },
];

const PRESET_SET = new Set<number>(SIT_PRESETS.map((preset) => preset.minutes));

export type SitMinutes = SittingMinutes;

export function isSittingMinutes(value: unknown): value is SittingMinutes {
  return typeof value === "number" && PRESET_SET.has(value);
}

export const isSitMinutes = isSittingMinutes;

/** Clamp any stored / search value into a usable sitting length (0–180). */
export function asSittingMinutes(
  value: unknown,
  fallback: SittingMinutes = 20,
): number {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    value = Number.parseInt(value, 10);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  if (n === 0) return 0;
  if (n < 0) return fallback;
  return Math.min(180, n);
}

export function sitLabel(minutes: number): string {
  const preset = SIT_PRESETS.find((item) => item.minutes === minutes);
  if (preset) return preset.label;
  if (minutes <= 0) return "Open";
  return `${minutes} min`;
}

export function remainingMs(
  startedAt: number | null | undefined,
  minutes: number | null | undefined,
  now = Date.now(),
): number | null {
  if (!startedAt || !minutes || minutes <= 0) return null;
  return startedAt + minutes * 60_000 - now;
}

export function formatSitClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const formatRemaining = formatSitClock;
