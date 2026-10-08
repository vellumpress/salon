import { emptyBreathRemap, mergeRemap, parseBreathRemap, type BreathRemap } from "./kept-lines.ts";

/**
 * Optional map from a retired breath id to the current one.
 * A re-bind may ship `src/lib/catalog/at-remap.json`. Missing file: no map.
 */
const files = import.meta.glob(
  ["./catalog/at-remap.json", "./catalog/breath-remap.json", "./at-remap.json"],
  { eager: true, import: "default" },
);

export function readBreathRemap(): BreathRemap {
  let remap = emptyBreathRemap();
  for (const raw of Object.values(files)) remap = mergeRemap(remap, parseBreathRemap(raw));
  return remap;
}
