import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Work } from "./literature";
import { asSittingMinutes } from "./sitting";
import {
  asContact,
  contactId,
  type FriendContact,
} from "./friends.ts";
import { handleError, normalizeHandle, readerByHandle, READERS } from "./social.ts";
import {
  addSitKeep,
  mergeHostedSit,
  rsvpHostedSit,
  type HostedSit,
  type SitKeep,
  type SitRsvp,
} from "./hosted-sit.ts";
import { mergePledge, type SitPledge, type SitPledgeStatus } from "./sit-pledge.ts";
import { sameTogetherPair, type TogetherKeep } from "./together-keep.ts";
import { dayKey } from "./day-key.ts";

export { dayKey };

export type WorkProgress = {
  breathIndex: number;
  lastOpenedAt: number;
  sittingStartedAt: number | null;
  keywords: Record<string, string>;
  kept: string[];
  completedAt: number | null;
  entered: boolean;
};

/** One finished sit — capped history for pace / resonance. */
export type SitSession = {
  workId: string;
  minutes: number;
  endedAt: number;
};

const MAX_SIT_HISTORY = 80;
const MAX_SESSION_MINUTES = 180;
const MIN_SESSION_MINUTES = 0.25;

export type CuratorTurn = { role: "user" | "curator"; text: string };

export type ReadingNow = {
  id: string;
  title: string;
  author: string;
  place: string;
  sentence: string;
};

type VellumState = {
  theme: "paper" | "dusk";
  /** Timed sit length in minutes; 0 = open (no hourglass end). */
  sittingMinutes: number;
  progress: Record<string, WorkProgress>;
  pageWork: Work | null;
  following: string[];
  /** Local @username. Pages has no handle API; this stays on the device. */
  handle: string;
  contacts: FriendContact[];
  joined: string[];
  clubInvites: Record<string, string>;
  lastShuffle: string | null;
  taste: string;
  favorites: string[];
  curator: CuratorTurn[];
  readingNow: ReadingNow | null;
  /** Per calendar day (local YYYY-MM-DD) accumulated sitting minutes. */
  readingMinutesByDay: Record<string, number>;
  /** Recent finished sits (newest last), capped. */
  sitHistory: SitSession[];
  /** Last completed episode number per serialize plan id. */
  serializeNight: Record<string, number>;
  togetherKeeps: TogetherKeep[];
  hostedSits: HostedSit[];
  sitPledges: SitPledge[];
  rememberTogetherKeep: (pair: TogetherKeep) => void;
  rememberHostedSit: (sit: HostedSit) => void;
  rsvpSit: (sitId: string, guest: { handle: string; name?: string; status: SitRsvp }) => void;
  keepWithSit: (sitId: string, keep: Omit<SitKeep, "keptAt"> & { keptAt?: number }) => void;
  endHostedSit: (sitId: string) => void;
  rememberPledge: (pledge: SitPledge) => void;
  setPledgeStatus: (id: string, status: SitPledgeStatus) => void;
  setTheme: (theme: "paper" | "dusk") => void;
  completeSerializeNight: (planId: string, n: number) => void;
  setSittingMinutes: (minutes: number) => void;
  setPageWork: (work: Work | null) => void;
  toggleFollow: (readerId: string) => void;
  setHandle: (handle: string) => { ok: true; handle: string } | { ok: false; error: string };
  addContact: (input: { handle: string; name?: string }) =>
    | { ok: true; id: string }
    | { ok: false; error: string };
  removeContact: (id: string) => void;
  toggleJoin: (clubId: string) => void;
  joinClub: (clubId: string) => void;
  rememberInvite: (clubId: string, token: string) => void;
  toggleFavorite: (workId: string) => void;
  setFavorites: (ids: string[]) => void;
  setLastShuffle: (workId: string) => void;
  startShuffle: (workId: string) => void;
  setTaste: (taste: string) => void;
  pushCurator: (turn: CuratorTurn) => void;
  setReadingNow: (now: ReadingNow | null) => void;
  ensure: (workId: string) => WorkProgress;
  setBreath: (workId: string, index: number) => void;
  startSitting: (workId: string, opts?: { restart?: boolean }) => void;
  endSitting: (workId: string) => void;
  saveKeyword: (workId: string, sceneId: string, keyword: string) => void;
  toggleKept: (workId: string, breathId: string) => void;
  complete: (workId: string) => void;
  resetWork: (workId: string) => void;
  stale: (workId: string, index: number) => void;
};

const emptyProgress = (): WorkProgress => ({
  breathIndex: 0,
  lastOpenedAt: 0,
  sittingStartedAt: null,
  keywords: {},
  kept: [],
  completedAt: null,
  entered: false,
});

const REENTRY_MS = 8 * 60 * 1000;

