import { useEffect, useState, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activityFromRow, readingWriteAction, type ActivityDraft, type ActivityRow } from "./remote-activity.ts";
import type { FriendActivity } from "./friend-profile.ts";
import { normalizeHandle } from "./social.ts";
import { isOffline } from "./net.ts";
import { getSupabase } from "./supabase.ts";

export type DirectoryProfile = {
  id: string;
  handle: string;
  name: string;
  bio: string;
};

export type RemoteBundle = {
  signedIn: boolean;
  userId: string | null;
  byHandle: Record<string, FriendActivity[]>;
  profiles: Record<string, DirectoryProfile>;
  /** Handles this phone follows that have no hosted account yet. */
  followMissing: string[];
};

const EMPTY: RemoteBundle = {
  signedIn: false,
  userId: null,
  byHandle: {},
  profiles: {},
  followMissing: [],
};

/** Kinds a follower needs. Sits must not crowd these out of the cap. */
export const FOLLOWED_FEED_KINDS = ["reading", "kept", "finished"] as const;

let bundle: RemoteBundle = EMPTY;
const listeners = new Set<() => void>();

function emit(next: RemoteBundle) {
  bundle = next;
  for (const listener of listeners) listener();
}

function patch(partial: Partial<RemoteBundle>) {
  emit({ ...bundle, ...partial });
}

export function getRemoteBundle(): RemoteBundle {
  return bundle;
}

