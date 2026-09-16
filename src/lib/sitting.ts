export const SIT_OPTIONS = [
  { minutes: 12, label: "Twelve minutes", short: "12 min" },
  { minutes: 20, label: "Twenty minutes", short: "20 min" },
  { minutes: 0, label: "Until the end", short: "Open" },
] as const;

export type SitMinutes = (typeof SIT_OPTIONS)[number]["minutes"];

export function isSitMinutes(value: number): value is SitMinutes {
  return value === 0 || value === 12 || value === 20;
}

export function sitLabel(minutes: number): string {
  return SIT_OPTIONS.find((option) => option.minutes === minutes)?.label ?? "Open";
}

export function remainingMs(
  startedAt: number | null | undefined,
  minutes: number | null | undefined,
  now = Date.now(),
): number | null {
  if (!startedAt || !minutes || minutes <= 0) return null;
  return startedAt + minutes * 60_000 - now;
}

export function formatRemaining(ms: number): string {
  const clamped = Math.max(0, ms);
  const total = Math.ceil(clamped / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