let persistTimer = 0;
let persistPending: { name: string; value: string } | null = null;

function flushPersist() {
  if (!persistPending || typeof window === "undefined") return;
  window.localStorage.setItem(persistPending.name, persistPending.value);
  persistPending = null;
}

const persistStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;
    persistPending = { name, value };
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(flushPersist, 220);
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;
    persistPending = null;
    window.localStorage.removeItem(name);
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPersist);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushPersist();
  });
}


function elapsedSittingMinutes(startedAt: number | null | undefined, endedAt: number) {
  if (typeof startedAt !== "number" || startedAt <= 0) return 0;
  const raw = (endedAt - startedAt) / 60_000;
  if (!Number.isFinite(raw) || raw < MIN_SESSION_MINUTES) return 0;
  return Math.min(MAX_SESSION_MINUTES, Math.round(raw * 4) / 4);
}

type SittingSlice = {
  progress: Record<string, WorkProgress>;
  readingMinutesByDay: Record<string, number>;
  sitHistory: SitSession[];
};

/** Credit elapsed sit time, clear sittingStartedAt, append sitHistory. */
function applySittingClose(
  state: SittingSlice,
  workId: string,
  endedAt: number,
): SittingSlice {
  const current = state.progress[workId] ?? emptyProgress();
  const minutes = elapsedSittingMinutes(current.sittingStartedAt, endedAt);
  const progress = {
    ...state.progress,
    [workId]: {
      ...current,
      sittingStartedAt: null,
      lastOpenedAt: endedAt,
    },
  };
  if (minutes <= 0) {
    return { ...state, progress };
  }
  const day = dayKey(endedAt);
  const readingMinutesByDay = {
    ...(state.readingMinutesByDay ?? {}),
    [day]: Math.round(((state.readingMinutesByDay?.[day] ?? 0) + minutes) * 4) / 4,
  };
  const sitHistory = [
    ...(state.sitHistory ?? []),
    { workId, minutes, endedAt },
  ].slice(-MAX_SIT_HISTORY);
  return { progress, readingMinutesByDay, sitHistory };
}

