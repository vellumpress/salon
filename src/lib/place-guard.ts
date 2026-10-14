/**
 * The latest tap owns the place.
 * A saved shelf, a remote shelf, a full-text bind, or a shell reload may
 * arrive later. None of them may move the breath unless it is newer user input.
 */

export const USER_MOVE_KEY = "tbr-user-move";

/** A shell reload inside this window still belongs to the tap, not to `?at=`. */
export const TAP_GUARD_MS = 60_000;

export type UserMove = {
  workId: string;
  index: number;
  cursor: number;
  /** Window inside a sentence taller than three lines. Missing means the first. */
  window?: number;
  /** `Date.now()` when the reader chose this place. */
  at: number;
  /** Path and query, with a shell `__fresh` reload stripped. */
  href: string;
  breathId: string;
};

/** True after `noteUserMove` in this document. A reload starts over. */
let notedThisDocument = false;

/** Drop `__fresh` so a shell reload is the same visit as the tap. */
export function readerHref(href: string): string {
  const hash = href.indexOf("#");
  const bare = hash >= 0 ? href.slice(0, hash) : href;
  const query = bare.indexOf("?");
  if (query < 0) return bare;
  const params = new URLSearchParams(bare.slice(query + 1));
  params.delete("__fresh");
  const rest = params.toString();
  return rest ? `${bare.slice(0, query)}?${rest}` : bare.slice(0, query);
}

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function noteUserMove(move: UserMove, storage?: Storage) {
  notedThisDocument = true;
  const box = storage ?? defaultStorage();
  if (!box) return;
  const row: UserMove = {
    workId: move.workId,
    index: Math.floor(move.index),
    cursor: Math.max(0, Math.floor(move.cursor)),
    window: typeof move.window === "number" && move.window > 0 ? Math.floor(move.window) : undefined,
    at: move.at,
    href: readerHref(move.href),
    breathId: move.breathId,
  };
  box.setItem(USER_MOVE_KEY, JSON.stringify(row));
}

export function readUserMove(storage?: Storage): UserMove | null {
  const box = storage ?? defaultStorage();
  if (!box) return null;
  try {
    const raw = box.getItem(USER_MOVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserMove>;
    if (!parsed || typeof parsed.workId !== "string") return null;
    if (typeof parsed.index !== "number" || typeof parsed.at !== "number") return null;
    return {
      workId: parsed.workId,
      index: Math.floor(parsed.index),
      cursor: typeof parsed.cursor === "number" ? Math.max(0, Math.floor(parsed.cursor)) : 0,
      window: typeof parsed.window === "number" && parsed.window > 0 ? Math.floor(parsed.window) : 0,
      at: parsed.at,
      href: typeof parsed.href === "string" ? parsed.href : "",
      breathId: typeof parsed.breathId === "string" ? parsed.breathId : "",
    };
  } catch {
    return null;
  }
}

/** A service-worker or boot reload re-applies the address. A clicked link does not. */
export function shellReapplied(href: string): boolean {
  if (/(?:^|[?&])__fresh(?:=|&|$)/.test(href)) return true;
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return false;
  const nav = performance.getEntriesByType("navigation")[0] as { type?: string } | undefined;
  return nav?.type === "reload";
}

/**
 * The tap still owns this visit.
 * In the document where it happened, always.
 * After a reload or `__fresh` shell swap, only while the tap is recent.
 * A later navigation to the same book is new user input and does not own.
 */
export function tapOwnsVisit(
  move: UserMove | null,
  workId: string,
  href: string,
  opts?: { now?: number; armed?: boolean },
): boolean {
  if (!move || move.workId !== workId) return false;
  if (readerHref(move.href) !== readerHref(href)) return false;
  const armed = opts?.armed ?? notedThisDocument;
  if (armed) return true;
  const now = opts?.now ?? Date.now();
  if (now - move.at > TAP_GUARD_MS) return false;
  return shellReapplied(href);
}

/** A write may land when no tap owns the visit, or it is that tap (or the same breath). */
export function tapAllowsWrite(
  workId: string,
  index: number,
  href: string,
  breathId?: string,
  storage?: Storage,
  opts?: { now?: number; armed?: boolean },
): boolean {
  const move = readUserMove(storage);
  if (!tapOwnsVisit(move, workId, href, opts)) return true;
  if (move!.index === index) return true;
  if (breathId && move!.breathId && breathId === move!.breathId) return true;
  return false;
}

export type PlaceClock = { userMovedAt?: number; lastOpenedAt?: number };

/** When this row last chose a place. A sit's `lastOpenedAt` is not a choice. */
export function placeTime(row: PlaceClock): number {
  const moved = row.userMovedAt ?? 0;
  if (moved > 0) return moved;
  return row.lastOpenedAt ?? 0;
}

/**
 * `row` is newer user input than `other`.
 * A tap beats an older save. A later tap on the other side still wins.
 * `lastOpenedAt` alone is the other side's place time only when it never recorded a tap.
 */
export function tapBeats(row: PlaceClock, other: PlaceClock): boolean {
  const moved = row.userMovedAt ?? 0;
  if (!(moved > 0)) return false;
  const otherMoved = other.userMovedAt ?? 0;
  if (otherMoved > moved) return false;
  return moved >= placeTime(other);
}

/** Tests share one process. A note in one case must not arm the next. */
export function disarmUserMoveDocument() {
  notedThisDocument = false;
}
