import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Work } from "./literature";
import { asSittingMinutes } from "./sitting";
import {
  asContact,
  contactId,
  type FriendContact,
} from "./friends.ts";
import { handlesInVault } from "./reader-account.ts";
import { handleError, normalizeHandle } from "./social.ts";
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
import {
  ACTIVE_READ_VERSION,
  addMinutes,
  beginSit,
  closeSit,
  migrateReadingClock,
  type ReadingClockState,
  noteAdvance,
  notePause,
  noteResume,
  type SitClock,
} from "./active-read.ts";
import { bumpDayCount, touchWorkOnDay } from "./reading-score.ts";

export { dayKey };

export type WorkProgress = {
  breathIndex: number;
  lastOpenedAt: number;
  sittingStartedAt: number | null;
  keywords: Record<string, string>;
  kept: string[];
  completedAt: number | null;
  entered: boolean;
  /**
   * Active-read clock for the open sit. Optional so older snapshots still
   * parse; missing fields are treated as a fresh clock. Minutes are credited
   * in `noteAdvance`, not from `sittingStartedAt`.
   */
  activeAnchorAt?: number | null;
  activeMs?: number;
  activeAdvances?: number;
};

/** One finished sit — capped history for pace / resonance. */
export type SitSession = {
  workId: string;
  minutes: number;
  endedAt: number;
};

const MAX_SIT_HISTORY = 80;

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
  /**
   * Per calendar day (local YYYY-MM-DD) of *active* reading minutes.
   * Credited on a forward breath, clamped per tap. Not wall-clock.
   */
  readingMinutesByDay: Record<string, number>;
  /** Forward advances (new breath / finished last line) per local day. */
  advancesByDay: Record<string, number>;
  /** Scene/chapter boundaries crossed by a forward advance, per local day. */
  sceneCrossesByDay: Record<string, number>;
  /** Lines kept (added) per local day. */
  keepsByDay: Record<string, number>;
  /** Distinct work ids that received a forward advance, per local day. */
  worksTouchedByDay: Record<string, string[]>;
  /** Hosted sits you opened, per local day. */
  hostOpensByDay: Record<string, number>;
  /** Finished sits (active advances closed), per local day. */
  sitsByDay: Record<string, number>;
  /** Together / club touches per local day. */
  clubTouchesByDay: Record<string, number>;
  /** Timestamp of the last forward advance. 0 until one happens after the clock reset. */
  lastActiveReadAt: number;
  /**
   * 1 = active-advance clock. Missing / 0 is the legacy wall-clock ledger,
   * cleared once in `migrateReadingClock`.
   */
  activeReadVersion: number;
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
  /** Forward advance: move to `index` and credit clamped active time. */
  advanceBreath: (
    workId: string,
    index: number,
    opts?: { crossedScene?: boolean },
  ) => void;
  /** Drop the open-sentence anchor (hidden, overlay, leaving). No credit. */
  pauseActiveRead: (workId: string) => void;
  /** Arm the anchor again after a pause, during an open sit. No credit. */
  resumeActiveRead: (workId: string) => void;
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
  activeAnchorAt: null,
  activeMs: 0,
  activeAdvances: 0,
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

function clockOf(progress: WorkProgress): SitClock {
  return {
    sittingStartedAt: progress.sittingStartedAt,
    activeAnchorAt: progress.activeAnchorAt ?? null,
    activeMs: progress.activeMs ?? 0,
    activeAdvances: progress.activeAdvances ?? 0,
  };
}

function writeClock(progress: WorkProgress, clock: SitClock): WorkProgress {
  return {
    ...progress,
    sittingStartedAt: clock.sittingStartedAt,
    activeAnchorAt: clock.activeAnchorAt,
    activeMs: clock.activeMs,
    activeAdvances: clock.activeAdvances,
  };
}

