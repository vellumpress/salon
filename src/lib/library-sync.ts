import { keptBreathId, type KeptStored } from "./kept-lines.ts";
import { isOffline } from "./net.ts";
import { getSupabase } from "./supabase.ts";

export const SHELF_VERSION = 1;
const MAX_SIT_HISTORY = 80;

export type ShelfProgress = {
  breathIndex: number;
  breathId?: string;
  breathCount?: number;
  bindHash?: string;
  lastOpenedAt: number;
  sittingStartedAt: number | null;
  keywords: Record<string, string>;
  kept: KeptStored[];
  completedAt: number | null;
  entered: boolean;
  activeAnchorAt?: number | null;
  activeMs?: number;
  activeAdvances?: number;
};

export type ShelfSit = { workId: string; minutes: number; endedAt: number };
export type ShelfRecord = { id: string };

export type ReaderShelf = {
  v: typeof SHELF_VERSION;
  favorites: string[];
  progress: Record<string, ShelfProgress>;
  sitHistory: ShelfSit[];
  readingMinutesByDay: Record<string, number>;
  advancesByDay: Record<string, number>;
  sceneCrossesByDay: Record<string, number>;
  keepsByDay: Record<string, number>;
  worksTouchedByDay: Record<string, string[]>;
  hostOpensByDay: Record<string, number>;
  sitsByDay: Record<string, number>;
  clubTouchesByDay: Record<string, number>;
  lastActiveReadAt: number;
  serializeNight: Record<string, number>;
  togetherKeeps: ShelfRecord[];
  hostedSits: ShelfRecord[];
  sitPledges: ShelfRecord[];
  jointDays: string[];
  taste: string;
};

type ShelfSource = {
  favorites?: string[] | null;
  progress?: Record<string, ShelfProgress> | null;
  sitHistory?: ShelfSit[] | null;
  readingMinutesByDay?: Record<string, number> | null;
  advancesByDay?: Record<string, number> | null;
  sceneCrossesByDay?: Record<string, number> | null;
  keepsByDay?: Record<string, number> | null;
  worksTouchedByDay?: Record<string, string[]> | null;
  hostOpensByDay?: Record<string, number> | null;
  sitsByDay?: Record<string, number> | null;
  clubTouchesByDay?: Record<string, number> | null;
  lastActiveReadAt?: number | null;
  serializeNight?: Record<string, number> | null;
  togetherKeeps?: ShelfRecord[] | null;
  hostedSits?: ShelfRecord[] | null;
  sitPledges?: ShelfRecord[] | null;
  jointDays?: string[] | null;
  taste?: string | null;
};

export function emptyShelf(): ReaderShelf {
  return {
    v: SHELF_VERSION,
    favorites: [],
    progress: {},
    sitHistory: [],
    readingMinutesByDay: {},
    advancesByDay: {},
    sceneCrossesByDay: {},
    keepsByDay: {},
    worksTouchedByDay: {},
    hostOpensByDay: {},
    sitsByDay: {},
    clubTouchesByDay: {},
    lastActiveReadAt: 0,
    serializeNight: {},
    togetherKeeps: [],
    hostedSits: [],
    sitPledges: [],
    jointDays: [],
    taste: "",
  };
}

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function asNumberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const n = typeof raw === "number" ? raw : Number.NaN;
    if (!key || !Number.isFinite(n) || n < 0) continue;
    out[key] = n;
  }
  return out;
}

function asIdMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(value)) {
    const ids = asIdList(raw);
    if (key && ids.length) out[key] = ids;
  }
  return out;
}

function asRecords<T extends ShelfRecord>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is T => {
    if (!row || typeof row !== "object") return false;
    return typeof (row as { id?: unknown }).id === "string";
  });
}

export function shelfFromState(state: ShelfSource): ReaderShelf {
  const base = emptyShelf();
  return {
    ...base,
    favorites: asIdList(state.favorites),
    progress: state.progress && typeof state.progress === "object" ? { ...state.progress } : {},
    sitHistory: Array.isArray(state.sitHistory) ? state.sitHistory.filter(isSit) : [],
    readingMinutesByDay: asNumberMap(state.readingMinutesByDay),
    advancesByDay: asNumberMap(state.advancesByDay),
    sceneCrossesByDay: asNumberMap(state.sceneCrossesByDay),
    keepsByDay: asNumberMap(state.keepsByDay),
    worksTouchedByDay: asIdMap(state.worksTouchedByDay),
    hostOpensByDay: asNumberMap(state.hostOpensByDay),
    sitsByDay: asNumberMap(state.sitsByDay),
    clubTouchesByDay: asNumberMap(state.clubTouchesByDay),
    lastActiveReadAt: finite(state.lastActiveReadAt),
    serializeNight: asNumberMap(state.serializeNight),
    togetherKeeps: asRecords(state.togetherKeeps),
    hostedSits: asRecords(state.hostedSits),
    sitPledges: asRecords(state.sitPledges),
    jointDays: asIdList(state.jointDays),
    taste: typeof state.taste === "string" ? state.taste.slice(0, 280) : "",
  };
}

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function isSit(value: unknown): value is ShelfSit {
  if (!value || typeof value !== "object") return false;
  const row = value as ShelfSit;
  return typeof row.workId === "string" && typeof row.endedAt === "number";
}

