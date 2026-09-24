import { shelfWork } from "./catalog/shelf.ts";
import { lastReadCue, lastReadProgress } from "./continuity.ts";
import { dayKey } from "./day-key.ts";
import { contactId, type FriendContact } from "./friends.ts";
import type { HostedSit, SitKeep } from "./hosted-sit.ts";
import { deriveWindowScores, type DayLedgers } from "./reading-score.ts";
import { formatHandle, normalizeHandle } from "./social.ts";
import { pledgeLine, windowLabel, type SitPledge } from "./sit-pledge.ts";
import type { SitSession, WorkProgress } from "./store.ts";
import type { TogetherKeep } from "./together-keep.ts";

/**
 * What a friend profile can show. A hosted sync may add rows of these kinds;
 * the Friends UI only renders this list.
 */
export type FriendActivityKind =
  | "reading"
  | "kept"
  | "sit"
  | "hosted"
  | "joined"
  | "invited"
  | "tonight"
  | "together"
  | "finished";

export type FriendActivity = {
  id: string;
  at: number;
  kind: FriendActivityKind;
  label: string;
  /** Lowercase sentence without the relative time. */
  summary: string;
  line?: string;
  workId?: string;
  workTitle?: string;
  author?: string;
  /** Breath index when this device actually knows it. */
  atIndex?: number;
  breathId?: string;
  progress?: string;
  pledgeId?: string;
};

export type FriendScore = {
  total: number;
  label: string;
  streak: number;
  hasSignal: boolean;
};

export type FriendReadingNow = {
  workId: string;
  workTitle: string;
  author: string;
  progress?: string;
  atIndex?: number;
  at: number;
};

export type FriendProfile = {
  id: string;
  handle: string;
  name: string;
  /** "This device" for the phone's own handle. Empty for everyone else. */
  place: string;
  isSelf: boolean;
  following: boolean;
  readingNow?: FriendReadingNow;
  /** Null until this device has a score. Others stay null until a sync fills it. */
  score: FriendScore | null;
  activity: FriendActivity[];
};

export type FriendRow = {
  id: string;
  handle: string;
  name: string;
  isSelf: boolean;
  following: boolean;
  place: string;
  readingTitle: string;
  readingAuthor: string;
  latest: string;
  /** Followed, and this phone still has no book or activity for them. */
  waiting: boolean;
};

/**
 * On-device social graph. `progress` and `sitHistory` belong to `selfHandle`
 * only — never copied onto another profile.
 */
export type FriendGraph = {
  selfHandle: string;
  selfName?: string;
  contacts: FriendContact[];
  following: string[];
  progress: Record<string, WorkProgress>;
  sitHistory: SitSession[];
  togetherKeeps: TogetherKeep[];
  hostedSits: HostedSit[];
  sitPledges: SitPledge[];
  ledgers?: DayLedgers;
  now?: number;
};

/**
 * Read API for Friends and friend profiles.
 * `localFriendProfiles` is the device graph. A future hosted sync implements
 * the same two methods and the pages stay as they are.
 */
export interface FriendProfiles {
  list(graph: FriendGraph): FriendRow[];
  profile(handle: string, graph: FriendGraph): FriendProfile | null;
}

const MS_DAY = 24 * 60 * 60 * 1000;
const ACTIVITY_CAP = 120;

export function friendProfilePath(handle: string) {
  return `/friends/${encodeURIComponent(normalizeHandle(handle))}`;
}