export const useVellum = create<VellumState>()(
  persist(
    (set, get) => ({
      theme: "paper",
      sittingMinutes: 20,
      progress: {},
      pageWork: null,
      following: [],
      handle: "",
      contacts: [],
      joined: [],
      clubInvites: {},
      lastShuffle: null,
      taste: "",
      favorites: [],
      curator: [],
      readingNow: null,
      readingMinutesByDay: {},
      sitHistory: [],
      serializeNight: {},
      togetherKeeps: [],
      hostedSits: [],
      sitPledges: [],
      rememberTogetherKeep: (pair) =>
        set((state) => {
          const togetherKeeps = state.togetherKeeps ?? [];
          if (togetherKeeps.some((row) => sameTogetherPair(row, pair))) return {};
          return { togetherKeeps: [pair, ...togetherKeeps].slice(0, 40) };
        }),
      rememberHostedSit: (sit) =>
        set((state) => {
          const hostedSits = state.hostedSits ?? [];
          const prior = hostedSits.find((row) => row.id === sit.id);
          const next = mergeHostedSit(prior, sit);
          return {
            hostedSits: [next, ...hostedSits.filter((row) => row.id !== sit.id)].slice(0, 24),
          };
        }),
      rsvpSit: (sitId, guest) =>
        set((state) => {
          const hostedSits = state.hostedSits ?? [];
          return {
            hostedSits: hostedSits.map((row) =>
              row.id === sitId ? rsvpHostedSit(row, guest) : row,
            ),
          };
        }),
      keepWithSit: (sitId, keep) =>
        set((state) => {
          const hostedSits = state.hostedSits ?? [];
          return {
            hostedSits: hostedSits.map((row) => (row.id === sitId ? addSitKeep(row, keep) : row)),
          };
        }),
      endHostedSit: (sitId) =>
        set((state) => ({
          hostedSits: (state.hostedSits ?? []).map((row) =>
            row.id === sitId ? { ...row, endedAt: row.endedAt ?? Date.now() } : row,
          ),
        })),
      rememberPledge: (pledge) =>
        set((state) => {
          const sitPledges = state.sitPledges ?? [];
          const prior = sitPledges.find((row) => row.id === pledge.id);
          const next = mergePledge(prior, pledge);
          return {
            sitPledges: [next, ...sitPledges.filter((row) => row.id !== pledge.id)].slice(0, 24),
          };
        }),
      setPledgeStatus: (id, status) =>
        set((state) => ({
          sitPledges: (state.sitPledges ?? []).map((row) =>
            row.id === id ? { ...row, status } : row,
          ),
        })),
      setTheme: (theme) => set({ theme }),
      setSittingMinutes: (sittingMinutes) => set({ sittingMinutes: asSittingMinutes(sittingMinutes) }),
      setPageWork: (pageWork) => set({ pageWork }),
      toggleFollow: (readerId) =>
        set((state) => {
          const following = state.following ?? [];
          return {
            following: following.includes(readerId)
              ? following.filter((id) => id !== readerId)
              : [...following, readerId],
          };
        }),
      setHandle: (raw) => {
        const handle = normalizeHandle(raw);
        const taken = [
          ...READERS.map((row) => row.handle),
          ...(get().contacts ?? []).map((row) => row.handle),
        ];
        const error = handleError(handle, taken);
        if (error) return { ok: false as const, error };
        set({ handle });
        return { ok: true as const, handle };
      },
      addContact: (input) => {
        const handle = normalizeHandle(input.handle);
        if (handle && handle === get().handle) {
          return { ok: false as const, error: "That is already you." };
        }
        const catalog = readerByHandle(handle);
        if (catalog) {
          const following = get().following ?? [];
          if (!following.includes(catalog.id)) {
            set({ following: [...following, catalog.id] });
          }
          return { ok: true as const, id: catalog.id };
        }
        const error = handleError(handle, [
          get().handle,
          ...(get().contacts ?? []).map((row) => row.handle),
        ]);
        if (error) return { ok: false as const, error };
        const contact = asContact({ handle, name: input.name });
        if (!contact) return { ok: false as const, error: "Use at least two letters." };
        set((state) => {
          const contacts = state.contacts ?? [];
          const following = state.following ?? [];
          const nextContacts = contacts.some((row) => row.handle === handle)
            ? contacts
            : [...contacts, contact];
          return {
            contacts: nextContacts,
            following: following.includes(contact.id)
              ? following
              : [...following, contact.id],
          };
        });
        return { ok: true as const, id: contactId(handle) };
      },
      removeContact: (id) =>
        set((state) => ({
          contacts: (state.contacts ?? []).filter((row) => row.id !== id),
          following: (state.following ?? []).filter((row) => row !== id),
        })),
      toggleJoin: (clubId) =>
        set((state) => {
          const joined = state.joined ?? [];
          return {
            joined: joined.includes(clubId)
              ? joined.filter((id) => id !== clubId)
              : [...joined, clubId],
          };
        }),
      joinClub: (clubId) =>
        set((state) => {
          const joined = state.joined ?? [];
          if (joined.includes(clubId)) return {};
          return { joined: [...joined, clubId] };
        }),
      rememberInvite: (clubId, token) =>
        set((state) => {
          const clubInvites = state.clubInvites ?? {};
          if (clubInvites[clubId] === token) return {};
          return { clubInvites: { ...clubInvites, [clubId]: token } };
        }),
      toggleFavorite: (workId) =>
        set((state) => {
          const favorites = state.favorites ?? [];
          return {
            favorites: favorites.includes(workId)
              ? favorites.filter((id) => id !== workId)
              : [...favorites, workId],
          };
        }),
      setFavorites: (favorites) =>
        set({
          favorites: [...new Set(favorites.filter(Boolean))].slice(0, 200),
        }),
      setLastShuffle: (lastShuffle) => set({ lastShuffle }),
      setTaste: (taste) => set({ taste: taste.slice(0, 400) }),
      pushCurator: (turn) =>
        set((state) => ({
          curator: [...(state.curator ?? []), turn].slice(-16),
        })),
      setReadingNow: (readingNow) => set({ readingNow }),
      startShuffle: (workId) =>
        set((state) => {
          const current = state.progress[workId] ?? emptyProgress();
          return {
            lastShuffle: workId,
            progress: {
              ...state.progress,
              [workId]: {
                ...current,
                breathIndex: 0,
                completedAt: null,
                sittingStartedAt: Date.now(),
                lastOpenedAt: Date.now(),
                entered: true,
              },
            },
          };
        }),
      ensure: (workId) => {
        const existing = get().progress[workId];
        if (existing) return existing;
        const fresh = emptyProgress();
        set((state) => ({
          progress: { ...state.progress, [workId]: fresh },
        }));
        return fresh;
      },
      setBreath: (workId, index) =>
        set((state) => {
          const current = state.progress[workId] ?? emptyProgress();
          return {
            progress: {
              ...state.progress,
              [workId]: {
                ...current,
                breathIndex: index,
                lastOpenedAt: Date.now(),
                entered: true,
              },
            },
          };
        }),
      startSitting: (workId, opts) =>
        set((state) => {
          const current = state.progress[workId] ?? emptyProgress();
          const restart = Boolean(opts?.restart);
          const keep =
            !restart &&
            typeof current.sittingStartedAt === "number" &&
            current.sittingStartedAt > 0;
          return {
            progress: {
              ...state.progress,
              [workId]: {
                ...current,
                sittingStartedAt: keep ? current.sittingStartedAt : Date.now(),
                lastOpenedAt: Date.now(),
                entered: true,
              },
            },
          };
        }),
      endSitting: (workId) =>
        set((state) => applySittingClose(state, workId, Date.now())),
      saveKeyword: (workId, sceneId, keyword) =>
        set((state) => {
          const current = state.progress[workId] ?? emptyProgress();
          return {
            progress: {
              ...state.progress,
              [workId]: {
                ...current,
                keywords: { ...current.keywords, [sceneId]: keyword.trim() },
                lastOpenedAt: Date.now(),
              },
            },
          };
        }),
      toggleKept: (workId, breathId) =>
        set((state) => {
          const current = state.progress[workId] ?? emptyProgress();
          const kept = current.kept.includes(breathId)
            ? current.kept.filter((id) => id !== breathId)
            : [...current.kept, breathId];
          return {
            progress: {
              ...state.progress,
              [workId]: { ...current, kept, lastOpenedAt: Date.now() },
            },
          };
        }),
      complete: (workId) =>
        set((state) => {
          const now = Date.now();
          const closed = applySittingClose(state, workId, now);
          const current = closed.progress[workId] ?? emptyProgress();
          return {
            ...closed,
            progress: {
              ...closed.progress,
              [workId]: {
                ...current,
                completedAt: now,
                sittingStartedAt: null,
                lastOpenedAt: now,
              },
            },
          };
        }),
      resetWork: (workId) =>
        set((state) => ({
          progress: { ...state.progress, [workId]: emptyProgress() },
        })),
      stale: (workId, index) =>
        set((state) => {
          const current = state.progress[workId] ?? emptyProgress();
          return {
            progress: {
              ...state.progress,
              [workId]: {
                ...current,
                breathIndex: index,
                entered: true,
                lastOpenedAt: Date.now() - REENTRY_MS - 1000,
                sittingStartedAt: null,
              },
            },
          };
        }),
      completeSerializeNight: (planId, n) =>
        set((state) => {
          const night = Math.max(0, Math.floor(n));
          if (!planId || night < 1) return {};
          const current = state.serializeNight?.[planId] ?? 0;
          if (night <= current) return {};
          return {
            serializeNight: { ...(state.serializeNight ?? {}), [planId]: night },
          };
        }),
    }),
    {
      name: "vellum-v1",
      storage: createJSONStorage(() => persistStorage),
      partialize: (state) => ({
        theme: state.theme,
        sittingMinutes: state.sittingMinutes,
        progress: state.progress,
        following: state.following,
        handle: state.handle,
        contacts: state.contacts,
        joined: state.joined,
        clubInvites: state.clubInvites,
        lastShuffle: state.lastShuffle,
        taste: state.taste,
        favorites: state.favorites,
        curator: state.curator,
        readingMinutesByDay: state.readingMinutesByDay,
        sitHistory: state.sitHistory,
        serializeNight: state.serializeNight,
        togetherKeeps: state.togetherKeeps,
        hostedSits: state.hostedSits,
        sitPledges: state.sitPledges,
      }),
    },
  ),
);