export function shelfHasReading(shelf: ReaderShelf): boolean {
  if (shelf.favorites.length || shelf.sitHistory.length || shelf.jointDays.length) return true;
  if (shelf.togetherKeeps.length || shelf.hostedSits.length || shelf.sitPledges.length) return true;
  if (Object.keys(shelf.progress).length || Object.keys(shelf.serializeNight).length) return true;
  if (shelf.lastActiveReadAt > 0 || shelf.taste.trim()) return true;
  const maps = [
    shelf.readingMinutesByDay,
    shelf.advancesByDay,
    shelf.sceneCrossesByDay,
    shelf.keepsByDay,
    shelf.hostOpensByDay,
    shelf.sitsByDay,
    shelf.clubTouchesByDay,
  ];
  if (maps.some((map) => Object.keys(map).length > 0)) return true;
  return Object.keys(shelf.worksTouchedByDay).length > 0;
}

function unionIds(local: string[], remote: string[]) {
  return asIdList([...local, ...remote]);
}

function maxDays(local: Record<string, number>, remote: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    out[key] = Math.max(local[key] ?? 0, remote[key] ?? 0);
  }
  return out;
}

function unionTouched(local: Record<string, string[]>, remote: Record<string, string[]>) {
  const out: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const ids = unionIds(local[key] ?? [], remote[key] ?? []);
    if (ids.length) out[key] = ids;
  }
  return out;
}

function unionKept(local: KeptStored[], remote: KeptStored[]): KeptStored[] {
  const order: string[] = [];
  const byId = new Map<string, KeptStored>();
  for (const entry of [...local, ...remote]) {
    const id = keptBreathId(entry);
    if (!id) continue;
    if (!byId.has(id)) order.push(id);
    const prev = byId.get(id);
    if (!prev || (typeof prev === "string" && typeof entry !== "string")) byId.set(id, entry);
  }
  return order.map((id) => byId.get(id)!);
}

function mergeProgress(local: ShelfProgress, remote: ShelfProgress): ShelfProgress {
  const localIndex = local.breathIndex ?? 0;
  const remoteIndex = remote.breathIndex ?? 0;
  const place =
    localIndex > remoteIndex
      ? local
      : remoteIndex > localIndex
        ? remote
        : (local.lastOpenedAt ?? 0) >= (remote.lastOpenedAt ?? 0)
          ? local
          : remote;
  const completed = [local.completedAt, remote.completedAt].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  return {
    breathIndex: Math.max(localIndex, remoteIndex),
    ...(place.breathId ? { breathId: place.breathId } : {}),
    ...(place.breathCount ? { breathCount: place.breathCount } : {}),
    ...(place.bindHash ? { bindHash: place.bindHash } : {}),
    lastOpenedAt: Math.max(local.lastOpenedAt ?? 0, remote.lastOpenedAt ?? 0),
    sittingStartedAt: local.sittingStartedAt ?? null,
    keywords: { ...(remote.keywords ?? {}), ...(local.keywords ?? {}) },
    kept: unionKept(local.kept ?? [], remote.kept ?? []),
    completedAt: completed.length ? Math.min(...completed) : null,
    entered: Boolean(local.entered || remote.entered),
    activeAnchorAt: local.activeAnchorAt ?? null,
    activeMs: Math.max(local.activeMs ?? 0, remote.activeMs ?? 0),
    activeAdvances: Math.max(local.activeAdvances ?? 0, remote.activeAdvances ?? 0),
  };
}