/** Clear every open-sentence anchor so a restored page cannot claim hidden time. */
function pauseAllAnchors(progress: Record<string, WorkProgress>) {
  let changed = false;
  const next: Record<string, WorkProgress> = { ...progress };
  for (const [id, item] of Object.entries(progress)) {
    if (!item?.activeAnchorAt) continue;
    next[id] = writeClock(item, notePause(clockOf(item)));
    changed = true;
  }
  return changed ? next : progress;
}

type ClockSlice = {
  progress: Record<string, WorkProgress>;
  readingMinutesByDay: Record<string, number>;
  advancesByDay: Record<string, number>;
  sceneCrossesByDay: Record<string, number>;
  keepsByDay: Record<string, number>;
  worksTouchedByDay: Record<string, string[]>;
  hostOpensByDay: Record<string, number>;
  sitsByDay: Record<string, number>;
  clubTouchesByDay: Record<string, number>;
  lastActiveReadAt: number;
  sitHistory: SitSession[];
};

type AdvanceOpts = { crossedScene?: boolean };

/**
 * Credit one forward advance into the day ledger and the open sit.
 * Closing the sit later must not add this time again.
 */
function applyAdvance(
  state: ClockSlice,
  workId: string,
  now: number,
  opts?: AdvanceOpts,
): Pick<
  ClockSlice,
  | "progress"
  | "readingMinutesByDay"
  | "advancesByDay"
  | "sceneCrossesByDay"
  | "worksTouchedByDay"
  | "lastActiveReadAt"
> {
  const current = state.progress[workId] ?? emptyProgress();
  const stepped = noteAdvance(clockOf(current), now);
  const day = dayKey(now);
  const advancesByDay = bumpDayCount(state.advancesByDay, day, 1);
  const sceneCrossesByDay = opts?.crossedScene
    ? bumpDayCount(state.sceneCrossesByDay, day, 1)
    : (state.sceneCrossesByDay ?? {});
  return {
    progress: {
      ...state.progress,
      [workId]: {
        ...writeClock(current, stepped.clock),
        lastOpenedAt: now,
        entered: true,
      },
    },
    readingMinutesByDay: {
      ...(state.readingMinutesByDay ?? {}),
      [day]: addMinutes(state.readingMinutesByDay?.[day] ?? 0, stepped.creditMs),
    },
    advancesByDay,
    sceneCrossesByDay,
    worksTouchedByDay: touchWorkOnDay(state.worksTouchedByDay, day, workId),
    lastActiveReadAt: now,
  };
}

/**
 * Finish a sit. History minutes are the active sum from advances, not
 * `endedAt - sittingStartedAt`. Idle open → no row, no extra minutes.
 */
