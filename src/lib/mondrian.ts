import { shelfWork } from "./catalog/shelf.ts";

export type Fill = "red" | "blue" | "yellow" | "forest" | "paper" | "ink";

export const FILLS: Fill[] = ["red", "blue", "yellow", "paper", "forest"];

/** Mondrian home mosaic: paper, yellow, red, blue, forest green — first row covers the set. */
export const MOSAIC: Fill[] = ["paper", "yellow", "red", "blue", "forest"];

/** Default seed is a stable hash. Changing the string would reshuffle the mosaic. */
export function mosaicFills(count: number, seed = "vellum") {
  // Seeded order of the five Mondrian colors, then walk so neighbors never match.
  const bag = [...MOSAIC];
  let h = hashSeed(seed);
  for (let i = bag.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    const j = h % (i + 1);
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  const out: Fill[] = [];
  for (let i = 0; i < count; i++) {
    const pick = bag[i % bag.length]!;
    if (out.length > 0 && pick === out[out.length - 1] && bag.length > 1) {
      out.push(bag[(i + 1) % bag.length]!);
    } else {
      out.push(pick);
    }
  }
  return out;
}

export function mosaicFill(index: number, seed = "vellum") {
  return mosaicFills(index + 1, seed)[index] ?? "paper";
}

export function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function planeOf(seed: string): Fill {
  return FILLS[hashSeed(seed) % FILLS.length] ?? "paper";
}

export function fillClass(fill: Fill) {
  switch (fill) {
    case "red":
      return "bg-red";
    case "blue":
      return "bg-blue";
    case "yellow":
      return "bg-yellow";
    case "forest":
      return "bg-forest";
    case "ink":
      return "bg-ink";
    default:
      return "bg-paper";
  }
}

export function fillInk(fill: Fill) {
  return fill === "red" || fill === "blue" || fill === "forest" || fill === "ink" ? "text-paper" : "text-ink";
}

export function fillVar(fill: Fill) {
  switch (fill) {
    case "red":
      return "var(--color-red)";
    case "blue":
      return "var(--color-blue)";
    case "yellow":
      return "var(--color-yellow)";
    case "forest":
      return "var(--color-forest)";
    case "ink":
      return "var(--color-ink)";
    default:
      return "var(--color-paper)";
  }
}

export function fillOf(id: string): Fill {
  switch (id) {
    case "passing":
      return "red";
    case "gold":
      return "paper";
    case "manhattan":
      return "blue";
    case "berlin":
      return "ink";
    case "we":
      return "yellow";
    default:
      return planeOf(id);
  }
}

export type BoardCell = {
  id: string;
  fill: Fill;
  span: "mark" | "hero" | "wide" | "tall" | "unit" | "band";
  title?: string;
  author?: string;
  opening?: string;
  breaths?: number;
  year?: number;
};

export const BOARD: BoardCell[] = [
  { id: "mark", fill: "paper", span: "mark" },
  { id: "together", fill: "forest", span: "hero" },
  { id: "clubs", fill: "red", span: "wide" },
  { id: "map", fill: "blue", span: "wide" },
  { id: "glass", fill: "yellow", span: "wide" },
];

export function boardWork(id: string): BoardCell | undefined {
  const entry = shelfWork(id);
  if (entry) {
    return {
      id: entry.id,
      fill: fillOf(entry.id),
      span: entry.local ? "wide" : "unit",
      title: entry.title,
      author: entry.author,
      opening: entry.opening,
      breaths: entry.breaths,
      year: entry.year,
    };
  }
  return BOARD.find((cell) => cell.id === id);
}