export const useChamber = useVellum;

export function shouldReenter(progress: WorkProgress | undefined) {
  if (!progress) return false;
  if (!progress.entered) return false;
  if (progress.breathIndex <= 0) return false;
  if (progress.completedAt) return false;
  if (!progress.lastOpenedAt) return false;
  return Date.now() - progress.lastOpenedAt > REENTRY_MS;
}



export function activeDays(progress: Record<string, WorkProgress>) {
  const days = new Set<string>();
  for (const item of Object.values(progress)) {
    if (!item.entered || !item.lastOpenedAt) continue;
    days.add(dayKey(item.lastOpenedAt));
  }
  return days;
}

/** Consecutive active days ending today or yesterday (from local progress). */
export function readingStreak(progress: Record<string, WorkProgress>) {
  const days = activeDays(progress);
  if (days.size === 0) return 0;
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 24 * 60 * 60 * 1000);
  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (cursor && days.has(cursor)) {
    streak += 1;
    const [y, m, d] = cursor.split("-").map(Number);
    const prev = new Date(y!, m! - 1, d!);
    prev.setDate(prev.getDate() - 1);
    cursor = dayKey(prev.getTime());
  }
  return streak;
}

export function breathsTouched(progress: Record<string, WorkProgress>) {
  let total = 0;
  for (const item of Object.values(progress)) {
    if (!item.entered) continue;
    total += Math.max(0, item.breathIndex);
  }
  return total;
}
