import { type Fill } from "./mondrian.ts";

/** Mondrian accents on paper — one painted ring per You visit. */
export const YOU_HERO_PALETTES = [
  { id: "yellow", ring: "yellow" },
  { id: "red", ring: "red" },
  { id: "blue", ring: "blue" },
  { id: "forest", ring: "forest" },
  { id: "ink", ring: "ink" },
] as const satisfies ReadonlyArray<{ id: string; ring: Fill }>;

export type YouHeroPalette = (typeof YOU_HERO_PALETTES)[number];

export const YOU_HERO_PALETTE_KEY = "salon-you-hero-palette";

export type PaletteStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStore(): PaletteStore | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function parseYouHeroPaletteIndex(raw: string | null, count = YOU_HERO_PALETTES.length): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return ((n % count) + count) % count;
}

export function youHeroPaletteAt(index: number): YouHeroPalette {
  const count = YOU_HERO_PALETTES.length;
  const i = ((index % count) + count) % count;
  return YOU_HERO_PALETTES[i]!;
}

/** Advance from the last persisted index so consecutive You visits do not repeat. */
export function nextYouHeroPaletteIndex(store: PaletteStore | null = defaultStore()): number {
  const count = YOU_HERO_PALETTES.length;
  if (!store) return 0;
  try {
    const last = parseYouHeroPaletteIndex(store.getItem(YOU_HERO_PALETTE_KEY), count);
    const next = last == null ? 0 : (last + 1) % count;
    store.setItem(YOU_HERO_PALETTE_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

let heldIndex: number | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

/** Hold the pick across a Strict Mode remount; a real leave-and-return advances. */
export function acquireYouHeroPalette(store: PaletteStore | null = defaultStore()): YouHeroPalette {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  if (heldIndex != null) return youHeroPaletteAt(heldIndex);
  heldIndex = nextYouHeroPaletteIndex(store);
  return youHeroPaletteAt(heldIndex);
}

export function releaseYouHeroPalette() {
  if (releaseTimer != null) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    heldIndex = null;
    releaseTimer = null;
  }, 80);
}

export function resetYouHeroPaletteHold() {
  if (releaseTimer != null) clearTimeout(releaseTimer);
  releaseTimer = null;
  heldIndex = null;
}
