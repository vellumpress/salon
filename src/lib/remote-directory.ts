import { useEffect, useState, useSyncExternalStore } from "react";
import { activityFromRow, type ActivityRow } from "./remote-activity.ts";
import type { FriendActivity } from "./friend-profile.ts";
import { normalizeHandle } from "./social.ts";
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
};

const EMPTY: RemoteBundle = {
  signedIn: false,
  userId: null,
  byHandle: {},
  profiles: {},
};

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
    byHandle: userId ? bundle.byHandle : {},
  });
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
  if (handle.length < 2) return [];
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
  if (handle.length < 2) return null;
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

/** Push local follows up. Never deletes — a new phone must not wipe the hosted list. */
export async function pushFollows(userId: string, handles: Iterable<string>) {
  const wanted = [...handles].map((handle) => normalizeHandle(handle)).filter((handle) => handle.length >= 2);
  if (!wanted.length) return;
  const supabase = getSupabase();
  const profiles = await supabase.from("profiles").select("id, handle").in("handle", wanted);
  if (profiles.error) return;
  const existing = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  if (existing.error) return;
  const have = new Set((existing.data ?? []).map((row) => row.followee_id as string));
  for (const row of profiles.data ?? []) {
    const followee = row.id as string;
    if (!followee || followee === userId || have.has(followee)) continue;
    const inserted = await supabase.from("follows").insert({ follower_id: userId, followee_id: followee });
    if (!inserted.error || inserted.error.code === "23505") have.add(followee);
  }
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
  const supabase = getSupabase();
  const follows = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  if (follows.error) return;
  const ids = (follows.data ?? []).map((row) => row.followee_id as string).filter(Boolean);
  if (!ids.length) {
    patch({ byHandle: {} });
    return;
  }
  const [profiles, activity] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, bio").in("id", ids),
    supabase
      .from("activity")
      .select("id, user_id, kind, book_id, payload, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);
  if (profiles.error || activity.error) return;
  const handleById = new Map<string, string>();
  const nextProfiles = { ...bundle.profiles };
  for (const row of profiles.data ?? []) {
    const profile = asProfile(row);
    if (!profile) continue;
    handleById.set(profile.id, profile.handle);
    nextProfiles[profile.handle] = profile;
  }
  const byHandle: Record<string, FriendActivity[]> = {};
  for (const row of (activity.data ?? []) as ActivityRow[]) {
    const handle = handleById.get(row.user_id);
    const event = activityFromRow(row);
    if (!handle || !event) continue;
    const list = byHandle[handle] ?? [];
    list.push(event);
    byHandle[handle] = list;
  }
  patch({ profiles: nextProfiles, byHandle });
}

export async function publishActivity(
  userId: string,
  drafts: Array<{
    key: string;
    kind: string;
    bookId: string;
    at: number;
    payload: Record<string, string | number>;
  }>,
  already: Set<string>,
): Promise<string[]> {
  const pending = drafts.filter((row) => row.key && !already.has(row.key)).slice(0, 40);
  if (!pending.length) return [];
  const supabase = getSupabase();
  const rows = pending.map((row) => ({
    user_id: userId,
    kind: row.kind,
    book_id: row.bookId || null,
    payload: row.payload,
    created_at: new Date(row.at || Date.now()).toISOString(),
  }));
  const inserted = await supabase.from("activity").insert(rows);
  if (!inserted.error) return pending.map((row) => row.key);
  const saved: string[] = [];
  for (let index = 0; index < pending.length; index += 1) {
    const one = await supabase.from("activity").insert(rows[index]!);
    if (!one.error) saved.push(pending[index]!.key);
  }
  return saved;
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