export function subscribeRemote(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRemoteBundle(): RemoteBundle {
  return useSyncExternalStore(subscribeRemote, getRemoteBundle, () => EMPTY);
}

export function setRemoteSession(userId: string | null) {
  patch({
    signedIn: Boolean(userId),
    userId,
  });
}

/** QA and probe handles stay out of "Readers to follow". */
export function isQaHandle(handle: string) {
  return normalizeHandle(handle).startsWith("qa");
}

export type ActiveReader = { handle: string; name: string; at: number };

/** Newest reading row per handle, QA and the viewer left out. */
export function rankActiveReaders(
  rows: Array<{ handle: string; name?: string; at: number }>,
  exclude: Iterable<string>,
  limit = 6,
): ActiveReader[] {
  const skip = new Set([...exclude].map((handle) => normalizeHandle(handle)));
  const best = new Map<string, ActiveReader>();
  for (const row of rows) {
    const handle = normalizeHandle(row.handle);
    if (handle.length < 2 || skip.has(handle) || isQaHandle(handle)) continue;
    const at = Number.isFinite(row.at) ? row.at : 0;
    const prev = best.get(handle);
    if (prev && prev.at >= at) continue;
    best.set(handle, { handle, name: (row.name ?? "").trim(), at });
  }
  return [...best.values()].sort((a, b) => b.at - a.at || a.handle.localeCompare(b.handle)).slice(0, limit);
}

export function rememberProfile(profile: DirectoryProfile) {
  const handle = normalizeHandle(profile.handle);
  if (handle.length < 2) return;
  patch({
    profiles: {
      ...bundle.profiles,
      [handle]: { ...profile, handle },
    },
  });
}

export function rememberActivity(handle: string, events: FriendActivity[]) {
  const clean = normalizeHandle(handle);
  if (clean.length < 2) return;
  patch({ byHandle: { ...bundle.byHandle, [clean]: events } });
}

function likePrefix(handle: string) {
  return `${handle.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function searchProfiles(raw: string): Promise<DirectoryProfile[]> {
  const handle = normalizeHandle(raw);
  if (handle.length < 2 || isOffline()) return [];
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, handle, display_name, bio")
    .ilike("handle", likePrefix(handle))
    .order("handle", { ascending: true })
    .limit(20);
  if (error || !data) return [];
  return data
    .map(asProfile)
    .filter((row): row is DirectoryProfile => Boolean(row && row.handle.startsWith(handle)));
}

export async function fetchProfile(raw: string): Promise<DirectoryProfile | null> {
  const handle = normalizeHandle(raw);
  if (handle.length < 2 || isOffline()) return null;
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, handle, display_name, bio")
    .eq("handle", handle)
    .maybeSingle();
  if (error || !data) return null;
  const profile = asProfile(data);
  if (profile) rememberProfile(profile);
  return profile;
}

function asProfile(row: {
  id?: string;
  handle?: string;
  display_name?: string | null;
  bio?: string | null;
}): DirectoryProfile | null {
  const handle = normalizeHandle(row.handle ?? "");
  if (!row.id || handle.length < 2) return null;
  return {
    id: row.id,
    handle,
    name: (row.display_name ?? "").trim(),
    bio: (row.bio ?? "").trim(),
  };
}

/**
 * Handles to delete on the server after a local unfollow.
 * An empty wanted list on the first pass is a hydrate blip, not "unfollow everyone".
 * A second empty pass in a row is a real unfollow of the last person.
 */
export function planFollowSync(
  previous: Iterable<string> | null,
  wanted: Iterable<string>,
  emptyStreak: number,
): { drop: string[]; next: string[]; emptyStreak: number } {
  const clean = (rows: Iterable<string>) =>
    [...new Set([...rows].map((handle) => normalizeHandle(handle)).filter((handle) => handle.length >= 2))];
  const next = clean(wanted);
  const prev = previous ? clean(previous) : null;
  if (next.length === 0) {
    const streak = emptyStreak + 1;
    if (!prev || prev.length === 0 || streak < 2) {
      return { drop: [], next: prev ?? [], emptyStreak: streak };
    }
    return { drop: prev, next: [], emptyStreak: streak };
  }
  return {
    drop: prev ? prev.filter((handle) => !next.includes(handle)) : [],
    next,
    emptyStreak: 0,
  };
}

export function wantedFollowHandles(
  selfHandle: string,
  following: string[],
  contacts: Array<{ id: string; handle: string }>,
) {
  const self = normalizeHandle(selfHandle);
  const wanted = new Set<string>();
  for (const id of following) {
    const fromId = normalizeHandle(id.replace(/^local:/, ""));
    if (fromId.length >= 2) wanted.add(fromId);
    const contact = contacts.find((row) => row.id === id || row.handle === fromId);
    if (contact) {
      const handle = normalizeHandle(contact.handle);
      if (handle.length >= 2) wanted.add(handle);
    }
  }
  if (self) wanted.delete(self);
  return wanted;
}

export function planFollowInserts(
  userId: string,
  wanted: Iterable<string>,
  profiles: Array<{ id: string; handle: string }>,
  already: Iterable<string>,
) {
  const byHandle = new Map(
    profiles.map((row) => [normalizeHandle(row.handle), row.id] as const),
  );
  const have = new Set(already);
  const rows: Array<{ follower_id: string; followee_id: string }> = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const raw of wanted) {
    const handle = normalizeHandle(raw);
    if (handle.length < 2 || seen.has(handle)) continue;
    seen.add(handle);
    const followee = byHandle.get(handle);
    if (!followee) {
      missing.push(handle);
      continue;
    }
    if (followee === userId || have.has(followee)) continue;
    rows.push({ follower_id: userId, followee_id: followee });
    have.add(followee);
  }
  return { rows, missing };
}

/** Push local follows up. Never deletes — a new phone must not wipe the hosted list. */
export async function pushFollows(userId: string, handles: Iterable<string>): Promise<string[]> {
  const wanted = [...handles].map((handle) => normalizeHandle(handle)).filter((handle) => handle.length >= 2);
  if (!wanted.length) {
    patch({ followMissing: [] });
    return [];
  }
  const supabase = getSupabase();
  const profiles = await supabase.from("profiles").select("id, handle").in("handle", wanted);
  if (profiles.error) return bundle.followMissing;
  const existing = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  if (existing.error) return bundle.followMissing;
  const plan = planFollowInserts(
    userId,
    wanted,
    (profiles.data ?? []).map((row) => ({ id: row.id as string, handle: row.handle as string })),
    (existing.data ?? []).map((row) => row.followee_id as string),
  );
  for (const row of plan.rows) {
    const inserted = await supabase.from("follows").insert(row);
    if (inserted.error && inserted.error.code !== "23505") continue;
  }
  patch({ followMissing: plan.missing });
  return plan.missing;
}

export async function pullFollows(userId: string): Promise<DirectoryProfile[]> {
  const supabase = getSupabase();
  const follows = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  if (follows.error) return [];
  const ids = (follows.data ?? []).map((row) => row.followee_id as string).filter(Boolean);
  if (!ids.length) return [];
  const profiles = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio")
    .in("id", ids);
  if (profiles.error) return [];
  const rows: DirectoryProfile[] = [];
  for (const row of profiles.data ?? []) {
    const profile = asProfile(row);
    if (!profile) continue;
    rememberProfile(profile);
    rows.push(profile);
  }
  return rows;
}

export async function dropFollows(userId: string, handles: string[]) {
  const clean = handles.map((handle) => normalizeHandle(handle)).filter((handle) => handle.length >= 2);
  if (!clean.length) return;
  const supabase = getSupabase();
  const profiles = await supabase.from("profiles").select("id, handle").in("handle", clean);
  if (profiles.error) return;
  for (const row of profiles.data ?? []) {
    if (!row.id) continue;
    await supabase.from("follows").delete().eq("follower_id", userId).eq("followee_id", row.id);
  }
}

export async function refreshFollowedActivity(userId: string) {
  if (isOffline()) return;
  const supabase = getSupabase();
  const follows = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  if (follows.error) return;
  const ids = (follows.data ?? []).map((row) => row.followee_id as string).filter(Boolean);
  if (!ids.length) {
    patch({ byHandle: {} });
    return;
  }
  const activitySelect = "id, user_id, kind, book_id, payload, created_at";
  const [profiles, feed, rest] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, bio").in("id", ids),
    supabase
      .from("activity")
      .select(activitySelect)
      .in("user_id", ids)
      .in("kind", [...FOLLOWED_FEED_KINDS])
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("activity")
      .select(activitySelect)
      .in("user_id", ids)
      .not("kind", "in", `(${FOLLOWED_FEED_KINDS.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  if (profiles.error || feed.error) return;
  const handleById = new Map<string, string>();
  const nextProfiles = { ...bundle.profiles };
  for (const row of profiles.data ?? []) {
    const profile = asProfile(row);
    if (!profile) continue;
    handleById.set(profile.id, profile.handle);
    nextProfiles[profile.handle] = profile;
  }
  const byHandle: Record<string, FriendActivity[]> = {};
  const seenIds = new Set<number>();
  const rows = [...(feed.data ?? []), ...(rest.error ? [] : (rest.data ?? []))] as ActivityRow[];
  for (const row of rows) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    const handle = handleById.get(row.user_id);
    const event = activityFromRow(row);
    if (!handle || !event) continue;
    const list = byHandle[handle] ?? [];
    list.push(event);
    byHandle[handle] = list;
  }
  patch({ profiles: nextProfiles, byHandle });
}

/** Books and kept lines for these handles. No session required. */
export async function refreshHandlesActivity(handles: Iterable<string>) {
  if (isOffline()) return;
  const wanted = [
    ...new Set([...handles].map((handle) => normalizeHandle(handle)).filter((handle) => handle.length >= 2)),
  ];
  if (!wanted.length) return;
  const supabase = getSupabase();
  const profiles = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio")
    .in("handle", wanted);
  if (profiles.error) return;
  const ids: string[] = [];
  const handleById = new Map<string, string>();
  const nextProfiles = { ...bundle.profiles };
  const found = new Set<string>();
  for (const row of profiles.data ?? []) {
    const profile = asProfile(row);
    if (!profile) continue;
    ids.push(profile.id);
    handleById.set(profile.id, profile.handle);
    nextProfiles[profile.handle] = profile;
    found.add(profile.handle);
  }
  const byHandle = { ...bundle.byHandle };
  for (const handle of wanted) {
    if (found.has(handle)) byHandle[handle] = [];
  }
  if (!ids.length) {
    patch({ profiles: nextProfiles, byHandle });
    return;
  }
  const activitySelect = "id, user_id, kind, book_id, payload, created_at";
  const [feed, rest] = await Promise.all([
    supabase
      .from("activity")
      .select(activitySelect)
      .in("user_id", ids)
      .in("kind", [...FOLLOWED_FEED_KINDS])
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("activity")
      .select(activitySelect)
      .in("user_id", ids)
      .not("kind", "in", `(${FOLLOWED_FEED_KINDS.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  if (feed.error) return;
  const seenIds = new Set<number>();
  const rows = [...(feed.data ?? []), ...(rest.error ? [] : (rest.data ?? []))] as ActivityRow[];
  for (const row of rows) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    const handle = handleById.get(row.user_id);
    const event = activityFromRow(row);
    if (!handle || !event) continue;
    const list = byHandle[handle] ?? [];
    list.push(event);
    byHandle[handle] = list;
  }
  patch({ profiles: nextProfiles, byHandle });
}

/** People with a real handle and a recent open book. QA handles are left out. */
export async function suggestActiveReaders(exclude: Iterable<string>): Promise<ActiveReader[]> {
  if (isOffline()) return [];
  const supabase = getSupabase();
  const activity = await supabase
    .from("activity")
    .select("user_id, created_at")
    .eq("kind", "reading")
    .order("created_at", { ascending: false })
    .limit(80);
  if (activity.error || !activity.data?.length) return [];
  const ids = [...new Set(activity.data.map((row) => row.user_id as string).filter(Boolean))];
  if (!ids.length) return [];
  const profiles = await supabase.from("profiles").select("id, handle, display_name").in("id", ids);
  if (profiles.error || !profiles.data) return [];
  const byId = new Map<string, DirectoryProfile>();
  for (const row of profiles.data) {
    const profile = asProfile(row);
    if (profile) byId.set(profile.id, profile);
  }
  const ranked = activity.data.flatMap((row) => {
    const profile = byId.get(row.user_id as string);
    if (!profile) return [];
    const at = Date.parse(String(row.created_at ?? ""));
    return [{ handle: profile.handle, name: profile.name, at: Number.isFinite(at) ? at : 0 }];
  });
  return rankActiveReaders(ranked, exclude);
}

type ActivityDraftRow = {
  key: string;
  kind: string;
  bookId: string;
  at: number;
  payload: Record<string, string | number>;
};

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === UNIQUE_VIOLATION;
}

/** One publish at a time. A second effect must see the keys the first one saved. */
let activityFlush: Promise<void> = Promise.resolve();

export function enqueueActivityFlush(run: () => Promise<void>): Promise<void> {
  const next = activityFlush.then(run, run);
  activityFlush = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** Move the book's newest progress row to this sentence. Missing row inserts. */
async function writeReading(userId: string, draft: ActivityDraftRow): Promise<"saved" | "insert"> {
  const supabase = getSupabase();
  const existing = await supabase
    .from("activity")
    .select("id, payload")
    .eq("user_id", userId)
    .eq("kind", "reading")
    .eq("book_id", draft.bookId)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = existing.error ? undefined : existing.data?.[0];
  const storedAt =
    row && row.payload && typeof row.payload.atIndex === "number" ? row.payload.atIndex : undefined;
  const nextAt = typeof draft.payload.atIndex === "number" ? draft.payload.atIndex : undefined;
  const action = readingWriteAction({ hasRow: Boolean(row), storedAt, nextAt });
  if (action === "skip") return "saved";
  if (action === "update" && row) {
    const updated = await supabase
      .from("activity")
      .update({
        payload: draft.payload,
        created_at: new Date(draft.at || Date.now()).toISOString(),
      })
      .eq("id", row.id)
      .eq("user_id", userId);
    if (!updated.error) return "saved";
  }
  return "insert";
}

export async function publishActivity(
  userId: string,
  drafts: ActivityDraftRow[],
  already: Set<string>,
  client?: SupabaseClient,
): Promise<string[]> {
  const byKey = new Map<string, ActivityDraftRow>();
  for (const row of drafts) {
    if (!row.key || already.has(row.key)) continue;
    byKey.set(row.key, row);
  }
  const pending = [...byKey.values()].slice(0, 40);
  if (!pending.length || isOffline()) return [];
  const supabase = client ?? getSupabase();
  const saved: string[] = [];
  const toInsert: ActivityDraftRow[] = [];
  const seenReading = new Set<string>();
  for (const row of pending) {
    if (row.kind === "reading" && row.bookId) {
      if (seenReading.has(row.bookId)) {
        saved.push(row.key);
        continue;
      }
      seenReading.add(row.bookId);
      const wrote = await writeReading(userId, row);
      if (wrote === "saved") {
        saved.push(row.key);
        continue;
      }
    }
    toInsert.push(row);
  }
  if (!toInsert.length) return saved;
  const rows = toInsert.map((row) => activityInsert(userId, row));
  const inserted = await supabase.from("activity").insert(rows);
  if (!inserted.error) return [...saved, ...toInsert.map((row) => row.key)];
  // The batch can commit and still surface an error, or fail because one key
  // is already there. Each row is inserted on its own. A unique violation
  // means that session is already stored: refresh it, and do not add another.
  for (let index = 0; index < toInsert.length; index += 1) {
    const row = rows[index]!;
    const draft = toInsert[index]!;
    const one = await supabase.from("activity").insert(row);
    if (!one.error) {
      saved.push(draft.key);
      continue;
    }
    if (!isUniqueViolation(one.error)) continue;
    // The row is already there. Refreshing it is best-effort; the key is
    // saved either way so the next flush does not insert a second copy.
    await supabase
      .from("activity")
      .update({
        kind: row.kind,
        book_id: row.book_id,
        payload: row.payload,
        created_at: row.created_at,
      })
      .eq("user_id", userId)
      .eq("client_key", row.client_key);
    saved.push(draft.key);
  }
  return saved;
}

function activityInsert(userId: string, row: ActivityDraftRow) {
  return {
    user_id: userId,
    kind: row.kind,
    book_id: row.bookId || null,
    payload: row.payload,
    created_at: new Date(row.at || Date.now()).toISOString(),
    client_key: row.key,
  };
}

/**
 * Write the drafts that are not already published. Remembers keys even when
 * the effect has since been cancelled, so the remounted effect does not
 * insert them again.
 */
export async function syncActivityDrafts(input: {
  userId: string;
  drafts: ActivityDraft[];
  readKeys: () => Set<string>;
  remember: (keys: string[]) => void;
  client?: SupabaseClient;
  cancelled?: () => boolean;
}): Promise<void> {
  let guard = 0;
  while (!(input.cancelled?.() ?? false) && guard < 8) {
    guard += 1;
    const saved = await publishActivity(input.userId, input.drafts, input.readKeys(), input.client);
    if (!saved.length) break;
    input.remember(saved);
    if (saved.length < 40 || input.cancelled?.()) break;
  }
}

/** Live inserts for the signed-in follower. Polling remains the fallback. */
export function subscribeFriendActivity(userId: string, onChange: () => void) {
  if (!userId) return () => undefined;
  let closed = false;
  const channel = getSupabase()
    .channel(`friends-activity:${userId}:${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity" },
      () => {
        if (!closed) onChange();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "follows",
        filter: `follower_id=eq.${userId}`,
      },
      () => {
        if (!closed) onChange();
      },
    )
    .subscribe();
  return () => {
    closed = true;
    void getSupabase().removeChannel(channel);
  };
}

const PUBLISHED_KEY = "tbr-activity-published";

export function readPublishedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PUBLISHED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === "string"));
  } catch {
    return new Set();
  }
}

export function rememberPublishedKeys(keys: string[]) {
  if (typeof window === "undefined" || !keys.length) return;
  const next = [...readPublishedKeys(), ...keys];
  const capped = next.slice(-2000);
  window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify(capped));
}

export function useRemoteHandleSearch(query: string): { hits: DirectoryProfile[]; pending: boolean } {
  const [hits, setHits] = useState<DirectoryProfile[]>([]);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const handle = normalizeHandle(query);
    if (handle.length < 2) {
      setHits([]);
      setPending(false);
      return;
    }
    setPending(true);
    let cancel = false;
    const timer = window.setTimeout(() => {
      void searchProfiles(handle)
        .then((rows) => {
          if (cancel) return;
          setHits(rows);
          setPending(false);
        })
        .catch(() => {
          if (cancel) return;
          setHits([]);
          setPending(false);
        });
    }, 280);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [query]);
  return { hits, pending };
}
