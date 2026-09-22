/**
 * Active reading clock.
 *
 * Older Salon credited a sit as wall-clock from `sittingStartedAt` to
 * `endSitting` (capped at 3 hours). Leaving the reader open, backgrounding
 * it, or letting the hourglass finish therefore inflated Today / Week.
 *
 * Version 1 counts time only when the reader advances to a new breath.
 * The gap since the previous advance (or since the sentence was shown) is
 * credited, clamped to `MAX_ADVANCE_CREDIT_MS`. A long pause then one tap
 * cannot dump the idle stretch. Hiding the page clears the anchor so the
 * hidden gap is not waiting to be claimed.
 *
 * Migration (`migrateReadingClock`): legacy `readingMinutesByDay` totals are
 * dropped, and existing `sitHistory` rows keep their count but their minutes
 * are zeroed. Those minutes were the inflated clock. Sits, breaths, keeps,
 * and streak-from-opens stay. Today / Week start again from real advances.
 * Breath-count estimates are not used to refill the cleared ledger.
 */

export const ACTIVE_READ_VERSION = 1;

/**
 * Longest gap that still counts as reading the sentence you just left.
 * Two minutes covers a slow literary sentence. Anything longer is idle;
 * the next tap credits this cap, not the whole absence.
 */
export const MAX_ADVANCE_CREDIT_MS = 120_000;

export type SitClock = {
  sittingStartedAt: number | null;
  /** When the current sentence became the one on screen. Null while paused. */
  activeAnchorAt: number | null;
  /** Active milliseconds credited during the open sit. */
  activeMs: number;
  /** Forward advances during the open sit. */
  activeAdvances: number;
};

export const emptySitClock = (): SitClock => ({
  sittingStartedAt: null,
  activeAnchorAt: null,
  activeMs: 0,
  activeAdvances: 0,
});

/** Milliseconds to credit for one forward advance. 0 when there is no anchor. */
export function advanceCreditMs(
  now: number,
  anchor: number | null | undefined,
  capMs = MAX_ADVANCE_CREDIT_MS,
): number {
  if (typeof anchor !== "number" || !Number.isFinite(anchor)) return 0;
  if (!Number.isFinite(now) || now <= anchor) return 0;
  const gap = now - anchor;
  if (!Number.isFinite(gap) || gap <= 0) return 0;
  const cap = Number.isFinite(capMs) && capMs > 0 ? capMs : MAX_ADVANCE_CREDIT_MS;
  return Math.min(cap, gap);
}

export function addMinutes(previous: number, creditMs: number): number {
  if (!(creditMs > 0)) return previous || 0;
  return Math.round(((previous || 0) + creditMs / 60_000) * 1e6) / 1e6;
}

/** Start or restart the open-sit clock. Does not credit time by itself. */
export function beginSit(clock: SitClock, now: number, keep: boolean): SitClock {
  if (keep && typeof clock.sittingStartedAt === "number") {
    return {
      ...clock,
      activeAnchorAt: clock.activeAnchorAt ?? now,
    };
  }
  return {
    sittingStartedAt: now,
    activeAnchorAt: now,
    activeMs: 0,
    activeAdvances: 0,
  };
}

/**
 * Successful advance. Credits the clamped gap, then moves the anchor to `now`
 * so the next sentence starts clean. A missing anchor credits 0 — opening,
 * returning from background, or repositioning is not reading time.
 */
export function noteAdvance(
  clock: SitClock,
  now: number,
  capMs = MAX_ADVANCE_CREDIT_MS,
): { clock: SitClock; creditMs: number } {
  const creditMs = advanceCreditMs(now, clock.activeAnchorAt, capMs);
  return {
    creditMs,
    clock: {
      ...clock,
      activeAnchorAt: now,
      activeMs: clock.activeMs + creditMs,
      activeAdvances: clock.activeAdvances + 1,
    },
  };
}

/** Page hidden, overlay up, or reader left. Drops the anchor without credit. */
export function notePause(clock: SitClock): SitClock {
  if (clock.activeAnchorAt == null) return clock;
  return { ...clock, activeAnchorAt: null };
}

/** Page visible again during an open sit. The hidden gap is not recoverable. */
export function noteResume(clock: SitClock, now: number): SitClock {
  if (typeof clock.sittingStartedAt !== "number") return clock;
  if (clock.activeAnchorAt != null) return clock;
  return { ...clock, activeAnchorAt: now };
}

/**
 * Close a sit. Minutes on the history row are the active sum already credited
 * tap by tap — never the wall clock from open to close. No advances means no
 * sit and no minutes, including an hourglass that runs out on an idle page.
 */
export function closeSit(clock: SitClock): {
  clock: SitClock;
  minutes: number;
  countSit: boolean;
} {
  const countSit = clock.activeAdvances > 0;
  const minutes = countSit ? Math.round((clock.activeMs / 60_000) * 1000) / 1000 : 0;
  return {
    countSit,
    minutes,
    clock: emptySitClock(),
  };
}

export type ReadingClockState = {
  readingMinutesByDay?: Record<string, number>;
  sitHistory?: { workId: string; minutes: number; endedAt: number }[];
  advancesByDay?: Record<string, number>;
  lastActiveReadAt?: number;
  activeReadVersion?: number;
};

/**
 * Drop idle-inflated duration. Sit rows stay so the Sits count survives;
 * their minutes were wall-clock and are cleared. Safe to call twice.
 */
export type MigratedClock<T> = T & {
  readingMinutesByDay: Record<string, number>;
  sitHistory: NonNullable<ReadingClockState["sitHistory"]>;
  advancesByDay: Record<string, number>;
  lastActiveReadAt: number;
  activeReadVersion: number;
};

export function migrateReadingClock<T extends ReadingClockState>(
  state: T,
  fromVersion: number,
): MigratedClock<T> {
  if ((state.activeReadVersion ?? 0) >= ACTIVE_READ_VERSION) {
    return {
      ...state,
      readingMinutesByDay: state.readingMinutesByDay ?? {},
      sitHistory: state.sitHistory ?? [],
      advancesByDay: state.advancesByDay ?? {},
      lastActiveReadAt: state.lastActiveReadAt ?? 0,
      activeReadVersion: state.activeReadVersion ?? ACTIVE_READ_VERSION,
    };
  }
  return {
    ...state,
    readingMinutesByDay: {},
    sitHistory: (state.sitHistory ?? []).map((row) => ({ ...row, minutes: 0 })),
    advancesByDay: {},
    lastActiveReadAt: 0,
    activeReadVersion: ACTIVE_READ_VERSION,
  };
}