export function compactWhen(at: number, now = Date.now()) {
  if (!at) return "";
  const delta = Math.max(0, now - at);
  if (delta < 60_000) return "just now";
  if (delta < 60 * 60_000) return `${Math.max(1, Math.round(delta / 60_000))}m`;
  if (delta < MS_DAY) return `${Math.max(1, Math.round(delta / (60 * 60_000)))}h`;
  const days = Math.round(delta / MS_DAY);
  if (days < 7) return `${Math.max(1, days)}d`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function activityBlurb(item: FriendActivity, now = Date.now()) {
  const when = compactWhen(item.at, now);
  return when ? `${item.summary} · ${when}` : item.summary;
}

export const localFriendProfiles: FriendProfiles = {
  list: listFriends,
  profile: friendProfile,
};

export function listFriends(graph: FriendGraph): FriendRow[] {
  const now = graph.now ?? Date.now();
  const people = knownPeople(graph);
  const rows = [...people.values()].map((person) => {
    const profile = friendProfile(person.handle, graph);
    const latest = profile?.activity[0];
    const following = person.isSelf ? false : isFollowed(person.handle, graph.following);
    const latestLine = latest ? activityBlurb(latest, now) : "";
    return {
      id: person.id,
      handle: person.handle,
      name: person.name,
      isSelf: person.isSelf,
      following,
      place: person.isSelf ? "This device" : "",
      readingTitle: profile?.readingNow?.workTitle ?? "",
      readingAuthor: profile?.readingNow?.author ?? "",
      latest: latestLine,
      waiting: following && !profile?.readingNow && !latestLine,
    };
  });
  rows.sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    const aAt = friendProfile(a.handle, graph)?.activity[0]?.at ?? 0;
    const bAt = friendProfile(b.handle, graph)?.activity[0]?.at ?? 0;
    if (aAt !== bAt) return bAt - aAt;
    return a.handle.localeCompare(b.handle);
  });
  return rows;
}

export function friendProfile(rawHandle: string, graph: FriendGraph): FriendProfile | null {
  const handle = normalizeHandle(rawHandle.replace(/^local:/, ""));
  if (handle.length < 2) return null;
  const now = graph.now ?? Date.now();
  const self = normalizeHandle(graph.selfHandle);
  const isSelf = Boolean(self) && handle === self;
  const contact = graph.contacts.find((row) => row.handle === handle);
  const name = displayName(handle, graph, contact);
  const current = readingNow(handle, graph, isSelf, contact);
  const activity = collectActivity(handle, graph, isSelf)
    .filter((item) => !(item.kind === "reading" && item.workId && item.workId === current?.workId))
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
  return {
    id: isSelf ? "you" : contact?.id ?? contactId(handle),
    handle,
    name,
    place: isSelf ? "This device" : "",
    isSelf,
    following: isSelf ? false : isFollowed(handle, graph.following),
    readingNow: current,
    score: isSelf ? selfScore(graph, now) : null,
    activity: activity.slice(0, ACTIVITY_CAP),
  };
}

type KnownPerson = { id: string; handle: string; name: string; isSelf: boolean };

function knownPeople(graph: FriendGraph): Map<string, KnownPerson> {
  const people = new Map<string, KnownPerson>();
  const self = normalizeHandle(graph.selfHandle);
  if (self.length >= 2) {
    people.set(self, {
      id: "you",
      handle: self,
      name: (graph.selfName ?? "").trim() || formatHandle(self),
      isSelf: true,
    });
  }
  for (const contact of graph.contacts) {
    const handle = normalizeHandle(contact.handle);
    if (handle.length < 2 || handle === self) continue;
    people.set(handle, {
      id: contact.id || contactId(handle),
      handle,
      name: contact.name?.trim() || formatHandle(handle),
      isSelf: false,
    });
  }
  for (const handle of handlesInSocial(graph)) {
    if (handle === self || people.has(handle)) continue;
    people.set(handle, {
      id: contactId(handle),
      handle,
      name: displayName(handle, graph),
      isSelf: false,
    });
  }
  return people;
}

