import { placePartialColonelProgress } from "./colonel-place.ts";
import { mergeKept, type KeptStored } from "./kept-lines.ts";

/**
 * Retired catalog ids. Saved progress, Kept lines, favorites, and share
 * links may still name the old id. Resolve them to the live book.
 */
export const WORK_ID_ALIASES: Readonly<Record<string, string>> = {
  immoralist: "the-immoralist",
  "three-plays": "three-plays-incl-henry-iv",
  // The shorter Mashonaland bind. Saved progress and links follow the full novel.
  "trooper-peter-halket-of-mashonaland": "trooper-peter-halket",
  // Textless catalog stubs. Saved progress and links follow the local book.
  "home-world": "the-home-and-the-world",
  "the-colonels-dream": "colonels-dream",
  // The 160-minute partial bind. The 419-minute book is the novel.
  "the-colonel-s-dream": "colonels-dream",
  // Shelf dupes. The keeper is the fuller copy. dorian.json stays for the preface pack.
  crime: "crime-and-punishment",
  niels: "niels-lyhne",
  "african-farm": "the-story-of-an-african-farm",
  dorian: "picture-of-dorian-gray",
  "hidden-force": "the-hidden-force",
  mattia: "the-late-mattia-pascal",
  venice: "death-in-venice",
  underdogs: "the-underdogs",
  "almayer-s-folly": "almayers-folly",
  "laos-folk-lore-of-farther-india": "laos-folk-lore",
  "god-s-trombones": "gods-trombones",
  "the-family-at-gilje": "family-at-gilje",
  "the-rise-of-david-levinsky": "rise-of-david-levinsky",
  "the-reign-of-greed": "reign-of-greed",
  "the-reign-of-greed-el-filibusterismo": "reign-of-greed",
  "the-way-of-all-flesh": "way-of-all-flesh",
  "mogens-and-other-stories": "mogens",
  "the-shadow-of-the-cathedral": "shadow-of-the-cathedral",
  malavoglia: "the-house-by-the-medlar-tree",
  "against-the-grain": "rebours",
  "taras-bulba-and-other-tales": "taras-bulba",
  "poison-tree": "the-poison-tree",
  "a-spring-time-case": "spring-time-case",
  gosta: "the-story-of-gosta-berling",
  "ecstasy-a-study-of-happiness": "ecstasy",
  "a-chambermaid-s-diary": "diary-of-a-chambermaid",
  "inferno-2": "the-inferno",
  "great-god-pan": "the-great-god-pan",
  charan: "korean-folk-tales",
};

export function canonicalWorkId(id: string): string {
  return WORK_ID_ALIASES[id] ?? id;
}

type ProgressRow = {
  lastOpenedAt?: number;
  breathIndex?: number;
  sentenceAt?: number;
  breathId?: string;
  breathCount?: number;
  bindHash?: string;
  kept?: KeptStored[];
};

type AliasState = {
  progress?: Record<string, ProgressRow>;
  favorites?: string[];
  lastShuffle?: string | null;
  readingNow?: { id: string } | null;
  worksTouchedByDay?: Record<string, string[]>;
  sitHistory?: { workId: string }[];
  togetherKeeps?: { workId: string }[];
  hostedSits?: { workId: string }[];
};

function preferProgress(current: ProgressRow | undefined, incoming: ProgressRow): ProgressRow {
  if (!current) return { ...incoming, kept: mergeKept(incoming.kept, []) };
  const winner = (incoming.lastOpenedAt ?? 0) > (current.lastOpenedAt ?? 0) ? incoming : current;
  const other = winner === incoming ? current : incoming;
  return {
    ...winner,
    kept: mergeKept(winner.kept, other.kept),
  };
}

function remapProgress(progress: Record<string, ProgressRow>): Record<string, ProgressRow> {
  const next: Record<string, ProgressRow> = {};
  for (const [id, row] of Object.entries(progress)) {
    if (!row || typeof row !== "object") continue;
    const placed = id === "the-colonel-s-dream" ? placePartialColonelProgress(row) : row;
    const key = canonicalWorkId(id);
    next[key] = preferProgress(next[key], placed);
  }
  return next;
}

function remapIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || !id) continue;
    const key = canonicalWorkId(id);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/** Rewrite retired work ids in a persisted reading snapshot. Idempotent. */
export function remapAliasedWorkIds<T extends AliasState>(state: T): T {
  if (!state || typeof state !== "object") return state;
  const next = { ...state };
  if (state.progress && typeof state.progress === "object") next.progress = remapProgress(state.progress);
  if (Array.isArray(state.favorites)) next.favorites = remapIds(state.favorites);
  if (typeof state.lastShuffle === "string") next.lastShuffle = canonicalWorkId(state.lastShuffle);
  if (state.readingNow && typeof state.readingNow.id === "string") {
    next.readingNow = { ...state.readingNow, id: canonicalWorkId(state.readingNow.id) };
  }
  if (state.worksTouchedByDay && typeof state.worksTouchedByDay === "object") {
    const days: Record<string, string[]> = {};
    for (const [day, ids] of Object.entries(state.worksTouchedByDay)) {
      const list = remapIds(ids);
      if (list.length > 0) days[day] = list;
    }
    next.worksTouchedByDay = days;
  }
  if (Array.isArray(state.sitHistory)) {
    next.sitHistory = state.sitHistory.flatMap((row) =>
      row && typeof row === "object"
        ? [{ ...row, workId: canonicalWorkId(typeof row.workId === "string" ? row.workId : "") }]
        : [],
    );
  }
  if (Array.isArray(state.togetherKeeps)) {
    next.togetherKeeps = state.togetherKeeps.flatMap((row) =>
      row && typeof row === "object"
        ? [{ ...row, workId: canonicalWorkId(typeof row.workId === "string" ? row.workId : "") }]
        : [],
    );
  }
  if (Array.isArray(state.hostedSits)) {
    next.hostedSits = state.hostedSits.flatMap((row) =>
      row && typeof row === "object"
        ? [{ ...row, workId: canonicalWorkId(typeof row.workId === "string" ? row.workId : "") }]
        : [],
    );
  }
  return next;
}
