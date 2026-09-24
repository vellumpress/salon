import type { FriendRow } from "./friend-profile.ts";
import { handleError, normalizeHandle } from "./social.ts";

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