function handlesInSocial(graph: FriendGraph): string[] {
  const found = new Set<string>();
  const add = (value: string | undefined) => {
    const handle = normalizeHandle(value ?? "");
    if (handle.length >= 2) found.add(handle);
  };
  for (const sit of graph.hostedSits) {
    add(sit.hostHandle);
    for (const guest of sit.invitees) add(guest);
    for (const guest of sit.rsvps) add(guest.handle);
    for (const keep of sit.keeps) add(keep.handle);
  }
  for (const pair of graph.togetherKeeps) {
    add(pair.theirs.handle);
    add(pair.yours.handle);
  }
  for (const pledge of graph.sitPledges) {
    add(pledge.fromHandle);
    add(pledge.toHandle);
  }
  return [...found];
}

function isFollowed(handle: string, following: string[]) {
  const id = contactId(handle);
  return following.includes(id) || following.includes(handle);
}

function displayName(handle: string, graph: FriendGraph, contact?: FriendContact) {
  const self = normalizeHandle(graph.selfHandle);
  if (handle === self && graph.selfName?.trim()) return graph.selfName.trim();
  if (contact?.name?.trim() && contact.name.trim() !== formatHandle(handle)) return contact.name.trim();
  for (const sit of graph.hostedSits) {
    if (sit.hostHandle === handle && named(sit.hostName, handle)) return sit.hostName.trim();
    const guest = sit.rsvps.find((row) => row.handle === handle);
    if (guest && named(guest.name, handle)) return guest.name.trim();
    const keep = sit.keeps.find((row) => row.handle === handle);
    if (keep && named(keep.name, handle)) return keep.name.trim();
  }
  for (const pair of graph.togetherKeeps) {
    for (const side of [pair.theirs, pair.yours]) {
      if (side.handle === handle && named(side.name, handle)) return side.name.trim();
    }
  }
  for (const pledge of graph.sitPledges) {
    if (pledge.fromHandle === handle && named(pledge.fromName, handle)) return pledge.fromName.trim();
    if (pledge.toHandle === handle && named(pledge.toName, handle)) return pledge.toName.trim();
  }
  if (contact?.name?.trim()) return contact.name.trim();
  return formatHandle(handle);
}

function named(value: string | undefined, handle: string) {
  const clean = (value ?? "").trim();
  return Boolean(clean) && clean !== formatHandle(handle) && clean.toLowerCase() !== handle;
}

function readingNow(
  handle: string,
  graph: FriendGraph,
  isSelf: boolean,
  contact: FriendContact | undefined,
): FriendReadingNow | undefined {
  if (isSelf) {
    const last = lastReadProgress(graph.progress);
    if (!last) return undefined;
    const item = graph.progress[last.id];
    if (item?.completedAt) {
      const open = Object.entries(graph.progress)
        .filter(([id, row]) => id !== "page" && row.entered && !row.completedAt)
        .sort((a, b) => (b[1].lastOpenedAt ?? 0) - (a[1].lastOpenedAt ?? 0))[0];
      if (!open) return undefined;
      return readingFromProgress(open[0], open[1]);
    }
    return readingFromProgress(last.id, item);
  }
  const workId = contact?.reading?.trim() ?? "";
  if (!workId) return undefined;
  const meta = workMeta(workId, contact?.workTitle ?? "");
  if (!meta.workTitle) return undefined;
  return {
    workId: meta.workId ?? workId,
    workTitle: meta.workTitle,
    author: meta.author,
    at: contact?.addedAt ?? 0,
  };
}

function readingFromProgress(workId: string, item: WorkProgress | undefined): FriendReadingNow | undefined {
  const meta = workMeta(workId);
  if (!meta.workId || !meta.workTitle) return undefined;
  const atIndex = Math.max(0, item?.breathIndex ?? 0);
  return {
    workId: meta.workId,
    workTitle: meta.workTitle,
    author: meta.author,
    progress: progressLabel(atIndex, meta.breaths),
    atIndex,
    at: item?.lastOpenedAt ?? 0,
  };
}