function unionRecords<T extends ShelfRecord>(local: T[], remote: T[]) {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const row of [...local, ...remote]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function mergeSits(local: ShelfSit[], remote: ShelfSit[]) {
  const byKey = new Map<string, ShelfSit>();
  for (const sit of [...local, ...remote]) {
    if (!isSit(sit)) continue;
    const key = `${sit.workId}:${sit.endedAt}`;
    if (!byKey.has(key)) byKey.set(key, sit);
  }
  return [...byKey.values()].sort((a, b) => a.endedAt - b.endedAt).slice(-MAX_SIT_HISTORY);
}

/** Local order leads. A side with nothing does not erase the other side. */
export function mergeShelves(local: ReaderShelf, remote: ReaderShelf): ReaderShelf {
  const progress: Record<string, ShelfProgress> = {};
  for (const workId of new Set([...Object.keys(local.progress), ...Object.keys(remote.progress)])) {
    const left = local.progress[workId];
    const right = remote.progress[workId];
    const row = left && right ? mergeProgress(left, right) : left ?? right;
    if (row) progress[workId] = row;
  }
  const taste = local.taste.trim() ? local.taste : remote.taste;
  return {
    v: SHELF_VERSION,
    favorites: unionIds(local.favorites, remote.favorites),
    progress,
    sitHistory: mergeSits(local.sitHistory, remote.sitHistory),
    readingMinutesByDay: maxDays(local.readingMinutesByDay, remote.readingMinutesByDay),
    advancesByDay: maxDays(local.advancesByDay, remote.advancesByDay),
    sceneCrossesByDay: maxDays(local.sceneCrossesByDay, remote.sceneCrossesByDay),
    keepsByDay: maxDays(local.keepsByDay, remote.keepsByDay),
    worksTouchedByDay: unionTouched(local.worksTouchedByDay, remote.worksTouchedByDay),
    hostOpensByDay: maxDays(local.hostOpensByDay, remote.hostOpensByDay),
    sitsByDay: maxDays(local.sitsByDay, remote.sitsByDay),
    clubTouchesByDay: maxDays(local.clubTouchesByDay, remote.clubTouchesByDay),
    lastActiveReadAt: Math.max(local.lastActiveReadAt, remote.lastActiveReadAt),
    serializeNight: maxDays(local.serializeNight, remote.serializeNight),
    togetherKeeps: unionRecords(local.togetherKeeps, remote.togetherKeeps),
    hostedSits: unionRecords(local.hostedSits, remote.hostedSits),
    sitPledges: unionRecords(local.sitPledges, remote.sitPledges),
    jointDays: unionIds(local.jointDays, remote.jointDays),
    taste,
  };
}

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJson);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortedJson((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function shelvesMatch(left: ReaderShelf, right: ReaderShelf) {
  return JSON.stringify(sortedJson(left)) === JSON.stringify(sortedJson(right));
}

export function parseShelf(value: unknown): ReaderShelf {
  if (!value || typeof value !== "object") return emptyShelf();
  return shelfFromState(value as ShelfSource);
}

export function shelfPatch(shelf: ReaderShelf) {
  return {
    favorites: shelf.favorites,
    progress: shelf.progress,
    sitHistory: shelf.sitHistory,
    readingMinutesByDay: shelf.readingMinutesByDay,
    advancesByDay: shelf.advancesByDay,
    sceneCrossesByDay: shelf.sceneCrossesByDay,
    keepsByDay: shelf.keepsByDay,
    worksTouchedByDay: shelf.worksTouchedByDay,
    hostOpensByDay: shelf.hostOpensByDay,
    sitsByDay: shelf.sitsByDay,
    clubTouchesByDay: shelf.clubTouchesByDay,
    lastActiveReadAt: shelf.lastActiveReadAt,
    serializeNight: shelf.serializeNight,
    togetherKeeps: shelf.togetherKeeps,
    hostedSits: shelf.hostedSits,
    sitPledges: shelf.sitPledges,
    jointDays: shelf.jointDays,
    taste: shelf.taste,
  };
}

async function profileReady(userId: string) {
  const { data, error } = await getSupabase().from("profiles").select("id").eq("id", userId).maybeSingle();
  if (error || !data?.id) return false;
  return true;
}

export async function pullShelf(userId: string): Promise<ReaderShelf | null> {
  const { data, error } = await getSupabase()
    .from("library")
    .select("shelf")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return parseShelf(data.shelf);
}

export async function pushShelf(userId: string, shelf: ReaderShelf) {
  const { error } = await getSupabase().from("library").upsert(
    { user_id: userId, shelf, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  return !error;
}

/**
 * Read the account shelf, fold it into this phone, then write the fold back.
 * An empty phone does not replace a full shelf. Signing out never calls this
 * with a delete.
 */
export async function reconcileShelf(
  userId: string,
  read: () => ShelfSource,
  write: (shelf: ReaderShelf) => void,
): Promise<"synced" | "skipped" | "noprofile" | "offline"> {
  if (!userId || isOffline()) return "offline";
  if (!(await profileReady(userId))) return "noprofile";
  const remote = await pullShelf(userId);
  const local = shelfFromState(read());
  if (!remote && !shelfHasReading(local)) return "skipped";
  const merged = mergeShelves(local, remote ?? emptyShelf());
  if (!shelvesMatch(local, merged)) write(merged);
  const saved = await pushShelf(userId, merged);
  return saved ? "synced" : "offline";
}

/** Write this phone's shelf after the first merge. Does not delete on failure. */
export async function pushCurrentShelf(
  userId: string,
  read: () => ShelfSource,
  write: (shelf: ReaderShelf) => void,
): Promise<boolean> {
  if (!userId || isOffline()) return false;
  if (!(await profileReady(userId))) return false;
  const remote = await pullShelf(userId);
  const local = shelfFromState(read());
  const merged = mergeShelves(local, remote ?? emptyShelf());
  if (!shelfHasReading(merged)) return false;
  if (!shelvesMatch(local, merged)) write(merged);
  return pushShelf(userId, merged);
}
