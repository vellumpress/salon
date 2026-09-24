import type { FriendRow } from "./friend-profile.ts";
import { formatHandle, handleError, normalizeHandle } from "./social.ts";

export type HandleSearch = {
  /** Lowercased handle: leading @ stripped, only [a-z0-9_.], capped at 20. */
  normalized: string;
  matches: FriendRow[];
  /** A valid handle that matches nobody this phone knows. */
  offer: string | null;
  message: string | null;
};

/**
 * Filter people this phone already knows by @handle.
 * A valid handle that matches nobody becomes a single follow offer.
 */
export function searchHandles(raw: string, rows: FriendRow[]): HandleSearch {
  const typed = raw.trim();
  if (!typed) return { normalized: "", matches: [], offer: null, message: null };
  const normalized = normalizeHandle(raw);
  const matches = normalized ? rows.filter((row) => row.handle.includes(normalized)) : [];
  if (matches.length > 0) return { normalized, matches, offer: null, message: null };
  if (!normalized || normalized.length < 2) {
    return { normalized, matches, offer: null, message: "Use at least two letters." };
  }
  const error = handleError(normalized);
  if (error) return { normalized, matches, offer: null, message: error };
  return { normalized, matches, offer: normalized, message: null };
}

export type DirectoryHit = {
  id: string;
  handle: string;
  name: string;
};

/**
 * Local matches stay. Hosted prefix hits fill in real people.
 * A hosted hit replaces the speculative "follow this unknown name" offer.
 */
export function mergeDirectorySearch(
  local: HandleSearch,
  hits: DirectoryHit[],
  known: FriendRow[],
  selfHandle = "",
  pending = false,
): HandleSearch {
  if (!local.normalized) return local;
  const self = normalizeHandle(selfHandle);
  const matches = [...local.matches];
  const seen = new Set(matches.map((row) => row.handle));
  const knownByHandle = new Map(known.map((row) => [row.handle, row]));
  for (const hit of hits) {
    const handle = normalizeHandle(hit.handle);
    if (!handle.startsWith(local.normalized) || seen.has(handle)) continue;
    seen.add(handle);
    const existing = knownByHandle.get(handle);
    matches.push(
      existing ?? {
        id: hit.id,
        handle,
        name: hit.name.trim() || formatHandle(handle),
        isSelf: Boolean(self) && handle === self,
        following: false,
        place: "",
        readingTitle: "",
        readingAuthor: "",
        latest: "",
        waiting: false,
      },
    );
  }
  const offer =
    local.offer && matches.some((row) => row.handle === local.offer) ? null : local.offer;
  if (pending && matches.length === 0) {
    return { ...local, matches, offer: null, message: null };
  }
  return {
    ...local,
    matches,
    offer,
    message: matches.length > 0 ? null : local.message,
  };
}