function applySittingClose(
  state: ClockSlice,
  workId: string,
  endedAt: number,
): Pick<ClockSlice, "progress"> &
  Partial<Pick<ClockSlice, "sitHistory" | "sitsByDay" | "worksTouchedByDay">> {
  const current = state.progress[workId] ?? emptyProgress();
  const closed = closeSit(clockOf(current));
  const progress = {
    ...state.progress,
    [workId]: {
      ...writeClock(current, closed.clock),
      lastOpenedAt: endedAt,
    },
  };
  if (!closed.countSit) {
    return { progress };
  }
  const day = dayKey(endedAt);
  const sitHistory = [
    ...(state.sitHistory ?? []),
    { workId, minutes: closed.minutes, endedAt },
  ].slice(-MAX_SIT_HISTORY);
  return {
    progress,
    sitHistory,
    sitsByDay: bumpDayCount(state.sitsByDay, day, 1),
    worksTouchedByDay: touchWorkOnDay(state.worksTouchedByDay, day, workId),
  };
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
      advancesByDay: {},
      sceneCrossesByDay: {},
      keepsByDay: {},
      worksTouchedByDay: {},
      hostOpensByDay: {},
      sitsByDay: {},
      clubTouchesByDay: {},
      lastActiveReadAt: 0,
      activeReadVersion: ACTIVE_READ_VERSION,
      sitHistory: [],
      serializeNight: {},
      togetherKeeps: [],
      hostedSits: [],
      sitPledges: [],
      rememberTogetherKeep: (pair) =>
        set((state) => {
          const togetherKeeps = state.togetherKeeps ?? [];
          if (togetherKeeps.some((row) => sameTogetherPair(row, pair))) return {};
          const day = dayKey(pair.createdAt || Date.now());
          return {
            togetherKeeps: [pair, ...togetherKeeps].slice(0, 40),
            clubTouchesByDay: bumpDayCount(state.clubTouchesByDay, day, 1),
          };
        }),
      rememberHostedSit: (sit) =>
        set((state) => {
          const hostedSits = state.hostedSits ?? [];
          const prior = hostedSits.find((row) => row.id === sit.id);
          const next = mergeHostedSit(prior, sit);
          const isNew = !prior;
          const me = normalizeHandle(state.handle ?? "");
          const hostedByMe = Boolean(me && next.hostHandle === me);
          const day = dayKey(next.createdAt || Date.now());
          return {
            hostedSits: [next, ...hostedSits.filter((row) => row.id !== sit.id)].slice(0, 24),
            ...(isNew && hostedByMe
              ? { hostOpensByDay: bumpDayCount(state.hostOpensByDay, day, 1) }
              : {}),
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
          ...(get().contacts ?? []).map((row) => row.handle),
          ...handlesInVault().filter((row) => row !== get().handle),
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
          const adding = !joined.includes(clubId);
          const day = dayKey(Date.now());
          return {
            joined: adding ? [...joined, clubId] : joined.filter((id) => id !== clubId),
            ...(adding ? { clubTouchesByDay: bumpDayCount(state.clubTouchesByDay, day, 1) } : {}),
          };
        }),
      joinClub: (clubId) =>
        set((state) => {
          const joined = state.joined ?? [];
          if (joined.includes(clubId)) return {};
          const day = dayKey(Date.now());
          return {
            joined: [...joined, clubId],
            clubTouchesByDay: bumpDayCount(state.clubTouchesByDay, day, 1),
          };
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
          const now = Date.now();
          const current = state.progress[workId] ?? emptyProgress();
          return {
            lastShuffle: workId,
            progress: {
              ...state.progress,
              [workId]: {
                ...writeClock(current, beginSit(clockOf(current), now, false)),
                breathIndex: 0,
                completedAt: null,
                lastOpenedAt: now,
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
          const now = Date.now();
          const current = state.progress[workId] ?? emptyProgress();
          // Retreats and jumps are not advances. Restart the gap so the next
          // forward tap measures only the sentence now on screen.
          const clock = current.sittingStartedAt
            ? noteResume(notePause(clockOf(current)), now)
            : clockOf(current);
          return {
            progress: {
              ...state.progress,
              [workId]: {
                ...writeClock(current, clock),
                breathIndex: index,
                lastOpenedAt: now,
                entered: true,
              },
            },
          };
        }),
      advanceBreath: (workId, index, opts) =>
        set((state) => {
          const now = Date.now();
          const current = state.progress[workId] ?? emptyProgress();
          if (!(index > current.breathIndex)) {
            const clock = current.sittingStartedAt
              ? noteResume(notePause(clockOf(current)), now)
              : clockOf(current);
            return {
              progress: {
                ...state.progress,
                [workId]: {
                  ...writeClock(current, clock),
                  breathIndex: index,
                  lastOpenedAt: now,
                  entered: true,
                },
              },
            };
          }
          const credited = applyAdvance(state, workId, now, {
            crossedScene: Boolean(opts?.crossedScene),
          });
          const row = credited.progress[workId] ?? emptyProgress();
          return {
            ...credited,
            progress: {
              ...credited.progress,
              [workId]: { ...row, breathIndex: index },
            },
          };
        }),
      pauseActiveRead: (workId) =>
        set((state) => {
          const current = state.progress[workId];
          if (!current?.activeAnchorAt) return {};
          return {
            progress: {
              ...state.progress,
              [workId]: writeClock(current, notePause(clockOf(current))),
            },
          };
        }),
      resumeActiveRead: (workId) =>
        set((state) => {
          const current = state.progress[workId];
          if (!current?.sittingStartedAt) return {};
          const clock = noteResume(clockOf(current), Date.now());
          if (clock.activeAnchorAt === (current.activeAnchorAt ?? null)) return {};
          return {
            progress: {
              ...state.progress,
              [workId]: writeClock(current, clock),
            },
          };
        }),
      startSitting: (workId, opts) =>
        set((state) => {
          const now = Date.now();
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
                ...writeClock(current, beginSit(clockOf(current), now, keep)),
                lastOpenedAt: now,
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
          const adding = !current.kept.includes(breathId);
          const kept = adding
            ? [...current.kept, breathId]
            : current.kept.filter((id) => id !== breathId);
          const now = Date.now();
          const day = dayKey(now);
          return {
            progress: {
              ...state.progress,
              [workId]: { ...current, kept, lastOpenedAt: now },
            },
            ...(adding ? { keepsByDay: bumpDayCount(state.keepsByDay, day, 1) } : {}),
          };
        }),
      complete: (workId) =>
        set((state) => {
          const now = Date.now();
          const current = state.progress[workId] ?? emptyProgress();
          if (current.completedAt) return {};
          // Finishing the last line is an advance: credit the sentence just left.
          const armed = Boolean(current.sittingStartedAt || current.activeAnchorAt);
          const credited = armed ? applyAdvance(state, workId, now) : null;
          const merged: ClockSlice = {
            progress: credited?.progress ?? state.progress,
            readingMinutesByDay: credited?.readingMinutesByDay ?? state.readingMinutesByDay,
            advancesByDay: credited?.advancesByDay ?? state.advancesByDay,
            sceneCrossesByDay: credited?.sceneCrossesByDay ?? state.sceneCrossesByDay,
            keepsByDay: state.keepsByDay,
            worksTouchedByDay: credited?.worksTouchedByDay ?? state.worksTouchedByDay,
            hostOpensByDay: state.hostOpensByDay,
            sitsByDay: state.sitsByDay,
            clubTouchesByDay: state.clubTouchesByDay,
            lastActiveReadAt: credited?.lastActiveReadAt ?? state.lastActiveReadAt,
            sitHistory: state.sitHistory,
          };
          const closed = applySittingClose(merged, workId, now);
          const row = closed.progress[workId] ?? emptyProgress();
          return {
            ...(credited ?? {}),
            ...closed,
            progress: {
              ...closed.progress,
              [workId]: {
                ...row,
                completedAt: now,
                sittingStartedAt: null,
                activeAnchorAt: null,
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
      // v2: active-advance clock. v0/v1 ledgers were open→close wall time.
      version: 2,
      migrate: (persisted, version) =>
        migrateReadingClock((persisted ?? {}) as ReadingClockState, version),
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
        advancesByDay: state.advancesByDay,
        sceneCrossesByDay: state.sceneCrossesByDay,
        keepsByDay: state.keepsByDay,
        worksTouchedByDay: state.worksTouchedByDay,
        hostOpensByDay: state.hostOpensByDay,
        sitsByDay: state.sitsByDay,
        clubTouchesByDay: state.clubTouchesByDay,
        lastActiveReadAt: state.lastActiveReadAt,
        activeReadVersion: state.activeReadVersion,
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

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    const progress = pauseAllAnchors(useVellum.getState().progress);
    if (progress !== useVellum.getState().progress) {
      useVellum.setState({ progress });
    }
    flushPersist();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    const progress = pauseAllAnchors(useVellum.getState().progress);
    if (progress !== useVellum.getState().progress) {
      useVellum.setState({ progress });
    }
    flushPersist();
  });
}

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
