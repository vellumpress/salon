/**
 * What the pre-deploy catalog walk opens.
 *
 * The full walk of every book stays in the catalog-walk workflow. Before
 * Pages deploys, the same test walks three sets:
 * - every book whose text changed in the push
 * - a window of 40 that advances one window per UTC day and wraps the catalog
 * - the anchor books, every time
 */

export const CATALOG_WALK_SAMPLE_SIZE = 40;

/** Catalog ids. House of Mirth lives at `the-house-of-mirth`. */
export const CATALOG_WALK_ANCHORS = [
  "the-house-of-mirth",
  "the-goose-man",
  "dona-perfecta",
  "falcon",
] as const;

const DAY_MS = 86_400_000;

export function catalogWalkMode(raw: string | undefined): "sample" | "full" {
  return raw === "sample" ? "sample" : "full";
}

/** Midnight UTC day count. The same calendar day always picks the same window. */
export function utcEpochDay(now: Date): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / DAY_MS);
}

export function resolveEpochDay(raw: string | undefined, now = new Date()): number {
  if (raw && /^-?\d+$/.test(raw.trim())) return Number(raw.trim());
  return utcEpochDay(now);
}

/** A git rev we are willing to pass to `git diff`. Not a shell string. */
export function usableDiffBase(rev: string | undefined): string | null {
  if (!rev) return null;
  const trimmed = rev.trim();
  if (!/^(?:HEAD(?:\^|~\d+)?|[0-9a-f]{7,40})$/i.test(trimmed)) return null;
  if (/^0+$/.test(trimmed)) return null;
  return trimmed;
}

export function bookIdFromCatalogPath(path: string): string | null {
  const normalized = path.replaceAll("\\", "/").trim();
  const renamed = normalized.match(/src\/lib\/catalog\/texts\/\{[^}]* => ([^}/]+)\}\.json$/);
  if (renamed?.[1]) return renamed[1];
  const plain = normalized.match(/(?:^|\/)src\/lib\/catalog\/texts\/([^/{}]+)\.json$/);
  return plain?.[1] ?? null;
}

/** `git diff --name-status` or a plain path list, one record per line. */
export function catalogIdsFromDiff(text: string): string[] {
  const ids: string[] = [];
  const add = (path: string) => {
    const id = bookIdFromCatalogPath(path);
    if (!id || ids.includes(id)) return;
    ids.push(id);
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[ACDMRT]\d*\t/.test(trimmed)) {
      for (const part of trimmed.split("\t").slice(1)) add(part);
      continue;
    }
    add(trimmed);
  }
  return ids;
}

/**
 * Contiguous window of `size` ids. The start advances by `size` each epoch
 * day and wraps, so successive days tile the sorted catalog.
 */
export function rotatingSample(ids: readonly string[], size: number, epochDay: number): string[] {
  const sorted = [...new Set(ids)].filter((id) => id.length > 0).sort();
  if (sorted.length === 0 || size <= 0) return [];
  if (sorted.length <= size) return sorted;
  const start = ((epochDay % sorted.length) + sorted.length) % sorted.length;
  const offset = (start * size) % sorted.length;
  const out: string[] = [];
  for (let i = 0; i < size; i += 1) out.push(sorted[(offset + i) % sorted.length] ?? "");
  return out.filter((id) => id.length > 0);
}

export function selectCatalogWalk(input: {
  ids: readonly string[];
  changed: readonly string[];
  epochDay: number;
  mode: "sample" | "full";
}): string[] {
  const known = [...new Set(input.ids)].filter((id) => id.length > 0).sort();
  if (input.mode === "full") return known;
  const knownSet = new Set(known);
  const sample = rotatingSample(known, CATALOG_WALK_SAMPLE_SIZE, input.epochDay);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...input.changed, ...CATALOG_WALK_ANCHORS, ...sample]) {
    if (!knownSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Playwright's navigation timeout, not a sentence-step miss. */
export function isPageGotoTimeout(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /page\.goto: Timeout \d+ms exceeded/.test(message);
}