function collectActivity(handle: string, graph: FriendGraph, isSelf: boolean): FriendActivity[] {
  const items: FriendActivity[] = [];
  if (isSelf) items.push(...selfShelfActivity(graph));
  for (const pair of graph.togetherKeeps) {
    const side = pair.theirs.handle === handle ? pair.theirs : pair.yours.handle === handle ? pair.yours : null;
    if (!side) continue;
    const meta = workMeta(pair.workId, pair.workTitle);
    items.push({
      id: `together:${pair.id}:${handle}`,
      at: pair.createdAt,
      kind: "together",
      label: "Together",
      summary: `kept a line from ${meta.workTitle || "a book"}`,
      line: side.line,
      workId: meta.workId,
      workTitle: meta.workTitle || pair.workTitle,
      author: meta.author || pair.author,
      atIndex: side.at,
      breathId: side.breathId,
    });
  }
  for (const sit of graph.hostedSits) {
    items.push(...sitActivity(handle, sit));
  }
  for (const pledge of graph.sitPledges) {
    if (pledge.fromHandle !== handle && pledge.toHandle !== handle) continue;
    const fromThem = pledge.fromHandle === handle;
    items.push({
      id: `tonight:${pledge.id}:${handle}`,
      at: pledge.createdAt,
      kind: "tonight",
      label: "Tonight",
      summary: fromThem
        ? pledge.status === "done"
          ? "sat, as promised"
          : pledge.status === "cancelled"
            ? "set the tonight-note aside"
            : `will sit ${windowLabel(pledge.window).toLowerCase()}`
        : `tonight-note from ${formatHandle(pledge.fromHandle)}`,
      line: pledgeLine(pledge),
      pledgeId: pledge.id,
    });
  }
  return items;
}

function selfShelfActivity(graph: FriendGraph): FriendActivity[] {
  const items: FriendActivity[] = [];
  for (const [workId, item] of Object.entries(graph.progress)) {
    if (workId === "page" || !item?.entered) continue;
    const meta = workMeta(workId);
    const atIndex = Math.max(0, item.breathIndex ?? 0);
    const progress = progressLabel(atIndex, meta.breaths);
    if (!item.completedAt) {
      items.push({
        id: `reading:${workId}`,
        at: item.lastOpenedAt || 0,
        kind: "reading",
        label: "Reading",
        summary: `reading ${meta.workTitle || workId}`,
        workId: meta.workId,
        workTitle: meta.workTitle,
        author: meta.author,
        atIndex,
        progress,
      });
    }
    if (item.completedAt) {
      items.push({
        id: `finished:${workId}`,
        at: item.completedAt,
        kind: "finished",
        label: "Finished",
        summary: `finished ${meta.workTitle || workId}`,
        workId: meta.workId,
        workTitle: meta.workTitle,
        author: meta.author,
        atIndex,
        progress,
      });
    }
    for (const breathId of item.kept ?? []) {
      if (!breathId) continue;
      items.push({
        id: `kept:${workId}:${breathId}`,
        at: item.lastOpenedAt || 0,
        kind: "kept",
        label: "Kept",
        summary: `kept a line from ${meta.workTitle || workId}`,
        workId: meta.workId,
        workTitle: meta.workTitle,
        author: meta.author,
        breathId,
      });
    }
  }
  for (const sit of graph.sitHistory) {
    const meta = workMeta(sit.workId);
    const minutes = sit.minutes > 0 ? `${Math.max(1, Math.round(sit.minutes))} min` : "";
    items.push({
      id: `sit:${sit.workId}:${sit.endedAt}`,
      at: sit.endedAt,
      kind: "sit",
      label: "Sit",
      summary: `sat with ${meta.workTitle || sit.workId}`,
      workId: meta.workId,
      workTitle: meta.workTitle,
      author: meta.author,
      progress: minutes,
    });
  }
  return items;
}

