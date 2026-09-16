import { hashString, mulberry32 } from "./hash";

export type Fill = "paper" | "yellow" | "red" | "blue" | "forest";

const FILLS: Fill[] = ["paper", "yellow", "red", "blue", "forest"];
const CURATED: Fill[] = ["paper", "yellow", "red", "blue", "forest"];

export function fillForWork(id: string): Fill {
  const special: Record<string, Fill> = {
    passing: "red",
    banjo: "forest",
    "in-our-time": "yellow",
    "the-house-of-mirth": "paper",
    carmilla: "blue",
  };
  return special[id] ?? FILLS[hashString(id) % FILLS.length] ?? "paper";
}

export function fillSequence(count: number, seed: string): Fill[] {
  const order = [...CURATED];
  const rand = mulberry32(hashString(seed));
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out: Fill[] = [];
  for (let i = 0; i < count; i += 1) {
    let next = order[i % order.length] ?? "paper";
    if (out.length > 0 && next === out[out.length - 1] && order.length > 1) {
      next = order[(i + 1) % order.length] ?? "paper";
    }
    out.push(next);
  }
  return out;
}

export function fillClass(fill: Fill): string {
  switch (fill) {
    case "red":
      return "bg-red";
    case "blue":
      return "bg-blue";
    case "yellow":
      return "bg-yellow";
    case "forest":
      return "bg-forest";
    default:
      return "bg-paper";
  }
}

export function inkClass(fill: Fill): string {
  return fill === "red" || fill === "blue" || fill === "forest"
    ? "text-paper"
    : "text-ink";
}
