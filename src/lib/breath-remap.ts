import { emptyBreathRemap, mergeRemap, parseBreathRemap, type BreathRemap } from "./kept-lines.ts";

/**
 * Optional map from a retired breath id to the current one.
 * A re-bind may ship `src/lib/catalog/at-remap.json`. The file is not
 * imported with the app: it loads the first time a saved Kept id is
 * missing from the current text, then stays cached. Missing file: no map.
 */
const loaders = import.meta.glob(
  ["./catalog/at-remap.json", "./catalog/breath-remap.json", "./at-remap.json"],
  { import: "default" },
);

let cached: BreathRemap | null = null;
let pending: Promise<BreathRemap> | null = null;

export function readBreathRemap(): BreathRemap {
  return cached ?? emptyBreathRemap();
}

export function breathRemapLoaded(): boolean {
  return cached != null;
}

/** Fetch and parse the remap once. Safe to call again; the first load wins. */
export function loadBreathRemap(): Promise<BreathRemap> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    let remap = emptyBreathRemap();
    for (const load of Object.values(loaders)) {
      try {
        remap = mergeRemap(remap, parseBreathRemap(await load()));
      } catch {
        /* An unreadable map leaves each line on the id it already has. */
      }
    }
    cached = remap;
    return cached;
  })();
  return pending;
}