function sitActivity(handle: string, sit: HostedSit): FriendActivity[] {
  const items: FriendActivity[] = [];
  const meta = workMeta(sit.workId, sit.workTitle);
  const work = {
    workId: meta.workId,
    workTitle: meta.workTitle || sit.workTitle,
    author: meta.author || sit.author,
  };
  if (sit.hostHandle === handle) {
    items.push({
      id: `hosted:${sit.id}`,
      at: sit.createdAt,
      kind: "hosted",
      label: "Hosted",
      summary: `hosted ${work.workTitle || "a sit"}`,
      ...work,
    });
  }
  const rsvp = sit.rsvps.find((row) => row.handle === handle);
  if (rsvp && sit.hostHandle !== handle) {
    items.push({
      id: `joined:${sit.id}:${handle}`,
      at: rsvp.at || sit.createdAt,
      kind: "joined",
      label: "Joined",
      summary:
        rsvp.status === "later"
          ? `said later for ${work.workTitle || "a sit"}`
          : `joined a sit with ${work.workTitle || "a book"}`,
      ...work,
    });
  } else if (!rsvp && sit.hostHandle !== handle && sit.invitees.includes(handle)) {
    items.push({
      id: `invited:${sit.id}:${handle}`,
      at: sit.createdAt,
      kind: "invited",
      label: "Invited",
      summary: `invited to ${work.workTitle || "a sit"}`,
      ...work,
    });
  }
  for (const keep of sit.keeps) {
    if (keep.handle !== handle) continue;
    items.push(keepActivity(sit.id, keep, work));
  }
  return items;
}

function keepActivity(
  sitId: string,
  keep: SitKeep,
  work: { workId?: string; workTitle?: string; author?: string },
): FriendActivity {
  return {
    id: `kept:sit:${sitId}:${keep.handle}:${keep.breathId}`,
    at: keep.keptAt,
    kind: "kept",
    label: "Kept",
    summary: `kept a line from ${work.workTitle || "a book"}`,
    line: keep.line,
    workId: work.workId,
    workTitle: work.workTitle,
    author: work.author,
    atIndex: keep.at,
    breathId: keep.breathId,
  };
}

function workMeta(workId: string, fallbackTitle = "") {
  const work = workId ? shelfWork(workId) : undefined;
  return {
    workId: work?.id ?? (workId || undefined),
    workTitle: work?.title ?? fallbackTitle,
    author: work?.author ?? "",
    breaths: work?.breaths,
  };
}

function progressLabel(index: number, breaths: number | undefined) {
  const cue = lastReadCue(index, breaths);
  return cue || undefined;
}

function selfScore(graph: FriendGraph, now: number): FriendScore | null {
  const ledgers = graph.ledgers ?? {};
  const daily = deriveWindowScores(ledgers, now).daily;
  const streak = selfStreak(graph, now);
  if (!daily.hasSignal && streak <= 0) return null;
  return {
    total: daily.total,
    label: daily.label,
    streak,
    hasSignal: daily.hasSignal,
  };
}

function selfStreak(graph: FriendGraph, now: number) {
  const minutes = graph.ledgers?.readingMinutesByDay ?? {};
  const days = new Set<string>();
  for (const item of Object.values(graph.progress)) {
    if (!item?.entered || !item.lastOpenedAt) continue;
    days.add(dayKey(item.lastOpenedAt));
  }
  const fromMinutes = walkStreak((key) => (minutes[key] ?? 0) > 0, now);
  const fromProgress = walkStreak((key) => days.has(key), now);
  return Math.max(fromMinutes, fromProgress);
}

function walkStreak(hasDay: (key: string) => boolean, now: number) {
  const today = dayKey(now);
  const yesterday = dayKey(now - MS_DAY);
  let cursor: string | null = hasDay(today) ? today : hasDay(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (cursor && hasDay(cursor)) {
    streak += 1;
    const [y, m, d] = cursor.split("-").map(Number);
    const prev = new Date(y!, m! - 1, d!);
    prev.setDate(prev.getDate() - 1);
    cursor = dayKey(prev.getTime());
  }
  return streak;
}
