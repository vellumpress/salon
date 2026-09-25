/**
 * Brand sheet colors for the tbr. lockup and the shelf mark.
 * Mondrian layout cells keep their own tokens (paper, ink, forest, blue, red, yellow).
 * Navy, olive, and oxblood are the sheet colors that were not already tokens.
 * The shelf's green is the sheet's forest, not the brighter Mondrian forest.
 */
export const BRAND = {
  paper: "#f3f1eb",
  ink: "#111111",
  navy: "#333e56",
  shelfForest: "#32463a",
  olive: "#aba56d",
  oxblood: "#4b2a28",
} as const;

export type WordmarkSurface =
  | "paper"
  | "forest"
  | "navy"
  | "blue"
  | "oxblood"
  | "olive"
  | "ink";

/**
 * On paper the letters are ink. On olive, everything is ink.
 * On forest, navy, oxblood (and the app's navy-like blue, or an ink field)
 * the letters turn paper.
 */
export function wordmarkInk(surface: WordmarkSurface): "paper" | "ink" {
  if (surface === "paper" || surface === "olive") return "ink";
  return "paper";
}

/**
 * On paper the stop is oxblood. On olive the stop is ink.
 * On forest, navy, or oxblood the stop turns olive.
 */
export function wordmarkStop(surface: WordmarkSurface): "oxblood" | "olive" | "ink" {
  if (surface === "paper") return "oxblood";
  if (surface === "olive") return "ink";
  return "olive";
}
